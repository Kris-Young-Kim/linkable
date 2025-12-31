import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { Calendar, CheckCircle2, Clock, ArrowRight } from "lucide-react"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  title: "K-IPPA 평가 — LinkAble",
  description: "보조기기 사용 후 효과성을 평가하고 개선 경험을 공유하세요.",
}

interface EvaluationTarget {
  id: string
  product_id: string
  consultation_id: string
  match_reason: string | null
  created_at: string
  product: {
    id: string
    name: string
    image_url: string | null
    description: string | null
  } | null
  consultation: {
    id: string
    title: string | null
  } | null
  daysSinceCreation: number
  hasEvaluation: boolean
}

async function fetchEvaluationTargets(clerkUserId: string): Promise<EvaluationTarget[]> {
  const supabase = getSupabaseServerClient()

  // 1. 사용자 ID 조회
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (userError || !userRow?.id) {
    return []
  }

  const userId = userRow.id

  // 2. 클릭된 추천 중 평가 대상 찾기 (7일 이상 경과)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysCutoff = sevenDaysAgo.toISOString()

  const { data: recommendations, error: recError } = await supabase
    .from("recommendations")
    .select(
      `
      id,
      product_id,
      consultation_id,
      match_reason,
      created_at,
      product:product_id(
        id,
        name,
        image_url,
        description
      ),
      consultations:consultation_id(
        id,
        title
      )
    `,
    )
    .eq("is_clicked", true)
    .lt("created_at", sevenDaysCutoff)
    .order("created_at", { ascending: false })
    .limit(50)

  if (recError || !recommendations) {
    console.error("[IPPA Page] Failed to fetch recommendations:", recError)
    return []
  }

  // 3. 이미 평가가 제출된 recommendation_id 목록 가져오기
  const recommendationIds = recommendations.map((r) => r.id)
  const { data: evaluatedRecommendations } = await supabase
    .from("ippa_evaluations")
    .select("recommendation_id")
    .in("recommendation_id", recommendationIds)
    .not("recommendation_id", "is", null)

  const evaluatedIds = new Set(
    (evaluatedRecommendations ?? [])
      .map((e) => e.recommendation_id)
      .filter(Boolean) as string[],
  )

  // 4. 사용자의 상담만 필터링
  const { data: userConsultations } = await supabase
    .from("consultations")
    .select("id")
    .eq("user_id", userId)

  const userConsultationIds = new Set((userConsultations ?? []).map((c) => c.id))

  // 5. 데이터 변환 및 필터링
  const now = Date.now()
  const targets: EvaluationTarget[] = recommendations
    .filter((rec) => {
      const consultation = Array.isArray(rec.consultations)
        ? rec.consultations[0]
        : rec.consultations
      return consultation && userConsultationIds.has(consultation.id)
    })
    .map((rec) => {
      const consultation = Array.isArray(rec.consultations)
        ? rec.consultations[0]
        : rec.consultations
      const product = Array.isArray(rec.product) ? rec.product[0] : rec.product
      const createdDate = new Date(rec.created_at)
      const daysSinceCreation = Math.floor((now - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      const hasEvaluation = evaluatedIds.has(rec.id)

      return {
        id: rec.id,
        product_id: rec.product_id!,
        consultation_id: rec.consultation_id!,
        match_reason: rec.match_reason,
        created_at: rec.created_at,
        product: product ?? null,
        consultation: consultation ?? null,
        daysSinceCreation,
        hasEvaluation,
      }
    })
    .filter((target) => target.product !== null) // 제품 정보가 있는 것만

  return targets
}

export default async function IppaPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/dashboard/ippa")}`)
  }

  const targets = await fetchEvaluationTargets(userId)
  const pendingTargets = targets.filter((t) => !t.hasEvaluation)
  const completedTargets = targets.filter((t) => t.hasEvaluation)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: "대시보드", href: "/dashboard" },
            { label: "K-IPPA 평가", href: "/dashboard/ippa" },
          ]}
        />

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">K-IPPA 평가</h1>
            <p className="text-muted-foreground">
              보조기기 사용 후 효과성을 평가하고 개선 경험을 공유하세요.
            </p>
          </div>

          {/* 평가 대기 중인 항목 */}
          {pendingTargets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  평가 대기 중 ({pendingTargets.length}개)
                </CardTitle>
                <CardDescription>
                  보조기기를 사용한 지 7일 이상 지난 추천에 대해 평가를 진행해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingTargets.map((target) => (
                  <div
                    key={target.id}
                    className="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {target.product?.image_url && (
                        <img
                          src={target.product.image_url}
                          alt={target.product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {target.product?.name || "제품명 없음"}
                            </h3>
                            {target.consultation?.title && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {target.consultation.title}
                              </p>
                            )}
                            {target.match_reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {target.match_reason}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {target.daysSinceCreation}일 전
                          </Badge>
                        </div>
                        <div className="flex justify-end">
                          <Button asChild>
                            <Link href={`/dashboard/ippa/${target.id}`}>
                              평가 시작
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 평가 완료된 항목 */}
          {completedTargets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  평가 완료 ({completedTargets.length}개)
                </CardTitle>
                <CardDescription>
                  이미 평가를 완료한 보조기기 목록입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {completedTargets.map((target) => (
                  <div
                    key={target.id}
                    className="rounded-lg border border-border bg-card p-4 opacity-75"
                  >
                    <div className="flex items-start gap-4">
                      {target.product?.image_url && (
                        <img
                          src={target.product.image_url}
                          alt={target.product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              {target.product?.name || "제품명 없음"}
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                완료
                              </Badge>
                            </h3>
                            {target.consultation?.title && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {target.consultation.title}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {target.daysSinceCreation}일 전
                          </Badge>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/ippa/${target.id}`}>
                              평가 보기
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 평가 대상이 없는 경우 */}
          {targets.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>평가할 항목이 없습니다</CardTitle>
                <CardDescription>
                  보조기기를 클릭하고 7일 이상 지나면 여기에서 평가할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard">대시보드로 이동</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
