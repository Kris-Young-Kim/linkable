/**
 * 벡터 스토어 유틸리티
 * 
 * Supabase pgvector를 활용한 ICF-ISO 매핑 임베딩 저장 및 검색
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createEmbedding } from "./gemini-embedding";
import { logEvent } from "@/lib/logging";

export interface IcfIsoEmbeddingRecord {
  id: string;
  icfCodes: string[];
  icfCodesText: string;
  isoCode: string;
  isoLabel: string;
  isoDescription?: string;
  embedding: number[];
  baseScore: number;
  usageCount: number;
  successRate: number;
}

export interface SimilarMatch {
  id: string;
  icfCodes: string[];
  isoCode: string;
  isoLabel: string;
  isoDescription?: string;
  similarity: number;
  baseScore: number;
  usageCount: number;
  successRate: number;
}

/**
 * ICF-ISO 매핑 임베딩 저장
 * 
 * @param icfCodes ICF 코드 배열
 * @param icfCodesText ICF 코드 설명 텍스트
 * @param isoCode ISO 코드
 * @param isoLabel ISO 라벨
 * @param isoDescription ISO 설명
 * @param baseScore 기본 점수
 * @returns 저장된 임베딩 ID
 */
export async function saveIcfIsoEmbedding(
  icfCodes: string[],
  icfCodesText: string,
  isoCode: string,
  isoLabel: string,
  isoDescription?: string,
  baseScore: number = 0.8
): Promise<string> {
  const supabase = getSupabaseServerClient();

  try {
    // 1. 임베딩 생성
    const text = `${icfCodesText}. ISO ${isoCode}: ${isoLabel}. ${isoDescription || ""}`;
    const embedding = await createEmbedding(text);

    // 2. Supabase에 저장 (중복 체크)
    // pgvector는 벡터를 배열로 직접 전달 (Supabase 클라이언트가 자동 변환)
    const { data, error } = await supabase
      .from("icf_iso_embeddings")
      .upsert(
        {
          icf_codes: icfCodes,
          icf_codes_text: icfCodesText,
          iso_code: isoCode,
          iso_label: isoLabel,
          iso_description: isoDescription || null,
          embedding: embedding, // 배열로 직접 전달 (Supabase가 vector 타입으로 변환)
          base_score: baseScore,
        },
        {
          onConflict: "icf_codes,iso_code",
          ignoreDuplicates: false,
        }
      )
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to save embedding: ${error.message}`);
    }

    logEvent({
      category: "matching",
      action: "icf_iso_embedding_saved",
      payload: {
        icfCodes,
        isoCode,
        embeddingLength: embedding.length,
      },
    });

    return data.id;
  } catch (error) {
    logEvent({
      category: "matching",
      action: "icf_iso_embedding_save_error",
      payload: { error: String(error), icfCodes, isoCode },
      level: "error",
    });
    throw error;
  }
}

/**
 * 벡터 유사도 기반 ICF-ISO 매핑 검색
 * 
 * @param queryText 검색 쿼리 텍스트
 * @param similarityThreshold 유사도 임계값 (기본 0.7)
 * @param maxResults 최대 결과 수 (기본 10)
 * @returns 유사한 매핑 목록
 */
export async function searchSimilarIcfIsoMappings(
  queryText: string,
  similarityThreshold: number = 0.7,
  maxResults: number = 10
): Promise<SimilarMatch[]> {
  const supabase = getSupabaseServerClient();

  try {
    // 1. 쿼리 텍스트를 임베딩으로 변환
    const queryEmbedding = await createEmbedding(queryText);

    // 2. Supabase 함수를 사용하여 벡터 유사도 검색
    // pgvector는 배열을 직접 전달 (Supabase가 자동 변환)
    const { data, error } = await supabase.rpc("search_similar_icf_iso_mappings", {
      query_embedding: queryEmbedding, // 배열로 직접 전달
      similarity_threshold: similarityThreshold,
      max_results: maxResults,
    });

    if (error) {
      throw new Error(`Failed to search embeddings: ${error.message}`);
    }

    // 3. 결과 변환
    const matches: SimilarMatch[] = (data || []).map((row: any) => ({
      id: row.id,
      icfCodes: row.icf_codes || [],
      isoCode: row.iso_code,
      isoLabel: row.iso_label,
      isoDescription: row.iso_description,
      similarity: Number(row.similarity) || 0,
      baseScore: Number(row.base_score) || 0.8,
      usageCount: Number(row.usage_count) || 0,
      successRate: Number(row.success_rate) || 0,
    }));

    logEvent({
      category: "matching",
      action: "vector_search_completed",
      payload: {
        queryText: queryText.substring(0, 100),
        resultsCount: matches.length,
        similarityThreshold,
      },
    });

    return matches;
  } catch (error) {
    logEvent({
      category: "matching",
      action: "vector_search_error",
      payload: { error: String(error), queryText },
      level: "error",
    });

    // 에러 발생 시 빈 배열 반환
    return [];
  }
}

/**
 * 임베딩 사용 통계 업데이트
 * 
 * @param icfCodes ICF 코드 배열
 * @param isoCode ISO 코드
 * @param success 성공 여부 (클릭/구매 등)
 */
export async function updateEmbeddingStats(
  icfCodes: string[],
  isoCode: string,
  success: boolean = false
): Promise<void> {
  const supabase = getSupabaseServerClient();

  try {
    const { error } = await supabase.rpc("update_icf_iso_embedding_stats", {
      p_icf_codes: icfCodes,
      p_iso_code: isoCode,
      p_success: success,
    });

    if (error) {
      logEvent({
        category: "matching",
        action: "embedding_stats_update_error",
        payload: { error: error.message, icfCodes, isoCode },
        level: "warn",
      });
    }
  } catch (error) {
    logEvent({
      category: "matching",
      action: "embedding_stats_update_exception",
      payload: { error: String(error), icfCodes, isoCode },
      level: "error",
    });
  }
}

