import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { sendEmail, generateIppaReminderEmail } from "@/lib/email"

const supabase = getSupabaseServerClient()

/**
 * IPPA 평가 리마인더 자동 발송 Cron Job (7일 및 14일 통합)
 * 
 * Vercel Cron에서 매일 실행 (예: 매일 오전 10시)
 * 
 * 트리거 조건:
 * - recommendations.created_at 기준 +7일 또는 +14일 경과
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

    // 7일 및 14일 전 날짜 계산
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysCutoff = sevenDaysAgo.toISOString()

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const fourteenDaysCutoff = fourteenDaysAgo.toISOString()

    console.log(`[Cron] Processing reminders for recommendations created before ${sevenDaysCutoff} (7일) and ${fourteenDaysCutoff} (14일)`)

    // 먼저 이미 평가가 제출된 recommendation_id 목록 가져오기
    const { data: evaluatedRecommendations } = await supabase
      .from("ippa_evaluations")
      .select("recommendation_id")
      .not("recommendation_id", "is", null)

    const evaluatedIds = (evaluatedRecommendations ?? [])
      .map((e) => e.recommendation_id)
      .filter(Boolean) as string[]

    // 7일 이상 전에 생성된 추천 중 클릭된 것 찾기 (7일과 14일 모두 포함)
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
          title,
          users!inner(
            email
          )
        ),
        products!inner(
          name
        )
      `
      )
      .eq("is_clicked", true)
      .lt("created_at", sevenDaysCutoff) // 7일 이상 전에 생성된 것만

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

    // 이미 알림이 생성된 추천은 제외 (중복 방지) - 7일 및 14일 리마인더 모두 확인
    const recommendationIds = recommendations.map((r) => r.id)
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("metadata")
      .in("type", ["ippa_reminder", "ippa_reminder_7days"])
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

    // 7일 리마인더와 14일 리마인더를 분리하여 처리
    const sevenDayRecommendations: typeof recommendations = []
    const fourteenDayRecommendations: typeof recommendations = []

    for (const rec of recommendations) {
      const createdAt = new Date(rec.created_at)
      const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      // 기존 알림 확인
      const hasSevenDayReminder = (existingNotifications ?? []).some((n) => {
        const metadata = n.metadata as { recommendation_id?: string; days_since_creation?: number } | null
        return metadata?.recommendation_id === rec.id && 
               metadata?.days_since_creation !== undefined && 
               metadata.days_since_creation < 14
      })
      
      const hasFourteenDayReminder = (existingNotifications ?? []).some((n) => {
        const metadata = n.metadata as { recommendation_id?: string; days_since_creation?: number } | null
        return metadata?.recommendation_id === rec.id && 
               metadata?.days_since_creation !== undefined && 
               metadata.days_since_creation >= 14
      })

      // 7일 리마인더 (7일 이상 14일 미만, 아직 7일 리마인더를 받지 않음)
      if (daysSinceCreation >= 7 && daysSinceCreation < 14 && !hasSevenDayReminder) {
        sevenDayRecommendations.push(rec)
      }
      
      // 14일 리마인더 (14일 이상, 아직 14일 리마인더를 받지 않음)
      if (daysSinceCreation >= 14 && !hasFourteenDayReminder) {
        fourteenDayRecommendations.push(rec)
      }
    }

    const newRecommendations = [...sevenDayRecommendations, ...fourteenDayRecommendations]

    if (newRecommendations.length === 0) {
      console.log("[Cron] All recommendations already have notifications")
      return NextResponse.json({ processed: recommendations.length, created: 0 })
    }

    // 알림 생성 및 이메일 발송
    const notifications = []
    let emailSentCount = 0

    for (const rec of newRecommendations) {
      const consultation = Array.isArray(rec.consultations) 
        ? rec.consultations[0] 
        : rec.consultations
      const product = Array.isArray(rec.products) 
        ? rec.products[0] 
        : rec.products

      const userEmail = (consultation as any)?.users?.email
      const productName = product?.name ?? "추천받은 보조기기"
      const evaluationLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://link-able.vercel.app"}/dashboard?evaluate=${rec.id}`

      // 생성일로부터 경과 일수 계산
      const createdAt = new Date(rec.created_at)
      const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      // 인앱 알림 생성 (7일 또는 14일에 따라 메시지 변경)
      const isSevenDayReminder = daysSinceCreation >= 7 && daysSinceCreation < 14
      const reminderType = isSevenDayReminder ? "ippa_reminder_7days" : "ippa_reminder"
      const reminderTitle = isSevenDayReminder 
        ? "보조기기 사용 후 평가를 진행해 주세요 (1주일)" 
        : "보조기기 사용 후 평가를 진행해 주세요 (2주일)"
      const reminderMessage = isSevenDayReminder
        ? `${productName}을(를) 사용하신 지 1주일이 지났습니다. 사용 경험을 공유해 주시면 더 나은 추천을 제공하는 데 도움이 됩니다.`
        : `${productName}을(를) 사용하신 지 2주가 지났습니다. 사용 경험을 공유해 주시면 더 나은 추천을 제공하는 데 도움이 됩니다.`

      notifications.push({
        user_id: consultation?.user_id,
        type: reminderType,
        title: reminderTitle,
        message: reminderMessage,
        link_url: `/dashboard?evaluate=${rec.id}`,
        metadata: {
          recommendation_id: rec.id,
          consultation_id: rec.consultation_id,
          product_id: rec.product_id,
          days_since_creation: daysSinceCreation,
        },
        is_read: false,
      })

      // 이메일 발송 (이메일 주소가 있는 경우)
      if (userEmail) {
        const emailHtml = generateIppaReminderEmail(productName, evaluationLink)
        const emailSent = await sendEmail({
          to: userEmail,
          subject: "[LinkAble] 보조기기 사용 후 평가 요청",
          html: emailHtml,
        })
        if (emailSent) {
          emailSentCount++
          console.log(`[Cron] 이메일 발송 성공: ${userEmail} (recommendation_id: ${rec.id})`)
        }
      }
    }

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
        emails_sent: emailSentCount,
      },
    })

    return NextResponse.json({
      processed: recommendations.length,
      created: insertedNotifications?.length ?? 0,
      emails_sent: emailSentCount,
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

