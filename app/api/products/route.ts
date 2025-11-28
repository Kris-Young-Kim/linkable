import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getIsoMatches } from "@/core/matching/iso-mapping"
import { rankProducts } from "@/core/matching/ranking"
import { logEvent } from "@/lib/logging"
import { getMultipleIsoCodeLinksFromEnv } from "@/lib/config/iso-links-env"

const supabase = getSupabaseServerClient()
const MAX_LIMIT = 30

type RecommendationPersistenceItem = {
  productId: string
  matchReason?: string | null
  rank: number
}

const persistRecommendations = async (
  consultationId: string,
  items: RecommendationPersistenceItem[],
) => {
  const mapping = new Map<string, string>()

  const { error: deleteError } = await supabase
    .from("recommendations")
    .delete()
    .eq("consultation_id", consultationId)

  if (deleteError) {
    logEvent({
      category: "matching",
      action: "recommendations_cleanup_error",
      payload: { error: deleteError, consultationId },
      level: "warn",
    })
    return mapping
  }

  if (items.length === 0) {
    return mapping
  }

  const insertPayload = items.map((item) => ({
    consultation_id: consultationId,
    product_id: item.productId,
    match_reason: item.matchReason ?? null,
    rank: item.rank,
  }))

  const { data, error } = await supabase
    .from("recommendations")
    .insert(insertPayload)
    .select("id, product_id")

  if (error) {
    logEvent({
      category: "matching",
      action: "recommendations_persist_error",
      payload: { error, consultationId },
      level: "error",
    })
    return mapping
  }

  for (const row of data ?? []) {
    if (row?.product_id && row?.id) {
      mapping.set(row.product_id as string, row.id as string)
    }
  }

  logEvent({
    category: "matching",
    action: "recommendations_persisted",
    payload: { consultationId, count: data?.length ?? 0 },
  })

  return mapping
}

const parseIcfCodes = (raw: string | null) =>
  raw
    ?.split(/[,|\s]/)
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean) ?? []

const fetchAnalysisIcfCodes = async (consultationId: string) => {
  const { data, error } = await supabase
    .from("analysis_results")
    .select("icf_codes")
    .eq("consultation_id", consultationId)
    .maybeSingle()

  if (error) {
    logEvent({
      category: "matching",
      action: "analysis_fetch_error",
      payload: { error, consultationId },
      level: "warn",
    })
    return []
  }

  if (!data?.icf_codes) {
    return []
  }

  const { b = [], d = [], e = [] } = data.icf_codes as Record<string, string[]>
  return [...b, ...d, ...e].map((code) => code.toLowerCase())
}

const computeAvailabilityScore = (price?: number | null) => {
  if (price === null || price === undefined) return 0.5
  if (price < 50) return 0.9
  if (price < 150) return 0.75
  if (price < 500) return 0.6
  return 0.45
}

