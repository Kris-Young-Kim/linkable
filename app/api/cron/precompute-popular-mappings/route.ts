import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { accurateMatch } from "@/core/matching/hybrid-matcher"
import { savePrecomputedMapping } from "@/lib/matching/precomputed-mappings"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

/**
 * 인기 ICF 조합 사전 계산 Cron Job
 * 
 * Vercel Cron에서 주간 실행 (예: 매주 월요일 새벽 3시)
 * 
 * 기능:
 * - 자주 사용되는 ICF 조합을 자동으로 사전 계산
 * - 매핑 결과를 캐시에 저장하여 성능 향상
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron Precompute] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron Precompute] Starting popular ICF combinations precomputation...")

    // 최근 30일간 자주 사용된 ICF 조합 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: consultations, error: consultationsError } = await supabase
      .from("consultations")
      .select("id")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(1000)

    if (consultationsError) {
      console.error("[Cron Precompute] Consultations query error:", consultationsError)
      return NextResponse.json(
        { error: "Failed to fetch consultations" },
        { status: 500 }
      )
    }

    const consultationIds = (consultations || []).map((c) => c.id)

    if (consultationIds.length === 0) {
      console.log("[Cron Precompute] No consultations found")
      return NextResponse.json({ processed: 0, created: 0 })
    }

    // 각 상담의 ICF 코드 조회
    const { data: icfCodes, error: icfError } = await supabase
      .from("consultation_icf_codes")
      .select("consultation_id, icf_codes!icf_code_id(code)")
      .in("consultation_id", consultationIds)

    if (icfError) {
      console.error("[Cron Precompute] ICF codes query error:", icfError)
      return NextResponse.json(
        { error: "Failed to fetch ICF codes" },
        { status: 500 }
      )
    }

    // 상담별로 ICF 코드 그룹화
    const consultationGroups = new Map<string, string[]>()
    for (const item of icfCodes || []) {
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

    // 빈도순으로 정렬하여 상위 50개 조합 선택
    const topCombinations = Array.from(combinationFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([key]) => key.split(","))

    console.log(
      `[Cron Precompute] Found ${topCombinations.length} popular combinations`
    )

    // 이미 사전 계산된 매핑이 있는지 확인
    const combinationKeys = topCombinations.map((codes) => codes.sort().join(","))
    const { data: existingMappings } = await supabase
      .from("icf_iso_precomputed_mappings")
      .select("icf_codes_key")
      .in("icf_codes_key", combinationKeys)

    const existingKeys = new Set(
      (existingMappings || []).map((m) => m.icf_codes_key)
    )

    // 새로운 조합만 처리
    const newCombinations = topCombinations.filter(
      (codes) => !existingKeys.has(codes.sort().join(","))
    )

    console.log(
      `[Cron Precompute] ${newCombinations.length} new combinations to process`
    )

    let successCount = 0
    let errorCount = 0

    // 각 조합에 대해 매핑 계산 및 저장
    for (const icfCodes of newCombinations) {
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
        }
      } catch (error) {
        errorCount++
        console.error(
          `[Cron Precompute] Error processing ${icfCodes.join(",")}:`,
          error
        )
      }
    }

    logEvent({
      category: "system",
      action: "precompute_popular_mappings_completed",
      payload: {
        total: newCombinations.length,
        success: successCount,
        errors: errorCount,
      },
    })

    return NextResponse.json({
      success: true,
      processed: newCombinations.length,
      created: successCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron Precompute] Unexpected error:", error)
    logEvent({
      category: "system",
      action: "precompute_popular_mappings_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
