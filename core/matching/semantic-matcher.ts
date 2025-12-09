/**
 * 시맨틱 임베딩 기반 ICF-ISO 매칭
 *
 * 의미론적 유사도를 활용하여 더 정확한 매칭을 수행합니다.
 * 
 * Note: @ai-sdk/google에는 embed 함수가 없으므로 임베딩 기능은 현재 폴백 구현을 사용합니다.
 */

import type { IsoMatch } from "./iso-mapping";
import { getIsoMatches } from "./iso-mapping";
import { findIcfCode } from "../assessment/icf-codes";

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
    const queryEmbedding = await createEmbedding(queryText);

    // 3. ISO 코드별 임베딩과 유사도 계산
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
      return meta ? `${code}: ${meta.description}` : code;
    })
    .join("; ");

  return `${icfDescriptions}. 사용자 상황: ${userContext || "정보 없음"}`;
}

/**
 * 텍스트를 벡터 임베딩으로 변환
 * 
 * 현재는 Google Embedding API를 직접 호출하는 방식으로 구현 예정
 * @ai-sdk/google에는 embed 함수가 없으므로 직접 API 호출 필요
 */
async function createEmbedding(text: string): Promise<number[]> {
  // TODO: Google Embedding API 직접 호출 구현
  // 현재는 임베딩 기능을 사용하지 않으므로 빈 배열 반환
  // 실제 구현 시:
  // 1. Google Embedding API 엔드포인트 호출
  // 2. 또는 다른 임베딩 서비스 (OpenAI, Cohere 등) 사용
  
  console.warn("[semantic-matcher] Embedding API not implemented, using fallback");
  
  // 임시: 간단한 해시 기반 임베딩 (실제 임베딩 대체)
  // 실제로는 Google Embedding API를 직접 호출해야 함
  const hash = text.split("").reduce((acc, char) => {
    const hash = char.charCodeAt(0);
    return ((acc << 5) - acc) + hash;
  }, 0);
  
  // 간단한 128차원 벡터 생성 (실제 임베딩은 768차원 등)
  const embedding: number[] = [];
  for (let i = 0; i < 128; i++) {
    embedding.push(Math.sin(hash + i) * 0.1);
  }
  
  return embedding;
}

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
