/**
 * ICF 코드 상관관계 분석 및 적용
 * 
 * 함께 나타나는 ICF 코드 조합을 분석하여 매칭 정확도를 향상시킵니다.
 * 예: b765(불수의적 운동 조절)와 d550(식사)가 함께 나타나면
 *     식사 보조기기(ISO 15 09)의 점수를 높입니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";
import type { IsoMatch } from "./iso-mapping";

export interface IcfCorrelation {
  /** 첫 번째 ICF 코드 */
  code1: string;
  /** 두 번째 ICF 코드 */
  code2: string;
  /** 함께 나타난 빈도 */
  cooccurrenceCount: number;
  /** 첫 번째 코드의 총 출현 횟수 */
  code1TotalCount: number;
  /** 두 번째 코드의 총 출현 횟수 */
  code2TotalCount: number;
  /** 상관관계 점수 (0-1, Jaccard 유사도 기반) */
  correlationScore: number;
  /** 함께 나타난 상담 수 */
  uniqueConsultations: number;
}

/**
 * ICF 코드 조합을 정규화 (정렬하여 일관성 유지)
 */
function normalizeCodePair(code1: string, code2: string): [string, string] {
  return code1 < code2 ? [code1, code2] : [code2, code1];
}

/**
 * ICF 코드 쌍별 상관관계 계산
 * 
 * @param icfCodes 현재 상담의 ICF 코드 배열
 * @param minCooccurrence 최소 공출현 횟수 (기본 2회)
 * @returns ICF 코드 쌍별 상관관계 맵 (key: "code1|code2")
 */
export async function getIcfCorrelations(
  icfCodes: string[],
  minCooccurrence: number = 2
): Promise<Map<string, IcfCorrelation>> {
  const supabase = getSupabaseServerClient();
  const correlationMap = new Map<string, IcfCorrelation>();

  if (icfCodes.length < 2) {
    return correlationMap;
  }

  try {
    // 1. 현재 ICF 코드들이 포함된 상담들의 로그 조회
    const { data: usageLogs, error: logError } = await supabase
      .from("icf_code_usage_logs")
      .select("consultation_id, icf_code")
      .in("icf_code", icfCodes.map((c) => c.toUpperCase()))
      .not("consultation_id", "is", null);

    if (logError) {
      logEvent({
        category: "matching",
        action: "icf_correlation_error",
        payload: { error: logError.message },
        level: "error",
      });
      return correlationMap;
    }

    if (!usageLogs || usageLogs.length === 0) {
      return correlationMap;
    }

    // 2. 상담별 ICF 코드 그룹화
    const consultationCodes = new Map<string, Set<string>>();
    for (const log of usageLogs) {
      const consultationId = log.consultation_id as string;
      const code = (log.icf_code as string).toUpperCase();

      if (!consultationCodes.has(consultationId)) {
        consultationCodes.set(consultationId, new Set());
      }
      consultationCodes.get(consultationId)!.add(code);
    }

    // 3. 각 ICF 코드의 총 출현 횟수 계산
    const codeTotalCounts = new Map<string, number>();
    for (const codes of consultationCodes.values()) {
      for (const code of codes) {
        codeTotalCounts.set(code, (codeTotalCounts.get(code) || 0) + 1);
      }
    }

    // 4. ICF 코드 쌍별 공출현 빈도 계산
    const cooccurrenceMap = new Map<string, Set<string>>();

    // 각 상담별로 코드 쌍 추출
    for (const [consultationId, codes] of consultationCodes.entries()) {
      const codeArray = Array.from(codes);
      
      // 모든 쌍 조합 생성
      for (let i = 0; i < codeArray.length; i++) {
        for (let j = i + 1; j < codeArray.length; j++) {
          const [code1, code2] = normalizeCodePair(codeArray[i], codeArray[j]);
          const pairKey = `${code1}|${code2}`;

          if (!cooccurrenceMap.has(pairKey)) {
            cooccurrenceMap.set(pairKey, new Set<string>());
          }
          cooccurrenceMap.get(pairKey)!.add(consultationId);
        }
      }
    }

    // 5. 상관관계 점수 계산 (Jaccard 유사도 기반)
    for (const [pairKey, consultationSet] of cooccurrenceMap.entries()) {
      const cooccurrenceCount = consultationSet.size;
      
      if (cooccurrenceCount < minCooccurrence) {
        continue; // 최소 공출현 횟수 미만이면 스킵
      }

      const [code1, code2] = pairKey.split("|");
      const code1Total = codeTotalCounts.get(code1) || 0;
      const code2Total = codeTotalCounts.get(code2) || 0;

      if (code1Total === 0 || code2Total === 0) {
        continue;
      }

      // Jaccard 유사도: 교집합 / 합집합
      // 교집합 = 공출현 횟수 (같은 상담에서 함께 나타난 횟수)
      // 합집합 = code1 출현 상담 수 + code2 출현 상담 수 - 공출현 상담 수
      const intersection = cooccurrenceCount;
      const union = code1Total + code2Total - intersection;
      const jaccardScore = union > 0 ? intersection / union : 0;

      // 상관관계 점수 = Jaccard 유사도 (0-1)
      correlationMap.set(pairKey, {
        code1,
        code2,
        cooccurrenceCount,
        code1TotalCount: code1Total,
        code2TotalCount: code2Total,
        correlationScore: jaccardScore,
        uniqueConsultations: consultationSet.size,
      });
    }

    logEvent({
      category: "matching",
      action: "icf_correlations_calculated",
      payload: {
        inputIcfCodes: icfCodes.length,
        correlationCount: correlationMap.size,
      },
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "icf_correlation_error",
      payload: { error: String(error) },
      level: "error",
    });
  }

  return correlationMap;
}

