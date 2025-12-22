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
import { applyFeedbackCorrection as applyFeedbackCorrectionFromScorer } from "./feedback-scorer";
import { applyCorrelationBonuses } from "./icf-correlation";
import { applyContextWeights, type UserContext } from "./context-weights";
import type { IsoMatch } from "./iso-mapping";
import { logEvent } from "@/lib/logging";
import {
  loadActiveWeightConfig,
  selectABTestVariant,
  convertToHybridMatchConfig,
  type MatchingWeightConfig,
} from "@/lib/matching-weight-loader";

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
  similarityThreshold?: number;
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
    disabilitySeverity?: string;
    environment?: string;
    userId?: string;
    consultationId?: string;
  };
}

/**
 * 하이브리드 매칭 메인 함수
 */
export async function hybridMatch(
  context: MatchContext,
  config: Partial<HybridMatchConfig> = {}
): Promise<IsoMatch[]> {
  const startTime = Date.now();
  
  // 데이터베이스에서 가중치 설정 로드 (A/B 테스트 지원)
  let dbConfig: MatchingWeightConfig | null = null;
  let weightConfigName = "default";
  
  try {
    // A/B 테스트가 활성화되어 있으면 변형 선택
    const abTestName = process.env.AB_TEST_MATCHING_WEIGHTS;
    if (abTestName) {
      dbConfig = await selectABTestVariant(
        context.userProfile?.userId,
        abTestName
      );
    } else {
      // 기본적으로 활성화된 설정 로드
      dbConfig = await loadActiveWeightConfig();
    }
    
    if (dbConfig) {
      weightConfigName = dbConfig.name;
      const dbConfigConverted = convertToHybridMatchConfig(dbConfig);
      // 데이터베이스 설정을 우선 적용
      config = {
        ...config,
        weights: dbConfigConverted.weights,
        minScore: dbConfigConverted.minScore,
        topK: dbConfigConverted.topK,
      };
      
      // 시맨틱 매칭 임계값도 설정에 포함 (semanticMatch 함수에 전달)
      if (config.similarityThreshold === undefined) {
        (config as any).similarityThreshold = dbConfigConverted.similarityThreshold;
      }
    }
  } catch (error) {
    console.error("[hybrid-matcher] Failed to load weight config, using default:", error);
  }
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

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
            similarityThreshold: (finalConfig as any).similarityThreshold || 0.7,
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

    // 6단계: ICF 상관관계 보너스 적용 (비동기)
    const correlationBoosted = await applyCorrelationBonuses(
      combined,
      context.icfCodes
    );

    // 7단계: 피드백 기반 보정 (비동기)
    const adjusted = await applyFeedbackCorrectionFromScorer(
      correlationBoosted,
      context.icfCodes
    );

    // 8단계: 사용자 컨텍스트 가중치 적용 (비동기)
    const userContext: UserContext = {
      ageGroup: context.userProfile?.ageGroup,
      disabilityType: context.userProfile?.disabilityType,
      disabilitySeverity: context.userProfile?.disabilitySeverity,
      environment: context.userProfile?.environment,
      userId: context.userProfile?.userId,
      consultationId: context.userProfile?.consultationId,
    };
    const contextWeighted = await applyContextWeights(adjusted, userContext);

    // 9단계: 의도 기반 재가중치
    const intent = detectPrimaryIntent(context);
    const intentWeighted = applyIntentWeights(contextWeighted, intent);

    // 10단계: 의도 기반 하드 필터 (전혀 다른 카테고리 제거)
    const intentFiltered = filterByIntent(intentWeighted, intent);

    // 11단계: 핵심/보조 분리 태깅
    // 핵심: 점수 상위 3개 + 점수 0.1 이상
    const tagged = intentFiltered.map((item, idx) => ({
      ...item,
      category: idx < 3 && item.score >= 0.1 ? "primary" : "secondary",
    }));

    const duration = Date.now() - startTime;
    
    // 성능 로깅 (데이터베이스에 저장)
    logMatchingPerformance({
      consultationId: context.userProfile?.consultationId,
      userId: context.userProfile?.userId,
      weightConfigId: dbConfig?.id,
      weightConfigName,
      icfCodes: context.icfCodes,
      matchedIsoCodes: tagged.map((m) => m.isoCode),
      topMatchScore: tagged[0]?.score,
      averageMatchScore: tagged.length > 0 
        ? tagged.reduce((sum, m) => sum + m.score, 0) / tagged.length 
        : 0,
      executionTimeMs: duration,
      semanticMatchUsed: finalConfig.useSemantic,
      knowledgeGraphUsed: finalConfig.useKnowledgeGraph,
    }).catch((err) => {
      // 로깅 실패는 조용히 무시 (메인 플로우에 영향 없음)
      console.error("[hybrid-matcher] Failed to log performance:", err);
    });
    
    logEvent({
      category: "matching",
      action: "hybrid_match_completed",
      payload: {
        duration,
        inputIcfCount: context.icfCodes.length,
        outputMatchCount: adjusted.length,
        config: finalConfig,
        weightConfigName,
      },
    });

    return tagged.slice(0, finalConfig.topK);
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
      sources.push("layer");
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

// 피드백 기반 점수 보정은 feedback-scorer.ts로 이동됨
// 이제 applyFeedbackCorrectionFromScorer를 사용합니다.

type PrimaryIntent =
  | "mobility_wheelchair"
  | "mobility_walking_aid"
  | "vision"
  | "communication"
  | "self_care_feeding"
  | "unknown";

function normalizeIsoCode(isoCode: string) {
  return isoCode.replace(/\s+/g, "").toLowerCase();
}

function detectPrimaryIntent(context: MatchContext): PrimaryIntent {
  const text = `${context.userMessage ?? ""} ${context.analysisSummary ?? ""}`.toLowerCase();
  const icfSet = new Set(context.icfCodes.map((c) => c.toLowerCase()));

  const hasIcf = (prefix: string) => Array.from(icfSet).some((c) => c.startsWith(prefix));
  const includesAny = (keywords: string[]) => keywords.some((k) => text.includes(k));

  // 휠체어/이동
  if (
    includesAny(["휠체어", "wheelchair", "전동 휠체어", "수동 휠체어"]) ||
    hasIcf("d46") ||
    hasIcf("d450")
  ) {
    return "mobility_wheelchair";
  }

  // 보행 보조
  if (includesAny(["보행기", "워커", "지팡이", "walking aid"]) || hasIcf("d410")) {
    return "mobility_walking_aid";
  }

  // 시각
  if (hasIcf("b210") || includesAny(["시각", "저시력", "vision"])) {
    return "vision";
  }

  // 의사소통
  if (hasIcf("d3") || includesAny(["의사소통", "말하기", "communication"])) {
    return "communication";
  }

  // 식사/자가관리
  if (hasIcf("d55") || includesAny(["식사", "먹기", "feeding", "음식"])) {
    return "self_care_feeding";
  }

  return "unknown";
}

function applyIntentWeights(matches: IsoMatch[], intent: PrimaryIntent): IsoMatch[] {
  if (intent === "unknown") return matches;

  // 의도별 우선/페널티 ISO 코드 (공백 제거 기준)
  const boost: Record<PrimaryIntent, string[]> = {
    mobility_wheelchair: ["1222", "1223", "1806", "1830", "1206"],
    mobility_walking_aid: ["1206", "1806", "1830"],
    vision: ["2203", "2206", "1806"],
    communication: ["2230", "2109"],
    self_care_feeding: ["0903", "0904", "0909"],
    unknown: [],
  };

  const penalty: Record<PrimaryIntent, string[]> = {
    mobility_wheelchair: ["090", "150", "2203"],
    mobility_walking_aid: ["090", "150"],
    vision: ["090", "1206", "1222", "1223"],
    communication: ["090", "1206", "1222", "1223"],
    self_care_feeding: ["1222", "1223", "1206"],
    unknown: [],
  };

  const boosted = boost[intent];
  const penalized = penalty[intent];

  return matches
    .map((m) => {
      const isoNorm = normalizeIsoCode(m.isoCode);
      let score = m.score;

      // 부스팅: 핵심 의도에 맞는 ISO는 1.15배
      if (boosted.some((p) => isoNorm.startsWith(p))) {
        score *= 1.15;
      }

      // 페널티: 의도와 거리가 먼 ISO는 0.75배
      if (penalized.some((p) => isoNorm.startsWith(p))) {
        score *= 0.75;
      }

      return { ...m, score };
    })
    .sort((a, b) => b.score - a.score);
}

function filterByIntent(matches: IsoMatch[], intent: PrimaryIntent): IsoMatch[] {
  if (intent === "unknown") return matches;

  // 의도별 하드 제외 리스트 (공백 제거된 ISO prefix)
  const exclude: Record<PrimaryIntent, string[]> = {
    mobility_wheelchair: ["220", "0903", "0904", "0909"], // 시각, 식사 카테고리 제거
    mobility_walking_aid: ["220", "0903", "0904", "0909"],
    vision: ["1206", "1222", "1223"], // 이동 보조 제거
    communication: ["1206", "1222", "1223"],
    self_care_feeding: ["1222", "1223", "1206"], // 이동 보조 제거
    unknown: [],
  };

  const excludes = exclude[intent];
  return matches.filter((m) => {
    const isoNorm = normalizeIsoCode(m.isoCode);
    return !excludes.some((p) => isoNorm.startsWith(p));
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

/**
 * 매칭 성능 로깅 (비동기, 에러가 발생해도 메인 플로우에 영향 없음)
 */
async function logMatchingPerformance(data: {
  consultationId?: string;
  userId?: string;
  weightConfigId?: string;
  weightConfigName: string;
  icfCodes: string[];
  matchedIsoCodes: string[];
  topMatchScore?: number;
  averageMatchScore: number;
  executionTimeMs: number;
  semanticMatchUsed: boolean;
  knowledgeGraphUsed: boolean;
}): Promise<void> {
  try {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase.from("matching_performance_logs").insert({
      consultation_id: data.consultationId || null,
      user_id: data.userId || null,
      weight_config_id: data.weightConfigId || null,
      weight_config_name: data.weightConfigName,
      icf_codes: data.icfCodes,
      icf_code_count: data.icfCodes.length,
      matched_iso_codes: data.matchedIsoCodes,
      match_count: data.matchedIsoCodes.length,
      top_match_score: data.topMatchScore || null,
      average_match_score: data.averageMatchScore,
      execution_time_ms: data.executionTimeMs,
      semantic_match_used: data.semanticMatchUsed,
      knowledge_graph_used: data.knowledgeGraphUsed,
    });
    
    if (error) {
      console.error("[hybrid-matcher] Performance logging error:", error);
    }
  } catch (error) {
    // 로깅 실패는 조용히 무시
    console.error("[hybrid-matcher] Performance logging failed:", error);
  }
}
