import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { accurateMatch } from "@/core/matching/hybrid-matcher"
import { savePrecomputedMapping } from "@/lib/matching/precomputed-mappings"
import { logEvent } from "@/lib/logging"

const mapReasonToStatus = (
  reason: "not_authenticated" | "insufficient_permissions" | "error"
) => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * POST /api/admin/matching/precompute-mappings
 * 
 * 자주 사용되는 ICF 조합에 대한 사전 계산된 매핑을 생성합니다.
 * 
 * Request body:
 * - icf_combinations: ICF 코드 조합 배열 (선택적, 없으면 자동으로 자주 사용되는 조합 조회)
 * - limit: 생성할 매핑 개수 (기본 100)
 */
export async function POST(request: NextRequest) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { icf_combinations, limit = 100 } = body

    const supabase = getSupabaseServerClient()

    // ICF 조합 목록 가져오기
    let combinationsToProcess: string[][] = []

    if (icf_combinations && Array.isArray(icf_combinations)) {
      // 사용자가 직접 제공한 조합 사용
      combinationsToProcess = icf_combinations.map((combo: string | string[]) =>
        Array.isArray(combo) ? combo : [combo]
      )
    } else {
      // 자주 사용되는 ICF 조합 자동 조회
      const { data: frequentCombinations, error: queryError } = await supabase
        .from("consultation_icf_codes")
        .select("consultation_id, icf_codes!icf_code_id(code)")
        .limit(limit * 10) // 더 많이 가져와서 그룹화

      if (queryError) {
        console.error("[Precompute] Query error:", queryError)
        return NextResponse.json(
          { error: "ICF 조합 조회 실패" },
          { status: 500 }
        )
      }

      // 상담별로 ICF 코드 그룹화
      const consultationGroups = new Map<string, string[]>()
      for (const item of frequentCombinations || []) {
        const consultationId = item.consultation_id
        const code = (item.icf_codes as any)?.code
        if (code) {
          if (!consultationGroups.has(consultationId)) {
            consultationGroups.set(consultationId, [])
          }
          consultationGroups.get(consultationId)!.push(code)
        }
      }

      // 조합별 사용 빈도 계산
      const combinationFrequency = new Map<string, number>()
      for (const codes of consultationGroups.values()) {
        const key = [...codes].sort().join(",")
        combinationFrequency.set(key, (combinationFrequency.get(key) || 0) + 1)
      }

      // 빈도순으로 정렬하여 상위 조합 선택
      const sortedCombinations = Array.from(combinationFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key]) => key.split(","))

      combinationsToProcess = sortedCombinations
    }

    console.log(
      `[Precompute] Processing ${combinationsToProcess.length} ICF combinations`
    )

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ combination: string[]; error: string }> = []

    // 각 조합에 대해 매핑 계산 및 저장
    for (const icfCodes of combinationsToProcess) {
      try {
        // 정확한 매칭 수행
        const matches = await accurateMatch({
          icfCodes,
          analysisSummary: undefined,
        })

        if (matches.length > 0) {
          // 사전 계산된 매핑 저장
          await savePrecomputedMapping(
            icfCodes,
            matches.slice(0, 10), // 상위 10개만 저장
            "hybrid",
            matches[0].score // 신뢰도는 최고 점수 사용
          )
          successCount++
        } else {
          // 매칭 결과가 없으면 스킵
          console.log(
            `[Precompute] No matches found for: ${icfCodes.join(",")}`
          )
        }
      } catch (error) {
        errorCount++
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push({
          combination: icfCodes,
          error: errorMessage,
        })
        console.error(
          `[Precompute] Error processing ${icfCodes.join(",")}:`,
          error
        )
      }
    }

    logEvent({
      category: "matching",
      action: "precompute_mappings_completed",
      payload: {
        total: combinationsToProcess.length,
        success: successCount,
        errors: errorCount,
      },
    })

    return NextResponse.json({
      success: true,
      total: combinationsToProcess.length,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.slice(0, 10), // 최대 10개 에러만 반환
      message: `${successCount}개 매핑이 사전 계산되어 저장되었습니다.`,
    })
  } catch (error) {
    console.error("[Precompute] Unexpected error:", error)
    logEvent({
      category: "matching",
      action: "precompute_mappings_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/matching/precompute-mappings
 * 
 * 사전 계산된 매핑 통계 조회
 */
export async function GET(request: NextRequest) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    )
  }

  try {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from("icf_iso_precomputed_mappings")
      .select("id, icf_codes_key, usage_count, success_rate, confidence_score, match_method, created_at, last_used_at")
      .order("usage_count", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[Precompute] Query error:", error)
      return NextResponse.json(
        { error: "매핑 통계 조회 실패" },
        { status: 500 }
      )
    }

    // 전체 통계 계산
    const { count: totalCount } = await supabase
      .from("icf_iso_precomputed_mappings")
      .select("*", { count: "exact", head: true })

    const totalUsage = (data || []).reduce(
      (sum, item) => sum + (item.usage_count || 0),
      0
    )
    const avgConfidence =
      (data || []).reduce(
        (sum, item) => sum + (item.confidence_score || 0),
        0
      ) / (data?.length || 1)

    return NextResponse.json({
      success: true,
      total_count: totalCount || 0,
      total_usage: totalUsage,
      avg_confidence: avgConfidence,
      mappings: data || [],
    })
  } catch (error) {
    console.error("[Precompute] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
