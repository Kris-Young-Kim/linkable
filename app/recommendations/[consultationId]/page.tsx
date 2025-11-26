import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { ArrowLeft, Filter, ArrowUpDown, Sparkles } from "lucide-react"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RecommendationsViewWithFilters, type RecommendationProduct } from "@/components/recommendations/recommendations-view-with-filters"
import { IcfVisualization, type IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  title: "LinkAble 추천 — 맞춤형 보조기기 리스트",
  description: "링커 분석 결과를 바탕으로 ICF·ISO 기준에 맞춘 맞춤형 보조기기 추천을 확인하세요.",
}

async function fetchConsultationData(consultationId: string, clerkUserId: string) {
  const supabase = getSupabaseServerClient()

  // 1. 사용자 ID 조회
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (userError || !userRow?.id) {
    return null
  }

  // 2. 상담 정보 조회
  const { data: consultation, error: consultError } = await supabase
    .from("consultations")
    .select(
      `
      id,
      title,
      status,
      created_at,
      updated_at,
      analysis_results(
        id,
        summary,
        icf_codes,
        identified_problems,
        env_factors
      )
    `,
    )
    .eq("id", consultationId)
    .eq("user_id", userRow.id)
    .maybeSingle()

  if (consultError || !consultation) {
    return null
  }

  const analysisResult = Array.isArray(consultation.analysis_results)
    ? consultation.analysis_results[0]
    : consultation.analysis_results

  return {
    consultation: {
      id: consultation.id,
      title: consultation.title,
      status: consultation.status,
      createdAt: consultation.created_at,
      updatedAt: consultation.updated_at,
    },
    analysis: analysisResult
      ? {
          summary: analysisResult.summary,
          icfCodes: analysisResult.icf_codes as IcfAnalysisBuckets | null,
          identifiedProblems: analysisResult.identified_problems,
          envFactors: analysisResult.env_factors,
        }
      : null,
  }
}

async function fetchRecommendations(consultationId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/products?consultationId=${consultationId}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return (await response.json()) as { products: RecommendationProduct[] }
}

export default async function RecommendationsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ consultationId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { consultationId } = await params
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/recommendations/${consultationId}`)}`)
  }

  const resolvedSearchParams = await searchParams
  const sortBy = typeof resolvedSearchParams.sort === "string" ? resolvedSearchParams.sort : "rank"
  const filterBy = typeof resolvedSearchParams.filter === "string" ? resolvedSearchParams.filter : "all"

  // 상담 데이터 조회
  const consultationData = await fetchConsultationData(consultationId, userId)

  if (!consultationData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">추천을 찾을 수 없습니다</CardTitle>
              <CardDescription>
                해당 상담을 찾을 수 없거나 접근 권한이 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard">대시보드로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 추천 데이터 조회
  let products: RecommendationProduct[] = []
  let errorMessage: string | null = null

  try {
    const data = await fetchRecommendations(consultationId)
    products = data.products
  } catch (error) {
    console.error("[recommendations] fetch_error", error)
    errorMessage = "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
  }

  const { consultation, analysis } = consultationData

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild aria-label="대시보드로 돌아가기">
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">추천 상세</p>
              <h1 className="text-2xl font-bold text-foreground">
                {consultation.title || "제목 없는 상담"}의 추천
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* 상담 컨텍스트 섹션 */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* 상담 요약 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  상담 요약
                </CardTitle>
                <CardDescription>이 상담에서 파악한 핵심 내용입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis?.summary ? (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">요약</p>
                    <p className="text-base leading-relaxed text-foreground">{analysis.summary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">요약 정보가 준비되지 않았습니다.</p>
                )}
                {analysis?.identifiedProblems && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">주요 문제</p>
                    <p className="text-base leading-relaxed text-foreground">{analysis.identifiedProblems}</p>
                  </div>
                )}
                {analysis?.envFactors && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">환경 요소</p>
                    <p className="text-base leading-relaxed text-foreground">{analysis.envFactors}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ICF 분석 결과 */}
            {analysis?.icfCodes && (
              <Card>
                <CardHeader>
                  <CardTitle>ICF 분석 결과</CardTitle>
                  <CardDescription>AI가 추출한 ICF 코드 요약입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <IcfVisualization data={analysis.icfCodes} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* 사이드바: 상담 정보 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">상담 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">상태</p>
                  <Badge
                    variant="outline"
                    className={
                      consultation.status === "completed"
                        ? "bg-emerald-100 text-emerald-900"
                        : consultation.status === "in_progress"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-200 text-slate-700"
                    }
                  >
                    {consultation.status === "completed"
                      ? "완료"
                      : consultation.status === "in_progress"
                        ? "진행 중"
                        : "보관됨"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">생성일</p>
                  <p className="text-sm text-foreground">
                    {new Date(consultation.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">최종 업데이트</p>
                  <p className="text-sm text-foreground">
                    {new Date(consultation.updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/consultation/${consultation.id}`}>상담 상세 보기</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 추천 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>추천된 보조기기</CardTitle>
                <CardDescription>
                  {products.length > 0
                    ? `총 ${products.length}개의 추천이 있습니다`
                    : "아직 추천이 생성되지 않았습니다"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RecommendationsViewWithFilters
              products={products}
              errorMessage={errorMessage}
              consultationId={consultationId}
              initialSort={sortBy}
              initialFilter={filterBy}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

