"use client"

import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X, Check } from "lucide-react"

import { EffectivenessDashboard } from "@/components/effectiveness-dashboard"
import { IppaForm } from "@/components/ippa-form"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LocalNav } from "@/components/navigation/local-nav"
import { SideNav } from "@/components/navigation/side-nav"
import { CardActionButtons } from "@/components/ui/card-action-buttons"

export type RecommendationRow = {
  id: string
  product_id: string | null
  match_reason: string | null
  is_clicked: boolean | null
  created_at?: string | null
  product?: {
    id: string
    name: string
    image_url?: string | null
  } | null
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
  const router = useRouter()
  const searchParams = useSearchParams()

  // 알림 링크에서 ?evaluate={recommendationId} 처리
  useEffect(() => {
    const evaluateParam = searchParams.get("evaluate")
    if (evaluateParam) {
      // K-IPPA 전용 페이지로 리다이렉트
      router.replace(`/dashboard/ippa/${evaluateParam}`)
    }
  }, [searchParams, router])

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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">내 상담</h1>
          <p className="text-muted-foreground mt-2 text-base">나의 상담 이력을 확인하고 이어서 진행할 수 있습니다.</p>
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

      <LocalNav
        items={[
          { label: "내 상담", href: "/dashboard" },
          { label: "평가 요청", href: "/dashboard?tab=evaluations", badge: String(pendingCount) },
          { label: "포인트", href: "/dashboard?tab=points", badge: "Soon" },
        ]}
        className="overflow-x-auto"
        label="Dashboard navigation"
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <SideNav
          className="border border-border/60 rounded-2xl bg-card/80 p-4 shadow-sm"
          items={[
            { label: "인사이트", href: "/dashboard#insights" },
            { label: "상담 이력", href: "/dashboard#consultations" },
            { label: "평가 요청", href: "/dashboard#evaluations", badge: pendingCount > 0 ? String(pendingCount) : undefined },
          ]}
        />

        <div className="space-y-8">
          <section id="insights" className="scroll-mt-24">
            <EffectivenessDashboard />
          </section>

          <section id="consultations" className="grid gap-6 md:grid-cols-2 scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.timelineTitle")}</CardTitle>
                <CardDescription>{t("dashboard.timelineDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {timelineItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("dashboard.timelineEmpty")}</p>
                ) : (
                  timelineItems.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      onUpdate={() => window.location.reload()}
                      onDelete={() => window.location.reload()}
                    />
                  ))
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

          <section id="evaluations" className="scroll-mt-24">
            <IppaEvaluationSection consultations={consultations} />
          </section>
        </div>
      </div>
    </div>
  )
}

