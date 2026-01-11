/**
 * 고도화된 ISO 코드 기반 보조기기 추천 시스템
 *
 * 다층 점수 계산 시스템:
 * 1. ISO 코드 매칭 점수 (기본)
 * 2. ICF-제품 시맨틱 매칭 점수
 * 3. 사용자 컨텍스트 반영 점수
 * 4. 제품 품질 지표 점수 (클릭률, 피드백, 효과성)
 * 5. 제품-ICF 직접 매칭 점수
 *
 * 최종 점수 = 가중 평균으로 통합하여 가장 적합한 제품 추천
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IsoMatch } from "./iso-mapping";
import {
  matchProductToIcf,
  combineProductIcfScore,
} from "./product-icf-matcher";
import { createEmbedding } from "@/lib/embeddings/gemini-embedding";
import { findIcfCode } from "@/core/assessment/icf-codes";
import { logEvent } from "@/lib/logging";

export interface ProductRecommendation {
  id: string;
  name: string;
  description: string | null;
  iso_code: string;
  category: string | null;
  manufacturer: string | null;
  price: number | null;
  image_url: string | null;
  purchase_link: string | null;
  score: number; // 최종 추천 점수 (0-1)
  match_reason: string; // 매칭 이유
  priority: number; // 우선순위 (높을수록 먼저 추천)
  scoreBreakdown?: {
    isoMatch: number; // ISO 매칭 점수
    semanticMatch: number; // 시맨틱 매칭 점수
    contextMatch: number; // 컨텍스트 매칭 점수
    qualityScore: number; // 품질 지표 점수
    directIcfMatch: number; // 직접 ICF 매칭 점수
  };
}

export interface IsoProductRecommendation {
  isoCode: string;
  products: ProductRecommendation[];
  totalProducts: number;
  confidence: number; // ISO 코드 매칭 신뢰도
}

interface ProductQualityMetrics {
  clickThroughRate: number; // 클릭률 (0-1)
  averageFeedbackRating: number; // 평균 피드백 점수 (1-5)
  averageEffectivenessScore: number; // 평균 효과성 점수 (0-20)
  totalClicks: number; // 총 클릭 수
  totalFeedbacks: number; // 총 피드백 수
  totalEvaluations: number; // 총 평가 수
}

interface RecommendationContext {
  icfCodes: string[];
  isoMatches: IsoMatch[];
  userMessage?: string;
  analysisSummary?: string;
  userProfile?: {
    ageGroup?: string;
    disabilityType?: string;
    disabilitySeverity?: string;
    environment?: string;
    userId?: string;
    consultationId?: string;
  };
}

/**
 * ISO 코드 계층 구조 파싱
 * ISO 9999:2022 구조:
 * - Class: 2자리 (예: "12")
 * - Subclass: 4자리 (예: "12 23")
 * - Division: 6자리 (예: "12 23 01")
 */
function parseIsoCodeHierarchy(isoCode: string): {
  class: string;
  subclass: string | null;
  division: string | null;
  fullCode: string;
} {
  const parts = isoCode.split(" ").filter(Boolean);
  return {
    class: parts[0] || "",
    subclass: parts.length >= 2 ? `${parts[0]} ${parts[1]}` : null,
    division: parts.length >= 3 ? `${parts[0]} ${parts[1]} ${parts[2]}` : null,
    fullCode: isoCode,
  };
}

/**
 * 두 ISO 코드가 관련되어 있는지 확인 (Division 레벨 기준)
 * 
 * ISO 9999:2022 표준에 따라 모든 제품은 Division 레벨(6자리)에만 존재합니다.
 * 관련 제품 판단 기준:
 * - 같은 Division: 관련 없음 (정확한 매칭)
 * - 같은 Subclass 내 다른 Division: 관련 있음
 * - 다른 Subclass: 관련 없음 (너무 넓은 매칭 방지)
 * 
 * @param targetIsoCode 목표 ISO 코드 (Division 레벨 권장)
 * @param candidateIsoCode 후보 ISO 코드 (null 가능, Division 레벨 권장)
 * @returns 관련 여부
 */
function areIsoCodesRelated(
  targetIsoCode: string,
  candidateIsoCode: string | null
): boolean {
  // null 체크: ISO 코드가 없으면 관련 없음
  if (!candidateIsoCode || !targetIsoCode) {
    return false;
  }

  const target = parseIsoCodeHierarchy(targetIsoCode);
  const candidate = parseIsoCodeHierarchy(candidateIsoCode);

  // 정확한 매칭은 관련 제품이 아님
  if (target.fullCode === candidate.fullCode) {
    return false;
  }

  // 명시적 관련 매핑 확인 (Division 레벨 기준)
  // Subclass 레벨 코드도 지원하지만, Division 레벨로 확장하여 비교
  const relatedIsoMapping: Record<string, string[]> = {
    "12 23": ["12 22"], // 전동휠체어 → 수동휠체어 (Subclass 레벨)
    "12 22": ["12 23"], // 수동휠체어 → 전동휠체어 (Subclass 레벨)
  };

  // Subclass 레벨 매핑 확인 (Division 레벨 코드도 Subclass로 변환하여 비교)
  const targetSubclass = target.division ? target.subclass : target.fullCode;
  const candidateSubclass = candidate.division ? candidate.subclass : candidate.fullCode;
  
  if (relatedIsoMapping[targetSubclass || target.fullCode]?.includes(candidateSubclass || candidate.fullCode)) {
    return true;
  }

  // Division 레벨: 같은 Subclass 내 다른 Division만 관련
  if (
    target.division &&
    candidate.division &&
    target.subclass === candidate.subclass &&
    target.division !== candidate.division
  ) {
    return true;
  }

  // 다른 경우는 관련 없음 (너무 넓은 매칭 방지)
  return false;
}

