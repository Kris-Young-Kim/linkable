"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/language-provider"
import { CheckCircle2, Loader2 } from "lucide-react"
import { getIcfActivityByCode } from "@/core/assessment/icf-activities"
import { findIcfCode } from "@/core/assessment/icf-codes"

interface ActivityScore {
  icfCode: string
  importance: number
  currentDifficulty: number
}

interface IppaConsultationFormProps {
  consultationId?: string
  onComplete: (data: { activities: ActivityScore[] }) => void
  onSkip?: () => void
  problemDescription?: string
}

export function IppaConsultationForm({
  consultationId,
  onComplete,
  onSkip,
  problemDescription,
}: IppaConsultationFormProps) {
  const { t } = useLanguage()
  const [extractedIcfCodes, setExtractedIcfCodes] = useState<string[]>([])
  const [activityScores, setActivityScores] = useState<Record<string, ActivityScore>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 상담에서 추출된 ICF D-Level 코드 불러오기
  useEffect(() => {
    if (consultationId) {
      setIsLoading(true)
      fetch(`/api/consultations/${consultationId}/icf-codes`)
        .then(res => res.json())
        .then(data => {
          if (data.icfCodes && Array.isArray(data.icfCodes)) {
            // D-Level 코드만 필터링 (d로 시작하는 코드)
            const dCodes = data.icfCodes.filter((code: string) => 
              typeof code === 'string' && code.toLowerCase().startsWith('d')
            )
            setExtractedIcfCodes(dCodes)
            
            // 초기값 설정
            const initialScores: Record<string, ActivityScore> = {}
            dCodes.forEach((code: string) => {
              initialScores[code] = { icfCode: code, importance: 3, currentDifficulty: 3 }
            })
            setActivityScores(initialScores)
          }
        })
        .catch(err => {
          console.error("Failed to load ICF codes:", err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [consultationId])

  const handleScoreChange = (code: string, field: "importance" | "currentDifficulty", value: number[]) => {
    setActivityScores(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [field]: value[0]
      }
    }))
  }

  const handleSubmit = () => {
    if (extractedIcfCodes.length === 0) {
      alert("추출된 ICF 활동 코드가 없습니다. 상담을 먼저 진행해주세요.")
      return
    }

    const activities = extractedIcfCodes
      .map(code => activityScores[code])
      .filter(Boolean)

    if (activities.length === 0) {
      alert("활동 점수를 입력해주세요.")
      return
    }

    setIsSubmitting(true)
    onComplete({ activities })
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("ippa.consultation.title")}
        </CardTitle>
        <CardDescription className="text-sm">
          {t("ippa.consultation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 문제 설명 (있는 경우) */}
        {problemDescription && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-1">{t("ippa.problemDescription")}</p>
            <p className="text-sm text-muted-foreground">{problemDescription}</p>
          </div>
        )}

        {/* 추출된 ICF 활동 코드 표시 및 점수 입력 */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">상담에서 추출된 ICF 활동 코드를 불러오는 중...</p>
          </div>
        ) : extractedIcfCodes.length === 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              상담에서 추출된 ICF 활동 코드가 없습니다. 상담을 먼저 진행해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">
                상담에서 추출된 활동에 대한 중요도 및 어려운 정도 평가
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                AI가 상담 내용을 분석하여 추출한 {extractedIcfCodes.length}개의 활동에 대해 중요도와 어려운 정도를 평가해주세요.
              </p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {extractedIcfCodes.map(code => {
                const icfCode = findIcfCode(code)
                const activity = getIcfActivityByCode(code)
                const scores = activityScores[code] || { importance: 3, currentDifficulty: 3 }
                
                return (
                  <Card key={code} className="p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-sm">
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {code}
                          </span>
                          {icfCode?.description || activity?.description || code}
                        </p>
                        {activity?.categoryName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.categoryName}
                          </p>
                        )}
                      </div>
                      
                      {/* 중요도 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">중요도</Label>
                          <span className="text-sm font-semibold text-primary">
                            {scores.importance}/5
                          </span>
                        </div>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[scores.importance]}
                          onValueChange={(v) => handleScoreChange(code, "importance", v)}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          1: 전혀 중요하지 않음 ~ 5: 매우 중요함
                        </p>
                      </div>

                      {/* 어려운 정도 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">어려운 정도</Label>
                          <span className="text-sm font-semibold text-primary">
                            {scores.currentDifficulty}/5
                          </span>
                        </div>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[scores.currentDifficulty]}
                          onValueChange={(v) => handleScoreChange(code, "currentDifficulty", v)}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          1: 전혀 어려움 없음 ~ 5: 활동을 전혀 수행할 수 없음
                        </p>
                      </div>

                      {/* 점수 미리보기 */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">중요도 × 어려움</span>
                          <span className="font-semibold">
                            {scores.importance} × {scores.currentDifficulty} = {scores.importance * scores.currentDifficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || extractedIcfCodes.length === 0}
            size="lg"
            className="flex-1 min-h-[48px]"
          >
            {isSubmitting ? "제출 중..." : `제출 (${extractedIcfCodes.length}개 활동)`}
          </Button>
          {onSkip && (
            <Button
              onClick={onSkip}
              variant="outline"
              size="lg"
              className="min-h-[48px]"
              disabled={isSubmitting}
            >
              {t("ippa.consultation.skip")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

