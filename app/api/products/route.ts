import { NextResponse } from "next/server";
import {
  getSupabaseServerClient,
  getSupabaseUserClient,
} from "@/lib/supabase/server";
import { getIsoMatches } from "@/core/matching/iso-mapping";
import { appendKeywordIsoMatches } from "@/core/matching/keyword-inference";
import { fastMatch, accurateMatch } from "@/core/matching/hybrid-matcher";
import { rankProducts } from "@/core/matching/ranking";
import { logEvent } from "@/lib/logging";
import { getMultipleIsoCodeLinksFromEnv } from "@/lib/config/iso-links-env";

const MAX_LIMIT = 30;

type RecommendationPersistenceItem = {
  productId: string;
  matchReason?: string | null;
  rank: number;
};

const persistRecommendations = async (
  consultationId: string,
  items: RecommendationPersistenceItem[],
  supabaseClient: ReturnType<typeof getSupabaseServerClient>
) => {
  const mapping = new Map<string, string>();

  const { error: deleteError } = await supabaseClient
    .from("recommendations")
    .delete()
    .eq("consultation_id", consultationId);

  if (deleteError) {
    logEvent({
      category: "matching",
      action: "recommendations_cleanup_error",
      payload: { error: deleteError, consultationId },
      level: "warn",
    });
    return mapping;
  }

  if (items.length === 0) {
    return mapping;
  }

  const insertPayload = items.map((item) => ({
    consultation_id: consultationId,
    product_id: item.productId,
    match_reason: item.matchReason ?? null,
    rank: item.rank,
  }));

  const { data, error } = await supabaseClient
    .from("recommendations")
    .insert(insertPayload)
    .select("id, product_id");

  if (error) {
    logEvent({
      category: "matching",
      action: "recommendations_persist_error",
      payload: { error, consultationId },
      level: "error",
    });
    return mapping;
  }

  for (const row of data ?? []) {
    if (row?.product_id && row?.id) {
      mapping.set(row.product_id as string, row.id as string);
    }
  }

  logEvent({
    category: "matching",
    action: "recommendations_persisted",
    payload: { consultationId, count: data?.length ?? 0 },
  });

  // 추천 생성 로그 추가 (리마인더 연동 테스트용)
  logEvent({
    category: "matching",
    action: "recommendations_created",
    payload: {
      consultationId,
      count: data?.length ?? 0,
      recommendationIds: data && data.length > 0 ? data.map((r) => r.id) : [],
    },
  });

  // 추천이 생성되면 상담 상태를 자동으로 'completed'로 변경
  const { error: statusUpdateError } = await supabaseClient
    .from("consultations")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultationId)
    .neq("status", "archived"); // 보관된 상담은 자동 변경하지 않음

  if (statusUpdateError) {
    logEvent({
      category: "consultation",
      action: "auto_status_update_error",
      payload: { error: statusUpdateError, consultationId },
      level: "warn",
    });
  } else {
    logEvent({
      category: "consultation",
      action: "auto_status_completed",
      payload: { consultationId },
    });
  }

  return mapping;
};

const parseIcfCodes = (raw: string | null) =>
  raw
    ?.split(/[,|\s]/)
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean) ?? [];

// 간단한 장애 유형 추론 (휴리스틱)
const detectDisabilityType = (
  icfCodes: string[],
  summary?: string | null
): string | undefined => {
  const text = (summary ?? "").toLowerCase();
  const has = (prefix: string) =>
    icfCodes.some((c) => c.startsWith(prefix.toLowerCase()));
  const includesAny = (keywords: string[]) =>
    keywords.some((k) => text.includes(k));

  if (
    has("d46") ||
    has("d450") ||
    includesAny(["휠체어", "보행", "이동", "wheelchair"])
  ) {
    return "mobility_impairment";
  }
  if (has("b210") || includesAny(["시각", "저시력", "시력", "vision"])) {
    return "visual_impairment";
  }
  if (
    has("d3") ||
    includesAny(["의사소통", "말하기", "소통", "communication"])
  ) {
    return "communication_impairment";
  }
  if (has("d55") || includesAny(["식사", "먹기", "feeding", "음식"])) {
    return "self_care_impairment";
  }
  if (has("b1") || includesAny(["인지", "기억", "주의", "cognitive"])) {
    return "cognitive_impairment";
  }
  return undefined;
};

