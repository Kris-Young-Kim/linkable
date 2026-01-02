/**
 * 시맨틱 임베딩 기반 ICF-ISO 매칭
 *
 * 의미론적 유사도를 활용하여 더 정확한 매칭을 수행합니다.
 * Supabase pgvector를 활용한 벡터 유사도 검색을 사용합니다.
 */

import type { IsoMatch } from "./iso-mapping";
import { getIsoMatches } from "./iso-mapping";
import { findIcfCode } from "../assessment/icf-codes";
import {
  searchSimilarIcfIsoMappings,
  updateEmbeddingStats,
} from "@/lib/embeddings/vector-store";
import { createEmbedding } from "@/lib/embeddings/gemini-embedding";
import { logEvent } from "@/lib/logging";

interface SemanticMatchConfig {
  useEmbeddings: boolean;
  similarityThreshold: number;
  topK: number;
}

interface IcfIsoEmbedding {
  icfCodes: string[];
  isoCode: string;
  embedding?: number[];
  metadata: {
    label: string;
    description: string;
    baseScore: number;
  };
}

/**
 * ICF 코드 조합과 ISO 코드를 의미론적으로 매칭
 */
export async function semanticMatch(
  icfCodes: string[],
  userContext: string,
  config: SemanticMatchConfig = {
    useEmbeddings: true,
    similarityThreshold: 0.7,
    topK: 10,
  }
): Promise<IsoMatch[]> {
  if (!icfCodes.length) {
    return [];
  }

  // 1. 기본 규칙 기반 매칭 (빠른 필터링)
  const ruleMatches = getIsoMatches(icfCodes);

  // 임베딩을 사용하지 않는 경우 기본 매칭 반환
  if (!config.useEmbeddings) {
    return ruleMatches;
  }

  try {
    // 2. 사용자 컨텍스트 + ICF 코드를 임베딩
    const queryText = buildQueryText(icfCodes, userContext);

    // 3. 벡터 DB에서 유사한 매핑 검색
    const vectorMatches = await searchSimilarIcfIsoMappings(
      queryText,
      config.similarityThreshold,
      config.topK
    );

    // 4. 벡터 검색 결과가 있으면 우선 사용, 없으면 규칙 기반 매칭 보강
    if (vectorMatches.length > 0) {
      const enhanced = vectorMatches.map((vm) => {
        // 벡터 검색 결과를 IsoMatch 형식으로 변환
        const baseMatch = ruleMatches.find((rm) => rm.isoCode === vm.isoCode);

        // 향상된 검색의 경우 adjustedScore 사용, 없으면 하이브리드 점수 계산
        const finalScore = vm.adjustedScore !== undefined
          ? Math.min(vm.adjustedScore, 1.0)
          : Math.min(
            (vm.baseScore * 0.3 + vm.similarity * 0.5 + vm.successRate * 0.2) * 1.0,
            1.0
          );

        return {
          isoCode: vm.isoCode,
          label: vm.isoLabel,
          description: vm.isoDescription || "",
          score: finalScore,
          matchedIcf: icfCodes.map((code) => {
            const meta = findIcfCode(code);
            return {
              code,
              description: meta?.description || code,
            };
          }),
          reason: `벡터 유사도 검색${vm.adjustedScore !== undefined ? " (향상된)" : ""} (유사도: ${(vm.similarity * 100).toFixed(1)}%, 성공률: ${(vm.successRate * 100).toFixed(1)}%, 사용 횟수: ${vm.usageCount})`,
        } as IsoMatch;
      });

      logEvent({
        category: "matching",
        action: "semantic_vector_search",
        payload: {
          icfCodes,
          vectorMatchesCount: vectorMatches.length,
          avgSimilarity:
            vectorMatches.length > 0
              ? vectorMatches.reduce((sum, vm) => sum + vm.similarity, 0) /
              vectorMatches.length
              : 0,
        },
      });

      // 통계 업데이트 (비동기, 에러 무시)
      // 향상된 검색에서는 이미 사용 통계가 반영되므로 선택적으로 업데이트
      for (const vm of vectorMatches) {
        updateEmbeddingStats(vm.icfCodes, vm.isoCode, false).catch(() => {
          // 통계 업데이트 실패는 무시
        });
      }

      // 벡터 검색 로깅 (비동기, 에러 무시)
      // consultation_id는 context에서 가져와야 하지만 여기서는 없으므로 나중에 업데이트

      return enhanced;
    }

    // 5. 벡터 검색 결과가 없으면 규칙 기반 매칭에 임베딩 보강 적용
    const queryEmbedding = await createEmbedding(queryText);
    const enhancedMatches = await enhanceMatchesWithSemantics(
      ruleMatches,
      icfCodes,
      queryEmbedding,
      config
    );

    return enhancedMatches;
  } catch (error) {
    console.error(
      "[semantic-matcher] Embedding failed, falling back to rule-based:",
      error
    );
    logEvent({
      category: "matching",
      action: "semantic_match_error",
      payload: { error: String(error), icfCodes },
      level: "error",
    });
    return ruleMatches;
  }
}

