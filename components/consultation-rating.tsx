"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface ConsultationRatingProps {
  consultationId: string
  existingRating?: number | null
  existingComment?: string | null
}

export function ConsultationRating({
  consultationId,
  existingRating,
  existingComment,
}: ConsultationRatingProps) {
  const [rating, setRating] = useState(existingRating || 0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [comment, setComment] = useState(existingComment || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingRating)
  const { toast } = useToast()

  const ratingMessages: Record<number, string> = {
    5: "매우 만족",
    4: "만족",
    3: "보통",
    2: "불만족",
    1: "매우 불만족",
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "별점을 선택해주세요",
        description: "상담 만족도를 평가하기 위해 별점을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/consultations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultationId,
          accuracy_rating: rating,
          feedback_comment: comment.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "리뷰 제출에 실패했습니다.")
      }

      const data = await response.json()
      setSubmitted(true)
      toast({
        title: "리뷰가 제출되었습니다",
        description: data.pointsEarned ? `${data.pointsEarned} 포인트가 적립되었습니다.` : "소중한 피드백 감사합니다.",
      })
    } catch (error) {
      console.error("[Consultation Rating] Submit error:", error)
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "리뷰 제출에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">상담 만족도</CardTitle>
          <CardDescription>이미 평가를 완료하셨습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-5 ${
                    star <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{ratingMessages[rating]}</span>
          </div>
          {comment && (
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{comment}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">추천 보조기기 만족도 평가</CardTitle>
        <CardDescription>링커가 추천한 보조기기가 얼마나 마음에 드시나요? 소중한 피드백이 서비스 개선에 도움이 됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="group transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full p-1"
              aria-label={`${star}점`}
              style={{ minWidth: "44px", minHeight: "44px" }}
            >
              <Star
                className={`size-8 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Label */}
        {rating > 0 && (
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{ratingMessages[rating]}</p>
          </div>
        )}

        {/* Comment */}
        <div className="space-y-2">
          <label htmlFor="comment" className="text-sm font-medium">
            추가 의견 (선택사항)
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="상담에 대한 자유로운 의견을 남겨주세요..."
            className="min-h-[100px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "제출 중..." : "평가 제출"}
        </Button>
      </CardContent>
    </Card>
  )
}

