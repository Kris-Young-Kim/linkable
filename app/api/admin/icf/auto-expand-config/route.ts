import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * 자동 확장 설정 조회/저장 API
 * GET /api/admin/icf/auto-expand-config - 조회
 * POST /api/admin/icf/auto-expand-config - 저장
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

    if (userRole !== "admin" && userRole !== "expert") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from("icf_auto_expand_config")
      .select("*")
      .single()

    if (error) {
      console.error("[Auto Expand Config] Fetch error:", error)
      return NextResponse.json(
        { error: "설정을 불러오는데 실패했습니다" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      enabled: data?.enabled || false,
      threshold: Number(data?.threshold || 20),
      lastRunAt: data?.last_run_at || null,
    })
  } catch (error) {
    console.error("[Auto Expand Config] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 관리자 권한 확인
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const userRole = clerkUser.privateMetadata?.role as string | undefined

    if (userRole !== "admin" && userRole !== "expert") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { enabled, threshold } = body

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled는 boolean이어야 합니다" },
        { status: 400 }
      )
    }

    if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
      return NextResponse.json(
        { error: "threshold는 0-100 사이의 숫자여야 합니다" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    // 기존 설정 업데이트 또는 새로 생성
    const { data: existing } = await supabase
      .from("icf_auto_expand_config")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from("icf_auto_expand_config")
        .update({
          enabled,
          threshold,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", existing.id)

      if (error) {
        console.error("[Auto Expand Config] Update error:", error)
        return NextResponse.json(
          { error: "설정 저장에 실패했습니다" },
          { status: 500 }
        )
      }
    } else {
      const { error } = await supabase
        .from("icf_auto_expand_config")
        .insert({
          enabled,
          threshold,
          updated_by: userId,
        })

      if (error) {
        console.error("[Auto Expand Config] Insert error:", error)
        return NextResponse.json(
          { error: "설정 저장에 실패했습니다" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      enabled,
      threshold,
    })
  } catch (error) {
    console.error("[Auto Expand Config] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

