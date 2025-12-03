import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { ArrowLeft, Filter, ArrowUpDown, Sparkles, ClipboardCheck } from "lucide-react"
import { Suspense } from "react"
import dynamic from "next/dynamic"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LocalNav } from "@/components/navigation/local-nav"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs"
import type { RecommendationProduct } from "@/components/recommendations/recommendations-view-with-filters"
import type { IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization"

// 동적 import로 무거운 컴포넌트 지연 로딩
const RecommendationsViewWithFilters = dynamic(
  () => import("@/components/recommendations/recommendations-view-with-filters").then((mod) => ({ default: mod.RecommendationsViewWithFilters })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg" />
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),
    ssr: true,
  }
)

// 상담 종료 설문 컴포넌트 (클라이언트 컴포넌트)
// 이미 "use client"로 선언된 컴포넌트이므로 ssr: false 불필요
const ConsultationFeedbackForm = dynamic(
  () => import("@/components/consultation-feedback-form").then((mod) => ({ default: mod.ConsultationFeedbackForm })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    ),
  }
)

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
      ippa_activities,
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

  // 기초선 평가 완료 여부 확인
  const hasBaselineEvaluation = consultation.ippa_activities && 
    typeof consultation.ippa_activities === 'object' &&
    Array.isArray((consultation.ippa_activities as any).activities) &&
    (consultation.ippa_activities as any).activities.length > 0

  return {
    consultation: {
      id: consultation.id,
      title: consultation.title,
      status: consultation.status,
      createdAt: consultation.created_at,
      updatedAt: consultation.updated_at,
      hasBaselineEvaluation,
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
    
    // 디버깅: 클라이언트에서도 확인 가능하도록
    if (process.env.NODE_ENV === "development" && (data as any)._debug) {
      console.log("[recommendations page] API 응답 디버깅 정보:", (data as any)._debug)
    }
    
    console.log("[recommendations page] 제품 개수:", products.length)
    if (products.length === 0) {
      console.warn("[recommendations page] 제품이 없습니다. ICF 코드:", consultationData.analysis?.icfCodes)
    }
  } catch (error) {
    console.error("[recommendations] fetch_error", error)
    errorMessage = "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
  }

  const { consultation, analysis } = consultationData

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Breadcrumbs
            className="mb-2 text-xs"
            items={[
              { translationKey: "breadcrumbs.dashboard", href: "/dashboard" },
              { translationKey: "breadcrumbs.recommendations", href: "/recommendations" },
              consultation.title
                ? { label: consultation.title }
                : { translationKey: "breadcrumbs.recommendationDetail" },
            ]}
          />
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild aria-label="대시보드로 돌아가기">
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">상담 상세</p>
              <h1 className="text-2xl font-bold text-foreground">링커의 맞춤 추천</h1>
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

            {/* 기초선 평가 제안 (아직 평가하지 않은 경우만 표시) */}
            {!consultation.hasBaselineEvaluation && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">기초선 평가</CardTitle>
                  </div>
                  <CardDescription>
                    현재 상태를 평가해주시면, 보조기기 사용 후 개선도를 정확히 측정할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <Link href={`/dashboard/ippa/baseline/${consultation.id}`}>
                      기초선 평가 시작하기
                    </Link>
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    평가는 선택사항이며, 나중에 대시보드에서도 진행할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 기초선 평가 완료 표시 */}
            {consultation.hasBaselineEvaluation && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-lg text-emerald-900">기초선 평가 완료</CardTitle>
                  </div>
                  <CardDescription className="text-emerald-700">
                    기초선 평가가 완료되었습니다. 보조기기 사용 후 효과를 측정할 준비가 되었습니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* 상담 종료 설문 (완료된 상담만 표시) */}
            {consultation.status === "completed" && (
              <ConsultationFeedbackForm
                consultationId={consultation.id}
                onSuccess={() => {
                  // 피드백 제출 성공 시 처리 (선택적)
                }}
              />
            )}
          </div>
        </div>

        {/* 추천 목록 */}
        <Card>
          <CardHeader className="pb-0">
            <LocalNav
              items={[
                { label: "전체 추천", href: `/recommendations/${consultationId}?filter=${filterBy}&sort=${sortBy}` },
                { label: "필터", href: `/recommendations/${consultationId}?filter=favorites&sort=${sortBy}`, badge: "Soon" },
                { label: "평가 대기", href: `/recommendations/${consultationId}?filter=pending&sort=${sortBy}`, badge: "Soon" },
              ]}
              className="overflow-x-auto"
              label="Recommendation filters"
            />
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              {products.length > 0 ? `총 ${products.length}개의 추천이 있습니다.` : "아직 추천이 생성되지 않았습니다."}
            </div>
            <Suspense
              fallback={
                <div className="space-y-6">
                  <div className="h-12 bg-muted animate-pulse rounded-lg" />
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="h-48 bg-muted rounded-t-lg" />
                        <CardHeader>
                          <div className="h-6 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                        </CardHeader>
                        <CardContent>
                          <div className="h-4 bg-muted rounded w-full mb-2" />
                          <div className="h-4 bg-muted rounded w-5/6" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              }
            >
              <RecommendationsViewWithFilters
                products={products}
                errorMessage={errorMessage}
                consultationId={consultationId}
                initialSort={sortBy}
                initialFilter={filterBy}
              />
            </Suspense>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

