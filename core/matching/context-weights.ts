/**
 * 사용자 컨텍스트 기반 가중치 시스템
 * 
 * 연령대, 환경, 장애 유형, 이전 사용 제품 등을 고려하여
 * 매칭 점수에 가중치를 적용합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";
import type { IsoMatch } from "./iso-mapping";

export interface UserContext {
  /** 연령대: 'child', 'adolescent', 'adult', 'elderly' */
  ageGroup?: string;
  /** 장애 유형: 'physical', 'visual', 'hearing', 'cognitive', 'multiple' 등 */
  disabilityType?: string;
  /** 장애 심각도: 'mild', 'moderate', 'severe' */
  disabilitySeverity?: string;
  /** 환경: 'home', 'work', 'school', 'community' 등 */
  environment?: string;
  /** 사용자 ID (이전 제품 조회용) */
  userId?: string;
  /** 상담 ID (이전 제품 조회용) */
  consultationId?: string;
}

export interface ContextWeights {
  /** ISO 코드별 가중치 (1.0 = 변화 없음, >1.0 = 보너스, <1.0 = 페널티) */
  weights: Map<string, number>;
  /** 가중치 적용 이유 (디버깅용) */
  reasons: Map<string, string[]>;
}

/**
 * 연령대별 ISO 코드 가중치 매핑
 * 
 * 특정 연령대에 더 적합한 제품에 보너스를 부여합니다.
 */
const AGE_GROUP_WEIGHTS: Record<string, Record<string, number>> = {
  child: {
    // 아동용 제품에 보너스
    "12 03": 1.15, // 아동용 이동 보조기기
    "12 06": 1.15, // 아동용 자세 보조기기
    "12 09": 1.15, // 아동용 식사 보조기기
    "12 12": 1.15, // 아동용 의사소통 보조기기
    "12 15": 1.15, // 아동용 학습 보조기기
  },
  adolescent: {
    // 청소년용 제품에 보너스
    "12 03": 1.1,
    "12 06": 1.1,
    "12 12": 1.1,
    "12 15": 1.1,
  },
  adult: {
    // 성인용 제품에 보너스 (기본값이므로 가중치 없음)
  },
  elderly: {
    // 노인용 제품에 보너스
    "12 03": 1.1, // 이동 보조기기
    "12 06": 1.1, // 자세 보조기기
    "12 09": 1.15, // 식사 보조기기 (노인에게 중요)
    "12 12": 1.1, // 의사소통 보조기기
    "12 18": 1.1, // 개인 보호 보조기기
    "12 21": 1.1, // 가사 보조기기
  },
};

/**
 * 장애 유형별 ISO 코드 가중치 매핑
 */
const DISABILITY_TYPE_WEIGHTS: Record<string, Record<string, number>> = {
  physical: {
    // 신체 장애에 적합한 제품
    "12 03": 1.2, // 이동 보조기기
    "12 06": 1.2, // 자세 보조기기
    "12 09": 1.15, // 식사 보조기기
    "12 12": 1.1, // 의사소통 보조기기
    "12 15": 1.1, // 학습 보조기기
    "12 18": 1.1, // 개인 보호 보조기기
    "12 21": 1.15, // 가사 보조기기
  },
  visual: {
    // 시각 장애에 적합한 제품
    "12 12": 1.3, // 의사소통 보조기기 (음성 인식 등)
    "12 15": 1.2, // 학습 보조기기 (점자 등)
    "12 18": 1.1, // 개인 보호 보조기기
    "12 21": 1.1, // 가사 보조기기
    "12 24": 1.2, // 시각 보조기기
  },
  hearing: {
    // 청각 장애에 적합한 제품
    "12 12": 1.3, // 의사소통 보조기기 (청각 보조기기)
    "12 15": 1.1, // 학습 보조기기
  },
  cognitive: {
    // 인지 장애에 적합한 제품
    "12 12": 1.2, // 의사소통 보조기기
    "12 15": 1.2, // 학습 보조기기
    "12 18": 1.15, // 개인 보호 보조기기
    "12 21": 1.1, // 가사 보조기기
  },
  multiple: {
    // 복합 장애에 적합한 제품 (모든 카테고리에 약간의 보너스)
    "12 03": 1.1,
    "12 06": 1.1,
    "12 09": 1.1,
    "12 12": 1.15,
    "12 15": 1.1,
    "12 18": 1.1,
    "12 21": 1.1,
  },
};

