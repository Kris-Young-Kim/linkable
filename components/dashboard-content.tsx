"use client"

import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X, Check, Star, Trash2, Archive } from "lucide-react"

import { IppaForm } from "@/components/ippa-form"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { CardActionButtons } from "@/components/ui/card-action-buttons"
import { CTAButton } from "@/components/ui/cta-button"
import { Checkbox } from "@/components/ui/checkbox"

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
  is_favorite?: boolean | null
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

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [favoriteFilter, setFavoriteFilter] = useState<boolean>(false)
  
  // 선택 상태
  const [selectedConsultations, setSelectedConsultations] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showAdvancedActions, setShowAdvancedActions] = useState(false)

  // 필터링된 상담 목록
  const filteredConsultations = useMemo(() => {
    let filtered = [...consultations]

    // 즐겨찾기 필터
    if (favoriteFilter) {
      filtered = filtered.filter((c) => c.is_favorite === true)
    }

    // 상태 필터
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    // 날짜 필터
    if (dateFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter((c) => {
        if (!c.created_at) return false
        const created = new Date(c.created_at)
        const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

        switch (dateFilter) {
          case "today":
            return diffDays === 0
          case "week":
            return diffDays <= 7
          case "month":
            return diffDays <= 30
          default:
            return true
        }
      })
    }

    return filtered
  }, [consultations, statusFilter, dateFilter, favoriteFilter])

  // 전체 선택/해제
  const allSelected = filteredConsultations.length > 0 && selectedConsultations.size === filteredConsultations.length
  const someSelected = selectedConsultations.size > 0 && selectedConsultations.size < filteredConsultations.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConsultations(new Set(filteredConsultations.map((c) => c.id)))
    } else {
      setSelectedConsultations(new Set())
    }
  }

  const handleSelectConsultation = (consultationId: string, checked: boolean) => {
    const newSelected = new Set(selectedConsultations)
    if (checked) {
      newSelected.add(consultationId)
    } else {
      newSelected.delete(consultationId)
    }
    setSelectedConsultations(newSelected)
  }

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedConsultations.size === 0) return

    if (!confirm(`선택한 ${selectedConsultations.size}개의 상담을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    setIsBulkDeleting(true)
    try {
      const deletePromises = Array.from(selectedConsultations).map((id) =>
        fetch(`/api/consultations/${id}`, { method: "DELETE" })
      )

      const results = await Promise.allSettled(deletePromises)
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok))

      if (failed.length > 0) {
        alert(`${failed.length}개의 상담 삭제에 실패했습니다.`)
      } else {
        setSelectedConsultations(new Set())
        window.location.reload()
      }
    } catch (error) {
      console.error("일괄 삭제 오류:", error)
      alert("삭제 중 오류가 발생했습니다.")
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // 일괄 보관 (단순화된 기능)
  const handleBulkArchive = async () => {
    if (selectedConsultations.size === 0) return

    setIsBulkDeleting(true)
    try {
      const updatePromises = Array.from(selectedConsultations).map((id) =>
        fetch(`/api/consultations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "archived" }),
        })
      )

      const results = await Promise.allSettled(updatePromises)
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok))

      if (failed.length > 0) {
        alert(`${failed.length}개의 상담 보관에 실패했습니다.`)
      } else {
        setSelectedConsultations(new Set())
        window.location.reload()
      }
    } catch (error) {
      console.error("일괄 보관 오류:", error)
      alert("보관 중 오류가 발생했습니다.")
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // 고급: 일괄 상태 변경 (숨겨진 기능)
  const handleBulkStatusChange = async (newStatus: "in_progress" | "completed" | "archived") => {
    if (selectedConsultations.size === 0) return

    setIsBulkDeleting(true)
    try {
      const updatePromises = Array.from(selectedConsultations).map((id) =>
        fetch(`/api/consultations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      )

      const results = await Promise.allSettled(updatePromises)
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok))

      if (failed.length > 0) {
        alert(`${failed.length}개의 상담 상태 변경에 실패했습니다.`)
      } else {
        setSelectedConsultations(new Set())
        window.location.reload()
      }
    } catch (error) {
      console.error("일괄 상태 변경 오류:", error)
      alert("상태 변경 중 오류가 발생했습니다.")
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{t("dashboard.tagline")}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">상담 내역</h1>
          <p className="text-muted-foreground mt-2 text-base">나의 상담 이력과 추천 보조기기를 확인할 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CTAButton variant="chat" href="/chat" size="default">
            {t("dashboard.actionChat")}
          </CTAButton>
        </div>
      </section>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Label className="text-sm font-medium">필터:</Label>
            <Button
              variant={favoriteFilter ? "default" : "outline"}
              size="sm"
              onClick={() => setFavoriteFilter(!favoriteFilter)}
              className="gap-2"
            >
              <Star className={`h-4 w-4 ${favoriteFilter ? "fill-amber-400 text-amber-400" : ""}`} />
              즐겨찾기만
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="in_progress">진행 중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="archived">보관됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="기간" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 기간</SelectItem>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="week">최근 7일</SelectItem>
                <SelectItem value="month">최근 30일</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || dateFilter !== "all" || favoriteFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all")
                  setDateFilter("all")
                  setFavoriteFilter(false)
                }}
              >
                <X className="mr-2 h-4 w-4" />
                필터 초기화
              </Button>
            )}
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredConsultations.length}개 상담
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 항목 일괄 작업 */}
      {selectedConsultations.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedConsultations.size}개 선택됨
              </span>
              <div className="flex gap-2 ml-auto">
                {/* 기본 작업: 보관 및 삭제만 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkArchive}
                  disabled={isBulkDeleting}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  보관
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConsultations(new Set())}
                >
                  선택 해제
                </Button>
                {/* 고급 기능 토글 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedActions(!showAdvancedActions)}
                  className="text-xs"
                >
                  {showAdvancedActions ? "간단히" : "고급"}
                </Button>
              </div>
            </div>
            {/* 고급 기능 (숨겨진 상태 변경 옵션) */}
            {showAdvancedActions && (
              <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground w-full mb-2">상태 변경:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange("in_progress")}
                  disabled={isBulkDeleting}
                  className="text-xs"
                >
                  진행 중
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange("completed")}
                  disabled={isBulkDeleting}
                  className="text-xs"
                >
                  완료
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusChange("archived")}
                  disabled={isBulkDeleting}
                  className="text-xs"
                >
                  보관
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 상담 타임라인 및 추천 보조기기 */}
      <div className="space-y-6">
        {filteredConsultations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {consultations.length === 0
                  ? "아직 상담 내역이 없습니다. 상담을 시작해보세요."
                  : "필터 조건에 맞는 상담이 없습니다."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 전체 선택 체크박스 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="전체 선택"
                  />
                  <Label className="text-sm font-medium cursor-pointer" onClick={() => handleSelectAll(!allSelected)}>
                    전체 선택 ({filteredConsultations.length}개)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* 상담 카드 목록 */}
            {filteredConsultations.map((consultation) => (
              <ConsultationTimelineCard
                key={consultation.id}
                consultation={consultation}
                isSelected={selectedConsultations.has(consultation.id)}
                onSelect={(checked) => handleSelectConsultation(consultation.id, checked)}
                onUpdate={() => window.location.reload()}
                onDelete={() => window.location.reload()}
              />
            ))}
          </>
        )}
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

// 상담 타임라인 카드 컴포넌트 (추천 보조기기 포함)
function ConsultationTimelineCard({
  consultation,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: {
  consultation: ConsultationRow
  isSelected?: boolean
  onSelect?: (checked: boolean) => void
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

  const recommendations = consultation.recommendations ?? []

  return (
    <>
      <Card className={isSelected ? "border-primary ring-2 ring-primary/20" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1">
              {onSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect(checked === true)}
                  aria-label="상담 선택"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Link href={`/consultation/${consultation.id}`} className="hover:underline">
                    <h3 className="text-lg font-semibold text-foreground">
                      {consultation.title || t("dashboard.untitled")}
                    </h3>
                  </Link>
                  <Badge className={badgeStyle}>{statusLabel(consultation.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{formatUpdatedAt(consultation.updated_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  const newFavoriteStatus = !consultation.is_favorite
                  try {
                    const response = await fetch(`/api/consultations/${consultation.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ is_favorite: newFavoriteStatus }),
                    })
                    if (response.ok) {
                      onUpdate()
                    }
                  } catch (error) {
                    console.error("즐겨찾기 업데이트 실패:", error)
                  }
                }}
                className="h-9 w-9"
                aria-label={consultation.is_favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              >
                <Star
                  className={`h-4 w-4 ${
                    consultation.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                  }`}
                />
              </Button>
              <CardActionButtons
                onDelete={() => setIsDeleting(true)}
                deleteLabel="상담 삭제"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 추천 보조기기 리스트 */}
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">추천 보조기기 ({recommendations.length}개)</h4>
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                        {rec.product?.name || "제품명 없음"}
                      </h5>
                      {rec.match_reason && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{rec.match_reason}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      asChild
                    >
                      <Link href={`/consultation/${consultation.id}`}>상세 보기</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">아직 추천된 보조기기가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

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