/**
 * 현재 ICF 코드 조합에 대한 상관관계 보너스 계산
 * 
 * @param icfCodes 현재 상담의 ICF 코드 배열
 * @param isoMatches ISO 매칭 결과
 * @returns ISO 코드별 상관관계 보너스 맵 (0-1 범위)
 */
export async function calculateCorrelationBonuses(
  icfCodes: string[],
  isoMatches: IsoMatch[]
): Promise<Map<string, number>> {
  const bonusMap = new Map<string, number>();

  if (icfCodes.length < 2 || isoMatches.length === 0) {
    return bonusMap;
  }

  try {
    // 1. ICF 코드 쌍별 상관관계 조회
    const correlations = await getIcfCorrelations(icfCodes, 2);

    if (correlations.size === 0) {
      return bonusMap;
    }

    // 2. 현재 ICF 코드 조합에서 나타나는 상관관계 쌍 찾기
    const normalizedCodes = icfCodes.map((c) => c.toUpperCase()).sort();
    const activeCorrelations: IcfCorrelation[] = [];

    for (const correlation of correlations.values()) {
      const hasCode1 = normalizedCodes.includes(correlation.code1);
      const hasCode2 = normalizedCodes.includes(correlation.code2);

      if (hasCode1 && hasCode2) {
        activeCorrelations.push(correlation);
      }
    }

    if (activeCorrelations.length === 0) {
      return bonusMap;
    }

    // 3. ISO 코드별로 상관관계 보너스 계산
    // 높은 상관관계를 가진 ICF 코드 조합이 있을 때 보너스 부여
    // 보너스 = 평균 상관관계 점수 × 0.1 (최대 10% 보너스)
    const avgCorrelationScore =
      activeCorrelations.reduce((sum, corr) => sum + corr.correlationScore, 0) /
      activeCorrelations.length;

    // 상관관계가 강할수록 보너스 증가 (0.5 이상이면 최대 보너스)
    const baseBonus = Math.min(avgCorrelationScore * 0.2, 0.1); // 최대 10% 보너스

    // 모든 ISO 코드에 동일한 보너스 적용
    for (const match of isoMatches) {
      bonusMap.set(match.isoCode, baseBonus);
    }

    logEvent({
      category: "matching",
      action: "correlation_bonuses_calculated",
      payload: {
        activeCorrelations: activeCorrelations.length,
        avgCorrelationScore: avgCorrelationScore.toFixed(3),
        baseBonus: baseBonus.toFixed(3),
      },
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "correlation_bonus_error",
      payload: { error: String(error) },
      level: "error",
    });
  }

  return bonusMap;
}

/**
 * ISO 매칭 결과에 상관관계 보너스 적용
 * 
 * @param matches ISO 매칭 결과
 * @param icfCodes 현재 상담의 ICF 코드 배열
 * @returns 보너스가 적용된 ISO 매칭 결과
 */
export async function applyCorrelationBonuses(
  matches: IsoMatch[],
  icfCodes: string[]
): Promise<IsoMatch[]> {
  if (matches.length === 0 || icfCodes.length < 2) {
    return matches;
  }

  try {
    const bonuses = await calculateCorrelationBonuses(icfCodes, matches);

    return matches.map((match) => {
      const bonus = bonuses.get(match.isoCode) || 0;
      const boostedScore = Math.min(match.score + bonus, 1.0); // 최대 1.0으로 제한

      return {
        ...match,
        score: boostedScore,
        // 디버깅용 메타데이터 (개발 환경에서만)
        ...(process.env.NODE_ENV === "development" && {
          _correlation: {
            bonus: bonus.toFixed(3),
            originalScore: match.score.toFixed(3),
          },
        }),
      };
    });
  } catch (error) {
    logEvent({
      category: "matching",
      action: "correlation_bonus_apply_error",
      payload: { error: String(error) },
      level: "error",
    });

    // 에러 발생 시 원본 반환
    return matches;
  }
}