/**
 * 환경별 ISO 코드 가중치 매핑
 */
const ENVIRONMENT_WEIGHTS: Record<string, Record<string, number>> = {
  home: {
    // 가정용 제품
    "12 09": 1.1, // 식사 보조기기
    "12 18": 1.1, // 개인 보호 보조기기
    "12 21": 1.15, // 가사 보조기기
    "12 24": 1.1, // 시각 보조기기
  },
  work: {
    // 직장용 제품
    "12 03": 1.1, // 이동 보조기기
    "12 06": 1.1, // 자세 보조기기
    "12 12": 1.15, // 의사소통 보조기기
    "12 15": 1.1, // 학습 보조기기
  },
  school: {
    // 학교용 제품
    "12 03": 1.1, // 이동 보조기기
    "12 12": 1.15, // 의사소통 보조기기
    "12 15": 1.2, // 학습 보조기기
  },
  community: {
    // 지역사회용 제품
    "12 03": 1.15, // 이동 보조기기
    "12 06": 1.1, // 자세 보조기기
    "12 12": 1.1, // 의사소통 보조기기
  },
};

/**
 * 장애 심각도별 가중치 조정
 */
const SEVERITY_MULTIPLIERS: Record<string, number> = {
  mild: 0.95, // 경증: 약간의 페널티 (일반 제품도 사용 가능)
  moderate: 1.0, // 중증: 기본 가중치
  severe: 1.1, // 중증: 보조기기 필요성 높음
};

/**
 * 사용자의 이전 사용 제품 조회
 * 
 * @param userId 사용자 ID
 * @param consultationId 현재 상담 ID (제외할 상담)
 * @returns ISO 코드별 사용 횟수 맵
 */
async function getUserPreviousProducts(
  userId?: string,
  consultationId?: string
): Promise<Map<string, number>> {
  const productMap = new Map<string, number>();

  if (!userId) {
    return productMap;
  }

  try {
    const supabase = getSupabaseServerClient();

    // 1. 사용자의 상담 ID 목록 조회 (현재 상담 제외)
    const { data: consultations, error: consultError } = await supabase
      .from("consultations")
      .select("id")
      .eq("user_id", userId);
    
    if (consultError || !consultations || consultations.length === 0) {
      return productMap;
    }

    const consultationIds = consultations
      .map((c) => c.id)
      .filter((id) => id !== consultationId);

    if (consultationIds.length === 0) {
      return productMap;
    }

    // 2. 구매 완료된 추천 제품 조회
    const { data: purchasedRecommendations, error: purchaseError } = await supabase
      .from("recommendations")
      .select(`
        product_id,
        purchase_completed,
        product:product_id(iso_code_id, iso_codes:iso_code_id(code))
      `)
      .in("consultation_id", consultationIds)
      .eq("purchase_completed", true);

    if (purchaseError) {
      logEvent({
        category: "matching",
        action: "context_weights_error",
        payload: { error: purchaseError.message },
        level: "warn",
      });
    }

    // 3. K-IPPA 평가가 있는 제품 조회 (사용 중인 제품)
    const { data: evaluations, error: evalError } = await supabase
      .from("ippa_evaluations")
      .select(`
        product_id,
        recommendation_id,
        product:product_id(iso_code_id, iso_codes:iso_code_id(code))
      `)
      .eq("user_id", userId);

    if (evalError) {
      logEvent({
        category: "matching",
        action: "context_weights_error",
        payload: { error: evalError.message },
        level: "warn",
      });
    }

    // 4. ISO 코드별 사용 횟수 집계
    for (const rec of purchasedRecommendations || []) {
      // Supabase 조인 결과 처리
      const productData = rec.product as unknown;
      const product = Array.isArray(productData) ? productData[0] : productData;
      if (!product) continue;

      const isoCodesData = (product as { iso_codes?: unknown }).iso_codes;
      const isoCodesObj = Array.isArray(isoCodesData) ? isoCodesData[0] : isoCodesData;
      const isoCode = (isoCodesObj as { code?: string } | null)?.code;
      if (isoCode) {
        const count = productMap.get(isoCode) || 0;
        productMap.set(isoCode, count + 1);
      }
    }

    for (const eval_ of evaluations || []) {
      // Supabase 조인 결과 처리
      const productData = eval_.product as unknown;
      const product = Array.isArray(productData) ? productData[0] : productData;
      if (!product) continue;

      const isoCodesData = (product as { iso_codes?: unknown }).iso_codes;
      const isoCodesObj = Array.isArray(isoCodesData) ? isoCodesData[0] : isoCodesData;
      const isoCode = (isoCodesObj as { code?: string } | null)?.code;
      if (isoCode) {
        const count = productMap.get(isoCode) || 0;
        productMap.set(isoCode, count + 2); // 평가가 있으면 더 높은 가중치
      }
    }
  } catch (error) {
    logEvent({
      category: "matching",
      action: "context_weights_error",
      payload: { error: String(error) },
      level: "error",
    });
  }

  return productMap;
}

