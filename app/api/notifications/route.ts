import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const supabase = getSupabaseServerClient()

const isMissingNotificationTable = (error: unknown) => {
  if (!error || typeof error !== "object") return false
  const { code, message } = error as { code?: string; message?: string }
  return code === "PGRST205" || message?.includes("notifications")
}

/**
 * 알림 조회 API
 * GET /api/notifications
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 사용자 ID 조회
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    if (userError || !userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 읽지 않은 알림만 조회 (또는 최근 50개)
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = Number(searchParams.get("limit")) || 50

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userRow.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data, error } = await query

    if (error) {
      if (isMissingNotificationTable(error)) {
        console.warn(
          "[Notifications] Table missing. Apply supabase/migrations/20241126100000_create_notifications_table.sql",
        )
        return NextResponse.json({ notifications: [], setupRequired: true })
      }

      console.error("[Notifications] Fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    return NextResponse.json({ notifications: data ?? [] })
  } catch (error) {
    console.error("[Notifications] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * 알림 읽음 처리 API
 * PATCH /api/notifications
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { notificationId: string; isRead?: boolean }

    if (!body.notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 })
    }

    // 사용자 ID 조회
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    if (userError || !userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 알림 업데이트
    const updateData: { is_read: boolean; read_at?: string } = {
      is_read: body.isRead ?? true,
    }

    if (updateData.is_read) {
      updateData.read_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", body.notificationId)
      .eq("user_id", userRow.id) // 본인 알림만 수정 가능

    if (updateError) {
      if (isMissingNotificationTable(updateError)) {
        console.warn(
          "[Notifications] Table missing during update. Apply supabase/migrations/20241126100000_create_notifications_table.sql",
        )
        return NextResponse.json(
          { error: "Notifications table missing", setupRequired: true },
          { status: 503 },
        )
      }

      console.error("[Notifications] Update error:", updateError)
      return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Notifications] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

