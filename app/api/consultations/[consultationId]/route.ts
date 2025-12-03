import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

async function ensureUserRecord(clerkUserId: string) {
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

  return null
}

async function verifyOwnership(consultationId: string, userRowId: string) {
  const { data, error } = await supabase
    .from("consultations")
    .select("id, user_id")
    .eq("id", consultationId)
    .single()

  if (error || !data) {
    return false
  }

  return data.user_id === userRowId
}

// PATCH: 상담 수정 (제목, 상태)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ consultationId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { consultationId } = await context.params
  const userRowId = await ensureUserRecord(userId)

  if (!userRowId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // 소유권 확인
  const isOwner = await verifyOwnership(consultationId, userRowId)
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    status?: "in_progress" | "completed" | "archived"
  }

  // 업데이트할 필드만 포함
  const updateData: { title?: string; status?: string; updated_at?: string } = {}
  if (body.title !== undefined) {
    updateData.title = body.title
  }
  if (body.status !== undefined) {
    if (!["in_progress", "completed", "archived"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    updateData.status = body.status
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("consultations")
    .update(updateData)
    .eq("id", consultationId)
    .eq("user_id", userRowId)
    .select("*")
    .single()

  if (error) {
    logEvent({
      category: "consultation",
      action: "update_error",
      payload: { error, consultationId },
      level: "error",
    })
    return NextResponse.json({ error: "Failed to update consultation" }, { status: 500 })
  }

  logEvent({
    category: "consultation",
    action: "updated",
    payload: { userId, consultationId, updatedFields: Object.keys(updateData) },
  })

  return NextResponse.json({ consultation: data })
}

// DELETE: 상담 삭제
export async function DELETE(
  request: Request,
  context: { params: Promise<{ consultationId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { consultationId } = await context.params
  const userRowId = await ensureUserRecord(userId)

  if (!userRowId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // 소유권 확인
  const isOwner = await verifyOwnership(consultationId, userRowId)
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // CASCADE로 인해 관련 데이터(chat_messages, analysis_results, recommendations)도 자동 삭제됨
  const { error } = await supabase
    .from("consultations")
    .delete()
    .eq("id", consultationId)
    .eq("user_id", userRowId)

  if (error) {
    logEvent({
      category: "consultation",
      action: "delete_error",
      payload: { error, consultationId },
      level: "error",
    })
    return NextResponse.json({ error: "Failed to delete consultation" }, { status: 500 })
  }

  logEvent({
    category: "consultation",
    action: "deleted",
    payload: { userId, consultationId },
  })

  return NextResponse.json({ success: true }, { status: 200 })
}