const fetchAnalysisIcfCodes = async (
  consultationId: string,
  supabaseClient: ReturnType<typeof getSupabaseServerClient>
) => {
  const { data, error } = await supabaseClient
    .from("analysis_results")
    .select("icf_codes")
    .eq("consultation_id", consultationId)
    .maybeSingle();

  if (error) {
    logEvent({
      category: "matching",
      action: "analysis_fetch_error",
      payload: { error, consultationId },
      level: "warn",
    });
    return [];
  }

  if (!data?.icf_codes) {
    return [];
  }

  const { b = [], d = [], e = [] } = data.icf_codes as Record<string, string[]>;
  return [...b, ...d, ...e].map((code) => code.toLowerCase());
};

const computeAvailabilityScore = (price?: number | null) => {
  if (price === null || price === undefined) return 0.5;
  if (price < 50) return 0.9;
  if (price < 150) return 0.75;
  if (price < 500) return 0.6;
  return 0.45;
};

const computeFreshnessScore = (updatedAt?: string | null) => {
  if (!updatedAt) return 0.5;
  const updatedDate = new Date(updatedAt).getTime();
  const now = Date.now();
  const diffDays = (now - updatedDate) / (1000 * 60 * 60 * 24);
  if (diffDays < 30) return 0.9;
  if (diffDays < 120) return 0.7;
  return 0.5;
};

// 캐싱 설정: 정적 데이터는 5분, 동적 데이터는 30초
export const revalidate = 30; // ISR: 30초마다 재검증
export const dynamic = "force-dynamic"; // 동적 데이터이므로 force-dynamic

