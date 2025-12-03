"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { trackEvent } from "@/lib/analytics"
import { getIcfActivityByCode, type IcfActivity } from "@/core/assessment/icf-activities"

type ActivityPostScore = {
  icfCode: string
  postDifficulty: number
}

export type IppaFormProps = {
  recommendationId?: string
  productId: string
  productName?: string
  problemDescription?: string
  consultationId?: string
  onSuccess?: (result: {
    effectivenessScore: number
    improvement: number
    improvementPercentage: number
    interpretation: string
    pointsEarned: number
  }) => void
  onCancel?: () => void
}

export function IppaForm({
  recommendationId,
  productId,
  productName,
  problemDescription,
  consultationId,
  onSuccess,
  onCancel,
}: IppaFormProps) {
  const { t } = useLanguage()
  const [baselineActivities, setBaselineActivities] = useState<Array<{
    icfCode: string
    importance: number
    preDifficulty: number
    activity?: IcfActivity
  }>>([])
  const [activityPostScores, setActivityPostScores] = useState<Record<string, number>>({})
  const [scoreImportance, setScoreImportance] = useState([3])
  const [scoreDifficultyPre, setScoreDifficultyPre] = useState([3])
  const [scoreDifficultyPost, setScoreDifficultyPost] = useState([3])
  const [feedbackComment, setFeedbackComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [result, setResult] = useState<{
    effectivenessScore: number
    improvement: number
    improvementPercentage: number
    interpretation: string
    pointsEarned: number
  } | null>(null)

  // 상담 단계에서 저장한 활동 점수 불러오기
  useEffect(() => {
    if (consultationId) {
      setIsLoadingActivities(true)
      fetch(`/api/consultations/${consultationId}/ippa-activities`)
        .then(res => res.json())
        .then(data => {
          if (data.activities && Array.isArray(data.activities)) {
            const activities = data.activities.map((a: any) => ({
              icfCode: a.icfCode,
              importance: a.importance,
              preDifficulty: a.preDifficulty,
              activity: getIcfActivityByCode(a.icfCode),
            }))
            setBaselineActivities(activities)
            // 초기값 설정
            activities.forEach((a: any) => {
              setActivityPostScores(prev => ({
                ...prev,
                [a.icfCode]: a.preDifficulty, // 기본값은 사전 점수와 동일
              }))
            })
          }
        })
        .catch(err => {
          console.error("Failed to load baseline activities:", err)
        })
        .finally(() => {
          setIsLoadingActivities(false)
        })
    }
  }, [consultationId])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // 활동별 점수가 있는 경우 (새로운 방식)
      const hasActivityScores = baselineActivities.length > 0 && 
        baselineActivities.every(a => activityPostScores[a.icfCode] !== undefined)

      const requestBody: any = {
        recommendationId,
        productId,
        problemDescription,
        feedbackComment: feedbackComment.trim() || undefined,
      }

      if (hasActivityScores) {
        // 활동별 점수 전송
        requestBody.activityScores = baselineActivities.map(a => ({
          icfCode: a.icfCode,
          importance: a.importance,
          preDifficulty: a.preDifficulty,
          postDifficulty: activityPostScores[a.icfCode],
        }))
        requestBody.consultationId = consultationId
      } else {
        // 기존 방식 (단일 활동)
        requestBody.scoreImportance = scoreImportance[0]
        requestBody.scoreDifficultyPre = scoreDifficultyPre[0]
        requestBody.scoreDifficultyPost = scoreDifficultyPost[0]
      }

      const response = await fetch("/api/ippa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to submit evaluation")
      }

      const data = await response.json()
      setResult({
        effectivenessScore: data.result.effectivenessScore,
        improvement: data.result.improvement,
        improvementPercentage: data.result.improvementPercentage,
        interpretation: data.result.interpretation,
        pointsEarned: data.pointsEarned,
      })
      setSubmitted(true)
      onSuccess?.(data.result)

      // GA4 이벤트 추적
      if (data.evaluationId) {
        trackEvent("ippa_submitted", {
          evaluation_id: data.evaluationId,
          product_id: productId,
          effectiveness_score: data.result.effectivenessScore,
          points_earned: data.pointsEarned || 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }, [
    recommendationId,
    productId,
    problemDescription,
    consultationId,
    baselineActivities,
    activityPostScores,
    scoreImportance,
    scoreDifficultyPre,
    scoreDifficultyPost,
    feedbackComment,
    onSuccess,
  ])

  const improvement = scoreDifficultyPre[0] - scoreDifficultyPost[0]
  const effectivenessScore = improvement * scoreImportance[0]
  const improvementPercentage =
    scoreDifficultyPre[0] > 0 ? (improvement / scoreDifficultyPre[0]) * 100 : 0

  const getInterpretationLabel = (interpretation: string) => {
    const labels: Record<string, string> = {
      excellent: t("ippa.interpretation.excellent"),
      good: t("ippa.interpretation.good"),
      moderate: t("ippa.interpretation.moderate"),
      minimal: t("ippa.interpretation.minimal"),
      none: t("ippa.interpretation.none"),
      worse: t("ippa.interpretation.worse"),
    }
    return labels[interpretation] || interpretation
  }

  if (submitted && result) {
    return (
      <Card className="border-2 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t("ippa.submitSuccess")}</h3>
              <p className="text-muted-foreground mb-4">{t("ippa.submitSuccessMessage")}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {t("ippa.effectivenessScore")}: {result.effectivenessScore.toFixed(1)}
                  </Badge>
                </div>
                {result.pointsEarned > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("ippa.pointsEarned").replace("{points}", String(result.pointsEarned))}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          {t("ippa.title")}
        </CardTitle>
        <CardDescription className="text-base">
          {productName && (
            <span className="font-medium text-foreground">{productName}</span>
          )}{" "}
          {t("ippa.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 flex items-start gap-3">
            <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">{error}</p>
            </div>
          </div>
        )}

        {/* 문제 설명 (읽기 전용) */}
        {problemDescription && (
          <div className="space-y-2">
            <Label>{t("ippa.problemDescription")}</Label>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground">{problemDescription}</p>
            </div>
          </div>
        )}

        {/* 활동별 사후 평가 (상담 단계에서 선택한 활동이 있는 경우) */}
        {isLoadingActivities ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">활동 정보를 불러오는 중...</p>
          </div>
        ) : baselineActivities.length > 0 ? (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">
                활동별 사후 평가 (보조기기 사용 후 어려운 정도)
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                상담 단계에서 선택한 활동들에 대해 보조기기 사용 후 어려운 정도를 평가해주세요.
              </p>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {baselineActivities.map(activity => {
                const postScore = activityPostScores[activity.icfCode] ?? activity.preDifficulty
                const improvement = activity.preDifficulty - postScore
                const effectivenessScore = improvement * activity.importance
                
                return (
                  <Card key={activity.icfCode} className="p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-sm">
                          <Badge variant="outline" className="mr-2 font-mono text-xs">
                            {activity.icfCode}
                          </Badge>
                          {activity.activity?.description || activity.icfCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.activity?.categoryName}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">중요도</p>
                          <p className="font-semibold">{activity.importance}/5</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">사전 어려움</p>
                          <p className="font-semibold">{activity.preDifficulty}/5</p>
                        </div>
                      </div>

                      {/* 사후 어려움 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">사후 어려움</Label>
                          <span className="text-sm font-semibold text-primary">
                            {postScore}/5
                          </span>
                        </div>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[postScore]}
                          onValueChange={(v) => {
                            setActivityPostScores(prev => ({
                              ...prev,
                              [activity.icfCode]: v[0]
                            }))
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          1: 전혀 어려움 없음 ~ 5: 활동을 전혀 수행할 수 없음
                        </p>
                      </div>

                      {/* 개선도 미리보기 */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">개선 점수</span>
                          <span className={`font-semibold ${
                            improvement > 0 ? "text-green-600" :
                            improvement < 0 ? "text-red-600" :
                            "text-gray-400"
                          }`}>
                            {improvement > 0 ? "+" : ""}{effectivenessScore.toFixed(1)}
                            <span className="ml-1 text-muted-foreground">
                              ({activity.importance} × {improvement})
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          /* 기존 방식 (단일 활동 평가) */
          <>
            {/* 중요도 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("ippa.importance")}</Label>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {scoreImportance[0]}/5
                </Badge>
              </div>
              <Slider
                value={scoreImportance}
                onValueChange={setScoreImportance}
                min={1}
                max={5}
                step={1}
                className="w-full"
                aria-label={t("ippa.importance")}
              />
              <p className="text-sm text-muted-foreground">{t("ippa.importanceHelp")}</p>
            </div>

            {/* 사용 전 난이도 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("ippa.difficultyPre")}</Label>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {scoreDifficultyPre[0]}/5
                </Badge>
              </div>
              <Slider
                value={scoreDifficultyPre}
                onValueChange={setScoreDifficultyPre}
                min={1}
                max={5}
                step={1}
                className="w-full"
                aria-label={t("ippa.difficultyPre")}
              />
              <p className="text-sm text-muted-foreground">{t("ippa.difficultyPreHelp")}</p>
            </div>

            {/* 사용 후 난이도 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("ippa.difficultyPost")}</Label>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {scoreDifficultyPost[0]}/5
                </Badge>
              </div>
              <Slider
                value={scoreDifficultyPost}
                onValueChange={setScoreDifficultyPost}
                min={1}
                max={5}
                step={1}
                className="w-full"
                aria-label={t("ippa.difficultyPost")}
              />
              <p className="text-sm text-muted-foreground">{t("ippa.difficultyPostHelp")}</p>
            </div>
          </>
        )}

        {/* 예상 효과성 점수 미리보기 (기존 방식일 때만) */}
        {baselineActivities.length === 0 && improvement !== 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{t("ippa.previewScore")}</span>
              <Badge className="text-base px-3 py-1">
                {effectivenessScore > 0 ? "+" : ""}
                {effectivenessScore.toFixed(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {improvement > 0
                ? t("ippa.improvementPreview").replace(
                    "{percentage}",
                    improvementPercentage.toFixed(0),
                  )
                : t("ippa.noImprovementPreview")}
            </p>
          </div>
        )}

        {/* 활동별 총계 미리보기 */}
        {baselineActivities.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">예상 총 개선 점수</span>
              <Badge className="text-base px-3 py-1">
                {baselineActivities.reduce((sum, a) => {
                  const postScore = activityPostScores[a.icfCode] ?? a.preDifficulty
                  const improvement = a.preDifficulty - postScore
                  return sum + (improvement * a.importance)
                }, 0).toFixed(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {baselineActivities.length}개 활동의 개선 점수 합계
            </p>
          </div>
        )}

        {/* 피드백 코멘트 */}
        <div className="space-y-2">
          <Label htmlFor="feedback-comment">{t("ippa.feedbackComment")}</Label>
          <Textarea
            id="feedback-comment"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder={t("ippa.feedbackCommentPlaceholder")}
            className="min-h-24 resize-none"
            rows={4}
            aria-label={t("ippa.feedbackComment")}
          />
          <p className="text-xs text-muted-foreground">{t("ippa.feedbackCommentHelp")}</p>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
              {t("ippa.cancel")}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px]"
            aria-label={t("ippa.submit")}
          >
            {isSubmitting ? t("ippa.submitting") : t("ippa.submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

