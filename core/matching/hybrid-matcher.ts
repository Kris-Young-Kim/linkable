/**
 * 하이브리드 매칭 시스템
 *
 * 규칙 기반, 시맨틱, 지식 그래프를 결합하여
 * 가장 정확하고 신뢰할 수 있는 ICF-ISO 매칭을 제공합니다.
 */

import { getIsoMatches } from "./iso-mapping";
import { appendKeywordIsoMatches } from "./keyword-inference";
import { semanticMatch } from "./semantic-matcher";
import { inferIsoFromGraph } from "./knowledge-graph";
import type { IsoMatch } from "./iso-mapping";
import { logEvent } from "@/lib/logging";

interface HybridMatchConfig {
  useSemantic: boolean;
  useKnowledgeGraph: boolean;
  useKeywordInference: boolean;
  weights: {
    ruleBased: number;
    semantic: number;
    knowledgeGraph: number;
    keyword: number;
  };
  minScore: number;
  topK: number;
}

const DEFAULT_CONFIG: HybridMatchConfig = {
  useSemantic: true,
  useKnowledgeGraph: true,
  useKeywordInference: true,
  weights: {
    ruleBased: 0.3,
    semantic: 0.4,
    knowledgeGraph: 0.2,
    keyword: 0.1,
  },
  minScore: 0.5,
  topK: 10,
};

interface MatchContext {
  icfCodes: string[];
  userMessage?: string;
  analysisSummary?: string;
  consultationHistory?: string[];
  userProfile?: {
    ageGroup?: string;
    disabilityType?: string;
    environment?: string;
  };
}

/**
 * 하이브리드 매칭 메인 함수
 */
export async function hybridMatch(
  context: MatchContext,
  config: Partial<HybridMatchConfig> = {}
): Promise<IsoMatch[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  try {
    // 1단계: 규칙 기반 매칭 (빠른 필터링)
    const ruleMatches = getIsoMatches(context.icfCodes);
    logEvent({
      category: "matching",
      action: "rule_based_matches",
      payload: { count: ruleMatches.length },
    });

    // 2단계: 키워드 기반 보강
    let keywordMatches: IsoMatch[] = [];
    if (finalConfig.useKeywordInference && context.analysisSummary) {
      keywordMatches = appendKeywordIsoMatches({
        text: context.analysisSummary,
        icfCodes: context.icfCodes,
        matches: ruleMatches,
      });
      logEvent({
        category: "matching",
        action: "keyword_matches",
        payload: { count: keywordMatches.length - ruleMatches.length },
      });
    } else {
      keywordMatches = ruleMatches;
    }

    // 3단계: 시맨틱 매칭 (비동기, 선택적)
    let semanticMatches: IsoMatch[] = [];
    if (finalConfig.useSemantic) {
      try {
        semanticMatches = await semanticMatch(
          context.icfCodes,
          context.userMessage || context.analysisSummary || "",
          {
            useEmbeddings: true,
            similarityThreshold: 0.7,
            topK: finalConfig.topK,
          }
        );
        logEvent({
          category: "matching",
          action: "semantic_matches",
          payload: { count: semanticMatches.length },
        });
      } catch (error) {
        console.error("[hybrid-matcher] Semantic matching failed:", error);
        // 실패 시 규칙 기반으로 폴백
        semanticMatches = keywordMatches;
      }
    }

    // 4단계: 지식 그래프 추론
    let graphMatches: IsoMatch[] = [];
    if (finalConfig.useKnowledgeGraph) {
      try {
        graphMatches = inferIsoFromGraph(context.icfCodes, context.userProfile);
        logEvent({
          category: "matching",
          action: "graph_matches",
          payload: { count: graphMatches.length },
        });
      } catch (error) {
        console.error(
          "[hybrid-matcher] Knowledge graph inference failed:",
          error
        );
        graphMatches = [];
      }
    }

    // 5단계: 결과 통합 및 재랭킹
    const combined = combineMatches(
      [
        {
          matches: keywordMatches,
          weight: finalConfig.weights.ruleBased + finalConfig.weights.keyword,
        },
        { matches: semanticMatches, weight: finalConfig.weights.semantic },
        { matches: graphMatches, weight: finalConfig.weights.knowledgeGraph },
      ],
      finalConfig.minScore
    );

    // 6단계: 피드백 기반 보정 (선택적)
    const adjusted = applyFeedbackCorrection(
      combined,
      context.consultationHistory || []
    );

    const duration = Date.now() - startTime;
    logEvent({
      category: "matching",
      action: "hybrid_match_completed",
      payload: {
        duration,
        inputIcfCount: context.icfCodes.length,
        outputMatchCount: adjusted.length,
        config: finalConfig,
      },
    });

    return adjusted.slice(0, finalConfig.topK);
  } catch (error) {
    console.error("[hybrid-matcher] Hybrid matching failed:", error);
    logEvent({
      category: "matching",
      action: "hybrid_match_error",
      payload: { error: String(error) },
      level: "error",
    });

    // 폴백: 기본 규칙 기반 매칭
    return getIsoMatches(context.icfCodes);
  }
}