/**
 * 단일 ISO 코드에 대한 제품 추천 (고도화 버전)
 */
export async function recommendProductsByIsoCode(
  isoCode: string,
  context: RecommendationContext,
  options?: {
    limit?: number;
    minScore?: number;
    includeRelated?: boolean;
    useSemanticMatching?: boolean;
    useQualityMetrics?: boolean;
  }
): Promise<IsoProductRecommendation> {
  const {
    limit = 10,
    minScore = 0.4,
    includeRelated = true,
    useSemanticMatching = true,
    useQualityMetrics = true,
  } = options || {};

  const supabase = getSupabaseServerClient();

  try {
    // ISO 코드 레벨 파싱
    const isoParts = isoCode.split(" ").filter(Boolean);
    const isDivision = isoParts.length >= 3; // Division 레벨 (6자리)
    const isSubclass = isoParts.length === 2; // Subclass 레벨 (4자리)
    const isClass = isoParts.length === 1; // Class 레벨 (2자리)

    // 1. 정확한 ISO 코드 매칭 제품 검색 (iso_code_id FK 조인 사용)
    let exactQuery = supabase
      .from("products")
      .select(`
        *,
        iso_codes!iso_code_id (
          code,
          name,
          level
        )
      `)
      .eq("is_active", true)
      .not("iso_code_id", "is", null)  // ✅ iso_code_id가 null인 제품 제외 (ISO 코드 없는 제품은 추천 불가)
      .order("created_at", { ascending: false });

    // Division 레벨이면 정확히 일치하는 제품만 검색
    if (isDivision) {
      exactQuery = exactQuery.eq("iso_codes.code", isoCode);
    }
    // Subclass 레벨이면 해당 Subclass의 모든 Division 제품 검색
    else if (isSubclass) {
      exactQuery = exactQuery.like("iso_codes.code", `${isoCode} %`);
    }
    // Class 레벨이면 해당 Class의 모든 Division 제품 검색
    else if (isClass) {
      exactQuery = exactQuery.like("iso_codes.code", `${isoCode} %`);
    }
    // 기타는 정확히 일치
    else {
      exactQuery = exactQuery.eq("iso_codes.code", isoCode);
    }

    const { data: exactProducts, error: exactError } = await exactQuery;
    if (exactError) {
      console.error("[ISO Product Recommender] Exact match error:", exactError);
      return {
        isoCode,
        products: [],
        totalProducts: 0,
        confidence: 0,
      };
    }

    // 2. 관련 ISO 코드 제품 검색 (Division 레벨 기준)
    let relatedProducts: any[] = [];
    if (includeRelated && exactProducts.length < limit) {
      // ISO 코드 계층 구조 기반 스마트 필터링
      // Division 레벨(6자리): "12 23 03" → 가장 정확, 정확히 일치하는 제품만 검색
      // Subclass 레벨(4자리): "12 23" → 해당 Subclass의 모든 Division 제품 검색
      // Class 레벨(2자리): "12" → 해당 Class의 모든 Division 제품 검색 (너무 넓음, 권장하지 않음)
      const isoParts = isoCode.split(" ").filter(Boolean);

      // 명시적으로 관련된 ISO 코드 매핑 (전문가 지식 기반, Subclass 레벨)
      // Division 레벨로 자동 확장됨
      const relatedIsoMapping: Record<string, string[]> = {
        // 이동 보조기기 (Class 12)
        "12 23": ["12 22"], // 전동휠체어 → 수동휠체어
        "12 22": ["12 23"], // 수동휠체어 → 전동휠체어
        "12 06": [], // 보행기 → 관련 제품 없음 (독립적)
        "12 31": [], // 체위 변경 → 관련 제품 없음 (독립적)

        // 식사 보조기기 (Class 15)
        "15 09": [], // 식사 보조기기 → 관련 제품 없음 (독립적)

        // 시각 보조기기 (Class 22 03) - 저시력 읽기 어려움
        "22 03": ["22 03 18", "22 03 21"], // 시각 보조기기 → 독서 확대기, 화면 확대 소프트웨어
        "22 03 18": ["22 03 21"], // 독서 확대기 → 화면 확대 소프트웨어 (컴퓨터 사용 시)
        "22 03 21": ["22 03 18"], // 화면 확대 소프트웨어 → 독서 확대기 (인쇄물 읽기 시)

        // 의사소통 보조기기 (Class 22)
        "22 30": [], // 의사소통 보조기기 → 관련 제품 없음 (독립적)
      };

      // ISO 코드를 Subclass 레벨로 변환하여 매핑 확인
      const isoSubclass = isoParts.length >= 2 
        ? `${isoParts[0]} ${isoParts[1]}` 
        : isoCode;

      const relatedIsoCodes: string[] = [];

      // 명시적 매핑이 있으면 Division 레벨로 확장
      if (relatedIsoMapping[isoSubclass]) {
        for (const relatedCode of relatedIsoMapping[isoSubclass]) {
          const relatedParts = relatedCode.split(" ").filter(Boolean);
          if (relatedParts.length === 2) {
            // Subclass 레벨이면 해당 Subclass의 모든 Division 검색
            const { data: relatedDivisions } = await supabase
              .from("iso_codes")
              .select("code")
              .eq("parent_code", relatedCode)
              .eq("level", 3) // Division 레벨만
              .eq("is_active", true);
            
            if (relatedDivisions && relatedDivisions.length > 0) {
              relatedIsoCodes.push(...relatedDivisions.map((d: any) => d.code));
            }
          } else if (relatedParts.length >= 3) {
            // 이미 Division 레벨이면 그대로 사용
            relatedIsoCodes.push(relatedCode);
          }
        }
      }

      // 관련 ISO 코드가 있을 때만 검색 (iso_code_id FK 조인 사용)
      if (relatedIsoCodes.length > 0) {
        // 관련 ISO 코드들을 iso_code_id로 변환
        const { getIsoCodeId } = await import("@/lib/utils/iso-code-converter");
        const relatedIsoCodeIds: string[] = [];
        for (const code of relatedIsoCodes) {
          const codeId = await getIsoCodeId(code, supabase);
          if (codeId) {
            relatedIsoCodeIds.push(codeId);
          }
        }

        if (relatedIsoCodeIds.length > 0) {
          const { data: relatedData, error: relatedError } = await supabase
            .from("products")
            .select(`
              *,
              iso_codes!iso_code_id (
                code,
                name,
                level
              )
            `)
            .in("iso_code_id", relatedIsoCodeIds)
            .eq("is_active", true)
            .not("iso_code_id", "is", null)  // ✅ iso_code_id가 null인 제품 제외
            .order("created_at", { ascending: false })
            .limit(limit - exactProducts.length); // 정확한 매칭 제품 수를 고려

          if (!relatedError && relatedData) {
            relatedProducts = relatedData;
          }
        }
      }
    }

    // 3. 제품 품질 지표 조회 (비동기, 병렬 처리)
    const qualityMetricsPromise = useQualityMetrics
      ? getProductQualityMetrics(
          [...exactProducts, ...relatedProducts].map((p) => p.id)
        )
      : Promise.resolve(new Map<string, ProductQualityMetrics>());

    // 4. 제품 점수 계산 (다층 점수 시스템)
    const allProducts = [...exactProducts, ...relatedProducts];
    const qualityMetrics = await qualityMetricsPromise;

    const recommendations = await calculateAdvancedProductScores(
      allProducts,
      isoCode,
      context,
      qualityMetrics,
      {
        useSemanticMatching,
        useQualityMetrics,
      }
    );

    // 5. 필터링 및 제한 - 정확한 ISO 매칭 제품 우선
    const filteredRecommendations = recommendations
      .filter((product) => {
        // 정확한 ISO 매칭이 있으면 점수와 관계없이 포함
        const productIsoCode = (product as any).iso_codes?.code || product.iso_code;
        const isExact = productIsoCode === isoCode;
        if (isExact) return true;
        // 관련 제품은 최소 점수 이상이어야 함
        return product.score >= minScore;
      })
      .sort((a, b) => {
        // 1순위: 정확한 ISO 매칭 여부
        const aIsoCode = (a as any).iso_codes?.code || a.iso_code;
        const bIsoCode = (b as any).iso_codes?.code || b.iso_code;
        const aExact = aIsoCode === isoCode;
        const bExact = bIsoCode === isoCode;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 2순위: 우선순위
        if (a.priority !== b.priority) return b.priority - a.priority;

        // 3순위: 점수
        if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score;

        // 4순위: 품질 점수
        const aQuality = a.scoreBreakdown?.qualityScore || 0;
        const bQuality = b.scoreBreakdown?.qualityScore || 0;
        return bQuality - aQuality;
      })
      .slice(0, limit);

    return {
      isoCode,
      products: filteredRecommendations,
      totalProducts: recommendations.length,
      confidence: exactProducts.length > 0 ? 1.0 : 0.7,
    };
  } catch (error) {
    console.error("[ISO Product Recommender] Error:", error);
    logEvent({
      category: "matching",
      action: "product_recommendation_error",
      payload: { error: String(error), isoCode },
      level: "error",
    });
    return {
      isoCode,
      products: [],
      totalProducts: 0,
      confidence: 0,
    };
  }
}

