"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface RecommendationFeedbackButtonProps {
  recommendationId: string
  productName: string
  onSuccess?: () => void
}

/**
 * 추천 상품에 대한 피드백 버튼 컴포넌트
 * 사용자가 추천된 상품에 대한 만족도를 평가할 수 있습니다.
 */
export function RecommendationFeedbackButton({
  recommendationId,
  productName,
  onSuccess,
}: RecommendationFeedbackButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rating, setRating] = useState<string>("")
  const [comment, setComment] = useState("")

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: "평가를 선택해주세요",
        description: "만족도를 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/recommendations/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          rating: parseInt(rating),
          comment: comment.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "피드백 제출에 실패했습니다.")
      }

      toast({
        title: "피드백이 제출되었습니다",
        description: "소중한 의견 감사합니다.",
      })

      setIsOpen(false)
      setRating("")
      setComment("")
      onSuccess?.()
    } catch (error) {
      console.error("[RecommendationFeedback] 제출 오류:", error)
      toast({
        title: "피드백 제출 실패",
        description: error instanceof Error ? error.message : "피드백 제출에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          피드백
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>추천 상품 피드백</DialogTitle>
          <DialogDescription>
            {productName}에 대한 추천이 도움이 되었나요?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>만족도 평가</Label>
            <RadioGroup value={rating} onValueChange={setRating}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5" id="rating-5" />
                <Label htmlFor="rating-5" className="flex items-center gap-2 cursor-pointer">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  매우 만족
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="rating-4" />
                <Label htmlFor="rating-4" className="cursor-pointer">만족</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="rating-3" />
                <Label htmlFor="rating-3" className="cursor-pointer">보통</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="rating-2" />
                <Label htmlFor="rating-2" className="cursor-pointer">불만족</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="rating-1" />
                <Label htmlFor="rating-1" className="flex items-center gap-2 cursor-pointer">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  매우 불만족
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">추가 의견 (선택사항)</Label>
            <Textarea
              id="comment"
              placeholder="추천에 대한 의견을 자유롭게 작성해주세요..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "제출 중..." : "제출"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
