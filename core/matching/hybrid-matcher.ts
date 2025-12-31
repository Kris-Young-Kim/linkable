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
  getPrecomputedMapping,
  savePrecomputedMapping,
} from "@/lib/matching/precomputed-mappings";
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
    // 0단계: 사전 계산된 매핑 조회 (캐시 우선 전략)
    const precomputedMatches = await getPrecomputedMapping(context.icfCodes);
    if (precomputedMatches && precomputedMatches.length > 0) {
      const elapsedTime = Date.now() - startTime;
      logEvent({
        category: "matching",
        action: "hybrid_match_cache_hit",
        payload: {
          icfCodes: context.icfCodes,
          matchCount: precomputedMatches.length,
          elapsedTime,
          weightConfig: weightConfigName,
        },
      });

      // 피드백 보정 적용 (학습 기반 점수 조정)
      const correctedMatches = await applyFeedbackCorrectionFromScorer(
        precomputedMatches,
        context.icfCodes
      );

      return correctedMatches;
    }

    // 사전 계산된 매핑이 없으면 실시간 계산 진행
    logEvent({
      category: "matching",
      action: "hybrid_match_cache_miss",
      payload: {
        icfCodes: context.icfCodes,
        weightConfig: weightConfigName,
      },
    });

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
    const intentFiltered = filterByIntent(intentWeighted, intent, context);

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

    // 사전 계산된 매핑 저장 (점진적 구축)
    // 조건: 결과가 있고, 신뢰도가 높으며, 실행 시간이 충분히 걸린 경우
    if (
      tagged.length > 0 &&
      tagged[0].score >= 0.7 && // 상위 매칭 점수가 0.7 이상
      duration >= 50 // 50ms 이상 걸린 경우 (캐싱 가치가 있는 경우)
    ) {
      // 비동기로 저장 (메인 플로우에 영향 없음)
      savePrecomputedMapping(
        context.icfCodes,
        tagged.slice(0, 10), // 상위 10개만 저장
        finalConfig.useSemantic && finalConfig.useKnowledgeGraph
          ? "hybrid"
          : finalConfig.useSemantic
          ? "semantic"
          : finalConfig.useKnowledgeGraph
          ? "knowledge_graph"
          : "rule",
        tagged[0].score // 신뢰도는 최고 점수 사용
      ).catch((err) => {
        // 저장 실패는 조용히 무시
        console.error("[hybrid-matcher] Failed to save precomputed mapping:", err);
      });
    }
    
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
  | "hearing"
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

  // 1. 시각 장애 감지 (최우선 처리)
  // 시각 중증/실명 키워드
  const severeVisualKeywords = [
    "앞이 안 보", "앞이 안보", "앞이 안 보이", "앞이 안보이", 
    "시각 중증", "맹인", "실명", "blind", "앞이 안 보임", "앞이 안보임",
    "전혀 안 보", "전혀 안보", "하나도 안 보", "하나도 안보"
  ];
  const isSevereVisualImpairment = includesAny(severeVisualKeywords) || 
    (hasIcf("b210") && includesAny(["중증", "심각", "심각한", "심하게", "전혀", "하나도"]));
  
  // 시각 장애 키워드
  const visualKeywords = [
    "시각", "저시력", "시력", "vision", "눈", "시야", "시야각", 
    "확대경", "돋보기", "점자", "스크린리더", "음성변환"
  ];
  
  if (hasIcf("b210") || hasIcf("b215") || includesAny(visualKeywords) || isSevereVisualImpairment) {
    return "vision";
  }

  // 2. 청각 장애 감지
  const hearingKeywords = [
    "청각", "청력", "난청", "보청기", "hearing", "귀", "듣기", 
    "소리", "알림", "진동", "평형", "어지럼", "전정"
  ];
  
  if (hasIcf("b230") || hasIcf("b235") || includesAny(hearingKeywords)) {
    return "hearing";
  }

  // 3. 언어/의사소통 장애 감지
  const languageKeywords = [
    "언어", "음성", "구어", "말하기", "발음", "발성", "의사소통", 
    "소통", "communication", "aac", "대화", "말하기 보조", 
    "음성 생성", "음성 인식", "프록스토커"
  ];
  
  if (hasIcf("b240") || hasIcf("b320") || hasIcf("b330") || 
      hasIcf("d3") || includesAny(languageKeywords)) {
    return "communication";
  }

  // 4. 지체 장애 / 뇌병변 감지 (휠체어)
  const physicalKeywords = [
    "지체", "절단", "관절", "지체기능", "변형", "신체", "physical",
    "뇌병변", "뇌손상", "뇌졸중", "뇌성마비", "cerebral palsy", 
    "뇌전증", "epilepsy", "척수", "spinal", "마비", "paralysis"
  ];
  
  const mobilityKeywords = [
    "휠체어", "wheelchair", "전동 휠체어", "수동 휠체어", 
    "이동", "보행", "걷기"
  ];
  
  if (includesAny(physicalKeywords) || 
      includesAny(mobilityKeywords) ||
      hasIcf("d46") || hasIcf("d450") || hasIcf("d465")) {
    return "mobility_wheelchair";
  }

  // 5. 보행 보조 (지체 장애이지만 휠체어가 아닌 경우)
  if (includesAny(["보행기", "워커", "지팡이", "walking aid", "보행 보조"]) || 
      hasIcf("d410") || hasIcf("d450")) {
    return "mobility_walking_aid";
  }

  // 6. 식사/자가관리
  if (hasIcf("d55") || hasIcf("d550") || includesAny(["식사", "먹기", "feeding", "음식"])) {
    return "self_care_feeding";
  }

  return "unknown";
}