/**
 * 여러 ISO 코드에 대한 통합 제품 추천 (고도화 버전)
 */
export async function recommendProductsByMultipleIsoCodes(
  isoMatches: IsoMatch[],
  context: RecommendationContext,
  options?: {
    limit?: number;
    maxProductsPerIso?: number;
    diversifyCategories?: boolean;
    useSemanticMatching?: boolean;
    useQualityMetrics?: boolean;
  }
): Promise<{
  recommendations: ProductRecommendation[];
  isoBreakdown: IsoProductRecommendation[];
  totalProducts: number;
}> {
  const {
    limit = 20,
    maxProductsPerIso = 5,
    diversifyCategories = true,
    useSemanticMatching = true,
    useQualityMetrics = true,
  } = options || {};

  const isoBreakdown: IsoProductRecommendation[] = [];
  const allRecommendations: ProductRecommendation[] = [];

  try {
    // 각 ISO 코드별 추천 수집 (병렬 처리)
    const recommendationPromises = isoMatches.map((isoMatch) =>
      recommendProductsByIsoCode(
        isoMatch.isoCode,
        { ...context, isoMatches },
        {
          limit: maxProductsPerIso,
          minScore: 0.3,
          useSemanticMatching,
          useQualityMetrics,
        }
      )
    );

    const results = await Promise.all(recommendationPromises);

    for (const result of results) {
      isoBreakdown.push(result);
      allRecommendations.push(...result.products);
    }

    // 중복 제거 및 점수 재계산 (ISO 매칭 점수 반영)
    const uniqueRecommendations = deduplicateAndRescoreProducts(
      allRecommendations,
      isoMatches
    );

    // 카테고리 다양화 (옵션)
    let finalRecommendations = uniqueRecommendations;
    if (diversifyCategories) {
      finalRecommendations = diversifyByCategory(uniqueRecommendations);
    }

    // 최종 정렬 및 제한
    finalRecommendations = finalRecommendations
      .sort((a, b) => {
        // 우선순위 > 점수 > 품질 점수 > 가격
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score;
        const aQuality = a.scoreBreakdown?.qualityScore || 0;
        const bQuality = b.scoreBreakdown?.qualityScore || 0;
        if (Math.abs(aQuality - bQuality) > 0.1) return bQuality - aQuality;
        return (a.price || 999999) - (b.price || 999999);
      })
      .slice(0, limit);

    return {
      recommendations: finalRecommendations,
      isoBreakdown,
      totalProducts: uniqueRecommendations.length,
    };
  } catch (error) {
    console.error("[ISO Product Recommender] Multi-ISO error:", error);
    logEvent({
      category: "matching",
      action: "multi_iso_recommendation_error",
      payload: { error: String(error) },
      level: "error",
    });
    return {
      recommendations: [],
      isoBreakdown: [],
      totalProducts: 0,
    };
  }
}

