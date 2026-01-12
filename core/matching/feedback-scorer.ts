/**
 * 피드백 기반 점수 보정 시스템
 * 
 * 실제 사용자 피드백 데이터(클릭, 구매, K-IPPA 효과성 평가)를 기반으로
 * ICF-ISO 매칭 점수를 보정하여 정확도를 향상시킵니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";
import type { IsoMatch } from "./iso-mapping";
import {
  getRealtimeWeightAdjustment,
  updateRealtimeLearningStats,
} from "@/lib/realtime-learning";

export interface FeedbackStats {
  /** ISO 코드 */
  isoCode: string;
  /** 클릭률 (0-1) */
  clickRate: number;
  /** 구매 전환율 (0-1) */
  purchaseRate: number;
  /** 평균 효과성 점수 (K-IPPA) */
  avgEffectivenessScore: number;
  /** 샘플 수 (신뢰도 계산용) */
  sampleCount: number;
  /** 최종 보정 계수 (1.0 = 변화 없음, >1.0 = 보너스, <1.0 = 페널티) */
  correctionFactor: number;
}

interface IcfIsoCombination {
  /** ICF 코드 배열 (정렬된 상태) */
  icfCodes: string[];
  /** ISO 코드 */
  isoCode: string;
  /** 클릭 수 */
  clicks: number;
  /** 노출 수 */
  impressions: number;
  /** 구매 수 */
  purchases: number;
  /** 효과성 평가 수 */
  evaluations: number;
  /** 평균 효과성 점수 */
  avgEffectiveness: number;
}

/**
 * ICF 코드 조합을 정규화 (정렬하여 일관성 유지)
 */
function normalizeIcfCodes(icfCodes: string[]): string[] {
  return [...icfCodes].sort();
}

/**
 * ISO 코드별 피드백 통계 수집
 * 
 * @param isoCodes 조회할 ISO 코드 목록 (빈 배열이면 전체 조회)
 * @param minSampleCount 최소 샘플 수 (이보다 적으면 신뢰도 낮음)
 * @returns ISO 코드별 피드백 통계
 */
