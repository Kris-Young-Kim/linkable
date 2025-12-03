import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs"

// 동적 import로 BaselineEvaluationClient 지연 로딩
const BaselineEvaluationClient = dynamic(
  () => import("@/components/ippa/baseline-evaluation-client").then((mod) => ({ default: mod.BaselineEvaluationClient })),
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

export const metadata: Metadata = {
  title: "기초선 평가 — LinkAble",
  description: "보조기기 사용 전 현재 상태를 평가해주세요.",
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
      ippa_activities,
      analysis_results(
        id,
        summary,
        identified_problems
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
      hasBaselineEvaluation,
    },
    analysis: analysisResult
      ? {
          summary: analysisResult.summary,
          identifiedProblems: analysisResult.identified_problems,
        }
      : null,
  }
}

export default async function BaselineEvaluationPage({
  params,
}: {
  params: Promise<{ consultationId: string }>
}) {
  const { consultationId } = await params
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=/dashboard/ippa/baseline/${consultationId}`)
  }

  const consultationData = await fetchConsultationData(consultationId, userId)

  if (!consultationData) {
    notFound()
  }

  const { consultation, analysis } = consultationData

  // 이미 평가가 완료된 경우 추천 페이지로 리다이렉트
  if (consultation.hasBaselineEvaluation) {
    redirect(`/recommendations/${consultationId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Breadcrumbs
            className="mb-2 text-xs"
            items={[
              { translationKey: "breadcrumbs.dashboard", href: "/dashboard" },
              { translationKey: "breadcrumbs.recommendations", href: `/recommendations/${consultationId}` },
              { label: "기초선 평가" },
            ]}
          />
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild aria-label="추천 페이지로 돌아가기">
              <Link href={`/recommendations/${consultationId}`}>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">기초선 평가</p>
              <h1 className="text-2xl font-bold text-foreground">현재 상태 평가</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 안내 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>기초선 평가란?</CardTitle>
              <CardDescription>
                보조기기 사용 전 현재 상태를 평가해주시면, 사용 후 개선도를 정확히 측정할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis?.summary && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">상담 요약</p>
                  <p className="text-sm text-foreground">{analysis.summary}</p>
                </div>
              )}
              {analysis?.identifiedProblems && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">주요 문제</p>
                  <p className="text-sm text-foreground">{analysis.identifiedProblems}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 평가 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>평가 시작</CardTitle>
              <CardDescription>
                AI가 상담 내용에서 추출한 활동 항목에 대해 중요도와 현재 어려움 정도를 평가해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BaselineEvaluationClient
                consultationId={consultationId}
                problemDescription={analysis?.identifiedProblems || analysis?.summary || ""}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

