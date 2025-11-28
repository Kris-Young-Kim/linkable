import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

async function ensureUserRecord(clerkUserId: string) {
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

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@linkable.local`

  const fullName = user?.fullName ?? user?.username ?? null
  const role = (user?.publicMetadata?.role as string) || "user"

  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name: fullName,
      role,
    })
    .select("id")
    .single()

  if (insertError) {
    throw insertError
  }

  logEvent({
    category: "system",
    action: "user_created",
    payload: { clerkUserId },
  })

  return insertData.id
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  const userRowId = await ensureUserRecord(userId)

  const { data: recommendation, error: recommendationError } = await supabase
    .from("recommendations")
    .select("id, consultation_id")
    .eq("id", id)
    .maybeSingle()

  if (recommendationError || !recommendation) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
  }

  const { data: consultation, error: consultationError } = await supabase
    .from("consultations")
    .select("id, user_id")
    .eq("id", recommendation.consultation_id as string)
    .maybeSingle()

  if (consultationError || !consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
  }

  if (consultation.user_id !== userRowId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error: deleteError } = await supabase.from("recommendations").delete().eq("id", id)

  if (deleteError) {
    logEvent({
      category: "recommendation",
      action: "delete_error",
      payload: { error: deleteError, recommendationId: id },
      level: "error",
    })
    return NextResponse.json({ error: "Failed to delete recommendation" }, { status: 500 })
  }

  logEvent({
    category: "recommendation",
    action: "deleted",
    payload: { recommendationId: id, consultationId: recommendation.consultation_id, userId },
  })

  return NextResponse.json({ success: true })
}


