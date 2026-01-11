/**
 * ICF-ISO-제품 매칭 최적화 모듈
 * 
 * PostgreSQL 함수를 사용하여 효율적인 매칭 수행
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/database.types";

type ProductMatchResult = {
  product_id: string;
  product_name: string;
  iso_code: string;
  iso_code_id: string;
  iso_label: string;
  match_score: number;
  match_reason: string;
  manufacturer: string | null;
  description: string | null;
  image_url: string | null;
  purchase_link: string | null;
  price: number | null;
  category: string | null;
  source?: "precomputed" | "computed";
};

type MatchingStats = {
  total_mappings: number;
  matched_iso_codes: number;
  matched_products: number;
  avg_score: number;
  max_score: number;
};

/**
 * ICF 코드 배열을 받아서 제품 목록을 반환 (최적화된 함수 사용)
 * 
 * @param icfCodes ICF 코드 배열
 * @param options 옵션
 * @returns 제품 매칭 결과
 */
export async function getProductsByIcfCodes(
  icfCodes: string[],
  options?: {
    limit?: number;
    minScore?: number;
    usePrecomputed?: boolean;
    supabase?: ReturnType<typeof getSupabaseServerClient>;
  }
): Promise<ProductMatchResult[]> {
  const {
    limit = 20,
    minScore = 0.4,
    usePrecomputed = true,
    supabase,
  } = options || {};

  if (icfCodes.length === 0) {
    return [];
  }

  const client = supabase || getSupabaseServerClient();

  try {
    // 정규화된 ICF 코드 배열 (소문자 변환, 중복 제거)
    const normalizedIcfCodes = Array.from(
      new Set(icfCodes.map((code) => code.trim().toLowerCase()))
    ).filter(Boolean);

    console.log(
      `[ICF Product Matcher] 매칭 시작: ICF 코드 ${normalizedIcfCodes.length}개`,
      { codes: normalizedIcfCodes, limit, minScore, usePrecomputed }
    );

    // PostgreSQL 함수 호출
    const { data, error } = await client.rpc(
      "get_products_by_icf_codes_with_cache",
      {
        p_icf_codes: normalizedIcfCodes,
        p_limit: limit,
        p_min_score: minScore,
        p_use_precomputed: usePrecomputed,
      }
    );

    if (error) {
      console.error("[ICF Product Matcher] 함수 호출 오류:", error);
      throw error;
    }

    console.log(
      `[ICF Product Matcher] 매칭 완료: ${data?.length || 0}개 제품 발견`
    );

    return (data as ProductMatchResult[]) || [];
  } catch (error) {
    console.error("[ICF Product Matcher] 오류:", error);
    throw error;
  }
}

/**
 * ICF 코드 매칭 통계 조회
 * 
 * @param icfCodes ICF 코드 배열
 * @returns 매칭 통계
 */
export async function getIcfMatchingStats(
  icfCodes: string[],
  supabase?: ReturnType<typeof getSupabaseServerClient>
): Promise<MatchingStats | null> {
  if (icfCodes.length === 0) {
    return null;
  }

  const client = supabase || getSupabaseServerClient();

  try {
    const normalizedIcfCodes = Array.from(
      new Set(icfCodes.map((code) => code.trim().toLowerCase()))
    ).filter(Boolean);

    const { data, error } = await client.rpc("get_icf_iso_matching_stats", {
      p_icf_codes: normalizedIcfCodes,
    });

    if (error) {
      console.error("[ICF Matching Stats] 오류:", error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0] as MatchingStats;
    }

    return null;
  } catch (error) {
    console.error("[ICF Matching Stats] 예외:", error);
    return null;
  }
}

/**
 * Materialized View 갱신 (관리자 전용)
 * 
 * @param supabase Supabase 클라이언트
 */
export async function refreshIcfProductMatchesView(
  supabase?: ReturnType<typeof getSupabaseServerClient>
): Promise<void> {
  const client = supabase || getSupabaseServerClient();

  try {
    const { error } = await client.rpc("refresh_materialized_view", {
      view_name: "mv_icf_iso_product_matches",
    });

    if (error) {
      console.error("[Refresh View] 오류:", error);
      throw error;
    }

    console.log("[Refresh View] Materialized View 갱신 완료");
  } catch (error) {
    console.error("[Refresh View] 예외:", error);
    throw error;
  }
}
