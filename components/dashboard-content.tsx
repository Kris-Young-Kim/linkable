"use client"

import Link from "next/link"
import { useMemo } from "react"

import { EffectivenessDashboard } from "@/components/effectiveness-dashboard"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type RecommendationRow = {
  id: string
  product_id: string | null
  match_reason: string | null
  is_clicked: boolean | null
}

export type ConsultationRow = {
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

export function DashboardContent({ consultations }: { consultations: ConsultationRow[] }) {
  const { t, language } = useLanguage()

  const activeConsultations = consultations.filter((item) => item.status === "in_progress")
  const pendingRecommendations = consultations
    .flatMap((item) => item.recommendations ?? [])
    .filter((rec) => rec && !rec.is_clicked)

  const pendingCount = pendingRecommendations.length

  const formatTemplate = (template: string, params: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => params[key]?.toString() ?? "")

  const recommendationSummary = (recommendationCount: number, unclickedCount: number) =>
    formatTemplate(t("dashboard.timelineSummary"), {
      recommendationCount,
      pendingCount: unclickedCount,
    })

  const statusLabel = (status?: string | null) => {
    if (!status) {
      return t("dashboard.status.unknown")
    }
    if (status === "completed") return t("dashboard.status.completed")
    if (status === "in_progress") return t("dashboard.status.inProgress")
    if (status === "archived") return t("dashboard.status.archived")
    return status
  }

  const formatUpdatedAt = (iso?: string | null) => {
    if (!iso) {
      return t("dashboard.noUpdates")
    }
    const formatter = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    return `${t("dashboard.updatedAt")} ${formatter.format(new Date(iso))}`
  }

  const timelineItems = useMemo(() => consultations, [consultations])

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{t("dashboard.tagline")}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground mt-2 text-base">{t("dashboard.heroDescription")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/chat">{t("dashboard.actionChat")}</Link>
          </Button>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/recommendations">{t("dashboard.actionRecommendations")}</Link>
          </Button>
        </div>
      </section>

      <EffectivenessDashboard />

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.timelineTitle")}</CardTitle>
            <CardDescription>{t("dashboard.timelineDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {timelineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.timelineEmpty")}</p>
            ) : (
              timelineItems.map((consultation) => {
                const badgeStyle =
                  consultation.status && statusStyle[consultation.status]
                    ? statusStyle[consultation.status]
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
                        {consultation.title || t("dashboard.untitled")}
                      </h3>
                      <Badge className={badgeStyle}>{statusLabel(consultation.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatUpdatedAt(consultation.updated_at)}</p>
                    <div className="text-xs text-foreground/80">
                      {recommendationSummary(recommendationCount, unclickedCount)}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.nextStepsTitle")}</CardTitle>
            <CardDescription>{t("dashboard.nextStepsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("dashboard.nextStepActive")}</p>
                <p className="text-muted-foreground text-sm">
                  {formatTemplate(t("dashboard.pendingSessions"), { count: activeConsultations.length })}
                </p>
              </div>
              <Badge variant="secondary">{activeConsultations.length}</Badge>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("dashboard.nextStepPending")}</p>
                <p className="text-muted-foreground text-sm">
                  {formatTemplate(t("dashboard.pendingRecommendationsLabel"), { count: pendingCount })}
                </p>
              </div>
              <Badge variant="outline">{pendingCount}</Badge>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("dashboard.nextStepReview")}</p>
                <p className="text-muted-foreground text-sm">{t("dashboard.nextStepReviewDescription")}</p>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/recommendations">{t("dashboard.actionRecommendations")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

