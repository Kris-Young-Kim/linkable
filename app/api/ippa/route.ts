import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { calculateEffectiveness, calculatePoints } from "@/core/validation/ippa-calculator"
import { analyseFeedback } from "@/core/validation/feedback-analyser"

type IppaSubmissionRequest = {
  recommendationId?: string
  productId: string
  problemDescription?: string
  scoreImportance: number // 1-5
  scoreDifficultyPre: number // 1-5
  scoreDifficultyPost: number // 1-5
  feedbackComment?: string
}

const supabase = getSupabaseServerClient()

const ensureUserRecord = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single()

  if (data?.id) {
    return data.id
  }

  if (error && error.code !== "PGRST116") {
    throw error
  }

  // 사용자가 없으면 에러 (일반적으로는 이미 생성되어 있어야 함)
  throw new Error("User record not found")
}

/**
 * K-IPPA 평가 제출 API
 * 
 * POST /api/ippa
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as IppaSubmissionRequest

    // 입력 검증
    if (!body.productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    if (
      !body.scoreImportance ||
      !body.scoreDifficultyPre ||
      !body.scoreDifficultyPost ||
      body.scoreImportance < 1 ||
      body.scoreImportance > 5 ||
      body.scoreDifficultyPre < 1 ||
      body.scoreDifficultyPre > 5 ||
      body.scoreDifficultyPost < 1 ||
      body.scoreDifficultyPost > 5
    ) {
      return NextResponse.json(
        { error: "All scores must be between 1 and 5" },
        { status: 400 },
      )
    }

    const supabaseUserId = await ensureUserRecord(userId)

    // 효과성 점수 계산
    const result = calculateEffectiveness({
      importance: body.scoreImportance,
      preDifficulty: body.scoreDifficultyPre,
      postDifficulty: body.scoreDifficultyPost,
    })

    // 피드백 감성 분석
    const feedbackAnalysis = body.feedbackComment
      ? analyseFeedback(body.feedbackComment)
      : null

    // DB에 저장
    const { data: evaluation, error: insertError } = await supabase
      .from("ippa_evaluations")
      .insert({
        user_id: supabaseUserId,
        product_id: body.productId,
        recommendation_id: body.recommendationId ?? null,
        problem_description: body.problemDescription ?? null,
        score_importance: body.scoreImportance,
        score_difficulty_pre: body.scoreDifficultyPre,
        score_difficulty_post: body.scoreDifficultyPost,
        effectiveness_score: result.effectivenessScore,
        feedback_comment: body.feedbackComment ?? null,
      })
      .select("id")
      .single()

    if (insertError) {
      logEvent({
        category: "validation",
        action: "ippa_insert_error",
        payload: { error: insertError },
        level: "error",
      })
      throw insertError
    }

    // 포인트 적립
    const pointsEarned = calculatePoints(result.effectivenessScore)
    if (pointsEarned > 0) {
      // 현재 포인트 조회
      const { data: userData } = await supabase
        .from("users")
        .select("points")
        .eq("id", supabaseUserId)
        .single()

      const currentPoints = (userData?.points as number) ?? 0
      const newPoints = currentPoints + pointsEarned

      const { error: pointsError } = await supabase
        .from("users")
        .update({ points: newPoints })
        .eq("id", supabaseUserId)

      if (pointsError) {
        // 포인트 적립 실패는 로그만 남기고 평가는 성공 처리
        logEvent({
          category: "validation",
          action: "ippa_points_error",
          payload: { error: pointsError, pointsEarned },
          level: "warn",
        })
      } else {
        logEvent({
          category: "validation",
          action: "ippa_points_awarded",
          payload: { userId: supabaseUserId, pointsEarned, newPoints },
        })
      }
    }

    logEvent({
      category: "validation",
      action: "ippa_submitted",
      payload: {
        evaluationId: evaluation.id,
        effectivenessScore: result.effectivenessScore,
        interpretation: result.interpretation,
        sentiment: feedbackAnalysis?.sentiment,
      },
    })

    return NextResponse.json({
      success: true,
      evaluationId: evaluation.id,
      result: {
        effectivenessScore: result.effectivenessScore,
        improvement: result.improvement,
        improvementPercentage: result.improvementPercentage,
        interpretation: result.interpretation,
      },
      pointsEarned,
      feedbackAnalysis: feedbackAnalysis
        ? {
            sentiment: feedbackAnalysis.sentiment,
            confidence: feedbackAnalysis.confidence,
            summary: feedbackAnalysis.summary,
          }
        : null,
    })
  } catch (error) {
    logEvent({
      category: "validation",
      action: "ippa_api_error",
      payload: { error: error instanceof Error ? error.message : String(error) },
      level: "error",
    })

    return NextResponse.json(
      { error: "Failed to submit evaluation. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    )
  }
}

/**
 * 사용자의 K-IPPA 평가 목록 조회
 * 
 * GET /api/ippa
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabaseUserId = await ensureUserRecord(userId)

    const { data, error } = await supabase
      .from("ippa_evaluations")
      .select(
        `
        id,
        product_id,
        recommendation_id,
        problem_description,
        score_importance,
        score_difficulty_pre,
        score_difficulty_post,
        effectiveness_score,
        feedback_comment,
        evaluated_at,
        products:product_id (
          id,
          name,
          image_url
        )
      `,
      )
      .eq("user_id", supabaseUserId)
      .order("evaluated_at", { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    return NextResponse.json({
      evaluations: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (error) {
    logEvent({
      category: "validation",
      action: "ippa_fetch_error",
      payload: { error: error instanceof Error ? error.message : String(error) },
      level: "error",
    })

    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 },
    )
  }
}

