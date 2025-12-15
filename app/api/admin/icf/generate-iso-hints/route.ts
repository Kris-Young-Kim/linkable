import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { generateIsoHintsForIcfCode } from "@/lib/icf-iso-generator"
import { logEvent } from "@/lib/logging"

/**
 * AI 기반 ISO 매핑 힌트 생성 API
 * POST /api/admin/icf/generate-iso-hints
 */
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
    const { code } = body

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "ICF 코드가 필요합니다" },
        { status: 400 }
      )
    }

    // 통계 데이터 조회
    const { getSupabaseServerClient } = await import("@/lib/supabase/server")
    const supabase = getSupabaseServerClient()
    const { data: stats } = await supabase
      .from("icf_code_statistics")
      .select("*")
      .eq("icf_code", code.toUpperCase())
      .maybeSingle()

    // AI 기반 ISO 힌트 생성
    const isoHints = await generateIsoHintsForIcfCode(code, stats || undefined)

    logEvent({
      category: "system",
      action: "icf_iso_hints_generated_manual",
      payload: { code, isoHints, userId },
      level: "info",
    })

    return NextResponse.json({
      success: true,
      code: code.toUpperCase(),
      isoCodes: isoHints,
      count: isoHints.length,
    })
  } catch (error) {
    console.error("[ICF ISO Hints] Generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ISO 힌트 생성에 실패했습니다" },
      { status: 500 }
    )
  }
}

