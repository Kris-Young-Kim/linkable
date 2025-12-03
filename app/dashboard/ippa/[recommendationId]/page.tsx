import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { ArrowLeft, TrendingUp, TrendingDown, Minus, History } from "lucide-react"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IppaEvaluationPageClient } from "@/components/ippa/ippa-evaluation-page-client"
import { IppaHistoryComparison } from "@/components/ippa/ippa-history-comparison"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  title: "K-IPPA 평가 — LinkAble",
  description: "보조기기 사용 후 효과성을 평가하고 개선 경험을 공유하세요.",
}

async function fetchRecommendationData(recommendationId: string, clerkUserId: string) {
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

  // 2. 추천 정보 조회
  const { data: recommendation, error: recError } = await supabase
    .from("recommendations")
    .select(
      `
      id,
      product_id,
      consultation_id,
      match_reason,
      is_clicked,
      created_at,
      product:product_id(
        id,
        name,
        description,
        image_url
      ),
      consultations:consultation_id(
        id,
        title,
        user_id,
        analysis_results(
          summary,
          identified_problems
        )
      )
    `,
    )
    .eq("id", recommendationId)
    .maybeSingle()

  if (recError || !recommendation) {
    return null
  }

  // 3. 사용자 소유 확인
  const consultation = Array.isArray(recommendation.consultations)
    ? recommendation.consultations[0]
    : recommendation.consultations

  if (!consultation || consultation.user_id !== userRow.id) {
    return null
  }

  // 4. 이전 평가 히스토리 조회 (같은 product_id 또는 recommendation_id)
  const { data: previousEvaluations, error: evalError } = await supabase
    .from("ippa_evaluations")
    .select(
      `
      id,
      score_importance,
      score_difficulty_pre,
      score_difficulty_post,
      effectiveness_score,
      feedback_comment,
      evaluated_at
    `,
    )
    .eq("user_id", userRow.id)
    .or(`product_id.eq.${recommendation.product_id},recommendation_id.eq.${recommendationId}`)
    .order("evaluated_at", { ascending: false })
    .limit(10)

  if (evalError) {
    console.error("[IPPA Page] Evaluation history fetch error:", evalError)
  }

  const analysisResult = Array.isArray(consultation.analysis_results)
    ? consultation.analysis_results[0]
    : consultation.analysis_results

  const product = Array.isArray(recommendation.product)
    ? recommendation.product[0]
    : recommendation.product

  return {
    recommendation: {
      id: recommendation.id,
      productId: recommendation.product_id,
      productName: product?.name,
      productDescription: product?.description,
      matchReason: recommendation.match_reason,
      isClicked: recommendation.is_clicked,
      createdAt: recommendation.created_at,
    },
    consultation: {
      id: consultation.id,
      title: consultation.title,
      problemDescription:
        analysisResult?.identified_problems || analysisResult?.summary || consultation.title || "",
    },
    previousEvaluations: previousEvaluations ?? [],
  }
}

export default async function IppaEvaluationPage({
  params,
}: {
  params: Promise<{ recommendationId: string }>
}) {
  const { recommendationId } = await params
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/dashboard/ippa/${recommendationId}`)}`)
  }

  const data = await fetchRecommendationData(recommendationId, userId)

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">평가할 수 없습니다</CardTitle>
              <CardDescription>
                해당 추천을 찾을 수 없거나 평가 권한이 없습니다.
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

  const { recommendation, consultation, previousEvaluations } = data
  const hasPreviousEvaluations = previousEvaluations.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
        <Breadcrumbs
          className="text-xs text-muted-foreground"
          items={[
            { translationKey: "breadcrumbs.dashboard", href: "/dashboard" },
            { translationKey: "breadcrumbs.ippa", href: "/dashboard?tab=evaluations" },
            recommendation.productName
              ? { label: recommendation.productName }
              : { translationKey: "breadcrumbs.ippaEvaluation" },
          ]}
        />
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label="대시보드로 돌아가기">
            <Link href="/dashboard">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">K-IPPA 평가</h1>
            <p className="text-muted-foreground mt-1">
              {recommendation.productName || "보조기기"} 사용 후 효과성을 평가해 주세요
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 메인 평가 폼 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 추천 정보 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>평가 대상</CardTitle>
                <CardDescription>이 추천에 대한 평가를 진행합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">상품명</p>
                  <p className="text-lg font-medium text-foreground">
                    {recommendation.productName || "이름 없음"}
                  </p>
                </div>
                {recommendation.matchReason && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">추천 사유</p>
                    <p className="text-sm text-foreground">{recommendation.matchReason}</p>
                  </div>
                )}
                {consultation.problemDescription && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">해결하고자 했던 문제</p>
                    <p className="text-sm text-foreground">{consultation.problemDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* K-IPPA 평가 폼 */}
            <IppaEvaluationPageClient
              recommendationId={recommendation.id}
              productId={recommendation.productId}
              productName={recommendation.productName}
              problemDescription={consultation.problemDescription}
              consultationId={consultation.id}
            />
          </div>

          {/* 사이드바: 평가 히스토리 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="size-5" />
                  평가 히스토리
                </CardTitle>
                <CardDescription>
                  {hasPreviousEvaluations
                    ? `이전 평가 ${previousEvaluations.length}개`
                    : "아직 평가 기록이 없습니다"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasPreviousEvaluations ? (
                  <IppaHistoryComparison
                    currentRecommendationId={recommendation.id}
                    previousEvaluations={previousEvaluations}
                  />
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">첫 평가를 진행해 주세요</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

