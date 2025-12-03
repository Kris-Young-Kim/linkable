import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { calculateEffectiveness, calculatePoints } from "@/core/validation/ippa-calculator"
import { analyseFeedback } from "@/core/validation/feedback-analyser"

type ActivityScore = {
  icfCode: string
  importance: number
  preDifficulty: number
  postDifficulty: number
}

type IppaSubmissionRequest = {
  recommendationId?: string
  productId: string
  problemDescription?: string
  consultationId?: string
  // 기존 방식 (단일 활동)
  scoreImportance?: number // 1-5
  scoreDifficultyPre?: number // 1-5
  scoreDifficultyPost?: number // 1-5
  // 새로운 방식 (활동별 점수)
  activityScores?: ActivityScore[]
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

    const supabaseUserId = await ensureUserRecord(userId)

    // 활동별 점수 처리 (새로운 방식)
    let activityScoresData: any = null
    let result: any
    let avgScoreImportance = 0
    let avgScoreDifficultyPre = 0
    let avgScoreDifficultyPost = 0

    if (body.activityScores && Array.isArray(body.activityScores) && body.activityScores.length > 0) {
      // 활동별 점수 유효성 검사
      for (const activity of body.activityScores) {
        if (
          !activity.icfCode ||
          !activity.importance ||
          !activity.preDifficulty ||
          !activity.postDifficulty ||
          activity.importance < 1 ||
          activity.importance > 5 ||
          activity.preDifficulty < 1 ||
          activity.preDifficulty > 5 ||
          activity.postDifficulty < 1 ||
          activity.postDifficulty > 5
        ) {
          return NextResponse.json(
            { error: "All activity scores must be between 1 and 5" },
            { status: 400 },
          )
        }
      }

      // 활동별 점수 계산
      const activities = body.activityScores.map(a => {
        const improvement = a.preDifficulty - a.postDifficulty
        const effectivenessScore = improvement * a.importance
        return {
          icfCode: a.icfCode,
          importance: a.importance,
          preDifficulty: a.preDifficulty,
          postDifficulty: a.postDifficulty,
          improvement,
          effectivenessScore,
        }
      })

      const totalPreScore = activities.reduce((sum, a) => sum + (a.importance * a.preDifficulty), 0)
      const totalPostScore = activities.reduce((sum, a) => sum + (a.importance * a.postDifficulty), 0)
      const totalImprovement = totalPreScore - totalPostScore
      const avgPreScore = totalPreScore / activities.length
      const avgPostScore = totalPostScore / activities.length
      const avgImprovement = avgPreScore - avgPostScore

      activityScoresData = {
        activities,
        totalPreScore,
        totalPostScore,
        totalImprovement,
        avgPreScore,
        avgPostScore,
        avgImprovement,
      }

      // 평균 점수 계산 (기존 필드 호환성)
      avgScoreImportance = activities.reduce((sum, a) => sum + a.importance, 0) / activities.length
      avgScoreDifficultyPre = activities.reduce((sum, a) => sum + a.preDifficulty, 0) / activities.length
      avgScoreDifficultyPost = activities.reduce((sum, a) => sum + a.postDifficulty, 0) / activities.length

      // 전체 효과성 점수는 총 개선 점수 사용
      result = {
        effectivenessScore: totalImprovement,
        improvement: avgScoreDifficultyPre - avgScoreDifficultyPost,
        improvementPercentage: avgScoreDifficultyPre > 0 
          ? ((avgScoreDifficultyPre - avgScoreDifficultyPost) / avgScoreDifficultyPre) * 100 
          : 0,
        interpretation: totalImprovement > 0 ? "excellent" : totalImprovement === 0 ? "none" : "worse",
      }
    } else {
      // 기존 방식 (단일 활동)
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

      avgScoreImportance = body.scoreImportance
      avgScoreDifficultyPre = body.scoreDifficultyPre
      avgScoreDifficultyPost = body.scoreDifficultyPost

      // 효과성 점수 계산
      result = calculateEffectiveness({
        importance: body.scoreImportance,
        preDifficulty: body.scoreDifficultyPre,
        postDifficulty: body.scoreDifficultyPost,
      })
    }

    // 피드백 감성 분석
    const feedbackAnalysis = body.feedbackComment
      ? analyseFeedback(body.feedbackComment)
      : null

    // DB에 저장
    const insertData: any = {
      user_id: supabaseUserId,
      product_id: body.productId,
      recommendation_id: body.recommendationId ?? null,
      problem_description: body.problemDescription ?? null,
      score_importance: avgScoreImportance,
      score_difficulty_pre: avgScoreDifficultyPre,
      score_difficulty_post: avgScoreDifficultyPost,
      effectiveness_score: result.effectivenessScore,
      feedback_comment: body.feedbackComment ?? null,
    }

    // 활동별 점수 데이터 추가
    if (activityScoresData) {
      insertData.activity_scores = activityScoresData
    }

    const { data: evaluation, error: insertError } = await supabase
      .from("ippa_evaluations")
      .insert(insertData)
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
      // 포인트 트랜잭션 기록 (트리거가 자동으로 users.points 업데이트)
      const { error: pointsError } = await supabase
        .from("point_transactions")
        .insert({
          user_id: supabaseUserId,
          points: pointsEarned,
          transaction_type: "earned_ippa_evaluation",
          description: `K-IPPA 평가 제출 보상 (효과성 점수: ${result.effectivenessScore.toFixed(2)})`,
          reference_id: evaluation.id,
          reference_type: "ippa_evaluation",
        })

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
          payload: { userId: supabaseUserId, pointsEarned },
        })
      }
    }

    // 전환 이벤트 로깅 (Analytics 대시보드 연동)
    await supabase.from("conversion_events").insert({
      user_id: supabaseUserId,
      event_type: "ippa_evaluation_submit",
      recommendation_id: body.recommendationId ?? null,
      product_id: body.productId,
      metadata: {
        effectiveness_score: result.effectivenessScore,
        improvement_percentage: result.improvementPercentage,
        points_earned: pointsEarned,
      },
    })

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

