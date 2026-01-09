/**
 * ISO 코드 기반 보조기기 추천 API
 *
 * POST /api/recommendations/iso-products
 *
 * ICF 코드를 기반으로 ISO 코드를 매칭하고,
 * 해당 ISO 코드에 맞는 보조기기를 추천합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getIsoMatchesAsync } from "@/core/matching/iso-mapping";
import {
  recommendProductsByMultipleIsoCodes,
  formatProductRecommendations
} from "@/core/matching/iso-product-recommender";

export interface RecommendationRequest {
  icfCodes: string[]; // ICF 코드 배열 (예: ["b730", "d630", "d640"])
  options?: {
    limit?: number; // 최대 추천 개수
    maxProductsPerIso?: number; // ISO 코드당 최대 제품 수
    diversifyCategories?: boolean; // 카테고리 다양화 여부
    includePricing?: boolean; // 가격 정보 포함
    includeManufacturer?: boolean; // 제조사 정보 포함
  };
}

export interface RecommendationResponse {
  success: boolean;
  data?: {
    icfCodes: string[];
    isoMatches: Array<{
      isoCode: string;
      label: string;
      score: number;
      confidence: number;
    }>;
    recommendations: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      manufacturer: string | null;
      price: number | null;
      image_url: string | null;
      purchase_link: string | null;
      match_score: number;
      match_reason: string;
      iso_code: string;
    }>;
    totalProducts: number;
    processingTime: number;
  };
  error?: string;
}

/**
 * POST: ICF 코드를 기반으로 ISO 제품 추천
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: RecommendationRequest = await request.json();
    const { icfCodes, options = {} } = body;

    // 입력 검증
    if (!icfCodes || !Array.isArray(icfCodes) || icfCodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "ICF 코드 배열이 필요합니다"
      } as RecommendationResponse, { status: 400 });
    }

    // 기본 옵션 설정
    const defaultOptions = {
      limit: 10,
      maxProductsPerIso: 3,
      diversifyCategories: true,
      includePricing: true,
      includeManufacturer: true,
      ...options
    };

    console.log(`[ISO Product API] ICF 코드 추천 요청:`, {
      icfCodes,
      options: defaultOptions
    });

    // 1. ICF → ISO 매칭 (Division 레벨로 확장)
    const supabase = getSupabaseServerClient();
    const isoMatches = await getIsoMatchesAsync(icfCodes, {
      expandToDivisions: true,
      supabase,
    });

    if (isoMatches.length === 0) {
      return NextResponse.json({
        success: false,
        error: "제공된 ICF 코드에 매칭되는 ISO 코드가 없습니다"
      } as RecommendationResponse, { status: 404 });
    }

    console.log(`[ISO Product API] ISO 매칭 결과: ${isoMatches.length}개 코드`);

    // 2. ISO 기반 제품 추천
    const recommendationResult = await recommendProductsByMultipleIsoCodes(
      isoMatches,
      {
        icfCodes,
        isoMatches,
      },
      {
        limit: defaultOptions.limit,
        maxProductsPerIso: defaultOptions.maxProductsPerIso,
        diversifyCategories: defaultOptions.diversifyCategories,
      }
    );

    // 3. 결과 포맷팅
    const formattedRecommendations = formatProductRecommendations(
      recommendationResult.recommendations,
      {
        includePricing: defaultOptions.includePricing,
        includeManufacturer: defaultOptions.includeManufacturer,
        maxDescriptionLength: 150
      }
    );

    // 4. ISO 매칭 결과 요약
    const isoSummary = isoMatches.map(match => ({
      isoCode: match.isoCode,
      label: match.label,
      score: match.score,
      confidence: match.matchedIcf.length / icfCodes.length // 매칭된 ICF 비율
    }));

    const processingTime = Date.now() - startTime;

    console.log(`[ISO Product API] 추천 완료: ${formattedRecommendations.length}개 제품, ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        icfCodes,
        isoMatches: isoSummary,
        recommendations: formattedRecommendations,
        totalProducts: recommendationResult.totalProducts,
        processingTime
      }
    } as RecommendationResponse);

  } catch (error) {
    console.error("[ISO Product API] 오류 발생:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류 발생"
    } as RecommendationResponse, { status: 500 });
  }
}

/**
 * GET: API 정보 및 사용 예제
 */
export async function GET() {
  return NextResponse.json({
    name: "ISO 코드 기반 보조기기 추천 API",
    version: "1.0.0",
    description: "ICF 코드를 기반으로 ISO 9999 표준에 따른 보조기기를 추천합니다",
    endpoint: "POST /api/recommendations/iso-products",
    example: {
      request: {
        icfCodes: ["b730", "d630", "d640"],
        options: {
          limit: 10,
          diversifyCategories: true
        }
      },
      response: {
        success: true,
        data: {
          icfCodes: ["b730", "d630", "d640"],
          isoMatches: [
            {
              isoCode: "15 03",
              label: "음식 및 음료 준비 보조기기",
              score: 0.85,
              confidence: 0.67
            }
          ],
          recommendations: [
            {
              id: "prod-001",
              name: "무게 조절 식기 세트",
              category: "식사",
              price: 45000,
              match_score: 0.95,
              match_reason: "정확한 ISO 코드 매칭"
            }
          ],
          totalProducts: 25,
          processingTime: 150
        }
      }
    }
  });
}