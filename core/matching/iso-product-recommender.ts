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
import { matchProductToIcf, combineProductIcfScore } from "./product-icf-matcher";
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
    // 1. 정확한 ISO 코드 매칭 제품 검색
    let exactQuery = supabase
      .from("products")
      .select("*")
      .eq("iso_code", isoCode)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

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

    // 2. 관련 ISO 코드 제품 검색 (부분 매칭)
    let relatedProducts: any[] = [];
    if (includeRelated && exactProducts.length < limit) {
      const isoPrefix = isoCode.split(" ")[0]; // "15 03" -> "15"

      const { data: relatedData, error: relatedError } = await supabase
        .from("products")
        .select("*")
        .like("iso_code", `${isoPrefix}%`)
        .neq("iso_code", isoCode)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit * 2 - exactProducts.length); // 더 많이 가져와서 필터링

      if (!relatedError && relatedData) {
        relatedProducts = relatedData;
      }
    }

    // 3. 제품 품질 지표 조회 (비동기, 병렬 처리)
    const qualityMetricsPromise = useQualityMetrics
      ? getProductQualityMetrics([...exactProducts, ...relatedProducts].map((p) => p.id))
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

    // 5. 필터링 및 제한
    const filteredRecommendations = recommendations
      .filter((product) => product.score >= minScore)
      .sort((a, b) => {
        // 우선순위 > 점수 > 품질 점수
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score;
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
      console.warn("[Product Recommender] Failed to create ICF embedding:", error);
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

      // 1. ISO 코드 매칭 점수 (기본 점수)
      const isExactMatch = product.iso_code === targetIsoCode;
      const isoPrefix = targetIsoCode.split(" ")[0];
      const isRelatedMatch = product.iso_code.startsWith(isoPrefix);

      if (isExactMatch) {
        breakdown.isoMatch = 0.9 - index * 0.02; // 정확 매칭
      } else if (isRelatedMatch) {
        breakdown.isoMatch = 0.7 - index * 0.03; // 관련 매칭
      } else {
        breakdown.isoMatch = 0.4 - index * 0.05; // 기타 매칭
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
        const directMatches = await matchProductToIcf(
          {
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            iso_code: product.iso_code,
          },
          context.icfCodes
        );

        if (directMatches.length > 0) {
          // 최고 점수 사용
          const maxDirectScore = Math.max(...directMatches.map((m) => m.score));
          breakdown.directIcfMatch = maxDirectScore * 0.7; // 최대 0.7점
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

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        iso_code: product.iso_code,
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
 * 가중 평균으로 최종 점수 계산
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

  // 기본 가중치
  let weights = {
    isoMatch: 0.35,
    semanticMatch: 0.25,
    contextMatch: 0.15,
    qualityScore: 0.15,
    directIcfMatch: 0.1,
  };

  // 상황별 가중치 조정
  if (flags.isExactMatch) {
    // 정확한 ISO 매칭이 있으면 ISO 매칭 가중치 증가
    weights.isoMatch = 0.45;
    weights.semanticMatch = 0.2;
  }

  if (flags.hasSemanticMatch && !flags.isExactMatch) {
    // 시맨틱 매칭이 있으면 가중치 증가
    weights.semanticMatch = 0.35;
    weights.isoMatch = 0.3;
  }

  if (flags.hasDirectIcfMatch) {
    // 직접 ICF 매칭이 있으면 가중치 증가
    weights.directIcfMatch = 0.2;
    weights.isoMatch = 0.3;
  }

  if (flags.hasQualityMetrics) {
    // 품질 지표가 있으면 가중치 증가
    weights.qualityScore = 0.2;
  }

  // 가중치 정규화
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  Object.keys(weights).forEach((key) => {
    (weights as any)[key] = (weights as any)[key] / totalWeight;
  });

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
        product.iso_code?.startsWith("22"))
    ) {
      score += 0.2;
    }

    // 청각 장애
    if (
      (typeLower.includes("청각") || typeLower.includes("hearing")) &&
      (categoryLower.includes("청각") ||
        categoryLower.includes("청력") ||
        categoryLower.includes("귀") ||
        product.iso_code?.startsWith("21"))
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
        product.iso_code?.startsWith("12"))
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
    const effectivenessScore = Math.min(metrics.averageEffectivenessScore / 20, 1) * 0.2; // 최대 20점 기준
    score += effectivenessScore;
  }

  // 신뢰도 보너스 (샘플 수가 많을수록 신뢰도 높음)
  const sampleBonus = Math.min(
    (metrics.totalClicks + metrics.totalFeedbacks + metrics.totalEvaluations) / 100,
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
      const relatedRecs = recommendationsForFeedback?.filter(
        (r) => r.product_id === productId
      ) || [];
      const relatedConsultations = new Set(relatedRecs.map((r) => r.consultation_id));
      const feedbacks = feedbackData?.filter((f) =>
        relatedConsultations.has(f.consultation_id)
      ) || [];
      const totalFeedbacks = feedbacks.length;
      const averageFeedbackRating =
        totalFeedbacks > 0
          ? feedbacks.reduce((sum, f) => sum + (f.accuracy_rating || 0), 0) / totalFeedbacks
          : 0;

      // 효과성 점수 계산
      const evaluations = ippaData?.filter((e) => e.product_id === productId) || [];
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
    console.error("[Product Recommender] Failed to get quality metrics:", error);
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
      const isoScore = isoScoreMap.get(rec.iso_code) || 0;
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
function diversifyByCategory(recommendations: ProductRecommendation[]): ProductRecommendation[] {
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
          semantic_match: Math.round(rec.scoreBreakdown.semanticMatch * 100) / 100,
          context_match: Math.round(rec.scoreBreakdown.contextMatch * 100) / 100,
          quality_score: Math.round(rec.scoreBreakdown.qualityScore * 100) / 100,
          direct_icf_match: Math.round(rec.scoreBreakdown.directIcfMatch * 100) / 100,
        }
      : undefined,
  }));
}
