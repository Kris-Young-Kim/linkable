import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role } = (await request.json()) as { role?: string }

    if (!role || !["user", "manager", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'user', 'manager', or 'admin'" },
        { status: 400 }
      )
    }

    // 1. Clerk 메타데이터에 role 저장
    try {
      const clerkClientInstance = await clerkClient()
      await clerkClientInstance.users.updateUserMetadata(userId, {
        publicMetadata: {
          role,
        },
      })

      console.log(`[Role API] Clerk metadata updated for user ${userId}: role=${role}`)
    } catch (clerkError) {
      console.error("[Role API] Clerk metadata update error:", clerkError)
      // Clerk 업데이트 실패해도 Supabase는 업데이트 시도
    }

    // 2. Supabase users 테이블에 role 저장/업데이트
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, role")
      .eq("clerk_id", userId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[Role API] Supabase fetch error:", fetchError)
      throw fetchError
    }

    if (existingUser) {
      // 기존 사용자: role 업데이트
      const { error: updateError } = await supabase
        .from("users")
        .update({ role })
        .eq("clerk_id", userId)

      if (updateError) {
        console.error("[Role API] Supabase update error:", updateError)
        throw updateError
      }

      console.log(`[Role API] Supabase user role updated: ${existingUser.id} -> ${role}`)
    } else {
      // 신규 사용자: 사용자 레코드 생성 (role 포함)
      const user = await currentUser()
      const email =
        user?.primaryEmailAddress?.emailAddress ??
        user?.emailAddresses?.[0]?.emailAddress ??
        `${userId}@linkable.local`
      const name = user?.fullName ?? user?.username ?? "LinkAble User"

      const { data: insertData, error: insertError } = await supabase
        .from("users")
        .insert({
          clerk_id: userId,
          email,
          name,
          role,
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("[Role API] Supabase insert error:", insertError)
        throw insertError
      }

      console.log(`[Role API] Supabase user created with role: ${insertData.id} -> ${role}`)
    }

    // 3. 로그 기록
    logEvent({
      category: "system",
      action: "role_set",
      payload: { userId, role },
    })

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error("[Role API] Unexpected error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to save role"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// 현재 사용자의 role 조회
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Supabase에서 role 조회
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("clerk_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[Role API] Supabase fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 })
    }

    const role = data?.role || "user" // 기본값: user

    return NextResponse.json({ role })
  } catch (error) {
    console.error("[Role API] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 })
  }
}