export async function getFeedbackStats(
  isoCodes: string[] = [],
  minSampleCount: number = 3
): Promise<Map<string, FeedbackStats>> {
  const supabase = getSupabaseServerClient();
  const statsMap = new Map<string, FeedbackStats>();

  try {
    // 1. 추천 데이터에서 ISO 코드별 클릭률 및 구매 전환율 계산
    let recommendationsQuery = supabase
      .from("recommendations")
      .select(`
        product_id,
        is_clicked,
        purchase_completed,
        product:product_id(iso_code_id, iso_codes:iso_code_id(code))
      `);

    // ISO 코드 필터링 (제품 조인 후 필터링)
    const { data: recommendations, error: recError } = await recommendationsQuery;

    if (recError) {
      logEvent({
        category: "matching",
        action: "feedback_stats_error",
        payload: { error: recError.message },
        level: "error",
      });
      return statsMap;
    }

    // ISO 코드별 통계 집계
    const isoStats = new Map<
      string,
      { impressions: number; clicks: number; purchases: number }
    >();

    for (const rec of recommendations || []) {
      // Supabase 조인 결과 처리
      const productData = rec.product as unknown;
      const product = Array.isArray(productData) ? productData[0] : productData;
      if (!product) continue;

      const isoCodesData = (product as { iso_codes?: unknown }).iso_codes;
      const isoCodesObj = Array.isArray(isoCodesData) ? isoCodesData[0] : isoCodesData;
      const isoCode = (isoCodesObj as { code?: string } | null)?.code;
      if (!isoCode) continue;

      // ISO 코드 필터링 (지정된 경우)
      if (isoCodes.length > 0 && !isoCodes.includes(isoCode)) continue;

      const stats = isoStats.get(isoCode) || {
        impressions: 0,
        clicks: 0,
        purchases: 0,
      };

      stats.impressions++;
      if (rec.is_clicked) stats.clicks++;
      if (rec.purchase_completed) stats.purchases++;

      isoStats.set(isoCode, stats);
    }

    // 2. K-IPPA 효과성 평가에서 ISO 코드별 평균 효과성 점수 계산
    let evaluationsQuery = supabase
      .from("ippa_evaluations")
      .select(`
        product_id,
        effectiveness_score,
        product:product_id(iso_code_id, iso_codes:iso_code_id(code))
      `)
      .not("effectiveness_score", "is", null);

    const { data: evaluations, error: evalError } = await evaluationsQuery;

    if (evalError) {
      logEvent({
        category: "matching",
        action: "feedback_stats_error",
        payload: { error: evalError.message },
        level: "warn",
      });
    }

    // ISO 코드별 효과성 점수 집계
    const isoEffectiveness = new Map<
      string,
      { totalScore: number; count: number }
    >();

    for (const eval_ of evaluations || []) {
      // Supabase 조인 결과 처리
      const productData = eval_.product as unknown;
      const product = Array.isArray(productData) ? productData[0] : productData;
      if (!product) continue;

      const isoCodesData = (product as { iso_codes?: unknown }).iso_codes;
      const isoCodesObj = Array.isArray(isoCodesData) ? isoCodesData[0] : isoCodesData;
      const isoCode = (isoCodesObj as { code?: string } | null)?.code;
      if (!isoCode) continue;

      // ISO 코드 필터링 (지정된 경우)
      if (isoCodes.length > 0 && !isoCodes.includes(isoCode)) continue;

      const stats = isoEffectiveness.get(isoCode) || {
        totalScore: 0,
        count: 0,
      };

      stats.totalScore += Number(eval_.effectiveness_score) || 0;
      stats.count++;

      isoEffectiveness.set(isoCode, stats);
    }

    // 3. 통계 결합 및 보정 계수 계산
    const allIsoCodes = new Set([
      ...isoStats.keys(),
      ...isoEffectiveness.keys(),
    ]);

    for (const isoCode of allIsoCodes) {
      const recStats = isoStats.get(isoCode) || {
        impressions: 0,
        clicks: 0,
        purchases: 0,
      };
      const effStats = isoEffectiveness.get(isoCode) || {
        totalScore: 0,
        count: 0,
      };

      const clickRate =
        recStats.impressions > 0
          ? recStats.clicks / recStats.impressions
          : 0;
      const purchaseRate =
        recStats.clicks > 0 ? recStats.purchases / recStats.clicks : 0;
      const avgEffectivenessScore =
        effStats.count > 0 ? effStats.totalScore / effStats.count : 0;

      const sampleCount =
        recStats.impressions + effStats.count;

      // 최소 샘플 수 미만이면 신뢰도 낮음 (보정 계수 1.0)
      if (sampleCount < minSampleCount) {
        statsMap.set(isoCode, {
          isoCode,
          clickRate,
          purchaseRate,
          avgEffectivenessScore,
          sampleCount,
          correctionFactor: 1.0,
        });
        continue;
      }

      // 보정 계수 계산
      // - 클릭률: 0.1 (10%) 기준으로 정규화 (0.1 = 1.0, 0.2 = 1.1, 0.05 = 0.95)
      // - 구매 전환율: 0.05 (5%) 기준으로 정규화
      // - 효과성 점수: 5.0 기준으로 정규화 (5.0 = 1.0, 10.0 = 1.2, 0 = 0.9)
      const clickBonus = Math.min((clickRate - 0.1) * 2 + 1.0, 1.3); // 최대 30% 보너스
      const purchaseBonus = Math.min((purchaseRate - 0.05) * 4 + 1.0, 1.3);
      const effectivenessBonus =
        avgEffectivenessScore > 0
          ? Math.min(avgEffectivenessScore / 5.0, 1.3)
          : 0.9; // 효과성 데이터 없으면 약간 페널티

      // 가중 평균 (클릭률 30%, 구매 전환율 30%, 효과성 40%)
      const correctionFactor =
        clickBonus * 0.3 + purchaseBonus * 0.3 + effectivenessBonus * 0.4;

      statsMap.set(isoCode, {
        isoCode,
        clickRate,
        purchaseRate,
        avgEffectivenessScore,
        sampleCount,
        correctionFactor: Math.max(0.7, Math.min(1.3, correctionFactor)), // 0.7 ~ 1.3 범위로 제한
      });
    }

    logEvent({
      category: "matching",
      action: "feedback_stats_calculated",
      payload: {
        totalIsoCodes: statsMap.size,
        filteredIsoCodes: isoCodes.length,
      },
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "feedback_stats_error",
      payload: { error: String(error) },
      level: "error",
    });
  }

  return statsMap;
}

