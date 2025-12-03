import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import {
  ArrowLeft,
  CalendarClock,
  MessageSquareText,
} from "lucide-react"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IcfVisualization, type IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization"
import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { Breadcrumbs } from "@/components/navigation/breadcrumbs"
import { ConsultationRating } from "@/components/consultation-rating"
import { ChatHistoryCollapsible } from "@/components/consultation/chat-history-collapsible"

type MessageRow = {
  id: string
  sender: "user" | "ai" | "system"
  message_text: string
  created_at: string
}

type RecommendationRow = {
  id: string
  match_reason: string | null
  rank: number | null
  product: {
    id: string
    name: string
    description: string | null
    image_url: string | null
    purchase_link: string | null
    price: number | null
    iso_code: string | null
  } | null
}

const statusBadgeMap: Record<
  string,
  {
    label: string
    className: string
  }
> = {
  in_progress: { label: "진행 중", className: "bg-amber-100 text-amber-900" },
  completed: { label: "완료", className: "bg-emerald-100 text-emerald-900" },
  archived: { label: "보관됨", className: "bg-slate-200 text-slate-800" },
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))

async function fetchUserRowId(clerkUserId: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (error || !data?.id) {
    return null
  }

  return data.id
}

export default async function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=/consultation/${id}`)
  }

  const userRowId = await fetchUserRowId(userId)
  if (!userRowId) {
    // 리다이렉트 대신 에러 페이지 표시 (301 리다이렉트 방지)
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-10 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>접근 권한이 없습니다</CardTitle>
              <CardDescription>
                사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const supabase = getSupabaseServerClient()
  
  // 먼저 기본 상담 정보만 조회
  const { data: consultationData, error: consultationError } = await supabase
    .from("consultations")
    .select("id, title, status, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userRowId)
    .maybeSingle()

  if (consultationError) {
    console.error("[consultation detail] 상담 조회 오류:", {
      error: consultationError,
      code: consultationError.code,
      message: consultationError.message,
      details: consultationError.details,
      hint: consultationError.hint,
      consultationId: id,
      userRowId,
    })
  }

  if (!consultationData) {
    console.error("[consultation detail] 상담 데이터 없음:", {
      consultationId: id,
      userRowId,
    })
  }

  // 상담이 없으면 에러 페이지 표시
  if (consultationError || !consultationData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-10 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>상담을 찾을 수 없습니다</CardTitle>
              <CardDescription>
                해당 상담을 찾을 수 없거나 접근 권한이 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 관련 데이터를 별도로 조회
  const [analysisResult, recommendationsResult, messagesResult, feedbackResult] = await Promise.all([
    // 분석 결과
    supabase
      .from("analysis_results")
      .select("summary, icf_codes, identified_problems")
      .eq("consultation_id", id)
      .maybeSingle(),
    
    // 추천 목록
    supabase
      .from("recommendations")
      .select(`
        id,
        match_reason,
        rank,
        product_id,
        product:product_id(
          id,
          name,
          description,
          image_url,
          purchase_link,
          price,
          iso_code
        )
      `)
      .eq("consultation_id", id)
      .order("rank", { ascending: true }),
    
    // 메시지
    supabase
      .from("chat_messages")
      .select("id, sender, message_text, created_at")
      .eq("consultation_id", id)
      .order("created_at", { ascending: true }),
    
    // 피드백
    supabase
      .from("consultation_feedback")
      .select("accuracy_rating, feedback_comment")
      .eq("consultation_id", id)
      .maybeSingle(),
  ])

  // 에러 로깅 (피드백은 선택적이므로 에러가 있어도 무시)
  if (analysisResult.error && analysisResult.error.code !== "PGRST116") {
    console.error("[consultation detail] 분석 결과 조회 오류:", {
      error: analysisResult.error,
      code: analysisResult.error.code,
      message: analysisResult.error.message,
    })
  }
  if (recommendationsResult.error) {
    console.error("[consultation detail] 추천 조회 오류:", {
      error: recommendationsResult.error,
      code: recommendationsResult.error.code,
      message: recommendationsResult.error.message,
    })
  }
  if (messagesResult.error) {
    console.error("[consultation detail] 메시지 조회 오류:", {
      error: messagesResult.error,
      code: messagesResult.error.code,
      message: messagesResult.error.message,
    })
  }
  // 피드백은 선택적이므로 에러가 있어도 경고만 표시
  if (feedbackResult.error && feedbackResult.error.code !== "PGRST116") {
    console.warn("[consultation detail] 피드백 조회 경고 (무시됨):", {
      error: feedbackResult.error,
      code: feedbackResult.error.code,
      message: feedbackResult.error.message,
    })
  }

  // 데이터 정리 (에러가 있어도 사용 가능한 데이터는 사용)
  const data = {
    ...consultationData,
    analysis: analysisResult.error ? null : analysisResult.data,
    recommendations: recommendationsResult.error ? [] : (recommendationsResult.data ?? []),
    messages: messagesResult.error ? [] : (messagesResult.data ?? []),
    feedback: feedbackResult.error ? null : feedbackResult.data,
  }

  const analysisData = data.analysis
  const icfBuckets =
    analysisData && analysisData.icf_codes && typeof analysisData.icf_codes === "object"
      ? (analysisData.icf_codes as IcfAnalysisBuckets)
      : null

  const recommendations: RecommendationRow[] =
    data.recommendations?.map((rec) => ({
      ...rec,
      product: Array.isArray(rec.product) ? rec.product[0] ?? null : rec.product,
    })) ?? []

  const messages: MessageRow[] = Array.isArray(data.messages) ? data.messages : []

  const statusMeta = statusBadgeMap[data.status] ?? statusBadgeMap.in_progress
  const title = data.title || "제목 없는 상담"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-10 space-y-8">
        <Breadcrumbs
          className="text-xs text-muted-foreground"
          items={[
            { translationKey: "breadcrumbs.dashboard", href: "/dashboard" },
            { label: title },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="대시보드로 돌아가기">
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">Consultation Detail</p>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
              <CalendarClock className="size-4" />
              {formatDateTime(data.created_at)}
            </div>
            <Badge variant="outline" className={statusMeta.className}>
              {statusMeta.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* 상담 내역 정리 */}
          <Card>
            <CardHeader>
              <CardTitle>상담 내역 정리</CardTitle>
              <CardDescription>AI가 상담 내용을 분석하여 정리한 핵심 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">상담 요약</p>
                <p className="text-base leading-relaxed text-foreground">
                  {analysisData?.summary ?? "요약 정보가 준비되지 않았습니다."}
                </p>
              </div>
              {analysisData?.identified_problems && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">주요 문제</p>
                  <p className="text-base leading-relaxed text-foreground">
                    {analysisData.identified_problems}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ICF 분석 결과 */}
          <Card>
            <CardHeader>
              <CardTitle>ICF 분석 결과</CardTitle>
              <CardDescription>채팅 중 추출된 ICF 코드를 시각화하여 표시합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {icfBuckets ? (
                <IcfVisualization data={icfBuckets} />
              ) : (
                <p className="text-sm text-muted-foreground py-4">ICF 분석 데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 추천 보조기기 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                추천 보조기기 ({recommendations.length}개)
              </CardTitle>
              <CardDescription>상담 내용을 바탕으로 추천된 보조기기 목록입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendations.map((rec) =>
                    rec.product ? (
                      <ProductRecommendationCard
                        key={rec.id}
                        recommendationId={rec.id}
                        productName={rec.product.name}
                        description={rec.product.description ?? "상세 설명 준비 중입니다."}
                        functionalSupport={rec.product.description ?? ""}
                        imageUrl={rec.product.image_url ?? undefined}
                        matchReason={rec.match_reason ?? undefined}
                        matchScore={rec.rank ? 1 - Math.min(rec.rank / 10, 0.9) : undefined}
                        isoCode={rec.product.iso_code ?? undefined}
                        price={rec.product.price}
                        purchaseLink={rec.product.purchase_link}
                      />
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                  <p className="text-sm">추천된 보조기기가 없습니다.</p>
                  <p className="text-xs mt-1">상담을 더 진행하면 추천이 제공됩니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 채팅 기록 (접을 수 있게) */}
          <ChatHistoryCollapsible messages={messages} />

          {/* 상담 평가 */}
          <ConsultationRating
            consultationId={data.id}
            existingRating={
              Array.isArray(data.feedback) 
                ? data.feedback[0]?.accuracy_rating 
                : data.feedback?.accuracy_rating
            }
            existingComment={
              Array.isArray(data.feedback)
                ? data.feedback[0]?.feedback_comment
                : data.feedback?.feedback_comment
            }
          />
        </div>
      </div>
    </div>
  )
}