const computeFreshnessScore = (updatedAt?: string | null) => {
  if (!updatedAt) return 0.5
  const updatedDate = new Date(updatedAt).getTime()
  const now = Date.now()
  const diffDays = (now - updatedDate) / (1000 * 60 * 60 * 24)
  if (diffDays < 30) return 0.9
  if (diffDays < 120) return 0.7
  return 0.5
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const icfParam = parseIcfCodes(searchParams.get("icf"))
  const consultationId = searchParams.get("consultationId") ?? undefined
  const limitParam = Number(searchParams.get("limit")) || 12
  const limit = Math.min(Math.max(limitParam, 1), MAX_LIMIT)

  const icfCodes =
    icfParam.length > 0
      ? icfParam
      : consultationId
        ? await fetchAnalysisIcfCodes(consultationId)
        : []

  // K-IPPA 데이터 가져오기 (상담 단계에서 수집한 중요도, 현재 난이도)
  let ippaData: { importance?: number; currentDifficulty?: number } | null = null
  if (consultationId) {
    const { data: analysisData } = await supabase
      .from("analysis_results")
      .select("icf_codes")
      .eq("consultation_id", consultationId)
      .single()

    if (analysisData?.icf_codes) {
      const icfCodesObj = analysisData.icf_codes as Record<string, unknown>
      if (icfCodesObj.ippa_consultation) {
        ippaData = icfCodesObj.ippa_consultation as {
          importance?: number
          currentDifficulty?: number
        }
      }
    }
  }

  const isoMatches = getIsoMatches(icfCodes)
  const isoCodes = isoMatches.map((match) => match.isoCode)

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
  )

  if (isoCodes.length) {
    query = query.in("iso_code", isoCodes)
  }

  const { data, error } = await query.eq("is_active", true).limit(limit)

  if (error) {
    logEvent({
      category: "matching",
      action: "products_fetch_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
  }

  // 데이터베이스에서 조회된 제품의 ISO 코드 목록
  const foundIsoCodes = new Set((data ?? []).map((p) => p.iso_code))

  // 디버깅: 전체 상황 로그
  console.log("[products API] 제품 조회 상황:", {
    totalIsoMatches: isoMatches.length,
    isoCodes,
    dbProductCount: data?.length ?? 0,
    foundIsoCodes: Array.from(foundIsoCodes),
  })

  // 환경 변수에서 ISO 링크 가져오기
  // 데이터베이스에 제품이 있어도 환경 변수 링크를 추가로 포함
  const envLinksMap = getMultipleIsoCodeLinksFromEnv(isoCodes)
  
  // 디버깅: 환경 변수 조회 결과
  console.log("[products API] 환경 변수 조회 결과:", {
    requestedCodes: isoCodes,
    foundLinks: Array.from(envLinksMap.entries()).map(([code, links]) => ({
      isoCode: code,
      linkCount: links.length,
      links: links.slice(0, 2), // 처음 2개만 로그
    })),
  })

  // 환경 변수 링크를 가상 제품으로 변환
  const envProducts: Array<{
    id: string
    name: string
    iso_code: string
    manufacturer: string | null
    description: string | null
    image_url: string | null
    purchase_link: string
    price: number | null
    category: string | null
    created_at: string
    updated_at: string
    is_active: boolean
  }> = []

  for (const [isoCode, links] of envLinksMap.entries()) {
    const isoMatch = isoMatches.find((match) => match.isoCode === isoCode)
    if (!isoMatch) {
      console.log(`[products API] ISO 매칭 정보 없음: ${isoCode}`)
      continue
    }

    // 각 링크마다 별도의 제품 생성
    links.forEach((link, index) => {
      const productId = `env_${isoCode.replace(/\s/g, "_")}_${index}`
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
      })
    })
    
    console.log(`[products API] 환경 변수 제품 생성: ${isoCode} -> ${links.length}개`)
  }

  // 데이터베이스 제품과 환경 변수 제품 합치기
  const allProducts = [...(data ?? []), ...envProducts]

  if (envProducts.length > 0) {
    logEvent({
      category: "matching",
      action: "env_products_added",
      payload: {
        count: envProducts.length,
        isoCodes: Array.from(envLinksMap.keys()),
      },
    })
  }

  const rankingInput = allProducts.map((product) => {
    const isoMatch = isoMatches.find((match) => match.isoCode === product.iso_code)
    let matchScore = isoMatch?.score ?? (icfCodes.length > 0 ? 0.35 : 0.5)

    // K-IPPA 중요도 기반 가중치 적용
    if (ippaData?.importance) {
      // 중요도가 높을수록 매칭 점수에 가중치 적용
      // 중요도 1-5를 0.8-1.2 범위로 변환
      const importanceMultiplier = 0.8 + (ippaData.importance - 1) * 0.1 // 1->0.8, 5->1.2
      matchScore = Math.min(matchScore * importanceMultiplier, 1.0)
    }

    return {
      product,
      matchScore,
      availabilityScore: computeAvailabilityScore(product.price as number | null),
      freshnessScore: computeFreshnessScore(product.updated_at as string | null),
      isoMatch,
    }
  })

  const ranked = rankProducts(rankingInput).map((item) => {
    const isoMatch = item.isoMatch
    return {
      ...item.product,
      match_score: item.finalScore,
      match_reason: isoMatch?.reason ?? "사용자 기본 프로필과 부합하는 인기 보조기기입니다.",
      match_label: isoMatch?.label ?? null,
      matched_icf: isoMatch?.matchedIcf ?? [],
    }
  })

  let recommendationMap: Map<string, string> | null = null

  if (consultationId) {
    // 환경 변수 제품은 recommendations에 저장하지 않음 (가상 ID이므로)
    // 대신 purchase_link를 직접 저장하는 방식으로 변경 가능하지만, 현재 구조에서는 제외
    const persistenceItems = ranked
      .filter((product) => typeof product.id === "string" && !product.id.startsWith("env_"))
      .map((product, index) => ({
        productId: product.id as string,
        matchReason: product.match_reason ?? null,
        rank: index + 1,
      }))

    recommendationMap = await persistRecommendations(consultationId, persistenceItems)
  }

  logEvent({
    category: "matching",
    action: "products_retrieved",
    payload: { count: ranked.length, hasIcfContext: icfCodes.length > 0 },
  })

  // 디버깅 정보 포함
  const debugInfo = {
    icfCodes,
    isoMatches: isoMatches.map((m) => ({ isoCode: m.isoCode, label: m.label })),
    dbProductCount: data?.length ?? 0,
    envProductCount: envProducts.length,
    envIsoCodes: Array.from(envLinksMap.keys()),
    totalProducts: ranked.length,
  }

  console.log("[products API] 최종 응답:", debugInfo)

  return NextResponse.json({
    products: ranked.map((product) => ({
      ...product,
      recommendation_id: recommendationMap?.get(product.id as string) ?? null,
    })),
    icfCodes,
    // 개발 환경에서만 디버깅 정보 포함
    ...(process.env.NODE_ENV === "development" && { _debug: debugInfo }),
  })
}
