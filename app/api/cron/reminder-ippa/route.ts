import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

/**
 * +14일 리마인더 자동 발송 Cron Job
 * 
 * Vercel Cron에서 매일 실행 (예: 매일 오전 10시)
 * 
 * 트리거 조건:
 * - recommendations.created_at 기준 +14일 경과
 * - is_clicked = true (실제 구매한 사용자)
 * - ippa_evaluations에 해당 recommendation_id가 없음 (평가 미제출)
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 14일 전 날짜 계산
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const cutoffDate = fourteenDaysAgo.toISOString()

    console.log(`[Cron] Processing reminders for recommendations created before ${cutoffDate}`)

    // 먼저 이미 평가가 제출된 recommendation_id 목록 가져오기
    const { data: evaluatedRecommendations } = await supabase
      .from("ippa_evaluations")
      .select("recommendation_id")
      .not("recommendation_id", "is", null)

    const evaluatedIds = (evaluatedRecommendations ?? [])
      .map((e) => e.recommendation_id)
      .filter(Boolean) as string[]

    // 14일 전에 생성된 추천 중 클릭된 것 찾기
    let query = supabase
      .from("recommendations")
      .select(
        `
        id,
        consultation_id,
        product_id,
        created_at,
        consultations!inner(
          user_id,
          title
        ),
        products!inner(
          name
        )
      `
      )
      .eq("is_clicked", true)
      .lt("created_at", cutoffDate)

    // 평가가 제출된 추천 제외
    const queryResult = await query
    let recommendations = queryResult.data
    const fetchError = queryResult.error

    if (fetchError) {
      console.error("[Cron] Error fetching recommendations:", fetchError)
      logEvent({
        category: "system",
        action: "cron_reminder_fetch_error",
        payload: { error: fetchError },
        level: "error",
      })
      return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 })
    }

    // 평가가 제출된 추천 제외
    if (evaluatedIds.length > 0 && recommendations) {
      recommendations = recommendations.filter((r) => !evaluatedIds.includes(r.id))
    }

    if (!recommendations || recommendations.length === 0) {
      console.log("[Cron] No recommendations found for reminders")
      return NextResponse.json({ processed: 0, created: 0 })
    }

    console.log(`[Cron] Found ${recommendations.length} recommendations eligible for reminders`)

    // 이미 알림이 생성된 추천은 제외 (중복 방지)
    const recommendationIds = recommendations.map((r) => r.id)
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("metadata")
      .eq("type", "ippa_reminder")
      .in(
        "metadata->>recommendation_id",
        recommendationIds
      )

    const existingRecommendationIds = new Set(
      (existingNotifications ?? [])
        .map((n) => {
          const metadata = n.metadata as { recommendation_id?: string } | null
          return metadata?.recommendation_id
        })
        .filter(Boolean) as string[]
    )

    const newRecommendations = recommendations.filter(
      (r) => !existingRecommendationIds.has(r.id)
    )

    if (newRecommendations.length === 0) {
      console.log("[Cron] All recommendations already have notifications")
      return NextResponse.json({ processed: recommendations.length, created: 0 })
    }

    // 알림 생성
    const notifications = newRecommendations.map((rec) => {
      const consultation = Array.isArray(rec.consultations) 
        ? rec.consultations[0] 
        : rec.consultations
      const product = Array.isArray(rec.products) 
        ? rec.products[0] 
        : rec.products

      return {
        user_id: consultation?.user_id,
        type: "ippa_reminder",
        title: "보조기기 사용 후 평가를 진행해 주세요",
        message: `${product?.name ?? "추천받은 보조기기"}을(를) 사용하신 지 2주가 지났습니다. 사용 경험을 공유해 주시면 더 나은 추천을 제공하는 데 도움이 됩니다.`,
        link_url: `/dashboard?evaluate=${rec.id}`,
        metadata: {
          recommendation_id: rec.id,
          consultation_id: rec.consultation_id,
          product_id: rec.product_id,
        },
        is_read: false,
      }
    })

    const { data: insertedNotifications, error: insertError } = await supabase
      .from("notifications")
      .insert(notifications)
      .select("id")

    if (insertError) {
      console.error("[Cron] Error creating notifications:", insertError)
      logEvent({
        category: "system",
        action: "cron_reminder_insert_error",
        payload: { error: insertError },
        level: "error",
      })
      return NextResponse.json({ error: "Failed to create notifications" }, { status: 500 })
    }

    console.log(`[Cron] Created ${insertedNotifications?.length ?? 0} notifications`)

    logEvent({
      category: "system",
      action: "cron_reminder_completed",
      payload: {
        processed: recommendations.length,
        created: insertedNotifications?.length ?? 0,
      },
    })

    return NextResponse.json({
      processed: recommendations.length,
      created: insertedNotifications?.length ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Unexpected error:", error)
    logEvent({
      category: "system",
      action: "cron_reminder_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

