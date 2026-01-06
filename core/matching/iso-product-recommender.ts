/**
 * ISO 코드 기반 보조기기 추천 시스템
 *
 * ISO 9999 코드를 기반으로 가장 적합한 보조기기를 추천합니다.
 * 이는 프로젝트의 핵심 기능으로, 정확한 매칭이 성패를 좌우합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IsoMatch } from "./iso-mapping";

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
  score: number; // 추천 점수 (0-1)
  match_reason: string; // 매칭 이유
  priority: number; // 우선순위 (높을수록 먼저 추천)
}

export interface IsoProductRecommendation {
  isoCode: string;
  products: ProductRecommendation[];
  totalProducts: number;
  confidence: number; // ISO 코드 매칭 신뢰도
}

/**
 * 단일 ISO 코드에 대한 제품 추천
 */
export async function recommendProductsByIsoCode(
  isoCode: string,
  options?: {
    limit?: number;
    minScore?: number;
    includeRelated?: boolean;
  }
): Promise<IsoProductRecommendation> {
  const { limit = 10, minScore = 0.3, includeRelated = true } = options || {};

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
        .limit(limit - exactProducts.length);

      if (!relatedError && relatedData) {
        relatedProducts = relatedData;
      }
    }

    // 3. 제품 점수 계산 및 정렬
    const allProducts = [...exactProducts, ...relatedProducts];
    const recommendations = calculateProductScores(allProducts, isoCode, exactProducts.length);

    // 4. 필터링 및 제한
    const filteredRecommendations = recommendations
      .filter(product => product.score >= minScore)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    return {
      isoCode,
      products: filteredRecommendations,
      totalProducts: recommendations.length,
      confidence: exactProducts.length > 0 ? 1.0 : 0.7, // 정확 매칭 vs 부분 매칭
    };

  } catch (error) {
    console.error("[ISO Product Recommender] Error:", error);
    return {
      isoCode,
      products: [],
      totalProducts: 0,
      confidence: 0,
    };
  }
}

/**
 * 여러 ISO 코드에 대한 통합 제품 추천
 */
export async function recommendProductsByMultipleIsoCodes(
  isoMatches: IsoMatch[],
  options?: {
    limit?: number;
    maxProductsPerIso?: number;
    diversifyCategories?: boolean;
  }
): Promise<{
  recommendations: ProductRecommendation[];
  isoBreakdown: IsoProductRecommendation[];
  totalProducts: number;
}> {
  const {
    limit = 20,
    maxProductsPerIso = 5,
    diversifyCategories = true
  } = options || {};

  const supabase = getSupabaseServerClient();
  const isoBreakdown: IsoProductRecommendation[] = [];
  const allRecommendations: ProductRecommendation[] = [];

  try {
    // 각 ISO 코드별 추천 수집
    for (const isoMatch of isoMatches) {
      const result = await recommendProductsByIsoCode(
        isoMatch.isoCode,
        { limit: maxProductsPerIso, minScore: 0.2 }
      );

      isoBreakdown.push(result);
      allRecommendations.push(...result.products);
    }

    // 중복 제거 및 점수 재계산
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
        // 우선순위 > 점수 > 가격(낮은 순)
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (Math.abs(a.score - b.score) > 0.1) return b.score - a.score;
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
    return {
      recommendations: [],
      isoBreakdown: [],
      totalProducts: 0,
    };
  }
}

/**
 * 제품 점수 계산 및 우선순위 결정
 */
function calculateProductScores(
  products: any[],
  targetIsoCode: string,
  exactMatchCount: number
): ProductRecommendation[] {
  return products.map((product, index) => {
    const isExactMatch = product.iso_code === targetIsoCode;
    const isRelatedMatch = product.iso_code.startsWith(targetIsoCode.split(" ")[0]);

    // 기본 점수 계산
    let score = 0.5; // 기본 점수
    let priority = 1;
    let matchReason = "관련 제품";

    if (isExactMatch) {
      score = 0.9 + (exactMatchCount - index) * 0.05; // 정확 매칭 + 순위 보너스
      priority = 10;
      matchReason = "정확한 ISO 코드 매칭";
    } else if (isRelatedMatch) {
      score = 0.7 - index * 0.05; // 관련 매칭
      priority = 5;
      matchReason = "관련 ISO 코드 매칭";
    } else {
      score = 0.4 - index * 0.1; // 기타 매칭
      priority = 1;
    }

    // 가격 보너스 (적정 가격 제품 우선)
    if (product.price) {
      if (product.price < 50000) priority += 2; // 저가 제품
      else if (product.price < 200000) priority += 3; // 중가 제품
      else if (product.price < 500000) priority += 1; // 고가 제품
    }

    // 카테고리 다양성 보너스
    if (product.category) {
      priority += 1; // 카테고리 정보 있는 제품
    }

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
      score: Math.max(0, Math.min(1, score)), // 0-1 범위 제한
      match_reason: matchReason,
      priority,
    };
  });
}

/**
 * 중복 제품 제거 및 점수 재계산
 */
function deduplicateAndRescoreProducts(
  recommendations: ProductRecommendation[],
  isoMatches: IsoMatch[]
): ProductRecommendation[] {
  const productMap = new Map<string, ProductRecommendation>();

  for (const rec of recommendations) {
    const existing = productMap.get(rec.id);

    if (!existing) {
      productMap.set(rec.id, { ...rec });
    } else {
      // 중복 제품의 경우 최고 점수와 우선순위 유지
      existing.score = Math.max(existing.score, rec.score);
      existing.priority = Math.max(existing.priority, rec.priority);

      // 여러 ISO 코드 매칭 표시
      if (!existing.match_reason.includes("여러")) {
        existing.match_reason = "여러 ISO 코드 매칭";
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

  return recommendations.filter(rec => {
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
    maxDescriptionLength = 100
  } = options || {};

  return recommendations.map(rec => ({
    id: rec.id,
    name: rec.name,
    description: rec.description ?
      (rec.description.length > maxDescriptionLength ?
        rec.description.substring(0, maxDescriptionLength) + "..." :
        rec.description) :
      null,
    category: rec.category,
    manufacturer: includeManufacturer ? rec.manufacturer : undefined,
    price: includePricing ? rec.price : undefined,
    image_url: rec.image_url,
    purchase_link: rec.purchase_link,
    match_score: Math.round(rec.score * 100) / 100,
    match_reason: rec.match_reason,
    iso_code: rec.iso_code,
  }));
}