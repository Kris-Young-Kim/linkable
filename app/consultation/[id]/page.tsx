import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import {
  ArrowLeft,
  CalendarClock,
  MessageCircle,
  MessageSquareText,
  Sparkles,
  Star,
} from "lucide-react"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IcfVisualization, type IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization"
import { ProductRecommendationCard } from "@/components/product-recommendation-card"

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

export default async function ConsultationDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=/consultation/${params.id}`)
  }

  const userRowId = await fetchUserRowId(userId)
  if (!userRowId) {
    redirect("/dashboard")
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("consultations")
    .select(
      `
        id,
        title,
        status,
        created_at,
        updated_at,
        analysis:analysis_results(
          summary,
          icf_codes,
          identified_problems
        ),
        recommendations:recommendations(
          id,
          match_reason,
          rank,
          product:product_id(
            id,
            name,
            description,
            image_url,
            purchase_link,
            price,
            iso_code
          )
        ),
        messages:chat_messages(
          id,
          sender,
          message_text,
          created_at
        )
      `,
    )
    .eq("id", params.id)
    .eq("user_id", userRowId)
    .order("created_at", { foreignTable: "chat_messages", ascending: true })
    .maybeSingle()

  if (error || !data) {
    redirect("/dashboard")
  }

  const analysisData = Array.isArray(data.analysis) ? data.analysis[0] : data.analysis
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>상담 요약</CardTitle>
                <CardDescription>최근 상담에서 드러난 핵심 내용을 정리했습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">요약</p>
                  <p className="mt-1 text-base leading-relaxed text-foreground">
                    {analysisData?.summary ?? "요약 정보가 준비되지 않았습니다."}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">주요 문제</p>
                  <p className="mt-1 text-base leading-relaxed text-foreground">
                    {analysisData?.identified_problems ?? "AI가 주요 문제를 아직 파악하지 못했습니다."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>상담 메시지 전체 기록</CardTitle>
                <CardDescription>AI와 나눈 대화를 시간 순으로 확인할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {messages.length > 0 ? (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                              message.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-foreground border"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/90 mb-1">
                              {message.sender === "user" ? (
                                <>
                                  <Star className="size-3" aria-hidden="true" />
                                  <span>사용자</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="size-3 text-primary" aria-hidden="true" />
                                  <span>링커</span>
                                </>
                              )}
                              <span>·</span>
                              <span>{formatDateTime(message.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-line">{message.message_text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    아직 대화 기록이 없습니다. 상담을 시작해 주세요.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ICF 분석</CardTitle>
                <CardDescription>AI가 추출한 ICF 코드 요약입니다.</CardDescription>
              </CardHeader>
              <CardContent>{icfBuckets ? <IcfVisualization data={icfBuckets} /> : <p className="text-sm text-muted-foreground">ICF 분석 데이터가 없습니다.</p>}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
                  추천된 보조기기
                </CardTitle>
                <CardDescription>추천 카드에서 바로 제품 정보를 확인하고 이동할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.length > 0 ? (
                  recommendations.map((rec) =>
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
                  )
                ) : (
                  <Card className="bg-muted/40 border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      추천 데이터가 아직 없습니다. 상담을 더 진행해 주세요.
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">다음 액션</CardTitle>
                <CardDescription>선택 가능한 후속 작업입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" variant="outline" asChild>
                  <Link href={`/consultation/report/${data.id}`}>
                    상담 리포트 보기
                    <MessageCircle className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button className="w-full justify-between" asChild>
                  <Link href={`/recommendations?consultationId=${data.id}`}>
                    추천 목록 열기
                    <MessageCircle className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

