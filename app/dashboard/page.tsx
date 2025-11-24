import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { formatDistanceToNow } from "date-fns"
import { EffectivenessDashboard } from "@/components/effectiveness-dashboard"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type RecommendationRow = {
  id: string
  product_id: string | null
  match_reason: string | null
  is_clicked: boolean | null
}

type ConsultationRow = {
  id: string
  title: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
  recommendations: RecommendationRow[] | null
}

const statusStyle: Record<string, string> = {
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-200 text-slate-700",
}

const fetchDashboardData = async (clerkUserId: string) => {
  const supabase = getSupabaseServerClient()
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (userError || !userRow?.id) {
    return { consultations: [] as ConsultationRow[] }
  }

  const { data, error } = await supabase
    .from("consultations")
    .select(
      `
        id,
        title,
        status,
        created_at,
        updated_at,
        recommendations:recommendations(id, product_id, match_reason, is_clicked)
      `,
    )
    .eq("user_id", userRow.id)
    .order("updated_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("[dashboard] consultations_fetch_error", error)
    return { consultations: [] as ConsultationRow[] }
  }

  return { consultations: (data as ConsultationRow[]) ?? [] }
}

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">로그인이 필요합니다</CardTitle>
              <CardDescription>대시보드 정보를 확인하려면 로그인 후 다시 시도해 주세요.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/sign-in">로그인 바로가기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">홈으로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { consultations } = await fetchDashboardData(userId)
  const activeConsultations = consultations.filter((item) => item.status === "in_progress")
  const completedConsultations = consultations.filter((item) => item.status === "completed")
  const pendingRecommendations = consultations.flatMap((item) => item.recommendations ?? []).filter(
    (rec) => rec && !rec.is_clicked,
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 space-y-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">LinkAble Insight Center</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Effectiveness Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-base">
              상담 진행 현황과 추천 보조기기 활용도를 한눈에 확인하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/chat">AI 상담 이어가기</Link>
            </Button>
            <Button variant="outline" className="bg-transparent" asChild>
              <Link href="/recommendations">추천 목록 보기</Link>
            </Button>
          </div>
        </section>

        <EffectivenessDashboard />

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>상담 타임라인</CardTitle>
              <CardDescription>최근 상담 상태와 추천 진행 상황을 확인하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {consultations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 상담 기록이 없습니다. 첫 상담을 시작하면 이곳에 타임라인이 표시됩니다.
                </p>
              ) : (
                consultations.map((consultation) => {
                  const badgeStyle = consultation.status
                    ? statusStyle[consultation.status] || "bg-slate-200 text-slate-700"
                    : "bg-slate-200 text-slate-700"
                  const recommendationCount = consultation.recommendations?.length ?? 0
                  const unclickedCount = consultation.recommendations?.filter((rec) => !rec.is_clicked).length ?? 0

                  return (
                    <div
                      key={consultation.id}
                      className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {consultation.title || "무제 상담"}
                        </h3>
                        <Badge className={badgeStyle}>
                          {consultation.status === "completed"
                            ? "완료"
                            : consultation.status === "in_progress"
                              ? "진행 중"
                              : consultation.status ?? "미정"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {consultation.updated_at
                          ? `${formatDistanceToNow(new Date(consultation.updated_at), { addSuffix: true })} 업데이트`
                          : "최근 업데이트 없음"}
                      </p>
                      <div className="text-xs text-foreground/80">
                        추천 {recommendationCount}건 · 클릭 대기 {unclickedCount}건
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>다음 단계</CardTitle>
              <CardDescription>추천 제품 확인, 클릭률 추적, 평가 요청 등을 빠르게 진행하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">진행 중 상담</p>
                  <p className="text-muted-foreground text-sm">
                    {activeConsultations.length}개 세션이 답변을 기다리고 있어요
                  </p>
                </div>
                <Badge variant="secondary">{activeConsultations.length}</Badge>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">미클릭 추천</p>
                  <p className="text-muted-foreground text-sm">{pendingRecommendations.length}개의 추천이 대기 중</p>
                </div>
                <Badge variant="outline">{pendingRecommendations.length}</Badge>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">완료된 상담</p>
                  <p className="text-muted-foreground text-sm">{completedConsultations.length}건의 피드백 가능</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">{completedConsultations.length}</Badge>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button className="flex-1 min-w-[180px]" asChild>
                  <Link href="/recommendations">추천 확인</Link>
                </Button>
                <Button variant="outline" className="flex-1 min-w-[180px] bg-transparent" asChild>
                  <Link href="/chat">추가 질문하기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