/**
 * ICF 코드 설명과 사용자 컨텍스트를 결합하여 쿼리 텍스트 생성
 */
function buildQueryText(icfCodes: string[], userContext: string): string {
  const icfDescriptions = icfCodes
    .map((code) => {
      const meta = findIcfCode(code);
      return `[${code}] ${meta?.description || "(설명 없음)"}`;
    })
    .join(", ");

  return `발견된 주요 증상 및 활동 제약: ${icfDescriptions}. 
추가 컨텍스트: ${userContext || "특이사항 없음"}. 
위 내용을 바탕으로 가장 적합한 보조기기 ISO 분류를 추천해 주세요.`;
}

// createEmbedding은 lib/embeddings/gemini-embedding.ts에서 import

/**
 * 규칙 기반 매칭 결과를 시맨틱 정보로 보강
 */
async function enhanceMatchesWithSemantics(
  ruleMatches: IsoMatch[],
  icfCodes: string[],
  queryEmbedding: number[],
  config: SemanticMatchConfig
): Promise<IsoMatch[]> {
  const enhanced: IsoMatch[] = [];

  for (const match of ruleMatches) {
    // ISO 코드 설명을 임베딩
    const isoText = `${match.isoCode}: ${match.label}. ${match.description}`;
    const isoEmbedding = await createEmbedding(isoText);

    // 코사인 유사도 계산
    const similarity = cosineSimilarity(queryEmbedding, isoEmbedding);

    // 유사도가 임계값 이상인 경우만 포함
    if (similarity >= config.similarityThreshold) {
      enhanced.push({
        ...match,
        score: Math.min(
          match.score * 0.6 + similarity * 0.4, // 규칙 점수 60% + 유사도 40%
          1.0
        ),
        reason: `${match.reason} (의미론적 유사도: ${(similarity * 100).toFixed(
          1
        )}%)`,
      });
    }
  }

  // 점수 순으로 정렬
  return enhanced.sort((a, b) => b.score - a.score).slice(0, config.topK);
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vector dimensions must match");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * ICF-ISO 매핑을 벡터 DB에 저장하기 위한 임베딩 생성
 * (초기 데이터 구축용)
 */
export async function generateIcfIsoEmbeddings(
  icfCodes: string[],
  isoCode: string,
  label: string,
  description: string
): Promise<IcfIsoEmbedding> {
  const text = [
    ...icfCodes.map((code) => {
      const meta = findIcfCode(code);
      return meta ? `${code}: ${meta.description}` : code;
    }),
    `${isoCode}: ${label}. ${description}`,
  ].join("; ");

  const embedding = await createEmbedding(text);

  return {
    icfCodes,
    isoCode,
    embedding,
    metadata: {
      label,
      description,
      baseScore: 0.8, // 기본 점수
    },
  };
}
