import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const supabase = getSupabaseServerClient()

/**
 * Analytics 데이터 조회 API
 * GET /api/analytics
 * 
 * 반환 데이터:
 * - 추천 정확도 (클릭률)
 * - K-IPPA 참여율
 * - 기타 메트릭
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 사용자 ID 조회
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    if (userError || !userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userIdSupabase = userRow.id

    // 1. 추천 정확도 (클릭률) 계산
    // 먼저 사용자의 상담 ID 목록 가져오기
    const { data: userConsultations } = await supabase
      .from("consultations")
      .select("id")
      .eq("user_id", userIdSupabase)

    const consultationIds = (userConsultations ?? []).map((c) => c.id)

    const { data: recommendations, error: recError } = consultationIds.length > 0
      ? await supabase
          .from("recommendations")
          .select("id, is_clicked, created_at")
          .in("consultation_id", consultationIds)
      : { data: null, error: null }

    if (recError) {
      console.error("[Analytics] Recommendations fetch error:", recError)
    }

    const totalRecommendations = recommendations?.length ?? 0
    const clickedRecommendations = recommendations?.filter((r) => r.is_clicked).length ?? 0
    const clickThroughRate = totalRecommendations > 0 
      ? (clickedRecommendations / totalRecommendations) * 100 
      : 0

    // 2. K-IPPA 참여율 계산
    const { data: ippaEvaluations, error: ippaError } = await supabase
      .from("ippa_evaluations")
      .select("id, recommendation_id, evaluated_at")
      .eq("user_id", userIdSupabase)

    if (ippaError) {
      console.error("[Analytics] IPPA evaluations fetch error:", ippaError)
    }

    const totalIppaEvaluations = ippaEvaluations?.length ?? 0
    const ippaParticipationRate = clickedRecommendations > 0
      ? (totalIppaEvaluations / clickedRecommendations) * 100
      : 0

    // 3. 상담 완료율
    const { data: consultations, error: consultError } = await supabase
      .from("consultations")
      .select("id, status, created_at")
      .eq("user_id", userIdSupabase)

    if (consultError) {
      console.error("[Analytics] Consultations fetch error:", consultError)
    }

    const totalConsultations = consultations?.length ?? 0
    const completedConsultations = consultations?.filter((c) => c.status === "completed").length ?? 0
    const consultationCompletionRate = totalConsultations > 0
      ? (completedConsultations / totalConsultations) * 100
      : 0

    // 4. 최근 30일 트렌드
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentRecommendations = recommendations?.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    ).length ?? 0

    const recentIppaEvaluations = ippaEvaluations?.filter(
      (e) => new Date(e.evaluated_at) >= thirtyDaysAgo
    ).length ?? 0

    // 5. 평균 효과성 점수
    const { data: effectivenessScores, error: effError } = await supabase
      .from("ippa_evaluations")
      .select("effectiveness_score")
      .eq("user_id", userIdSupabase)
      .not("effectiveness_score", "is", null)

    if (effError) {
      console.error("[Analytics] Effectiveness scores fetch error:", effError)
    }

    const scores = (effectivenessScores ?? []).map((e) => Number(e.effectiveness_score))
    const avgEffectivenessScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0

    return NextResponse.json({
      metrics: {
        // 추천 정확도
        recommendationAccuracy: {
          clickThroughRate: Number(clickThroughRate.toFixed(2)),
          totalRecommendations,
          clickedRecommendations,
        },
        // K-IPPA 참여율
        ippaParticipation: {
          participationRate: Number(ippaParticipationRate.toFixed(2)),
          totalEvaluations: totalIppaEvaluations,
          eligibleRecommendations: clickedRecommendations,
        },
        // 상담 완료율
        consultationCompletion: {
          completionRate: Number(consultationCompletionRate.toFixed(2)),
          totalConsultations,
          completedConsultations,
        },
        // 최근 30일 활동
        recentActivity: {
          recommendations: recentRecommendations,
          ippaEvaluations: recentIppaEvaluations,
        },
        // 평균 효과성 점수
        averageEffectiveness: Number(avgEffectivenessScore.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Analytics] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

