import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { RecommendationsView, type RecommendationProduct } from "@/components/recommendations-view"

type SearchParams = {
  icf?: string
  consultationId?: string
  limit?: string
}

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

const fetchRecommendations = async (params: SearchParams) => {
  const search = new URLSearchParams()
  if (params.icf) search.set("icf", params.icf)
  if (params.consultationId) search.set("consultationId", params.consultationId)
  if (params.limit) search.set("limit", params.limit)

  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/api/products?${search.toString()}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return (await response.json()) as { products: RecommendationProduct[] }
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = await searchParams
  const normalizedParams: SearchParams = {
    icf: typeof resolvedParams.icf === "string" ? resolvedParams.icf : undefined,
    consultationId:
      typeof resolvedParams.consultationId === "string" ? resolvedParams.consultationId : undefined,
    limit: typeof resolvedParams.limit === "string" ? resolvedParams.limit : undefined,
  }

  // consultationId가 있으면 동적 라우트로 리다이렉트
  if (normalizedParams.consultationId) {
    redirect(`/recommendations/${normalizedParams.consultationId}`)
  }

  // consultationId가 없으면 기존 방식으로 동작 (ICF 코드 기반 추천)
  let products: RecommendationProduct[] = []
  let errorMessage: string | null = null

  try {
    const data = await fetchRecommendations(normalizedParams)
    products = data.products
  } catch (error) {
    console.error("[recommendations] fetch_error", error)
    errorMessage = "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
  }

  return <RecommendationsView products={products} errorMessage={errorMessage} />
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/recommendations`
const ogImage = `${baseUrl}/modern-walking-cane-with-led-light.jpg`

export const metadata: Metadata = {
  title: "LinkAble 추천 — 맞춤형 보조기기 리스트",
  description: "링커 분석 결과를 바탕으로 ICF·ISO 기준에 맞춘 맞춤형 보조기기 추천을 확인하세요.",
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: pageUrl,
    title: "LinkAble 추천 리스트",
    description: "ICF 분석과 ISO 매칭으로 엄선한 보조기기를 한눈에 비교하고 바로 구매 페이지로 이동하세요.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "LinkAble 추천 보조기기 미리보기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkAble 추천 리스트",
    description: "AI가 선별한 맞춤형 보조기기를 확인하고 필요한 솔루션을 빠르게 찾으세요.",
    images: [ogImage],
  },
}

