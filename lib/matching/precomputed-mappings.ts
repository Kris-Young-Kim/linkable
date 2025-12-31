/**
 * 사전 계산된 ICF-ISO 매핑 조회 및 저장
 * 
 * 자주 사용되는 ICF 조합에 대한 사전 계산된 매핑을 저장하고 조회하여
 * 성능 향상 및 일관성을 보장합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import type { IsoMatch } from "@/core/matching/iso-mapping"

/**
 * ICF 코드 배열을 정규화하여 키 생성
 */
function normalizeIcfCodes(icfCodes: string[]): string[] {
  return [...icfCodes]
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)
    .sort()
}

function createIcfKey(icfCodes: string[]): string {
  return normalizeIcfCodes(icfCodes).join(",")
}

/**
 * 사전 계산된 매핑 조회
 * 
 * @param icfCodes ICF 코드 배열
 * @returns 사전 계산된 ISO 매칭 결과 또는 null
 */
export async function getPrecomputedMapping(
  icfCodes: string[]
): Promise<IsoMatch[] | null> {
  if (!icfCodes || icfCodes.length === 0) {
    return null
  }

  try {
    const supabase = getSupabaseServerClient()
    const icfKey = createIcfKey(icfCodes)

    const { data, error } = await supabase
      .from("icf_iso_precomputed_mappings")
      .select("iso_matches, confidence_score, match_method")
      .eq("icf_codes_key", icfKey)
      .maybeSingle()

    if (error) {
      console.error("[Precomputed Mappings] Query error:", error)
      return null
    }

    if (!data) {
      return null
    }

    // 사용 통계 업데이트 (비동기, 에러 무시)
    Promise.resolve(
      supabase
        .from("icf_iso_precomputed_mappings")
        .update({ last_used_at: new Date().toISOString() })
        .eq("icf_codes_key", icfKey)
    )
      .then(() => {
        // 사용 횟수 증가는 트리거에서 처리
      })
      .catch(() => {
        // 에러 무시
      })

    // JSONB를 IsoMatch 배열로 변환
    const isoMatches = data.iso_matches as IsoMatch[]

    logEvent({
      category: "matching",
      action: "precomputed_mapping_hit",
      payload: {
        icfCodes,
        icfKey,
        matchCount: isoMatches.length,
        confidenceScore: data.confidence_score,
        matchMethod: data.match_method,
      },
    })

    return isoMatches
  } catch (error) {
    console.error("[Precomputed Mappings] Get error:", error)
    return null
  }
}

/**
 * 사전 계산된 매핑 저장
 * 
 * @param icfCodes ICF 코드 배열
 * @param isoMatches ISO 매칭 결과
 * @param matchMethod 매칭 방법
 * @param confidenceScore 신뢰도 점수
 */
export async function savePrecomputedMapping(
  icfCodes: string[],
  isoMatches: IsoMatch[],
  matchMethod: "rule" | "semantic" | "hybrid" | "knowledge_graph" = "hybrid",
  confidenceScore: number = 0.8
): Promise<void> {
  if (!icfCodes || icfCodes.length === 0 || !isoMatches || isoMatches.length === 0) {
    return
  }

  try {
    const supabase = getSupabaseServerClient()
    const icfKey = createIcfKey(icfCodes)
    const normalizedCodes = normalizeIcfCodes(icfCodes)

    const { error } = await supabase
      .from("icf_iso_precomputed_mappings")
      .upsert(
        {
          icf_codes: normalizedCodes,
          icf_codes_key: icfKey,
          iso_matches: isoMatches,
          match_method: matchMethod,
          confidence_score: confidenceScore,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "icf_codes_key",
          ignoreDuplicates: false,
        }
      )

    if (error) {
      console.error("[Precomputed Mappings] Save error:", error)
      logEvent({
        category: "matching",
        action: "precomputed_mapping_save_error",
        payload: { error: error.message, icfCodes, icfKey },
        level: "error",
      })
      return
    }

    logEvent({
      category: "matching",
      action: "precomputed_mapping_saved",
      payload: {
        icfCodes,
        icfKey,
        matchCount: isoMatches.length,
        matchMethod,
        confidenceScore,
      },
    })
  } catch (error) {
    console.error("[Precomputed Mappings] Save failed:", error)
  }
}

/**
 * 자주 사용되는 ICF 조합 조회 (사전 계산 우선순위 결정용)
 * 
 * @param limit 조회할 개수
 * @returns 자주 사용되는 ICF 조합 목록
 */
export async function getFrequentlyUsedIcfCombinations(
  limit: number = 100
): Promise<Array<{ icf_codes: string[]; usage_count: number }>> {
  try {
    const supabase = getSupabaseServerClient()

    // consultation_icf_codes에서 자주 사용되는 조합 조회
    let data: any = null
    let error: any = null

    try {
      const result = await supabase.rpc("get_frequently_used_icf_combinations", { p_limit: limit })
      data = result.data
      error = result.error
    } catch (rpcError) {
      // RPC 함수가 없으면 직접 쿼리
      const fallbackResult = await supabase
        .from("consultation_icf_codes")
        .select("icf_code_id, consultations!inner(id)")
        .limit(limit * 10) // 더 많이 가져와서 그룹화
      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error("[Precomputed Mappings] Frequent combinations error:", error)
      return []
    }

    // 간단한 구현: 실제로는 더 정교한 집계가 필요
    return []
  } catch (error) {
    console.error("[Precomputed Mappings] Frequent combinations failed:", error)
    return []
  }
}

/**
 * 사전 계산된 매핑의 성공률 업데이트
 * 
 * @param icfCodes ICF 코드 배열
 * @param successRate 성공률 (0-1)
 */
export async function updatePrecomputedMappingSuccessRate(
  icfCodes: string[],
  successRate: number
): Promise<void> {
  if (!icfCodes || icfCodes.length === 0) {
    return
  }

  try {
    const supabase = getSupabaseServerClient()
    const icfKey = createIcfKey(icfCodes)

    const { error } = await supabase
      .from("icf_iso_precomputed_mappings")
      .update({
        success_rate: Math.max(0, Math.min(1, successRate)),
        updated_at: new Date().toISOString(),
      })
      .eq("icf_codes_key", icfKey)

    if (error) {
      console.error("[Precomputed Mappings] Update success rate error:", error)
    }
  } catch (error) {
    console.error("[Precomputed Mappings] Update success rate failed:", error)
  }
}