/**
 * 여러 매칭 결과를 가중치 기반으로 통합
 */
function combineMatches(
  matchLayers: Array<{ matches: IsoMatch[]; weight: number }>,
  minScore: number
): IsoMatch[] {
  const scoreMap = new Map<string, number>();
  const matchMap = new Map<string, IsoMatch>();
  const sourceMap = new Map<string, string[]>(); // 어떤 소스에서 매칭되었는지 추적

  // 각 레이어의 매칭 결과를 가중 평균
  for (const layer of matchLayers) {
    for (const match of layer.matches) {
      const existingScore = scoreMap.get(match.isoCode) || 0;
      const weightedScore = match.score * layer.weight;
      scoreMap.set(match.isoCode, existingScore + weightedScore);

      // 가장 높은 점수의 매치 정보 저장
      const existing = matchMap.get(match.isoCode);
      if (!existing || match.score > existing.score) {
        matchMap.set(match.isoCode, match);
      }

      // 소스 추적
      const sources = sourceMap.get(match.isoCode) || [];
      sources.push(layer.matches === match ? "self" : "other");
      sourceMap.set(match.isoCode, sources);
    }
  }

  // 통합된 점수로 매치 업데이트
  const combined = Array.from(matchMap.values())
    .map((match) => {
      const finalScore = scoreMap.get(match.isoCode)!;
      const sources = sourceMap.get(match.isoCode) || [];

      return {
        ...match,
        score: Math.min(finalScore, 1.0), // 최대 1.0으로 제한
        reason: `${match.reason} [통합 점수: ${(finalScore * 100).toFixed(
          1
        )}%, 소스: ${sources.length}개]`,
      };
    })
    .filter((match) => match.score >= minScore) // 최소 점수 필터
    .sort((a, b) => b.score - a.score);

  return combined;
}

/**
 * 피드백 기반 점수 보정
 *
 * 과거 상담에서 성공한 매칭은 점수를 높이고,
 * 실패한 매칭은 점수를 낮춥니다.
 */
function applyFeedbackCorrection(
  matches: IsoMatch[],
  consultationHistory: string[]
): IsoMatch[] {
  // TODO: 실제 피드백 데이터를 DB에서 조회하여 적용
  // 현재는 플레이스홀더

  // 예시: 특정 ISO 코드가 과거에 높은 클릭률을 보였다면 점수 보너스
  const feedbackBoost: Record<string, number> = {
    // '15 09': 1.1, // 식사 보조기기는 과거 성공률이 높음
  };

  return matches.map((match) => {
    const boost = feedbackBoost[match.isoCode] || 1.0;
    return {
      ...match,
      score: Math.min(match.score * boost, 1.0),
    };
  });
}

/**
 * 빠른 매칭 (규칙 기반만, 실시간 응답용)
 */
export function fastMatch(
  icfCodes: string[],
  analysisSummary?: string
): IsoMatch[] {
  const ruleMatches = getIsoMatches(icfCodes);

  if (analysisSummary) {
    return appendKeywordIsoMatches({
      text: analysisSummary,
      icfCodes,
      matches: ruleMatches,
    });
  }

  return ruleMatches;
}

/**
 * 정확한 매칭 (하이브리드, 추천 생성용)
 */
export async function accurateMatch(
  context: MatchContext,
  config?: Partial<HybridMatchConfig>
): Promise<IsoMatch[]> {
  return hybridMatch(context, {
    ...config,
    useSemantic: true,
    useKnowledgeGraph: true,
  });
}
