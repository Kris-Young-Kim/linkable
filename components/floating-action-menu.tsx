"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { HelpCircle, MessageCircle, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FloatingActionMenuProps {
  productName?: string
  recommendationId?: string | null
  isoCode?: string
  onSupportClick?: () => void
  onExpertClick?: () => void
}

export function FloatingActionMenu({
  productName = "",
  recommendationId,
  isoCode,
  onSupportClick,
  onExpertClick,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSupportClick = async () => {
    if (onSupportClick) {
      onSupportClick()
      return
    }

    try {
      // 클릭 이벤트 로깅
      if (recommendationId) {
        await fetch(`/api/recommendations/${recommendationId}/click`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "support" }),
        })
      }

      // 지원제도 링크 열기
      const supportLink =
        process.env.NEXT_PUBLIC_SUPPORT_PROGRAM_URL ||
        "https://www.bokjiro.go.kr/ssis-tbu/twatzzza/intgSearch/moveTWZZ01000M.do"
      window.open(supportLink, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("[floating menu] support_click_error", error)
    }
  }

  const handleExpertClick = async () => {
    if (onExpertClick) {
      onExpertClick()
      return
    }

    try {
      // 클릭 이벤트 로깅
      if (recommendationId) {
        await fetch(`/api/recommendations/${recommendationId}/click`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "expert" }),
        })
      }

      // 전문가 문의 이메일 열기
      const expertEmail = process.env.NEXT_PUBLIC_EXPERT_EMAIL || "expert@linkable.ai"
      window.location.href = `mailto:${expertEmail}?subject=${encodeURIComponent(`[LinkAble 전문가 문의] ${productName || "보조기기"} 관련 상담 요청`)}&body=${encodeURIComponent(`안녕하세요.\n\n${productName || "보조기기"}에 대해 전문가 상담을 받고 싶습니다.\n\n추천 ID: ${recommendationId || "없음"}\nISO 코드: ${isoCode || "없음"}\n\n문의 내용:\n`)}`
    } catch (error) {
      console.error("[floating menu] expert_click_error", error)
    }
  }

  return (
    <TooltipProvider>
      <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
        {/* 메뉴 버튼들 */}
        {isOpen && (
          <div className="flex flex-col gap-2 transition-all duration-300 ease-in-out">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full shadow-lg h-14 w-14"
                  onClick={handleSupportClick}
                  aria-label="지원제도 정보 보기"
                >
                  <HelpCircle className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>지원제도</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full shadow-lg h-14 w-14"
                  onClick={handleExpertClick}
                  aria-label="전문가 문의하기"
                >
                  <MessageCircle className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>전문가 문의</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* 토글 버튼 */}
        <Button
          variant="default"
          size="lg"
          className="rounded-full shadow-lg h-14 w-14"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>
    </TooltipProvider>
  )
}

