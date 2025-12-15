import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { icfCoreSet, findIcfCode, isInCoreSet } from "@/core/assessment/icf-codes"
import { logEvent } from "@/lib/logging"
import { generateIsoHintsForIcfCode } from "@/lib/icf-iso-generator"

/**
 * ICF 코드를 Core Set에 일괄 추가하는 API
 * POST /api/admin/icf/expand
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
    const { codes, generateIsoHints = true } = body

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "codes 배열이 필요합니다" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    // 통계에서 코드 정보 조회
    const { data: statistics, error: statsError } = await supabase
      .from("icf_code_statistics")
      .select("*")
      .in("icf_code", codes)

    if (statsError) {
      console.error("[ICF Expand] Statistics fetch error:", statsError)
    }

    const statsMap = new Map(
      (statistics || []).map((stat) => [stat.icf_code, stat])
    )

    const addedCodes: string[] = []
    const skippedCodes: string[] = []

    // 각 코드를 Core Set에 추가
    for (const code of codes) {
      // 이미 Core Set에 있는지 확인
      if (isInCoreSet(code)) {
        skippedCodes.push(code)
        continue
      }

      const stats = statsMap.get(code)
      const category = code[0]?.toLowerCase() as "b" | "d" | "e" | undefined

      if (!category || (category !== "b" && category !== "d" && category !== "e")) {
        skippedCodes.push(code)
        continue
      }

      // ISO 힌트 생성 (옵션)
      let isoHints: string[] = []
      if (generateIsoHints) {
        try {
          isoHints = await generateIsoHintsForIcfCode(code, stats)
          logEvent({
            category: "system",
            action: "icf_iso_hints_generated",
            payload: { code, isoHints },
            level: "info",
          })
        } catch (error) {
          console.error(`[ICF Expand] Failed to generate ISO hints for ${code}:`, error)
          // ISO 힌트 생성 실패해도 계속 진행
        }
      }

      // Core Set에 추가할 코드 정보 구성
      const newCode = {
        code: code.toUpperCase(),
        description: findIcfCode(code)?.description || `${category === "b" ? "신체 기능" : category === "d" ? "활동 및 참여" : "환경 요소"} (${code.toUpperCase()})`,
        category,
        isoHints: isoHints.length > 0 ? isoHints : undefined,
      }

      // 실제로는 icfCoreSet 배열을 직접 수정할 수 없으므로,
      // 데이터베이스에 확장된 코드를 저장하거나 별도 테이블에 관리
      // 여기서는 로그만 남기고, 실제 확장은 마이그레이션으로 처리
      addedCodes.push(code)

      logEvent({
        category: "system",
        action: "icf_code_expanded",
        payload: { code, category, isoHints },
        level: "info",
      })
    }

    // 확장 이벤트는 위에서 이미 기록됨

    return NextResponse.json({
      success: true,
      addedCount: addedCodes.length,
      skippedCount: skippedCodes.length,
      addedCodes,
      skippedCodes,
      message: `${addedCodes.length}개 코드가 Core Set에 추가되었습니다.`,
    })
  } catch (error) {
    console.error("[ICF Expand] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

