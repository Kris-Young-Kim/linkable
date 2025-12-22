/**
 * 벡터 검색 성능 로깅 유틸리티
 * 
 * 벡터 검색 성능을 측정하고 로깅합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface VectorSearchLogData {
  consultationId?: string;
  queryText: string;
  queryIcfCodes: string[];
  thresholdUsed: number;
  thresholdConfigId?: string;
  resultsCount: number;
  avgSimilarity?: number;
  maxSimilarity?: number;
  minSimilarity?: number;
}

/**
 * 벡터 검색 성능 로깅
 */
export async function logVectorSearchPerformance(
  data: VectorSearchLogData
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase.from("vector_search_performance_logs").insert({
      consultation_id: data.consultationId || null,
      query_text: data.queryText,
      query_icf_codes: data.queryIcfCodes,
      threshold_used: data.thresholdUsed,
      threshold_config_id: data.thresholdConfigId || null,
      results_count: data.resultsCount,
      avg_similarity: data.avgSimilarity || null,
      max_similarity: data.maxSimilarity || null,
      min_similarity: data.minSimilarity || null,
    });
    
    if (error) {
      console.error("[Vector Search Logger] Logging error:", error);
    }
  } catch (error) {
    console.error("[Vector Search Logger] Logging failed:", error);
  }
}

/**
 * 벡터 검색 결과 클릭 시 로그 업데이트
 */
export async function updateVectorSearchLogOnClick(
  consultationId: string,
  clicked: boolean = true
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    await supabase
      .from("vector_search_performance_logs")
      .update({
        top_result_clicked: clicked,
        any_result_clicked: clicked,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", consultationId)
      .is("top_result_clicked", false)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch (error) {
    console.error("[Vector Search Logger] Update failed:", error);
  }
}

/**
 * 벡터 검색 결과 구매 완료 시 로그 업데이트
 */
export async function updateVectorSearchLogOnPurchase(
  consultationId: string
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    await supabase
      .from("vector_search_performance_logs")
      .update({
        purchase_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", consultationId)
      .is("purchase_completed", false)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch (error) {
    console.error("[Vector Search Logger] Purchase update failed:", error);
  }
}

