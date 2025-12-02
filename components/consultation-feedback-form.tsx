"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Star, CheckCircle2, X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface ConsultationFeedbackFormProps {
  consultationId: string
  onSuccess?: () => void
  onSkip?: () => void
  className?: string
}

/**
 * 상담 종료 설문 컴포넌트
 * 
 * ICF 분석 정확도를 평가할 수 있는 피드백 폼입니다.
 * 상담이 완료된 후 추천 페이지에서 표시됩니다.
 */
export function ConsultationFeedbackForm({
  consultationId,
  onSuccess,
  onSkip,
  className,
}: ConsultationFeedbackFormProps) {
  const { t } = useLanguage()
  const [accuracyRating, setAccuracyRating] = useState<string>("")
  const [feedbackComment, setFeedbackComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!accuracyRating) {
      setError("정확도 평가를 선택해주세요.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/consultations/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultation_id: consultationId,
          accuracy_rating: parseInt(accuracyRating),
          feedback_comment: feedbackComment.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "피드백 제출에 실패했습니다.")
      }

      setIsSubmitted(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "피드백 제출에 실패했습니다.")
      console.error("[ConsultationFeedbackForm] 제출 오류:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onSkip?.()
  }

  if (isSubmitted) {
    return (
      <Card className={cn("border-2 border-primary/20", className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t("consultationFeedback.thankYou") || "피드백을 주셔서 감사합니다!"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("consultationFeedback.thankYouDescription") ||
                  "소중한 의견이 서비스 개선에 도움이 됩니다."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("consultationFeedback.title") || "ICF 분석 정확도 평가"}
            </CardTitle>
            <CardDescription className="mt-2">
              {t("consultationFeedback.description") ||
                "링커의 ICF 분석이 얼마나 정확했는지 평가해주세요. 소중한 피드백이 서비스 개선에 도움이 됩니다."}
            </CardDescription>
          </div>
          {onSkip && (
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("common.close") || "닫기"}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 정확도 평가 */}
        <div className="space-y-3">
          <Label htmlFor="accuracy-rating" className="text-base font-semibold">
            {t("consultationFeedback.accuracyQuestion") || "ICF 분석이 얼마나 정확했나요?"}
          </Label>
          <RadioGroup
            value={accuracyRating}
            onValueChange={setAccuracyRating}
            className="space-y-3"
            id="accuracy-rating"
            aria-label={t("consultationFeedback.accuracyQuestion") || "ICF 분석 정확도 평가"}
          >
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="5" id="rating-5" />
              <Label htmlFor="rating-5" className="flex-1 cursor-pointer font-normal">
                {t("consultationFeedback.veryAccurate") || "매우 정확함 (5점)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="4" id="rating-4" />
              <Label htmlFor="rating-4" className="flex-1 cursor-pointer font-normal">
                {t("consultationFeedback.accurate") || "정확함 (4점)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="3" id="rating-3" />
              <Label htmlFor="rating-3" className="flex-1 cursor-pointer font-normal">
                {t("consultationFeedback.moderate") || "보통 (3점)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="2" id="rating-2" />
              <Label htmlFor="rating-2" className="flex-1 cursor-pointer font-normal">
                {t("consultationFeedback.inaccurate") || "부정확함 (2점)"}
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="1" id="rating-1" />
              <Label htmlFor="rating-1" className="flex-1 cursor-pointer font-normal">
                {t("consultationFeedback.veryInaccurate") || "매우 부정확함 (1점)"}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 피드백 코멘트 */}
        <div className="space-y-2">
          <Label htmlFor="feedback-comment">
            {t("consultationFeedback.commentLabel") || "추가 의견 (선택사항)"}
          </Label>
          <Textarea
            id="feedback-comment"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder={
              t("consultationFeedback.commentPlaceholder") ||
              "ICF 분석에서 개선되었으면 하는 점이나 추가 의견을 자유롭게 작성해주세요."
            }
            className="min-h-24 resize-none"
            rows={4}
            aria-label={t("consultationFeedback.commentLabel") || "추가 의견"}
          />
          <p className="text-xs text-muted-foreground">
            {t("consultationFeedback.commentHelp") ||
              "피드백은 익명으로 처리되며, 서비스 개선에만 사용됩니다."}
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="flex gap-3 pt-2">
          {onSkip && (
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t("consultationFeedback.skip") || "건너뛰기"}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !accuracyRating}
            className="flex-1 min-h-[44px]"
            aria-label={t("consultationFeedback.submit") || "피드백 제출"}
          >
            {isSubmitting
              ? t("consultationFeedback.submitting") || "제출 중..."
              : t("consultationFeedback.submit") || "피드백 제출"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

