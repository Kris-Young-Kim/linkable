import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * 관리자용 사용자별 종합 데이터 조회 API
 * GET /api/admin/users
 * 
 * 반환 데이터:
 * - 사용자 목록 (이름, 이메일, 역할)
 * - 각 사용자의 상담 수, 추천 수, K-IPPA 평가 수
 * - K-IPPA 점수 변화 추이
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
    const userRole = clerkUser.publicMetadata?.role as string | undefined
    
    if (userRole !== "admin" && userRole !== "expert") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const supabase = getSupabaseServerClient()

    // 모든 사용자 조회
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, clerk_id, role, points, created_at")
      .order("created_at", { ascending: false })

    if (usersError) {
      console.error("[Admin] Users fetch error:", usersError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // Clerk에서 사용자 정보 가져오기
    const usersWithDetails = await Promise.all(
      (users ?? []).map(async (user) => {
        try {
          const client = await clerkClient()
          const clerkUserData = await client.users.getUser(user.clerk_id)
          return {
            supabaseId: user.id,
            clerkId: user.clerk_id,
            name: clerkUserData.firstName && clerkUserData.lastName
              ? `${clerkUserData.firstName} ${clerkUserData.lastName}`
              : clerkUserData.username || clerkUserData.emailAddresses[0]?.emailAddress || "이름 없음",
            email: clerkUserData.emailAddresses[0]?.emailAddress || "",
            role: (user.role || clerkUserData.publicMetadata?.role) as string,
            points: user.points || 0,
            createdAt: user.created_at,
          }
        } catch (error) {
          console.error(`[Admin] Failed to fetch Clerk user ${user.clerk_id}:`, error)
          return {
            supabaseId: user.id,
            clerkId: user.clerk_id,
            name: "정보 없음",
            email: "",
            role: user.role || "user",
            points: user.points || 0,
            createdAt: user.created_at,
          }
        }
      })
    )

    // 각 사용자의 상담, 추천, K-IPPA 데이터 조회
    const usersWithStats = await Promise.all(
      usersWithDetails.map(async (user) => {
        // 상담 수
        const { data: consultations, error: consultError } = await supabase
          .from("consultations")
          .select("id, status, created_at")
          .eq("user_id", user.supabaseId)

        // 추천 수
        const consultationIds = (consultations ?? []).map((c) => c.id)
        const { data: recommendations, error: recError } = consultationIds.length > 0
          ? await supabase
              .from("recommendations")
              .select("id, is_clicked, created_at")
              .in("consultation_id", consultationIds)
          : { data: null, error: null }

        // K-IPPA 평가 데이터
        const { data: ippaEvaluations, error: ippaError } = await supabase
          .from("ippa_evaluations")
          .select("id, effectiveness_score, pre_score, post_score, importance, evaluated_at, recommendation_id")
          .eq("user_id", user.supabaseId)
          .order("evaluated_at", { ascending: true })

        // K-IPPA 점수 변화 추이 계산
        const scoreHistory = (ippaEvaluations ?? []).map((evaluation) => ({
          date: evaluation.evaluated_at,
          effectivenessScore: evaluation.effectiveness_score ? Number(evaluation.effectiveness_score) : null,
          preScore: evaluation.pre_score ? Number(evaluation.pre_score) : null,
          postScore: evaluation.post_score ? Number(evaluation.post_score) : null,
          importance: evaluation.importance ? Number(evaluation.importance) : null,
          recommendationId: evaluation.recommendation_id,
        }))

        // 평균 효과성 점수
        const effectivenessScores = scoreHistory
          .map((h) => h.effectivenessScore)
          .filter((s): s is number => s !== null)
        const avgEffectiveness = effectivenessScores.length > 0
          ? effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length
          : 0

        return {
          ...user,
          stats: {
            totalConsultations: consultations?.length ?? 0,
            completedConsultations: consultations?.filter((c) => c.status === "completed").length ?? 0,
            totalRecommendations: recommendations?.length ?? 0,
            clickedRecommendations: recommendations?.filter((r) => r.is_clicked).length ?? 0,
            totalIppaEvaluations: ippaEvaluations?.length ?? 0,
            averageEffectiveness: Number(avgEffectiveness.toFixed(2)),
            scoreHistory,
          },
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Admin] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

