import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { CalendarDays, CheckCircle2, Download, MessageSquare } from "lucide-react"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { IcfVisualization, type IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization"
import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

type MessageRow = {
  id: string
  sender: "user" | "ai" | "system"
  message_text: string
  created_at: string
}

export const dynamic = "force-dynamic"

const statusMap: Record<
  string,
  {
    label: string
    badgeClass: string
  }
> = {
  in_progress: { label: "진행 중", badgeClass: "bg-amber-100 text-amber-900" },
  completed: { label: "완료", badgeClass: "bg-emerald-100 text-emerald-900" },
  archived: { label: "보관됨", badgeClass: "bg-slate-200 text-slate-800" },
}

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString))

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

export default async function ConsultationReportPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=/consultation/report/${params.id}`)
  }

  const userRowId = await fetchUserRowId(userId)
  if (!userRowId) {
    notFound()
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
          id,
          summary,
          identified_problems,
          env_factors,
          icf_codes
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
    notFound()
  }

  const analysisRaw = Array.isArray(data.analysis) ? data.analysis[0] : data.analysis
  const icfBuckets =
    analysisRaw && typeof analysisRaw.icf_codes === "object" && !Array.isArray(analysisRaw.icf_codes)
      ? (analysisRaw.icf_codes as IcfAnalysisBuckets)
      : null

  const envFactors =
    analysisRaw?.env_factors
      ?.split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []

  const recommendations: RecommendationRow[] =
    data.recommendations?.map((rec: RecommendationRow) => ({
      ...rec,
      product: Array.isArray(rec.product) ? rec.product[0] ?? null : rec.product,
    })) ?? []

  const displayedMessages: MessageRow[] = (data.messages as MessageRow[] | null)?.slice(-6) ?? []

  const statusMeta = statusMap[data.status] ?? statusMap.in_progress
  const title = data.title || "상담 리포트"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-muted/30">
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Consultation Report</p>
            <h1 className="text-3xl font-bold text-foreground mt-2">{title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatDate(data.created_at)}
              </span>
              <Badge variant="outline" className={statusMeta.badgeClass}>
                {statusMeta.label}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="lg" disabled className="min-w-[160px]">
              <Download className="mr-2 size-4" aria-hidden="true" />
              PDF 다운로드 준비중
            </Button>
            <Button size="lg" className="min-w-[180px]" asChild>
              <Link href={`/recommendations?consultationId=${data.id}`}>추천 페이지 보기</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>상담 요약</CardTitle>
              <CardDescription>AI 분석을 통해 도출된 핵심 문제가 정리되어 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">요약</p>
                <p className="text-base leading-relaxed text-foreground">
                  {analysisRaw?.summary ?? "요약 정보가 아직 준비되지 않았습니다."}
                </p>
              </div>
              {analysisRaw?.identified_problems && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">주요 불편 사항</p>
                  <p className="text-base leading-relaxed text-foreground">{analysisRaw.identified_problems}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>환경 요소 분석</CardTitle>
              <CardDescription>AI가 상담 내용을 토대로 파악한 주변 환경 요소입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {envFactors.length > 0 ? (
                <ul className="space-y-2">
                  {envFactors.map((factor) => (
                    <li key={factor} className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="size-4 text-primary mt-1 shrink-0" aria-hidden="true" />
                      <span className="text-base">{factor}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">환경 요소 분석 결과가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>ICF 코드 분석</CardTitle>
                  <CardDescription>상담 중 언급된 신체 기능 · 활동 · 환경 요소를 시각화합니다.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>{icfBuckets ? <IcfVisualization data={icfBuckets} /> : <p className="text-sm text-muted-foreground">ICF 분석 데이터가 없습니다.</p>}</CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">추천된 보조기기</h2>
            <span className="text-sm text-muted-foreground">{recommendations.length}건</span>
          </div>
          {recommendations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
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
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                추천 데이터가 아직 생성되지 않았습니다. 상담을 조금 더 진행해 주세요.
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>상담 하이라이트</CardTitle>
              <CardDescription>최근 대화 내용을 요약해 드립니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayedMessages.length > 0 ? (
                displayedMessages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-2 font-medium text-foreground">
                        <MessageSquare className="size-4 text-primary" aria-hidden="true" />
                        {message.sender === "user" ? "사용자" : "링커"}
                      </span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                    <p className="text-base leading-relaxed text-foreground whitespace-pre-line">
                      {message.message_text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">대화 기록이 아직 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