// K-IPPA 평가 대상 추천 섹션
function IppaEvaluationSection({ consultations }: { consultations: ConsultationRow[] }) {
  const { t } = useLanguage()
  const [selectedRecommendation, setSelectedRecommendation] = useState<{
    id: string
    productId: string
    productName?: string
    problemDescription?: string
  } | null>(null)

  // 평가 대상 추천 찾기 (클릭되었고, 14일 이상 경과, 아직 평가 안 한 것)
  const evaluationTargets = useMemo(() => {
    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    return consultations
      .flatMap((consultation) =>
        (consultation.recommendations ?? [])
          .filter((rec) => {
            if (!rec.is_clicked || !rec.product_id) return false
            if (!rec.created_at) return false
            const createdDate = new Date(rec.created_at)
            return createdDate <= fourteenDaysAgo
          })
          .map((rec) => ({
            ...rec,
            consultationTitle: consultation.title,
            problemDescription: consultation.title, // 추후 analysis_results에서 가져올 수 있음
          })),
      )
      .slice(0, 5) // 최대 5개만 표시
  }, [consultations])

  if (evaluationTargets.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("dashboard.ippaSectionTitle")}</CardTitle>
          <CardDescription>{t("dashboard.ippaSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRecommendation ? (
            <IppaForm
              recommendationId={selectedRecommendation.id}
              productId={selectedRecommendation.productId}
              productName={selectedRecommendation.productName}
              problemDescription={selectedRecommendation.problemDescription}
              onSuccess={() => {
                setSelectedRecommendation(null)
                // 페이지 새로고침 또는 상태 업데이트
                window.location.reload()
              }}
              onCancel={() => setSelectedRecommendation(null)}
            />
          ) : (
            <>
              {evaluationTargets.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {rec.product?.name || t("dashboard.unknownProduct")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rec.match_reason || t("dashboard.noMatchReason")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      setSelectedRecommendation({
                        id: rec.id,
                        productId: rec.product_id!,
                        productName: rec.product?.name,
                        problemDescription: rec.problemDescription || undefined,
                      })
                    }
                    aria-label={t("dashboard.startEvaluation")}
                  >
                    {t("dashboard.startEvaluation")}
                  </Button>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

// 상담 카드 컴포넌트 (수정/삭제 기능 포함)
function ConsultationCard({
  consultation,
  onUpdate,
  onDelete,
}: {
  consultation: ConsultationRow
  onUpdate: () => void
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(consultation.title || "")
  const [editStatus, setEditStatus] = useState<"in_progress" | "completed" | "archived">(
    (consultation.status as "in_progress" | "completed" | "archived") || "in_progress",
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const badgeStyle =
    consultation.status && statusStyle[consultation.status]
      ? statusStyle[consultation.status]
      : "bg-slate-200 text-slate-700"
  const recommendationCount = consultation.recommendations?.length ?? 0
  const unclickedCount = consultation.recommendations?.filter((rec) => !rec.is_clicked).length ?? 0

  const formatUpdatedAt = (iso?: string | null) => {
    if (!iso) {
      return t("dashboard.noUpdates")
    }
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    return `${t("dashboard.updatedAt")} ${formatter.format(new Date(iso))}`
  }

  const statusLabel = (status?: string | null) => {
    if (!status) {
      return t("dashboard.status.unknown")
    }
    if (status === "completed") return t("dashboard.status.completed")
    if (status === "in_progress") return t("dashboard.status.inProgress")
    if (status === "archived") return t("dashboard.status.archived")
    return status
  }

  const formatTemplate = (template: string, params: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => params[key]?.toString() ?? "")

  const recommendationSummary = (recommendationCount: number, unclickedCount: number) =>
    formatTemplate(t("dashboard.timelineSummary"), {
      recommendationCount,
      pendingCount: unclickedCount,
    })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || null,
          status: editStatus,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("[dashboard] Update error:", error)
        alert("수정에 실패했습니다. 다시 시도해 주세요.")
        return
      }

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error("[dashboard] Update error:", error)
      alert("수정에 실패했습니다. 다시 시도해 주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("[dashboard] Delete error:", error)
        alert("삭제에 실패했습니다. 다시 시도해 주세요.")
        return
      }

      setIsDeleting(false)
      onDelete()
    } catch (error) {
      console.error("[dashboard] Delete error:", error)
      alert("삭제에 실패했습니다. 다시 시도해 주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="상담 제목"
            className="flex-1"
          />
          <Select value={editStatus} onValueChange={(value) => setEditStatus(value as typeof editStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_progress">진행 중</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="archived">보관됨</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
            <X className="size-4 mr-1" />
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Check className="size-4 mr-1" />
            저장
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col gap-1.5 hover:bg-muted/50 transition-colors group relative">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/consultation/${consultation.id}`}
            className="flex-1 flex items-center justify-between gap-2"
          >
            <h3 className="text-base font-semibold text-foreground">
              {consultation.title || t("dashboard.untitled")}
            </h3>
            <Badge className={badgeStyle}>{statusLabel(consultation.status)}</Badge>
          </Link>
          <CardActionButtons
            onEdit={() => setIsEditing(true)}
            onDelete={() => setIsDeleting(true)}
            editLabel="상담 수정"
            deleteLabel="상담 삭제"
          />
        </div>
        <Link href={`/consultation/${consultation.id}`}>
          <p className="text-sm text-muted-foreground">{formatUpdatedAt(consultation.updated_at)}</p>
          <div className="text-xs text-foreground/80">
            {recommendationSummary(recommendationCount, unclickedCount)}
          </div>
        </Link>
      </div>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 상담을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 데이터(대화 기록, 분석 결과, 추천 등)가 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