/**
 * 고도화된 제품 점수 계산 (다층 점수 시스템)
 */
async function calculateAdvancedProductScores(
  products: any[],
  targetIsoCode: string,
  context: RecommendationContext,
  qualityMetrics: Map<string, ProductQualityMetrics>,
  options: {
    useSemanticMatching: boolean;
    useQualityMetrics: boolean;
  }
): Promise<ProductRecommendation[]> {
  const { useSemanticMatching, useQualityMetrics } = options;

  // ICF 코드 설명 텍스트 준비 (시맨틱 매칭용)
  const icfText = context.icfCodes
    .map((code) => {
      const meta = findIcfCode(code);
      return meta ? `${code}: ${meta.description}` : code;
    })
    .join("; ");

  // 사용자 컨텍스트 텍스트 준비
  const userContextText = [
    context.userMessage || "",
    context.analysisSummary || "",
    context.userProfile?.disabilityType || "",
    context.userProfile?.disabilitySeverity || "",
  ]
    .filter(Boolean)
    .join(" ");

  // ICF 코드 임베딩 생성 (시맨틱 매칭용, 한 번만 생성)
  let icfEmbedding: number[] | null = null;
  if (useSemanticMatching && icfText) {
    try {
      icfEmbedding = await createEmbedding(icfText);
    } catch (error) {
      console.warn(
        "[Product Recommender] Failed to create ICF embedding:",
        error
      );
    }
  }

  // 각 제품에 대해 점수 계산
  const scoredProducts = await Promise.all(
    products.map(async (product, index) => {
      const breakdown = {
        isoMatch: 0,
        semanticMatch: 0,
        contextMatch: 0,
        qualityScore: 0,
        directIcfMatch: 0,
      };

      // ISO 코드 추출 (조인된 필드 또는 직접 필드)
      const productIsoCode = (product as any).iso_codes?.code || product.iso_code;

      // 1. ISO 코드 매칭 점수 (기본 점수) - 정확한 매칭 우선순위 대폭 강화
      const isExactMatch = productIsoCode === targetIsoCode;

      // 관련 매칭: Subclass 레벨 필터링을 통과한 제품만 관련 제품으로 간주
      // areIsoCodesRelated 함수를 사용하여 관련 여부 확인
      // null 체크: productIsoCode가 null이면 관련 매칭 없음
      let isRelatedMatch = false;
      if (!isExactMatch && productIsoCode) {
        isRelatedMatch = areIsoCodesRelated(targetIsoCode, productIsoCode);
      }

      if (isExactMatch) {
        breakdown.isoMatch = 1.0; // 정확 매칭: 최고 점수
      } else if (isRelatedMatch) {
        breakdown.isoMatch = 0.4 - index * 0.02; // 관련 매칭: 낮은 점수 (더 낮게 조정)
      } else {
        breakdown.isoMatch = 0.05; // 기타 매칭: 매우 낮은 점수 (필터링 대상, 더 낮게 조정)
      }

      // 2. ICF-제품 시맨틱 매칭 점수
      if (useSemanticMatching && icfEmbedding && product.description) {
        try {
          const productText = `${product.name}. ${product.description || ""}`;
          const productEmbedding = await createEmbedding(productText);
          const similarity = cosineSimilarity(icfEmbedding, productEmbedding);
          breakdown.semanticMatch = similarity * 0.8; // 최대 0.8점
        } catch (error) {
          console.warn(
            `[Product Recommender] Semantic matching failed for product ${product.id}:`,
            error
          );
        }
      }

      // 3. 사용자 컨텍스트 매칭 점수
      breakdown.contextMatch = calculateContextMatchScore(
        product,
        context.userProfile || {}
      );

      // 4. 제품 품질 지표 점수
      if (useQualityMetrics) {
        const metrics = qualityMetrics.get(product.id);
        if (metrics) {
          breakdown.qualityScore = calculateQualityScore(metrics);
        }
      }

      // 5. 제품-ICF 직접 매칭 점수
      try {
        // productIsoCode는 555줄에서 이미 정의됨

        const directMatches = await matchProductToIcf(
          {
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            iso_code: productIsoCode,
          },
          context.icfCodes
        );

        if (directMatches.length > 0) {
          // 최고 점수 사용 (AI 기반 매칭 포함)
          const maxDirectScore = Math.max(...directMatches.map((m) => m.score));
          // AI 기반 매칭이 포함된 경우 점수 상향
          const hasAIMatch = directMatches.some((m) => m.method === "ai");
          breakdown.directIcfMatch = hasAIMatch
            ? maxDirectScore * 0.9 // AI 매칭 포함 시 최대 0.9점
            : maxDirectScore * 0.8; // 기타 매칭 시 최대 0.8점
        }
      } catch (error) {
        console.warn(
          `[Product Recommender] Direct ICF matching failed for product ${product.id}:`,
          error
        );
      }

      // 최종 점수 계산 (가중 평균)
      const finalScore = calculateWeightedScore(breakdown, {
        isExactMatch,
        hasSemanticMatch: breakdown.semanticMatch > 0,
        hasDirectIcfMatch: breakdown.directIcfMatch > 0,
        hasQualityMetrics: breakdown.qualityScore > 0,
      });

      // 우선순위 계산
      const priority = calculatePriority(breakdown, product, {
        isExactMatch,
        hasQualityMetrics: breakdown.qualityScore > 0,
      });

      // 매칭 이유 생성
      const matchReason = buildMatchReason(breakdown, {
        isExactMatch,
        isRelatedMatch,
        hasSemanticMatch: breakdown.semanticMatch > 0,
        hasDirectIcfMatch: breakdown.directIcfMatch > 0,
        hasQualityMetrics: breakdown.qualityScore > 0,
      });

      // productIsoCode는 555줄에서 이미 정의됨

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        iso_code: productIsoCode, // 조인된 필드에서 추출
        category: product.category,
        manufacturer: product.manufacturer,
        price: product.price,
        image_url: product.image_url,
        purchase_link: product.purchase_link,
        score: Math.max(0, Math.min(1, finalScore)),
        match_reason: matchReason,
        priority,
        scoreBreakdown: breakdown,
      };
    })
  );

  return scoredProducts;
}