/**
 * 사용자 컨텍스트 기반 가중치 계산
 * 
 * @param context 사용자 컨텍스트
 * @param isoMatches ISO 매칭 결과
 * @returns 컨텍스트 가중치
 */
export async function calculateContextWeights(
  context: UserContext,
  isoMatches: IsoMatch[]
): Promise<ContextWeights> {
  const weights = new Map<string, number>();
  const reasons = new Map<string, string[]>();

  // 모든 ISO 코드에 기본 가중치 1.0 설정
  for (const match of isoMatches) {
    weights.set(match.isoCode, 1.0);
    reasons.set(match.isoCode, []);
  }

  try {
    // 1. 연령대별 가중치 적용
    if (context.ageGroup && AGE_GROUP_WEIGHTS[context.ageGroup]) {
      const ageWeights = AGE_GROUP_WEIGHTS[context.ageGroup];
      for (const [isoCode, weight] of Object.entries(ageWeights)) {
        const currentWeight = weights.get(isoCode) || 1.0;
        const newWeight = currentWeight * weight;
        weights.set(isoCode, newWeight);
        
        const currentReasons = reasons.get(isoCode) || [];
        currentReasons.push(`연령대(${context.ageGroup}): ${((weight - 1) * 100).toFixed(1)}%`);
        reasons.set(isoCode, currentReasons);
      }
    }

    // 2. 장애 유형별 가중치 적용
    if (context.disabilityType && DISABILITY_TYPE_WEIGHTS[context.disabilityType]) {
      const disabilityWeights = DISABILITY_TYPE_WEIGHTS[context.disabilityType];
      for (const [isoCode, weight] of Object.entries(disabilityWeights)) {
        const currentWeight = weights.get(isoCode) || 1.0;
        const newWeight = currentWeight * weight;
        weights.set(isoCode, newWeight);
        
        const currentReasons = reasons.get(isoCode) || [];
        currentReasons.push(`장애유형(${context.disabilityType}): ${((weight - 1) * 100).toFixed(1)}%`);
        reasons.set(isoCode, currentReasons);
      }
    }

    // 3. 장애 심각도별 가중치 조정
    if (context.disabilitySeverity && SEVERITY_MULTIPLIERS[context.disabilitySeverity]) {
      const multiplier = SEVERITY_MULTIPLIERS[context.disabilitySeverity];
      for (const isoCode of weights.keys()) {
        const currentWeight = weights.get(isoCode) || 1.0;
        const newWeight = currentWeight * multiplier;
        weights.set(isoCode, newWeight);
        
        const currentReasons = reasons.get(isoCode) || [];
        currentReasons.push(`심각도(${context.disabilitySeverity}): ${((multiplier - 1) * 100).toFixed(1)}%`);
        reasons.set(isoCode, currentReasons);
      }
    }

    // 4. 환경별 가중치 적용
    if (context.environment && ENVIRONMENT_WEIGHTS[context.environment]) {
      const envWeights = ENVIRONMENT_WEIGHTS[context.environment];
      for (const [isoCode, weight] of Object.entries(envWeights)) {
        const currentWeight = weights.get(isoCode) || 1.0;
        const newWeight = currentWeight * weight;
        weights.set(isoCode, newWeight);
        
        const currentReasons = reasons.get(isoCode) || [];
        currentReasons.push(`환경(${context.environment}): ${((weight - 1) * 100).toFixed(1)}%`);
        reasons.set(isoCode, currentReasons);
      }
    }

    // 5. 이전 사용 제품과의 유사도 반영
    const previousProducts = await getUserPreviousProducts(
      context.userId,
      context.consultationId
    );

    if (previousProducts.size > 0) {
      // 이전에 사용한 제품의 ISO 코드에 보너스
      // 사용 횟수가 많을수록 더 높은 보너스 (최대 15%)
      for (const [isoCode, usageCount] of previousProducts.entries()) {
        if (weights.has(isoCode)) {
          const bonus = Math.min(usageCount * 0.05, 0.15); // 사용 횟수당 5%, 최대 15%
          const currentWeight = weights.get(isoCode) || 1.0;
          const newWeight = currentWeight * (1.0 + bonus);
          weights.set(isoCode, newWeight);
          
          const currentReasons = reasons.get(isoCode) || [];
          currentReasons.push(`이전사용(${usageCount}회): ${(bonus * 100).toFixed(1)}%`);
          reasons.set(isoCode, currentReasons);
        }
      }
    }

    logEvent({
      category: "matching",
      action: "context_weights_calculated",
      payload: {
        ageGroup: context.ageGroup,
        disabilityType: context.disabilityType,
        environment: context.environment,
        previousProductsCount: previousProducts.size,
        weightedIsoCodes: Array.from(weights.entries())
          .filter(([_, w]) => w !== 1.0)
          .length,
      },
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "context_weights_error",
      payload: { error: String(error) },
      level: "error",
    });
  }

  return { weights, reasons };
}

/**
 * ISO 매칭 결과에 컨텍스트 가중치 적용
 * 
 * @param matches ISO 매칭 결과
 * @param context 사용자 컨텍스트
 * @returns 가중치가 적용된 ISO 매칭 결과
 */
export async function applyContextWeights(
  matches: IsoMatch[],
  context: UserContext
): Promise<IsoMatch[]> {
  if (matches.length === 0) {
    return matches;
  }

  try {
    const { weights, reasons } = await calculateContextWeights(context, matches);

    return matches.map((match) => {
      const weight = weights.get(match.isoCode) || 1.0;
      const weightedScore = Math.min(match.score * weight, 1.0); // 최대 1.0으로 제한
      const matchReasons = reasons.get(match.isoCode) || [];

      return {
        ...match,
        score: weightedScore,
        // 디버깅용 메타데이터 (개발 환경에서만)
        ...(process.env.NODE_ENV === "development" && {
          _context: {
            weight: weight.toFixed(3),
            originalScore: match.score.toFixed(3),
            reasons: matchReasons,
          },
        }),
      };
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "context_weights_apply_error",
      payload: { error: String(error) },
      level: "error",
    });

    // 에러 발생 시 원본 반환
    return matches;
  }
}