function applyIntentWeights(matches: IsoMatch[], intent: PrimaryIntent): IsoMatch[] {
  if (intent === "unknown") return matches;

  // 의도별 우선/페널티 ISO 코드 (공백 제거 기준)
  // 보조공학사 기본 지식: 장애 유형별 적절한 보조기기 매핑
  const boost: Record<PrimaryIntent, string[]> = {
    mobility_wheelchair: ["1222", "1223", "1231", "1806", "1830"], // 휠체어, 체위 변경, 접근성
    mobility_walking_aid: ["1206", "1203", "1806", "1830"], // 보행 보조기기, 접근성
    vision: ["2203", "2206", "1208", "1806"], // 시각 보조기기, 안내 지팡이, 조명
    hearing: ["2106", "2127"], // 청각 보조기기, 평형 보조기기
    communication: ["2230", "2109"], // 의사소통 보조기기, 음성 보조기기
    self_care_feeding: ["1509", "0933", "0918"], // 식사 보조기기, 자가관리 보조기기
    unknown: [],
  };

  const penalty: Record<PrimaryIntent, string[]> = {
    mobility_wheelchair: ["090", "150", "2203", "2206", "2106", "2230"], // 시각, 청각, 의사소통 제거
    mobility_walking_aid: ["090", "150", "2203", "2206", "2106", "2230"], // 시각, 청각, 의사소통 제거
    vision: ["1206", "1222", "1223", "1203", "2106", "2230", "2109"], // 이동 보조, 청각, 의사소통 제거
    hearing: ["1206", "1222", "1223", "2203", "2206", "2230"], // 이동 보조, 시각, 의사소통 제거
    communication: ["1206", "1222", "1223", "2203", "2206", "2106"], // 이동 보조, 시각, 청각 제거
    self_care_feeding: ["1222", "1223", "1206", "2203", "2206", "2106", "2230"], // 이동 보조, 시각, 청각, 의사소통 제거
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

function filterByIntent(matches: IsoMatch[], intent: PrimaryIntent, context?: MatchContext): IsoMatch[] {
  if (intent === "unknown") return matches;

  // 시각 중증/실명 감지 (컨텍스트에서)
  const text = `${context?.userMessage ?? ""} ${context?.analysisSummary ?? ""}`.toLowerCase();
  const severeVisualKeywords = [
    "앞이 안 보", "앞이 안보", "앞이 안 보이", "앞이 안보이", 
    "시각 중증", "맹인", "실명", "blind", "앞이 안 보임", "앞이 안보임",
    "전혀 안 보", "전혀 안보", "하나도 안 보", "하나도 안보"
  ];
  const isSevereVisualImpairment = severeVisualKeywords.some((k) => text.includes(k)) ||
    (context?.icfCodes.some((c) => c.toLowerCase().startsWith("b210")) && 
     (text.includes("중증") || text.includes("심각") || text.includes("전혀") || text.includes("하나도")));

  // 의도별 하드 제외 리스트 (공백 제거된 ISO prefix)
  // 보조공학사 기본 지식: 장애 유형별 부적절한 보조기기 제외
  const exclude: Record<PrimaryIntent, string[]> = {
    mobility_wheelchair: ["220", "2106", "2230", "2109"], // 시각, 청각, 의사소통 제거
    mobility_walking_aid: ["220", "2106", "2230", "2109"], // 시각, 청각, 의사소통 제거
    vision: isSevereVisualImpairment 
      ? ["1206", "1222", "1223", "1203", "2230", "2109", "2106"] // 시각 중증: 이동 보조 + 의사소통 + 청각 제거
      : ["1206", "1222", "1223", "2106", "2230", "2109"], // 일반 시각: 이동 보조 + 청각 + 의사소통 제거
    hearing: ["1206", "1222", "1223", "2203", "2206", "2230", "2109"], // 이동 보조, 시각, 의사소통 제거
    communication: ["1206", "1222", "1223", "2203", "2206", "2106"], // 이동 보조, 시각, 청각 제거
    self_care_feeding: ["1222", "1223", "1206", "2203", "2206", "2106", "2230"], // 이동 보조, 시각, 청각, 의사소통 제거
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
