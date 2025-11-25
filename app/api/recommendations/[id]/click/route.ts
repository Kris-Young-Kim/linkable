import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

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

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@linkable.local`
  const name = user?.fullName ?? user?.username ?? "LinkAble User"

  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name,
    })
    .select("id")
    .single()

  if (insertError) {
    throw insertError
  }

  logEvent({ category: "system", action: "user_created", payload: { clerkUserId } })

  return insertData.id
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const recommendationId = params.id
  if (!recommendationId) {
    return NextResponse.json({ error: "Recommendation id is required" }, { status: 400 })
  }

  const { source } = (await request.json().catch(() => ({}))) as { source?: string }

  try {
    const supabaseUserId = await ensureUserRecord(userId)

    const { data: recommendation, error: recommendationError } = await supabase
      .from("recommendations")
      .select("id, consultation_id, is_clicked")
      .eq("id", recommendationId)
      .single()

    if (recommendationError || !recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("id", recommendation.consultation_id)
      .single()

    if (consultationError || !consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    if (consultation.user_id !== supabaseUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!recommendation.is_clicked) {
      const { error: updateError } = await supabase
        .from("recommendations")
        .update({ is_clicked: true })
        .eq("id", recommendationId)

      if (updateError) {
        logEvent({
          category: "matching",
          action: "recommendation_click_update_error",
          payload: { error: updateError, recommendationId },
          level: "error",
        })
        return NextResponse.json({ error: "Failed to record click" }, { status: 500 })
      }

      logEvent({
        category: "matching",
        action: "recommendation_clicked",
        payload: { recommendationId, source: source ?? "unknown" },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logEvent({
      category: "matching",
      action: "recommendation_click_error",
      payload: { error, recommendationId },
      level: "error",
    })
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}