/**
 * 신뢰도 기반 동적 가중치로 최종 점수 계산
 *
 * 각 점수 요소의 신뢰도를 계산하고, 신뢰도가 높은 요소의 가중치를 동적으로 증가시킴
 */
function calculateWeightedScore(
  breakdown: ProductRecommendation["scoreBreakdown"],
  flags: {
    isExactMatch: boolean;
    hasSemanticMatch: boolean;
    hasDirectIcfMatch: boolean;
    hasQualityMetrics: boolean;
  }
): number {
  if (!breakdown) return 0;

  // 기본 가중치 (제품-ICF 직접 매칭 가중치 상향)
  let baseWeights = {
    isoMatch: 0.35,
    semanticMatch: 0.2, // 시맨틱 매칭 가중치 하향 (0.25 → 0.2)
    contextMatch: 0.15,
    qualityScore: 0.15,
    directIcfMatch: 0.15, // 직접 ICF 매칭 가중치 상향 (0.1 → 0.15)
  };

  // 각 점수 요소의 신뢰도 계산
  const confidences = {
    isoMatch: calculateIsoMatchConfidence(
      breakdown.isoMatch,
      flags.isExactMatch
    ),
    semanticMatch: calculateSemanticMatchConfidence(
      breakdown.semanticMatch,
      flags.hasSemanticMatch
    ),
    contextMatch: calculateContextMatchConfidence(breakdown.contextMatch),
    qualityScore: calculateQualityScoreConfidence(
      breakdown.qualityScore,
      flags.hasQualityMetrics
    ),
    directIcfMatch: calculateDirectIcfMatchConfidence(
      breakdown.directIcfMatch,
      flags.hasDirectIcfMatch
    ),
  };

  // 상황별 기본 가중치 조정
  if (flags.isExactMatch) {
    // 정확한 ISO 매칭이 있으면 ISO 매칭 가중치 대폭 증가, 시맨틱 매칭 영향력 감소
    baseWeights.isoMatch = 0.7; // ISO 매칭 가중치 대폭 증가
    baseWeights.semanticMatch = 0.1; // 시맨틱 매칭 영향력 감소
    baseWeights.contextMatch = 0.1;
    baseWeights.qualityScore = 0.05;
    baseWeights.directIcfMatch = 0.05;
  } else {
    // 정확한 매칭이 없을 때만 시맨틱 매칭 활용
    if (flags.hasSemanticMatch) {
      baseWeights.semanticMatch = 0.35;
      baseWeights.isoMatch = 0.3;
    }
  }

  if (flags.hasDirectIcfMatch) {
    // 직접 ICF 매칭이 있으면 가중치 대폭 증가
    baseWeights.directIcfMatch = 0.5; // 제품-ICF 직접 매칭 가중치 상향
    baseWeights.isoMatch = 0.25; // ISO 매칭 가중치 하향
    baseWeights.semanticMatch = 0.15; // 시맨틱 매칭 가중치 하향
  }

  if (flags.hasQualityMetrics) {
    // 품질 지표가 있으면 가중치 증가
    baseWeights.qualityScore = 0.2;
  }

  // 신뢰도 기반 동적 가중치 조정
  // 신뢰도가 높으면 가중치 증가 (0.5 ~ 1.5 범위)
  const weights = {
    isoMatch: baseWeights.isoMatch * (0.7 + confidences.isoMatch * 0.6),
    semanticMatch:
      baseWeights.semanticMatch * (0.7 + confidences.semanticMatch * 0.6),
    contextMatch:
      baseWeights.contextMatch * (0.7 + confidences.contextMatch * 0.6),
    qualityScore:
      baseWeights.qualityScore * (0.7 + confidences.qualityScore * 0.6),
    directIcfMatch:
      baseWeights.directIcfMatch * (0.7 + confidences.directIcfMatch * 0.6),
  };

  // 가중치 정규화
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (totalWeight > 0) {
    Object.keys(weights).forEach((key) => {
      (weights as any)[key] = (weights as any)[key] / totalWeight;
    });
  }

  // 가중 평균 계산
  const score =
    breakdown.isoMatch * weights.isoMatch +
    breakdown.semanticMatch * weights.semanticMatch +
    breakdown.contextMatch * weights.contextMatch +
    breakdown.qualityScore * weights.qualityScore +
    breakdown.directIcfMatch * weights.directIcfMatch;

  return score;
}