export async function GET(request: Request) {
  // 사용자 인증이 적용된 Supabase 클라이언트 생성 (RLS 정책 적용)
  // consultationId가 있으면 사용자 인증 필요, 없으면 익명 접근 가능
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  const supabase = userId
    ? await getSupabaseUserClient()
    : getSupabaseServerClient();

  const { searchParams } = new URL(request.url);
  const icfParam = parseIcfCodes(searchParams.get("icf"));
  const consultationId = searchParams.get("consultationId") ?? undefined;
  const limitParam = Number(searchParams.get("limit")) || 12;
  const limit = Math.min(Math.max(limitParam, 1), MAX_LIMIT);

  // 응답 헤더에 캐싱 설정
  const headers = new Headers();
  if (consultationId) {
    // 상담별 추천은 짧은 캐시 (30초)
    headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );
  } else {
    // 일반 제품 목록은 더 긴 캐시 (5분)
    headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
  }

  const icfCodes =
    icfParam.length > 0
      ? icfParam
      : consultationId
      ? await fetchAnalysisIcfCodes(consultationId, supabase)
      : [];

  // K-IPPA 데이터 및 요약 정보
  let ippaData: { importance?: number; currentDifficulty?: number } | null =
    null;
  let analysisSummary: string | null = null;
  let disabilityType: string | undefined;
  let disabilitySeverity: string | undefined;

  if (consultationId) {
    const { data: consultationRow } = await supabase
      .from("consultations")
      .select("disability_type, disability_severity")
      .eq("id", consultationId)
      .maybeSingle();

    if (consultationRow) {
      disabilityType = consultationRow.disability_type ?? undefined;
      disabilitySeverity = consultationRow.disability_severity ?? undefined;
    }

    const { data: analysisData } = await supabase
      .from("analysis_results")
      .select("icf_codes, summary, identified_problems")
      .eq("consultation_id", consultationId)
      .single();

    if (analysisData?.icf_codes) {
      const icfCodesObj = analysisData.icf_codes as Record<string, unknown>;
      if (icfCodesObj.ippa_consultation) {
        ippaData = icfCodesObj.ippa_consultation as {
          importance?: number;
          currentDifficulty?: number;
        };
      }
    }

    if (
      typeof analysisData?.summary === "string" &&
      analysisData.summary.trim()
    ) {
      analysisSummary = analysisData.summary;
    } else if (
      typeof analysisData?.identified_problems === "string" &&
      analysisData.identified_problems.trim()
    ) {
      analysisSummary = analysisData.identified_problems;
    }

    disabilityType =
      disabilityType ?? detectDisabilityType(icfCodes, analysisSummary);
  }

  // ICF 코드 사용 로깅 (비동기, 에러가 발생해도 메인 플로우에 영향 없음)
  if (icfCodes.length > 0 && consultationId) {
    import("@/lib/icf-tracking").then(({ logIcfCodeUsageBatch }) => {
      logIcfCodeUsageBatch(icfCodes, "semantic_match", {
        consultationId,
        keywords: analysisSummary ? [analysisSummary] : undefined,
      }).catch((err) => {
        // 로깅 실패는 조용히 무시 (메인 플로우에 영향 없음)
        console.error("[ICF Tracking] Failed to log ICF codes:", err);
      });
    });
  }

  // 하이브리드 매칭 시스템 사용
  // 빠른 응답이 필요한 경우 fastMatch, 정확도가 중요한 경우 accurateMatch
  const useHybridMatching = process.env.ENABLE_HYBRID_MATCHING === "true";

  let isoMatches: Awaited<ReturnType<typeof getIsoMatches>>;

  // 사용자 ID 조회 (컨텍스트 가중치용) - Supabase users 테이블의 ID
  let supabaseUserId: string | undefined;
  if (consultationId) {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("id", consultationId)
      .maybeSingle();
    supabaseUserId = consultation?.user_id;
  }

  if (useHybridMatching) {
    // 정확한 매칭 (시맨틱 + 지식 그래프)
    isoMatches = await accurateMatch({
      icfCodes,
      userMessage: analysisSummary || undefined,
      analysisSummary: analysisSummary || undefined,
      consultationHistory: consultationId ? [] : undefined, // TODO: 실제 히스토리 조회
      userProfile: {
        disabilityType: disabilityType ?? undefined,
        disabilitySeverity: disabilitySeverity ?? undefined,
        userId: supabaseUserId,
        consultationId: consultationId,
      },
    });
  } else {
    // 빠른 매칭 (규칙 + 키워드, 기존 방식)
    isoMatches = fastMatch(icfCodes, analysisSummary || undefined);
  }

  const isoCodes = isoMatches.map((match) => match.isoCode);

  // API 응답 최적화: 클라이언트에서 사용하지 않는 필드 제거
  // created_at, updated_at은 서버에서만 사용 (랭킹 계산용)
  // 하지만 랭킹 계산을 위해 SELECT에는 포함해야 함
  let query = supabase.from("products").select(
    `
      id,
      name,
      iso_code,
      manufacturer,
      description,
      image_url,
      purchase_link,
      price,
      category,
      created_at,
      updated_at
    `
  );

  // ICF 코드가 없으면 추천을 반환하지 않음 (consultationId만 있고 ICF 분석이 없는 경우)
  if (isoCodes.length === 0 && consultationId) {
    logEvent({
      category: "matching",
      action: "no_icf_codes_for_consultation",
      payload: { consultationId },
      level: "warn",
    });
    return NextResponse.json({ products: [] });
  }

  if (isoCodes.length) {
    query = query.in("iso_code", isoCodes);
  }

  const { data, error } = await query.eq("is_active", true).limit(limit);

  if (error) {
    logEvent({
      category: "matching",
      action: "products_fetch_error",
      payload: { error },
      level: "error",
    });
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }

  // 데이터베이스에서 조회된 제품의 ISO 코드 목록
  const foundIsoCodes = new Set((data ?? []).map((p) => p.iso_code));

  // 제품 조회 상황 로깅 (개발 환경에서만 상세 로그)
  if (process.env.NODE_ENV === "development") {
    logEvent({
      category: "matching",
      action: "products_query_debug",
      payload: {
        totalIsoMatches: isoMatches.length,
        isoCodes,
        dbProductCount: data?.length ?? 0,
        foundIsoCodes: Array.from(foundIsoCodes),
      },
      level: "info",
    });
  }

  // 환경 변수에서 ISO 링크 가져오기
  // 데이터베이스에 제품이 있어도 환경 변수 링크를 추가로 포함
  const envLinksMap = getMultipleIsoCodeLinksFromEnv(isoCodes);

  // 환경 변수 조회 결과 로깅 (개발 환경에서만 상세 로그)
  if (process.env.NODE_ENV === "development" && envLinksMap.size > 0) {
    logEvent({
      category: "matching",
      action: "env_links_retrieved",
      payload: {
        requestedCodes: isoCodes,
        foundLinks: Array.from(envLinksMap.entries()).map(([code, links]) => ({
          isoCode: code,
          linkCount: links.length,
        })),
      },
      level: "info",
    });
  }

  // 환경 변수 링크를 가상 제품으로 변환
  const envProducts: Array<{
    id: string;
    name: string;
    iso_code: string;
    manufacturer: string | null;
    description: string | null;
    image_url: string | null;
    purchase_link: string;
    price: number | null;
    category: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
  }> = [];

  for (const [isoCode, links] of envLinksMap.entries()) {
      const isoMatch = isoMatches.find((match) => match.isoCode === isoCode);
      if (!isoMatch) {
        logEvent({
          category: "matching",
          action: "iso_match_not_found",
          payload: { isoCode },
          level: "warn",
        });
        continue;
      }

    // 각 링크마다 별도의 제품 생성
    links.forEach((link, index) => {
      const productId = `env_${isoCode.replace(/\s/g, "_")}_${index}`;
      envProducts.push({
        id: productId,
        name: isoMatch.label || `ISO ${isoCode} 보조기기`,
        iso_code: isoCode,
        manufacturer: null,
        description: isoMatch.description || null,
        image_url: null,
        purchase_link: link,
        price: null,
        category: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      });
    });
  }

  // 데이터베이스 제품과 환경 변수 제품 합치기
  const allProducts = [...(data ?? []), ...envProducts];

  if (envProducts.length > 0) {
    logEvent({
      category: "matching",
      action: "env_products_added",
      payload: {
        count: envProducts.length,
        isoCodes: Array.from(envLinksMap.keys()),
      },
    });
  }

  const rankingInput = allProducts.map((product) => {
    const isoMatch = isoMatches.find(
      (match) => match.isoCode === product.iso_code
    );
    let matchScore = isoMatch?.score ?? (icfCodes.length > 0 ? 0.35 : 0.5);

    // K-IPPA 중요도 기반 가중치 적용
    if (ippaData?.importance) {
      // 중요도가 높을수록 매칭 점수에 가중치 적용
      // 중요도 1-5를 0.8-1.2 범위로 변환
      const importanceMultiplier = 0.8 + (ippaData.importance - 1) * 0.1; // 1->0.8, 5->1.2
      matchScore = Math.min(matchScore * importanceMultiplier, 1.0);
    }

    return {
      product,
      matchScore,
      availabilityScore: computeAvailabilityScore(
        product.price as number | null
      ),
      freshnessScore: computeFreshnessScore(
        product.updated_at as string | null
      ),
      isoMatch,
    };
  });

  const ranked = rankProducts(rankingInput).map((item) => {
    const isoMatch = item.isoMatch;
    return {
      ...item.product,
      match_score: item.finalScore,
      match_reason:
        isoMatch?.reason ??
        "사용자 기본 프로필과 부합하는 인기 보조기기입니다.",
      match_label: isoMatch?.label ?? null,
      matched_icf: isoMatch?.matchedIcf ?? [],
    };
  });

  let recommendationMap: Map<string, string> | null = null;

  if (consultationId) {
    // 환경 변수 제품은 recommendations에 저장하지 않음 (가상 ID이므로)
    // 대신 purchase_link를 직접 저장하는 방식으로 변경 가능하지만, 현재 구조에서는 제외
    const persistenceItems = ranked
      .filter(
        (product) =>
          typeof product.id === "string" && !product.id.startsWith("env_")
      )
      .map((product, index) => ({
        productId: product.id as string,
        matchReason: product.match_reason ?? null,
        rank: index + 1,
      }));

    recommendationMap = await persistRecommendations(
      consultationId,
      persistenceItems,
      supabase
    );

    // 실시간 학습: 추천 생성 시 impression 이벤트 기록 (비동기, 에러 무시)
    if (icfCodes.length > 0 && recommendationMap) {
      const mapForLearning = recommendationMap; // 타입 가드를 위한 로컬 변수
      import("@/lib/realtime-learning").then(({ updateRealtimeLearningStats }) => {
        // 각 추천된 제품에 대해 impression 이벤트 기록
        for (const [productId, recommendationId] of mapForLearning.entries()) {
          const product = ranked.find((p) => p.id === productId);
          if (product?.iso_code) {
            updateRealtimeLearningStats(
              icfCodes,
              product.iso_code as string,
              "impression"
            ).catch((err) => {
              console.error("[Products API] Realtime learning impression failed:", err);
            });
          }
        }
      });
    }
  }

  logEvent({
    category: "matching",
    action: "products_retrieved",
    payload: { count: ranked.length, hasIcfContext: icfCodes.length > 0 },
  });

  // 디버깅 정보 (개발 환경에서만)
  const debugInfo = process.env.NODE_ENV === "development" ? {
    icfCodes,
    isoMatches: isoMatches.map((m) => ({ isoCode: m.isoCode, label: m.label })),
    dbProductCount: data?.length ?? 0,
    envProductCount: envProducts.length,
    envIsoCodes: Array.from(envLinksMap.keys()),
    totalProducts: ranked.length,
  } : undefined;

  // 응답 최적화: 불필요한 필드 제거 및 필수 필드만 반환
  const optimizedProducts = ranked.map((product) => {
    const { created_at, updated_at, ...rest } = product;
    return {
      ...rest,
      recommendation_id: recommendationMap?.get(product.id as string) ?? null,
    };
  });

  return NextResponse.json(
    {
      products: optimizedProducts,
      icfCodes,
      // 개발 환경에서만 디버깅 정보 포함
      ...(process.env.NODE_ENV === "development" && { _debug: debugInfo }),
    },
    { headers }
  );
}