/**
 * ICF 코드 조합과 ISO 코드의 조합별 피드백 통계 수집
 * 
 * 더 정확한 매칭을 위해 특정 ICF 코드 조합에서 특정 ISO 코드가
 * 얼마나 효과적이었는지 분석합니다.
 * 
 * @param icfCodes ICF 코드 배열
 * @param isoCodes 조회할 ISO 코드 목록 (빈 배열이면 전체 조회)
 * @param minSampleCount 최소 샘플 수
 * @returns ICF-ISO 조합별 보정 계수 맵 (key: "icf1,icf2|isoCode")
 */
export async function getIcfIsoCombinationStats(
  icfCodes: string[],
  isoCodes: string[] = [],
  minSampleCount: number = 2
): Promise<Map<string, number>> {
  const supabase = getSupabaseServerClient();
  const combinationMap = new Map<string, number>();

  if (icfCodes.length === 0) {
    return combinationMap;
  }

  try {
    const normalizedIcf = normalizeIcfCodes(icfCodes);
    const icfKey = normalizedIcf.join(",");

    // 1. 해당 ICF 코드 조합을 가진 상담들의 분석 결과 조회
    const { data: analysisResults, error: analysisError } = await supabase
      .from("analysis_results")
      .select("consultation_id, icf_codes")
      .not("icf_codes", "is", null);

    if (analysisError) {
      logEvent({
        category: "matching",
        action: "icf_iso_combination_stats_error",
        payload: { error: analysisError.message },
        level: "error",
      });
      return combinationMap;
    }

    // 2. ICF 코드 조합이 일치하는 상담 ID 추출
    const matchingConsultationIds: string[] = [];

    for (const analysis of analysisResults || []) {
      const analysisIcf = analysis.icf_codes as {
        b?: string[];
        d?: string[];
        e?: string[];
      } | null;

      if (!analysisIcf) continue;

      // 모든 ICF 코드 추출
      const allIcfCodes = [
        ...(analysisIcf.b || []),
        ...(analysisIcf.d || []),
        ...(analysisIcf.e || []),
      ];

      const normalizedAnalysisIcf = normalizeIcfCodes(allIcfCodes);

      // 정규화된 ICF 코드가 포함되어 있는지 확인 (부분 일치 허용)
      const hasAllCodes = normalizedIcf.every((code) =>
        normalizedAnalysisIcf.includes(code)
      );

      if (hasAllCodes) {
        matchingConsultationIds.push(analysis.consultation_id);
      }
    }

    if (matchingConsultationIds.length === 0) {
      return combinationMap;
    }

    // 3. 해당 상담들의 추천 데이터에서 ISO 코드별 통계 집계
    const { data: recommendations, error: recError } = await supabase
      .from("recommendations")
      .select(`
        id,
        consultation_id,
        product_id,
        is_clicked,
        purchase_completed,
        product:product_id(iso_code_id, iso_codes:iso_code_id(code))
      `)
      .in("consultation_id", matchingConsultationIds);

    if (recError) {
      logEvent({
        category: "matching",
        action: "icf_iso_combination_stats_error",
        payload: { error: recError.message },
        level: "warn",
      });
      return combinationMap;
    }

    // 4. ISO 코드별 통계 집계
    const isoStats = new Map<
      string,
      { impressions: number; clicks: number; purchases: number }
    >();

    for (const rec of recommendations || []) {
      // Supabase 조인 결과 처리
      const productData = rec.product as unknown;
      const product = Array.isArray(productData) ? productData[0] : productData;
      if (!product) continue;

      const isoCodesData = (product as { iso_codes?: unknown }).iso_codes;
      const isoCodesObj = Array.isArray(isoCodesData) ? isoCodesData[0] : isoCodesData;
      const isoCode = (isoCodesObj as { code?: string } | null)?.code;
      if (!isoCode) continue;

      // ISO 코드 필터링 (지정된 경우)
      if (isoCodes.length > 0 && !isoCodes.includes(isoCode)) continue;

      const stats = isoStats.get(isoCode) || {
        impressions: 0,
        clicks: 0,
        purchases: 0,
      };

      stats.impressions++;
      if (rec.is_clicked) stats.clicks++;
      if (rec.purchase_completed) stats.purchases++;

      isoStats.set(isoCode, stats);
    }

    // 5. K-IPPA 효과성 평가에서 ISO 코드별 평균 효과성 점수 계산
    const { data: evaluations, error: evalError } = await supabase
      .from("ippa_evaluations")
      .select(`
        product_id,
        effectiveness_score,
        recommendation_id,
        product:product_id(iso_code_id, iso_codes:iso_code_id(code)),
        recommendation:recommendation_id(consultation_id)
      `)
      .not("effectiveness_score", "is", null)
      .in("recommendation_id",
        recommendations?.map((r) => r.id).filter(Boolean) || []
      );

    if (evalError) {
      logEvent({
        category: "matching",
        action: "icf_iso_combination_stats_error",
        payload: { error: evalError.message },
        level: "warn",
      });
    }

    // ISO 코드별 효과성 점수 집계
    const isoEffectiveness = new Map<
      string,
      { totalScore: number; count: number }
    >();

    for (const eval_ of evaluations || []) {
      // Supabase 조인 결과 처리
      const productData = eval_.product as unknown;
      const product = Array.isArray(productData) ? productData[0] : productData;
      if (!product) continue;

      const isoCodesData = (product as { iso_codes?: unknown }).iso_codes;
      const isoCodesObj = Array.isArray(isoCodesData) ? isoCodesData[0] : isoCodesData;
      const isoCode = (isoCodesObj as { code?: string } | null)?.code;
      if (!isoCode) continue;

      // ISO 코드 필터링 (지정된 경우)
      if (isoCodes.length > 0 && !isoCodes.includes(isoCode)) continue;

      const stats = isoEffectiveness.get(isoCode) || {
        totalScore: 0,
        count: 0,
      };

      stats.totalScore += Number(eval_.effectiveness_score) || 0;
      stats.count++;

      isoEffectiveness.set(isoCode, stats);
    }

    // 6. 보정 계수 계산
    for (const [isoCode, recStats] of isoStats.entries()) {
      const effStats = isoEffectiveness.get(isoCode) || {
        totalScore: 0,
        count: 0,
      };

      const sampleCount = recStats.impressions + effStats.count;

      if (sampleCount < minSampleCount) {
        continue; // 샘플 수 부족하면 스킵
      }

      const clickRate =
        recStats.impressions > 0
          ? recStats.clicks / recStats.impressions
          : 0;
      const purchaseRate =
        recStats.clicks > 0 ? recStats.purchases / recStats.clicks : 0;
      const avgEffectivenessScore =
        effStats.count > 0 ? effStats.totalScore / effStats.count : 0;

      // 보정 계수 계산 (동일한 로직)
      const clickBonus = Math.min((clickRate - 0.1) * 2 + 1.0, 1.3);
      const purchaseBonus = Math.min((purchaseRate - 0.05) * 4 + 1.0, 1.3);
      const effectivenessBonus =
        avgEffectivenessScore > 0
          ? Math.min(avgEffectivenessScore / 5.0, 1.3)
          : 0.9;

      const correctionFactor =
        clickBonus * 0.3 + purchaseBonus * 0.3 + effectivenessBonus * 0.4;

      const combinationKey = `${icfKey}|${isoCode}`;
      combinationMap.set(
        combinationKey,
        Math.max(0.7, Math.min(1.3, correctionFactor))
      );
    }

    logEvent({
      category: "matching",
      action: "icf_iso_combination_stats_calculated",
      payload: {
        icfCodes: normalizedIcf,
        combinationCount: combinationMap.size,
      },
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "icf_iso_combination_stats_error",
      payload: { error: String(error) },
      level: "error",
    });
  }

  return combinationMap;
}