/**
 * ISO 매칭 점수의 신뢰도 계산
 */
function calculateIsoMatchConfidence(
  score: number,
  isExactMatch: boolean
): number {
  if (isExactMatch) {
    return 1.0; // 정확한 매칭은 최고 신뢰도
  }
  // 점수가 높을수록 신뢰도 높음
  return Math.min(score * 1.2, 1.0);
}

/**
 * 시맨틱 매칭 점수의 신뢰도 계산
 */
function calculateSemanticMatchConfidence(
  score: number,
  hasMatch: boolean
): number {
  if (!hasMatch || score === 0) {
    return 0.3; // 매칭이 없으면 낮은 신뢰도
  }
  // 시맨틱 매칭은 점수가 0.5 이상일 때 신뢰도 높음
  return score >= 0.5 ? 0.8 : score * 1.2;
}

/**
 * 컨텍스트 매칭 점수의 신뢰도 계산
 */
function calculateContextMatchConfidence(score: number): number {
  // 컨텍스트 매칭은 보조적이므로 신뢰도가 상대적으로 낮음
  return Math.min(score * 1.0, 0.7);
}

/**
 * 품질 점수의 신뢰도 계산
 */
function calculateQualityScoreConfidence(
  score: number,
  hasMetrics: boolean
): number {
  if (!hasMetrics) {
    return 0.2; // 품질 지표가 없으면 낮은 신뢰도
  }
  // 품질 점수가 높을수록 신뢰도 높음
  return Math.min(score * 1.3, 1.0);
}

/**
 * 직접 ICF 매칭 점수의 신뢰도 계산
 */
function calculateDirectIcfMatchConfidence(
  score: number,
  hasMatch: boolean
): number {
  if (!hasMatch || score === 0) {
    return 0.3; // 매칭이 없으면 낮은 신뢰도
  }
  // 직접 ICF 매칭은 점수가 높을수록 신뢰도 높음
  return Math.min(score * 1.4, 1.0);
}

/**
 * 사용자 컨텍스트 매칭 점수 계산
 */
function calculateContextMatchScore(
  product: any,
  userProfile: {
    ageGroup?: string;
    disabilityType?: string;
    disabilitySeverity?: string;
    environment?: string;
  }
): number {
  let score = 0.5; // 기본 점수

    // ISO 코드 추출 (조인된 필드 또는 직접 필드)
    const productIsoCode = (product as any).iso_codes?.code || product.iso_code;

    // 장애 유형 매칭
    if (userProfile.disabilityType && product.category) {
      const categoryLower = product.category.toLowerCase();
      const typeLower = userProfile.disabilityType.toLowerCase();

      // 시각 장애
      if (
        (typeLower.includes("시각") || typeLower.includes("vision")) &&
        (categoryLower.includes("시각") ||
          categoryLower.includes("시력") ||
          categoryLower.includes("눈") ||
          productIsoCode?.startsWith("22"))
      ) {
        score += 0.2;
      }

      // 청각 장애
      if (
        (typeLower.includes("청각") || typeLower.includes("hearing")) &&
        (categoryLower.includes("청각") ||
          categoryLower.includes("청력") ||
          categoryLower.includes("귀") ||
          productIsoCode?.startsWith("21"))
      ) {
        score += 0.2;
      }

      // 지체 장애
      if (
        (typeLower.includes("지체") ||
          typeLower.includes("뇌병변") ||
          typeLower.includes("mobility")) &&
        (categoryLower.includes("이동") ||
          categoryLower.includes("보행") ||
          categoryLower.includes("휠체어") ||
          productIsoCode?.startsWith("12"))
      ) {
        score += 0.2;
      }
    }

  // 심각도 매칭 (중증일수록 더 전문적인 제품 필요)
  if (userProfile.disabilitySeverity === "severe") {
    // 중증: 더 전문적이고 고가 제품 선호
    if (product.price && product.price > 200000) {
      score += 0.1;
    }
  } else if (userProfile.disabilitySeverity === "mild") {
    // 경증: 저가 제품도 괜찮음
    if (product.price && product.price < 200000) {
      score += 0.1;
    }
  }

  return Math.min(1.0, score);
}

/**
 * 제품 품질 지표 점수 계산
 */
