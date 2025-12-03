import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * 관리자용 K-IPPA 통계 API
 * GET /api/admin/ippa-stats
 * 
 * 반환 데이터:
 * - 총 평가 수
 * - 평가 참여 사용자 수
 * - 평균 효과성 점수
 * - 평균 사전/사후 점수
 * - 월별 평가 추이
 * - 카테고리별 통계
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 관리자 권한 확인
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const userRole = clerkUser.privateMetadata?.role as string | undefined
    
    console.log(`[Admin Ippa Stats] Checking role for user ${userId}: role=${userRole}`)
    
    if (userRole !== "admin" && userRole !== "expert") {
      console.log(`[Admin Ippa Stats] Access denied for user ${userId}: role=${userRole}`)
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    console.log(`[Admin Ippa Stats] Access granted for user ${userId}: role=${userRole}`)

    const supabase = getSupabaseServerClient()

    // 전체 K-IPPA 평가 데이터 (활동별 점수 포함)
    const { data: allEvaluations, error: evalError } = await supabase
      .from("ippa_evaluations")
      .select("id, user_id, product_id, effectiveness_score, score_difficulty_pre, score_difficulty_post, evaluated_at, recommendation_id, activity_scores")

    if (evalError) {
      console.error("[Admin Ippa Stats] Evaluations fetch error:", evalError)
      return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 })
    }

    const evaluations = allEvaluations ?? []

    // 기본 통계
    const totalEvaluations = evaluations.length
    const uniqueUsers = new Set(evaluations.map((e) => e.user_id)).size

    // 평균 효과성 점수
    const effectivenessScores = evaluations
      .map((e) => e.effectiveness_score ? Number(e.effectiveness_score) : null)
      .filter((s): s is number => s !== null)
    const averageEffectiveness = effectivenessScores.length > 0
      ? effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length
      : 0

    // 평균 사전/사후 점수
    const preScores = evaluations
      .map((e) => Number(e.score_difficulty_pre))
      .filter((s) => !isNaN(s))
    const postScores = evaluations
      .map((e) => Number(e.score_difficulty_post))
      .filter((s) => !isNaN(s))

    const averagePreScore = preScores.length > 0
      ? preScores.reduce((sum, score) => sum + score, 0) / preScores.length
      : 0
    const averagePostScore = postScores.length > 0
      ? postScores.reduce((sum, score) => sum + score, 0) / postScores.length
      : 0
    const scoreImprovement = averagePostScore - averagePreScore

    // product_id를 직접 사용하여 ISO 코드 가져오기
    const productIds = Array.from(new Set(evaluations.map((e) => e.product_id).filter(Boolean)))
    
    let productIdToIsoCode: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, iso_code")
        .in("id", productIds)

      if (productsError) {
        console.error("[Admin Ippa Stats] Products fetch error:", productsError)
      } else if (products) {
        products.forEach((product) => {
          if (product.iso_code) {
            productIdToIsoCode[product.id] = product.iso_code
          }
        })
      }
    }

    // 월별 평가 추이 (최근 6개월)
    const now = new Date()
    const months: Array<{ month: string; count: number; totalEffectiveness: number }> = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      
      const monthEvaluations = evaluations.filter((e) => {
        const evalDate = new Date(e.evaluated_at)
        return evalDate.getFullYear() === date.getFullYear() && 
               evalDate.getMonth() === date.getMonth()
      })

      const monthEffectiveness = monthEvaluations
        .map((e) => e.effectiveness_score ? Number(e.effectiveness_score) : null)
        .filter((s): s is number => s !== null)
      const avgMonthEffectiveness = monthEffectiveness.length > 0
        ? monthEffectiveness.reduce((sum, score) => sum + score, 0) / monthEffectiveness.length
        : 0

      months.push({
        month: monthStr,
        count: monthEvaluations.length,
        totalEffectiveness: avgMonthEffectiveness,
      })
    }

    // 카테고리별 통계
    const categoryStats: Record<string, { count: number; totalEffectiveness: number }> = {}
    
    evaluations.forEach((evaluation) => {
      const isoCode = productIdToIsoCode[evaluation.product_id]
      
      if (isoCode) {
        if (!categoryStats[isoCode]) {
          categoryStats[isoCode] = { count: 0, totalEffectiveness: 0 }
        }
        categoryStats[isoCode].count++
        const effectiveness = evaluation.effectiveness_score ? Number(evaluation.effectiveness_score) : 0
        categoryStats[isoCode].totalEffectiveness += effectiveness
      }
    })

    const topCategories = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        avgEffectiveness: stats.count > 0 ? stats.totalEffectiveness / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 상위 10개

    // 활동별 점수가 있는 평가들 추출
    const evaluationsWithActivities = evaluations.filter(e => 
      e.activity_scores && typeof e.activity_scores === 'object' && 
      'activities' in e.activity_scores && Array.isArray((e.activity_scores as any).activities)
    )

    // 활동별 통계 계산
    let activityStats: Record<string, {
      count: number
      totalImprovement: number
      avgImprovement: number
    }> = {}

    evaluationsWithActivities.forEach(evaluation => {
      const activityScores = (evaluation.activity_scores as any)?.activities
      if (Array.isArray(activityScores)) {
        activityScores.forEach((activity: any) => {
          const icfCode = activity.icfCode
          if (!icfCode) return

          if (!activityStats[icfCode]) {
            activityStats[icfCode] = { count: 0, totalImprovement: 0, avgImprovement: 0 }
          }
          activityStats[icfCode].count++
          activityStats[icfCode].totalImprovement += (activity.improvement || 0)
        })
      }
    })

    // 평균 계산
    Object.keys(activityStats).forEach(code => {
      const stat = activityStats[code]
      stat.avgImprovement = stat.count > 0 ? stat.totalImprovement / stat.count : 0
    })

    return NextResponse.json({
      stats: {
        totalEvaluations,
        totalUsers: uniqueUsers,
        averageEffectiveness,
        averagePreScore,
        averagePostScore,
        scoreImprovement,
        evaluationsByMonth: months.map((m) => ({
          month: m.month,
          count: m.count,
          avgEffectiveness: m.totalEffectiveness,
        })),
        topCategories,
        evaluationsWithActivities: evaluationsWithActivities.length,
        activityStats: Object.entries(activityStats)
          .map(([code, stat]) => ({
            icfCode: code,
            count: stat.count,
            avgImprovement: stat.avgImprovement,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20), // 상위 20개 활동
      },
      evaluations: evaluations.map(e => ({
        id: e.id,
        productId: e.product_id,
        effectivenessScore: e.effectiveness_score,
        activityScores: e.activity_scores,
        evaluatedAt: e.evaluated_at,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Admin Ippa Stats] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

