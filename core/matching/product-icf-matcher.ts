/**
 * 제품-ICF 직접 매칭 시스템
 * 
 * ISO 코드를 우회하여 제품명/설명에서 직접 ICF 코드를 추론하고 매칭합니다.
 * 이를 통해 ISO 코드가 부정확한 제품도 정확히 매칭할 수 있습니다.
 */

import { findIcfCode } from "@/core/assessment/icf-codes";
import { generateEmbedding } from "@/lib/ai/gemini";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IsoMatch } from "./iso-mapping";

export interface ProductIcfMatch {
  icfCode: string;
  score: number;
  method: "keyword" | "semantic" | "ai" | "category";
  confidence: number;
  evidence: string[];
}

interface ProductInfo {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  iso_code: string | null;
}

/**
 * 제품 정보에서 ICF 코드를 직접 매칭
 */
export async function matchProductToIcf(
  product: ProductInfo,
  targetIcfCodes: string[]
): Promise<ProductIcfMatch[]> {
  const matches: ProductIcfMatch[] = [];
  
  // 제품 텍스트 준비
  const productText = [
    product.name,
    product.description || "",
    product.category || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 1. 키워드 기반 매칭
  const keywordMatches = matchByKeywords(productText, targetIcfCodes);
  matches.push(...keywordMatches);

  // 2. 카테고리 기반 매칭
  if (product.category) {
    const categoryMatches = matchByCategory(product.category, targetIcfCodes);
    matches.push(...categoryMatches);
  }

  // 3. 시맨틱 매칭 (벡터 검색)
  try {
    const semanticMatches = await matchBySemantic(productText, targetIcfCodes);
    matches.push(...semanticMatches);
  } catch (error) {
    console.warn("[Product-ICF Matcher] Semantic matching failed:", error);
    // 실패해도 계속 진행
  }

  // 중복 제거 및 점수 통합
  const mergedMatches = mergeMatches(matches);
  
  // 점수 정규화 (0.0-1.0)
  return mergedMatches.map((match) => ({
    ...match,
    score: Math.min(match.score, 1.0),
  }));
}

/**
 * 키워드 기반 매칭
 */
function matchByKeywords(
  productText: string,
  targetIcfCodes: string[]
): ProductIcfMatch[] {
  const matches: ProductIcfMatch[] = [];

  // ICF 코드별 키워드 매핑
  const icfKeywords: Record<string, string[]> = {
    // 시각 장애 (b210, b215)
    b210: ["시각", "시력", "눈", "시야", "저시력", "맹인", "실명", "blind", "vision", "visual"],
    b215: ["시각", "시력", "눈", "시야", "visual"],
    
    // 청각 장애 (b230, b235)
    b230: ["청각", "청력", "귀", "난청", "보청기", "hearing", "auditory"],
    b235: ["청각", "청력", "귀", "hearing"],
    
    // 언어/의사소통 (b240, b320, b330, d3)
    b240: ["언어", "말하기", "발음", "음성", "language", "speech"],
    b320: ["의사소통", "소통", "communication"],
    b330: ["말하기", "발성", "speech"],
    d3: ["의사소통", "소통", "communication", "aac"],
    
    // 지체 장애 / 이동 (d46, d450, d465)
    d46: ["휠체어", "wheelchair", "이동", "mobility"],
    d450: ["보행", "걷기", "walking", "보행기", "워커"],
    d465: ["이동", "mobility", "이동성"],
    
    // 식사/자가관리 (d55, d550)
    d55: ["식사", "먹기", "feeding", "식기"],
    d550: ["식사", "먹기", "feeding"],
    
    // 인지 기능 (b117, b140, b144, b160, b164)
    b117: ["인지", "기억", "memory", "cognitive"],
    b140: ["주의", "attention", "집중"],
    b144: ["기억", "memory"],
    b160: ["사고", "thinking", "인지"],
    b164: ["문제해결", "problem solving"],
  };

  for (const icfCode of targetIcfCodes) {
    const keywords = icfKeywords[icfCode.toLowerCase()] || [];
    const foundKeywords: string[] = [];

    for (const keyword of keywords) {
      if (productText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }

    if (foundKeywords.length > 0) {
      const score = Math.min(foundKeywords.length / keywords.length, 1.0);
      matches.push({
        icfCode: icfCode.toUpperCase(),
        score: score * 0.7, // 키워드 매칭은 최대 0.7점
        method: "keyword",
        confidence: foundKeywords.length >= 2 ? 0.8 : 0.6,
        evidence: foundKeywords,
      });
    }
  }

  return matches;
}

/**
 * 카테고리 기반 매칭
 */
function matchByCategory(
  category: string,
  targetIcfCodes: string[]
): ProductIcfMatch[] {
  const matches: ProductIcfMatch[] = [];
  const categoryLower = category.toLowerCase();

  // 카테고리-ICF 매핑
  const categoryIcfMap: Record<string, string[]> = {
    "시각": ["b210", "b215"],
    "청각": ["b230", "b235"],
    "의사소통": ["b240", "b320", "b330", "d3"],
    "휠체어": ["d46", "d465"],
    "보행": ["d450"],
    "식사": ["d55", "d550"],
    "인지": ["b117", "b140", "b144", "b160", "b164"],
  };

  for (const [catKeyword, icfCodes] of Object.entries(categoryIcfMap)) {
    if (categoryLower.includes(catKeyword)) {
      for (const icfCode of icfCodes) {
        if (targetIcfCodes.includes(icfCode.toLowerCase())) {
          matches.push({
            icfCode: icfCode.toUpperCase(),
            score: 0.6, // 카테고리 매칭은 0.6점
            method: "category",
            confidence: 0.7,
            evidence: [catKeyword],
          });
        }
      }
    }
  }

  return matches;
}

/**
 * 시맨틱 매칭 (벡터 검색)
 */
async function matchBySemantic(
  productText: string,
  targetIcfCodes: string[]
): Promise<ProductIcfMatch[]> {
  const matches: ProductIcfMatch[] = [];

  try {
    // 제품 텍스트 임베딩 생성
    const productEmbedding = await generateEmbedding(productText);
    if (!productEmbedding) {
      return matches;
    }

    const supabase = getSupabaseServerClient();

    // 각 ICF 코드의 설명을 임베딩하여 유사도 계산
    for (const icfCode of targetIcfCodes) {
      const icfInfo = findIcfCode(icfCode);
      if (!icfInfo) continue;

      const icfDescription = icfInfo.description || "";
      const icfEmbedding = await generateEmbedding(icfDescription);
      
      if (!icfEmbedding) continue;

      // 코사인 유사도 계산
      const similarity = cosineSimilarity(productEmbedding, icfEmbedding);
      
      if (similarity > 0.5) {
        matches.push({
          icfCode: icfCode.toUpperCase(),
          score: similarity * 0.8, // 시맨틱 매칭은 최대 0.8점
          method: "semantic",
          confidence: similarity,
          evidence: [`시맨틱 유사도: ${(similarity * 100).toFixed(1)}%`],
        });
      }
    }
  } catch (error) {
    console.error("[Product-ICF Matcher] Semantic matching error:", error);
  }

  return matches;
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * 중복 매칭 통합 (같은 ICF 코드에 대한 여러 매칭 방법 통합)
 */
function mergeMatches(matches: ProductIcfMatch[]): ProductIcfMatch[] {
  const merged = new Map<string, ProductIcfMatch>();

  for (const match of matches) {
    const existing = merged.get(match.icfCode);
    
    if (!existing) {
      merged.set(match.icfCode, match);
    } else {
      // 여러 방법의 점수를 가중 평균으로 통합
      const methods = [existing.method, match.method];
      const scores = [existing.score, match.score];
      const confidences = [existing.confidence, match.confidence];
      
      // 방법별 가중치
      const methodWeights: Record<string, number> = {
        semantic: 0.4,
        keyword: 0.3,
        category: 0.2,
        ai: 0.1,
      };

      let totalWeight = 0;
      let weightedScore = 0;
      let weightedConfidence = 0;

      for (let i = 0; i < methods.length; i++) {
        const weight = methodWeights[methods[i]] || 0.1;
        totalWeight += weight;
        weightedScore += scores[i] * weight;
        weightedConfidence += confidences[i] * weight;
      }

      merged.set(match.icfCode, {
        icfCode: match.icfCode,
        score: weightedScore / totalWeight,
        method: existing.method, // 가장 높은 점수의 방법 유지
        confidence: weightedConfidence / totalWeight,
        evidence: [...existing.evidence, ...match.evidence],
      });
    }
  }

  return Array.from(merged.values());
}

/**
 * 제품-ICF 매칭 점수를 ISO 매칭 점수와 통합
 */
export function combineProductIcfScore(
  productIcfScore: number,
  icfToIsoScore: number
): number {
  // 가중 평균: ICF→ISO 점수 50%, 제품→ICF 점수 40%, 기본 점수 10%
  return (
    icfToIsoScore * 0.5 +
    productIcfScore * 0.4 +
    0.1
  );
}
