import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

const ensureUserRecord = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (data?.id) {
    return data.id
  }

  if (error && error.code !== "PGRST116") {
    throw error
  }

  // 사용자가 없으면 null 반환 (비로그인 사용자 허용)
  return null
}

/**
 * POST /api/recommendations/[id]/action
 * 
 * 추천 카드의 추가 액션(지원제도, 전문가 문의) 클릭 이벤트를 로깅합니다.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params
  const { userId } = await auth()
  const recommendationId = params.id

  if (!recommendationId) {
    return NextResponse.json({ error: "Recommendation id is required" }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string }
  const action = body.action

  if (!action || !["support_program_click", "expert_inquiry_click"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  try {
    const supabaseUserId = userId ? await ensureUserRecord(userId) : null

    // 추천 정보 조회
    const { data: recommendation, error: recommendationError } = await supabase
      .from("recommendations")
      .select("id, product_id, consultation_id")
      .eq("id", recommendationId)
      .maybeSingle()

    if (recommendationError || !recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    // 전환 이벤트 로깅
    const eventType =
      action === "support_program_click" ? "support_program_click" : "expert_inquiry_click"

    await supabase.from("conversion_events").insert({
      user_id: supabaseUserId,
      event_type: eventType,
      source: action === "support_program_click" ? "support" : "expert",
      recommendation_id: recommendationId,
      product_id: recommendation.product_id,
      consultation_id: recommendation.consultation_id,
      metadata: { action },
    })

    logEvent({
      category: "matching",
      action: eventType,
      payload: { recommendationId, action },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logEvent({
      category: "matching",
      action: "recommendation_action_error",
      payload: { error, recommendationId, action },
      level: "error",
    })
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}

