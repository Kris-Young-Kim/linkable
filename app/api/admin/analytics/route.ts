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

    // 관리자 권한 확인 (privateMetadata에서 role 확인)
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const userRole = clerkUser.privateMetadata?.role as string | undefined
    
    console.log(`[Admin Analytics] Checking role for user ${userId}: role=${userRole}`)
    
    if (userRole !== "admin" && userRole !== "expert") {
      console.log(`[Admin Analytics] Access denied for user ${userId}: role=${userRole}`)
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    console.log(`[Admin Analytics] Access granted for user ${userId}: role=${userRole}`)

    const supabase = getSupabaseServerClient()

    // 필터 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "30days"
    const userGroup = searchParams.get("userGroup") || "all"
    const includeDaily = searchParams.get("daily") === "true"

    console.log(`[Admin Analytics] Filters: dateRange=${dateRange}, userGroup=${userGroup}`)

    // 날짜 범위 계산
    const getDateRange = (range: string) => {
      const now = new Date()
      const start = new Date()
      
      switch (range) {
        case "today":
          start.setHours(0, 0, 0, 0)
          break
        case "7days":
          start.setDate(start.getDate() - 7)
          break
        case "30days":
          start.setDate(start.getDate() - 30)
          break
        case "90days":
          start.setDate(start.getDate() - 90)
          break
        case "1year":
          start.setFullYear(start.getFullYear() - 1)
          break
        default:
          start.setDate(start.getDate() - 30)
      }
      
      return { start, end: now }
    }

    const { start: dateStart, end: dateEnd } = getDateRange(dateRange)

    // View를 사용하여 플랫폼 통계 조회 (성능 최적화)
    const { data: platformStats, error: viewError } = await supabase
      .from("view_platform_stats")
      .select("*")
      .single()

    if (viewError) {
      console.error("[Admin Analytics] View fetch error:", viewError)
      // View가 없으면 기존 방식으로 폴백
      console.log("[Admin Analytics] Falling back to direct queries")
      
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
    }

    // View에서 데이터 사용
    const stats = platformStats as {
      total_recommendations: number
      clicked_recommendations: number
      click_through_rate: number
      total_ippa_evaluations: number
      ippa_participation_rate: number
      total_consultations: number
      completed_consultations: number
      consultation_completion_rate: number
      average_effectiveness_score: number
      recent_recommendations: number
      recent_ippa_evaluations: number
    }

    console.log("[Admin Analytics] Using view_platform_stats for optimized query")

    // 기간 필터링이 필요한 경우 프로시저 사용
    let filteredMetrics = stats
    if (dateRange !== "30days") {
      try {
        const { data: periodStats, error: periodError } = await supabase.rpc(
          "calculate_period_stats",
          {
            p_start_date: dateStart.toISOString(),
            p_end_date: dateEnd.toISOString(),
          }
        )

        if (!periodError && periodStats && periodStats.length > 0) {
          const period = periodStats[0] as {
            total_recommendations: number
            clicked_recommendations: number
            click_through_rate: number
            total_ippa_evaluations: number
            average_effectiveness_score: number
            total_consultations: number
            completed_consultations: number
          }

          filteredMetrics = {
            ...stats,
            total_recommendations: period.total_recommendations,
            clicked_recommendations: period.clicked_recommendations,
            click_through_rate: period.click_through_rate,
            total_ippa_evaluations: period.total_ippa_evaluations,
            average_effectiveness_score: period.average_effectiveness_score || 0,
            total_consultations: period.total_consultations,
            completed_consultations: period.completed_consultations,
            consultation_completion_rate: period.total_consultations > 0
              ? (period.completed_consultations / period.total_consultations) * 100
              : 0,
          }
        }
      } catch (error) {
        console.warn("[Admin Analytics] Period stats calculation failed, using view data:", error)
      }
    }

    // 일별 통계 조회 (선택적)
    let dailyStats = null
    if (includeDaily) {
      try {
        const { data: daily, error: dailyError } = await supabase
          .from("view_daily_stats")
          .select("*")
          .order("stat_date", { ascending: false })
          .limit(30)

        if (!dailyError) {
          dailyStats = daily
        }
      } catch (error) {
        console.warn("[Admin Analytics] Daily stats fetch failed:", error)
      }
    }

    const response: any = {
      metrics: {
        recommendationAccuracy: {
          clickThroughRate: Number(filteredMetrics.click_through_rate),
          totalRecommendations: Number(filteredMetrics.total_recommendations),
          clickedRecommendations: Number(filteredMetrics.clicked_recommendations),
        },
        ippaParticipation: {
          participationRate: Number(filteredMetrics.ippa_participation_rate),
          totalEvaluations: Number(filteredMetrics.total_ippa_evaluations),
          eligibleRecommendations: Number(filteredMetrics.clicked_recommendations),
        },
        consultationCompletion: {
          completionRate: Number(filteredMetrics.consultation_completion_rate),
          totalConsultations: Number(filteredMetrics.total_consultations),
          completedConsultations: Number(filteredMetrics.completed_consultations),
        },
        recentActivity: {
          recommendations: Number(filteredMetrics.recent_recommendations),
          ippaEvaluations: Number(filteredMetrics.recent_ippa_evaluations),
        },
        averageEffectiveness: Number(filteredMetrics.average_effectiveness_score),
      },
      timestamp: new Date().toISOString(),
    }

    if (dailyStats) {
      response.dailyStats = dailyStats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Admin Analytics] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