/**
 * 피드백 기반 점수 보정 적용
 * 
 * @param matches ISO 매칭 결과
 * @param icfCodes ICF 코드 배열 (조합별 통계 계산용)
 * @returns 보정된 ISO 매칭 결과
 */
export async function applyFeedbackCorrection(
  matches: IsoMatch[],
  icfCodes: string[]
): Promise<IsoMatch[]> {
  if (matches.length === 0) {
    return matches;
  }

  try {
    // 1. ISO 코드별 일반 피드백 통계 조회
    const isoCodes = matches.map((m) => m.isoCode);
    const feedbackStats = await getFeedbackStats(isoCodes, 3);

    // 2. ICF-ISO 조합별 통계 조회 (더 정확한 보정)
    const combinationStats = await getIcfIsoCombinationStats(
      icfCodes,
      isoCodes,
      2
    );

    const normalizedIcf = normalizeIcfCodes(icfCodes);
    const icfKey = normalizedIcf.join(",");

    // 3. 실시간 학습 가중치 조정 조회 (비동기, 에러 무시)
    const realtimeAdjustments = new Map<string, number>();
    try {
      for (const match of matches) {
        const adjustment = await getRealtimeWeightAdjustment(icfCodes, match.isoCode);
        realtimeAdjustments.set(match.isoCode, adjustment);
      }
    } catch (error) {
      console.error("[Feedback Scorer] Realtime adjustment failed:", error);
      // 실패해도 계속 진행
    }

    // 4. 각 매칭 결과에 보정 계수 적용
    return matches.map((match) => {
      // 조합별 보정 계수 (우선순위 높음)
      const combinationKey = `${icfKey}|${match.isoCode}`;
      const combinationFactor = combinationStats.get(combinationKey);

      // 일반 ISO 코드별 보정 계수 (폴백)
      const generalStats = feedbackStats.get(match.isoCode);
      const generalFactor = generalStats?.correctionFactor || 1.0;

      // 실시간 학습 가중치 조정 (최우선)
      const realtimeAdjustment = realtimeAdjustments.get(match.isoCode) || 1.0;

      // 조합별 통계가 있으면 우선 사용, 없으면 일반 통계 사용
      // 실시간 학습 조정을 최종적으로 적용
      const baseCorrectionFactor = combinationFactor || generalFactor;
      const correctionFactor = baseCorrectionFactor * realtimeAdjustment;

      // 점수 보정 (최대 1.0으로 제한)
      const correctedScore = Math.min(match.score * correctionFactor, 1.0);

      return {
        ...match,
        score: correctedScore,
        // 디버깅용 메타데이터 (개발 환경에서만)
        ...(process.env.NODE_ENV === "development" && {
          _feedback: {
            correctionFactor,
            baseCorrectionFactor,
            realtimeAdjustment,
            source: combinationFactor ? "combination" : "general",
            sampleCount: generalStats?.sampleCount || 0,
          },
        }),
      };
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "feedback_correction_error",
      payload: { error: String(error) },
      level: "error",
    });

    // 에러 발생 시 원본 반환
    return matches;
  }
}