function calculateQualityScore(metrics: ProductQualityMetrics): number {
  let score = 0.5; // 기본 점수

  // 클릭률 점수 (0-0.3점)
  // 클릭률이 높을수록 좋은 제품
  const clickRateScore = Math.min(metrics.clickThroughRate * 3, 0.3);
  score += clickRateScore;

  // 피드백 점수 (0-0.2점)
  // 평균 피드백이 높을수록 좋은 제품
  if (metrics.totalFeedbacks > 0) {
    const feedbackScore = ((metrics.averageFeedbackRating - 1) / 4) * 0.2; // 1-5점을 0-0.2로 변환
    score += feedbackScore;
  }

  // 효과성 점수 (0-0.2점)
  // 효과성 점수가 높을수록 좋은 제품
  if (metrics.totalEvaluations > 0) {
    const effectivenessScore =
      Math.min(metrics.averageEffectivenessScore / 20, 1) * 0.2; // 최대 20점 기준
    score += effectivenessScore;
  }

  // 신뢰도 보너스 (샘플 수가 많을수록 신뢰도 높음)
  const sampleBonus = Math.min(
    (metrics.totalClicks + metrics.totalFeedbacks + metrics.totalEvaluations) /
      100,
    0.1
  );
  score += sampleBonus;

  return Math.min(1.0, score);
}

/**
 * 제품 품질 지표 조회 (병렬 처리)
 */
async function getProductQualityMetrics(
  productIds: string[]
): Promise<Map<string, ProductQualityMetrics>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseServerClient();
  const metricsMap = new Map<string, ProductQualityMetrics>();

  try {
    // 1. 클릭률 조회
    const { data: clickData } = await supabase
      .from("recommendations")
      .select("product_id, is_clicked")
      .in("product_id", productIds);

    // 2. 피드백 조회
    const { data: feedbackData } = await supabase
      .from("consultation_feedback")
      .select("consultation_id, accuracy_rating")
      .not("accuracy_rating", "is", null);

    // 피드백과 추천 연결
    const { data: recommendationsForFeedback } = await supabase
      .from("recommendations")
      .select("id, product_id, consultation_id")
      .in("product_id", productIds);

    // 3. 효과성 점수 조회
    const { data: ippaData } = await supabase
      .from("ippa_evaluations")
      .select("product_id, effectiveness_score")
      .in("product_id", productIds)
      .not("effectiveness_score", "is", null);

    // 제품별 통계 계산
    for (const productId of productIds) {
      const clicks = clickData?.filter((r) => r.product_id === productId) || [];
      const totalClicks = clicks.length;
      const clickedCount = clicks.filter((r) => r.is_clicked === true).length;
      const clickThroughRate = totalClicks > 0 ? clickedCount / totalClicks : 0;

      // 피드백 계산
      const relatedRecs =
        recommendationsForFeedback?.filter((r) => r.product_id === productId) ||
        [];
      const relatedConsultations = new Set(
        relatedRecs.map((r) => r.consultation_id)
      );
      const feedbacks =
        feedbackData?.filter((f) =>
          relatedConsultations.has(f.consultation_id)
        ) || [];
      const totalFeedbacks = feedbacks.length;
      const averageFeedbackRating =
        totalFeedbacks > 0
          ? feedbacks.reduce((sum, f) => sum + (f.accuracy_rating || 0), 0) /
            totalFeedbacks
          : 0;

      // 효과성 점수 계산
      const evaluations =
        ippaData?.filter((e) => e.product_id === productId) || [];
      const totalEvaluations = evaluations.length;
      const averageEffectivenessScore =
        totalEvaluations > 0
          ? evaluations.reduce(
              (sum, e) => sum + Number(e.effectiveness_score || 0),
              0
            ) / totalEvaluations
          : 0;

      metricsMap.set(productId, {
        clickThroughRate,
        averageFeedbackRating,
        averageEffectivenessScore,
        totalClicks,
        totalFeedbacks,
        totalEvaluations,
      });
    }
  } catch (error) {
    console.error(
      "[Product Recommender] Failed to get quality metrics:",
      error
    );
  }

  return metricsMap;
}

/**
 * 우선순위 계산
 */
function calculatePriority(
  breakdown: ProductRecommendation["scoreBreakdown"],
  product: any,
  flags: {
    isExactMatch: boolean;
    hasQualityMetrics: boolean;
  }
): number {
  if (!breakdown) return 1;

  let priority = 1;

  // ISO 매칭 우선순위
  if (flags.isExactMatch) {
    priority += 10;
  } else {
    priority += 5;
  }

  // 시맨틱 매칭 우선순위
  if (breakdown.semanticMatch > 0.6) {
    priority += 5;
  } else if (breakdown.semanticMatch > 0.4) {
    priority += 3;
  }

  // 직접 ICF 매칭 우선순위
  if (breakdown.directIcfMatch > 0.5) {
    priority += 4;
  }

  // 품질 지표 우선순위
  if (flags.hasQualityMetrics) {
    if (breakdown.qualityScore > 0.7) {
      priority += 6; // 우수한 품질
    } else if (breakdown.qualityScore > 0.5) {
      priority += 3; // 양호한 품질
    }
  }

  // 가격 우선순위 (적정 가격대)
  if (product.price) {
    if (product.price < 50000) priority += 2; // 저가
    else if (product.price < 200000) priority += 3; // 중가 (가장 선호)
    else if (product.price < 500000) priority += 1; // 고가
  }

  // 카테고리 정보 우선순위
  if (product.category) {
    priority += 1;
  }

  return priority;
}

/**
 * 매칭 이유 생성
 */
