import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { generateIsoHintsForIcfCode } from "@/lib/icf-iso-generator"

/**
 * 자동 확장 워크플로우 실행 API
 * POST /api/admin/icf/auto-expand
 * 
 * 우선순위 점수가 임계값을 넘는 ICF 코드를 자동으로 Core Set에 추가합니다.
 * 이 API는 스케줄러/크론에서 주기적으로 호출됩니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 토큰 확인 (스케줄러에서 호출 시)
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.AUTO_EXPAND_SECRET_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServerClient()

    // 자동 확장 설정 조회
    const { data: config, error: configError } = await supabase
      .from("icf_auto_expand_config")
      .select("*")
      .single()

    if (configError || !config) {
      console.error("[Auto Expand] Config fetch error:", configError)
      return NextResponse.json(
        { error: "자동 확장 설정을 불러올 수 없습니다" },
        { status: 500 }
      )
    }

    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        message: "자동 확장이 비활성화되어 있습니다",
        expandedCount: 0,
      })
    }

    const threshold = Number(config.threshold || 20)

    // 우선순위 점수가 임계값 이상인 코드 조회
    const { data: expansionData, error: expansionError } = await supabase
      .from("icf_code_expansion_priority")
      .select("*")
      .gte("priority_score", threshold)
      .order("priority_score", { ascending: false })
      .limit(50) // 한 번에 최대 50개까지

    if (expansionError) {
      console.error("[Auto Expand] Expansion data fetch error:", expansionError)
      return NextResponse.json(
        { error: "확장 대상 코드를 불러올 수 없습니다" },
        { status: 500 }
      )
    }

    if (!expansionData || expansionData.length === 0) {
      // 마지막 실행 시간 업데이트
      await supabase
        .from("icf_auto_expand_config")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", config.id)

      return NextResponse.json({
        success: true,
        message: "확장할 코드가 없습니다",
        expandedCount: 0,
      })
    }

    // 통계 데이터 조회
    const codes = expansionData.map((item) => item.icf_code)
    const { data: statistics } = await supabase
      .from("icf_code_statistics")
      .select("*")
      .in("icf_code", codes)

    const statsMap = new Map(
      (statistics || []).map((stat) => [stat.icf_code, stat])
    )

    const expandedCodes: string[] = []
    const errors: Array<{ code: string; error: string }> = []

    // 각 코드를 Core Set에 추가
    for (const item of expansionData) {
      try {
        const code = item.icf_code
        const stats = statsMap.get(code)

        // ISO 힌트 생성
        const isoHints = await generateIsoHintsForIcfCode(code, stats || undefined)

        // 확장 이벤트 기록
        const { error: logError } = await supabase
          .from("icf_code_expansions")
          .insert({
            icf_code: code,
            expanded_by: "auto_expand_workflow",
            iso_hints: isoHints,
            notes: `자동 확장 (우선순위 점수: ${item.priority_score.toFixed(2)})`,
          })

        if (logError) {
          console.error(`[Auto Expand] Failed to log expansion for ${code}:`, logError)
          errors.push({ code, error: "로그 기록 실패" })
          continue
        }

        expandedCodes.push(code)

        logEvent({
          category: "system",
          action: "icf_code_auto_expanded",
          payload: {
            code,
            priorityScore: item.priority_score,
            isoHints,
          },
          level: "info",
        })
      } catch (error) {
        console.error(`[Auto Expand] Failed to expand ${item.icf_code}:`, error)
        errors.push({
          code: item.icf_code,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        })
      }
    }

    // 마지막 실행 시간 업데이트
    await supabase
      .from("icf_auto_expand_config")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", config.id)

    return NextResponse.json({
      success: true,
      expandedCount: expandedCodes.length,
      expandedCodes,
      errors: errors.length > 0 ? errors : undefined,
      message: `${expandedCodes.length}개 코드가 자동으로 확장되었습니다.`,
    })
  } catch (error) {
    console.error("[Auto Expand] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

