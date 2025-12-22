/**
 * 하이브리드 매칭 가중치 설정 로더
 * 
 * 데이터베이스에서 가중치 설정을 로드하고 A/B 테스트를 수행합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface MatchingWeightConfig {
  id: string;
  name: string;
  description?: string;
  weight_rule_based: number;
  weight_semantic: number;
  weight_knowledge_graph: number;
  weight_keyword: number;
  min_score: number;
  top_k: number;
  similarity_threshold: number;
  is_ab_test_variant: boolean;
  ab_test_name?: string;
  ab_test_traffic_percentage: number;
}

/**
 * 활성화된 가중치 설정 로드
 */
export async function loadActiveWeightConfig(): Promise<MatchingWeightConfig | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("matching_weight_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[Matching Weight Loader] Error loading active config:", error);
      return null;
    }

    return data as MatchingWeightConfig | null;
  } catch (error) {
    console.error("[Matching Weight Loader] Failed to load config:", error);
    return null;
  }
}

/**
 * 기본 가중치 설정 로드
 */
export async function loadDefaultWeightConfig(): Promise<MatchingWeightConfig | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("matching_weight_configs")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();

    if (error) {
      console.error("[Matching Weight Loader] Error loading default config:", error);
      return null;
    }

    return data as MatchingWeightConfig | null;
  } catch (error) {
    console.error("[Matching Weight Loader] Failed to load default config:", error);
    return null;
  }
}

/**
 * A/B 테스트를 위한 가중치 설정 선택
 * 
 * @param userId 사용자 ID (일관된 A/B 테스트를 위해)
 * @param abTestName A/B 테스트 이름
 * @returns 선택된 가중치 설정
 */
export async function selectABTestVariant(
  userId?: string,
  abTestName?: string
): Promise<MatchingWeightConfig | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    if (!abTestName) {
      // A/B 테스트 이름이 없으면 기본 설정 반환
      return await loadDefaultWeightConfig();
    }

    // A/B 테스트 변형들 조회
    const { data: variants, error } = await supabase
      .from("matching_weight_configs")
      .select("*")
      .eq("is_ab_test_variant", true)
      .eq("ab_test_name", abTestName)
      .order("created_at", { ascending: true });

    if (error || !variants || variants.length === 0) {
      console.warn(`[Matching Weight Loader] No AB test variants found for: ${abTestName}`);
      return await loadDefaultWeightConfig();
    }

    // 사용자 ID 기반 일관된 선택 (해시 기반)
    let selectedVariant: MatchingWeightConfig | null = null;
    
    if (userId) {
      // 사용자 ID를 해시하여 일관된 변형 선택
      const hash = simpleHash(userId);
      let cumulativePercentage = 0;
      
      for (const variant of variants) {
        cumulativePercentage += variant.ab_test_traffic_percentage;
        if (hash % 100 < cumulativePercentage) {
          selectedVariant = variant as MatchingWeightConfig;
          break;
        }
      }
    } else {
      // 사용자 ID가 없으면 첫 번째 변형 선택
      selectedVariant = variants[0] as MatchingWeightConfig;
    }

    // 선택된 변형이 없으면 기본 설정 반환
    return selectedVariant || await loadDefaultWeightConfig();
  } catch (error) {
    console.error("[Matching Weight Loader] Failed to select AB test variant:", error);
    return await loadDefaultWeightConfig();
  }
}

/**
 * 간단한 해시 함수 (일관된 A/B 테스트를 위해)
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * 가중치 설정을 HybridMatchConfig로 변환
 */
export function convertToHybridMatchConfig(
  config: MatchingWeightConfig
): {
  weights: {
    ruleBased: number;
    semantic: number;
    knowledgeGraph: number;
    keyword: number;
  };
  minScore: number;
  topK: number;
  similarityThreshold: number;
} {
  return {
    weights: {
      ruleBased: Number(config.weight_rule_based),
      semantic: Number(config.weight_semantic),
      knowledgeGraph: Number(config.weight_knowledge_graph),
      keyword: Number(config.weight_keyword),
    },
    minScore: Number(config.min_score),
    topK: config.top_k,
    similarityThreshold: Number(config.similarity_threshold),
  };
}