function buildMatchReason(
  breakdown: ProductRecommendation["scoreBreakdown"],
  flags: {
    isExactMatch: boolean;
    isRelatedMatch: boolean;
    hasSemanticMatch: boolean;
    hasDirectIcfMatch: boolean;
    hasQualityMetrics: boolean;
  }
): string {
  if (!breakdown) return "관련 제품";

  const reasons: string[] = [];

  if (flags.isExactMatch) {
    reasons.push("정확한 ISO 코드 매칭");
  } else if (flags.isRelatedMatch) {
    reasons.push("관련 ISO 코드 매칭");
  }

  if (flags.hasSemanticMatch && breakdown.semanticMatch > 0.5) {
    reasons.push(
      `의미적 유사도 ${(breakdown.semanticMatch * 100).toFixed(0)}%`
    );
  }

  if (flags.hasDirectIcfMatch && breakdown.directIcfMatch > 0.4) {
    reasons.push("ICF 코드 직접 매칭");
  }

  if (flags.hasQualityMetrics && breakdown.qualityScore > 0.6) {
    reasons.push("검증된 품질");
  }

  if (reasons.length === 0) {
    return "관련 제품";
  }

  return reasons.join(" • ");
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
 * 중복 제품 제거 및 점수 재계산
 */
function deduplicateAndRescoreProducts(
  recommendations: ProductRecommendation[],
  isoMatches: IsoMatch[]
): ProductRecommendation[] {
  const productMap = new Map<string, ProductRecommendation>();
  const isoScoreMap = new Map<string, number>();

    // ISO 매칭 점수 맵 생성
    for (const isoMatch of isoMatches) {
      isoScoreMap.set(isoMatch.isoCode, isoMatch.score);
    }

    for (const rec of recommendations) {
      const existing = productMap.get(rec.id);

      if (!existing) {
        productMap.set(rec.id, { ...rec });
      } else {
        // 중복 제품의 경우 최고 점수와 우선순위 유지
        // ISO 매칭 점수 반영
        const recIsoCode = rec.iso_code || "";
        const isoScore = isoScoreMap.get(recIsoCode) || 0;
      const adjustedScore = Math.max(
        existing.score,
        rec.score * (0.7 + isoScore * 0.3) // ISO 매칭 점수 반영
      );

      existing.score = adjustedScore;
      existing.priority = Math.max(existing.priority, rec.priority);

      // 여러 ISO 코드 매칭 표시
      if (!existing.match_reason.includes("여러")) {
        existing.match_reason = "여러 ISO 코드 매칭 • " + existing.match_reason;
      }

      // 점수 breakdown 통합
      if (existing.scoreBreakdown && rec.scoreBreakdown) {
        existing.scoreBreakdown = {
          isoMatch: Math.max(
            existing.scoreBreakdown.isoMatch,
            rec.scoreBreakdown.isoMatch
          ),
          semanticMatch: Math.max(
            existing.scoreBreakdown.semanticMatch,
            rec.scoreBreakdown.semanticMatch
          ),
          contextMatch: Math.max(
            existing.scoreBreakdown.contextMatch,
            rec.scoreBreakdown.contextMatch
          ),
          qualityScore: Math.max(
            existing.scoreBreakdown.qualityScore,
            rec.scoreBreakdown.qualityScore
          ),
          directIcfMatch: Math.max(
            existing.scoreBreakdown.directIcfMatch,
            rec.scoreBreakdown.directIcfMatch
          ),
        };
      }
    }
  }

  return Array.from(productMap.values());
}

/**
 * 카테고리별 다양화 (중복 카테고리 제품 제한)
 */
function diversifyByCategory(
  recommendations: ProductRecommendation[]
): ProductRecommendation[] {
  const categoryCount = new Map<string, number>();
  const maxPerCategory = 3; // 카테고리당 최대 제품 수

  return recommendations.filter((rec) => {
    const category = rec.category || "기타";
    const count = categoryCount.get(category) || 0;

    if (count >= maxPerCategory) {
      return false;
    }

    categoryCount.set(category, count + 1);
    return true;
  });
}

/**
 * 제품 추천 결과 포맷팅 (사용자 친화적)
 */
export function formatProductRecommendations(
  recommendations: ProductRecommendation[],
  options?: {
    includePricing?: boolean;
    includeManufacturer?: boolean;
    maxDescriptionLength?: number;
  }
): any[] {
  const {
    includePricing = true,
    includeManufacturer = true,
    maxDescriptionLength = 100,
  } = options || {};

  return recommendations.map((rec) => ({
    id: rec.id,
    name: rec.name,
    description: rec.description
      ? rec.description.length > maxDescriptionLength
        ? rec.description.substring(0, maxDescriptionLength) + "..."
        : rec.description
      : null,
    category: rec.category,
    manufacturer: includeManufacturer ? rec.manufacturer : undefined,
    price: includePricing ? rec.price : undefined,
    image_url: rec.image_url,
    purchase_link: rec.purchase_link,
    match_score: Math.round(rec.score * 100) / 100,
    match_reason: rec.match_reason,
    iso_code: rec.iso_code,
    score_breakdown: rec.scoreBreakdown
      ? {
          iso_match: Math.round(rec.scoreBreakdown.isoMatch * 100) / 100,
          semantic_match:
            Math.round(rec.scoreBreakdown.semanticMatch * 100) / 100,
          context_match:
            Math.round(rec.scoreBreakdown.contextMatch * 100) / 100,
          quality_score:
            Math.round(rec.scoreBreakdown.qualityScore * 100) / 100,
          direct_icf_match:
            Math.round(rec.scoreBreakdown.directIcfMatch * 100) / 100,
        }
      : undefined,
  }));
}
