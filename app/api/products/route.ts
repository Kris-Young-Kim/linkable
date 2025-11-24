import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getIsoMatches } from "@/core/matching/iso-mapping"
import { rankProducts } from "@/core/matching/ranking"
import { logEvent } from "@/lib/logging"

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

  const rankingInput = (data ?? []).map((product) => {
    const isoMatch = isoMatches.find((match) => match.isoCode === product.iso_code)
    const matchScore = isoMatch?.score ?? (icfCodes.length > 0 ? 0.35 : 0.5)

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
    const persistenceItems = ranked
      .filter((product) => typeof product.id === "string")
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

  return NextResponse.json({
    products: ranked.map((product) => ({
      ...product,
      recommendation_id: recommendationMap?.get(product.id as string) ?? null,
    })),
    icfCodes,
  })
}
