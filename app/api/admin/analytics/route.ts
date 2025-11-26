import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * 관리자용 전체 플랫폼 통계 API
 * GET /api/admin/analytics
 * 
 * 반환 데이터:
 * - 전체 추천 정확도 (클릭률)
 * - 전체 K-IPPA 참여율
 * - 전체 상담 완료율
 * - 전체 평균 효과성 점수
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 관리자 권한 확인
    const clerkUser = await clerkClient.users.getUser(userId)
    const userRole = clerkUser.publicMetadata?.role as string | undefined
    
    if (userRole !== "admin" && userRole !== "expert") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const supabase = getSupabaseServerClient()

    // 전체 추천 데이터
    const { data: allRecommendations, error: recError } = await supabase
      .from("recommendations")
      .select("id, is_clicked, created_at")

    if (recError) {
      console.error("[Admin Analytics] Recommendations fetch error:", recError)
    }

    const totalRecommendations = allRecommendations?.length ?? 0
    const clickedRecommendations = allRecommendations?.filter((r) => r.is_clicked).length ?? 0
    const clickThroughRate = totalRecommendations > 0 
      ? (clickedRecommendations / totalRecommendations) * 100 
      : 0

    // 전체 K-IPPA 평가 데이터
    const { data: allIppaEvaluations, error: ippaError } = await supabase
      .from("ippa_evaluations")
      .select("id, recommendation_id, evaluated_at, effectiveness_score")

    if (ippaError) {
      console.error("[Admin Analytics] IPPA evaluations fetch error:", ippaError)
    }

    const totalIppaEvaluations = allIppaEvaluations?.length ?? 0
    const ippaParticipationRate = clickedRecommendations > 0
      ? (totalIppaEvaluations / clickedRecommendations) * 100
      : 0

    // 전체 상담 데이터
    const { data: allConsultations, error: consultError } = await supabase
      .from("consultations")
      .select("id, status, created_at")

    if (consultError) {
      console.error("[Admin Analytics] Consultations fetch error:", consultError)
    }

    const totalConsultations = allConsultations?.length ?? 0
    const completedConsultations = allConsultations?.filter((c) => c.status === "completed").length ?? 0
    const consultationCompletionRate = totalConsultations > 0
      ? (completedConsultations / totalConsultations) * 100
      : 0

    // 최근 30일 트렌드
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentRecommendations = allRecommendations?.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    ).length ?? 0

    const recentIppaEvaluations = allIppaEvaluations?.filter(
      (e) => new Date(e.evaluated_at) >= thirtyDaysAgo
    ).length ?? 0

    // 전체 평균 효과성 점수
    const effectivenessScores = (allIppaEvaluations ?? [])
      .map((e) => e.effectiveness_score ? Number(e.effectiveness_score) : null)
      .filter((s): s is number => s !== null)
    const avgEffectivenessScore = effectivenessScores.length > 0
      ? effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length
      : 0

    return NextResponse.json({
      metrics: {
        recommendationAccuracy: {
          clickThroughRate: Number(clickThroughRate.toFixed(2)),
          totalRecommendations,
          clickedRecommendations,
        },
        ippaParticipation: {
          participationRate: Number(ippaParticipationRate.toFixed(2)),
          totalEvaluations: totalIppaEvaluations,
          eligibleRecommendations: clickedRecommendations,
        },
        consultationCompletion: {
          completionRate: Number(consultationCompletionRate.toFixed(2)),
          totalConsultations,
          completedConsultations,
        },
        recentActivity: {
          recommendations: recentRecommendations,
          ippaEvaluations: recentIppaEvaluations,
        },
        averageEffectiveness: Number(avgEffectivenessScore.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Admin Analytics] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

