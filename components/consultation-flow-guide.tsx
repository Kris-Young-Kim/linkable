"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CTAButton } from "@/components/ui/cta-button"
import { Sparkles, ShoppingBag, ArrowRight, X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface ConsultationFlowGuideProps {
  isOpen: boolean
  onClose: () => void
  consultationId: string | null
  recommendationCount?: number
  variant?: "modal" | "toast"
}

/**
 * 상담→추천 플로우 안내 컴포넌트
 * 
 * ICF 분석 완료 후 사용자에게 추천 페이지로 이동할 수 있음을 안내합니다.
 * 모달 또는 토스트 형태로 표시할 수 있습니다.
 */
export function ConsultationFlowGuide({
  isOpen,
  onClose,
  consultationId,
  recommendationCount = 0,
  variant = "modal",
}: ConsultationFlowGuideProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [hasSeen, setHasSeen] = useState(false)

  // 로컬 스토리지에 표시 여부 저장 (하루에 한 번만 표시)
  useEffect(() => {
    if (isOpen && consultationId) {
      const key = `consultation-guide-${consultationId}`
      const seen = localStorage.getItem(key)
      const today = new Date().toDateString()
      
      if (seen === today) {
        setHasSeen(true)
        onClose()
      } else {
        localStorage.setItem(key, today)
      }
    }
  }, [isOpen, consultationId, onClose])

  const handleViewRecommendations = () => {
    if (consultationId) {
      router.push(`/recommendations/${consultationId}`)
      onClose()
    }
  }

  const handleContinueChat = () => {
    onClose()
  }

  if (variant === "toast") {
    return (
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 max-w-md rounded-lg border-2 border-primary/20 bg-card p-4 shadow-lg",
          "animate-in slide-in-from-bottom-5 fade-in-0",
          !isOpen && "hidden"
        )}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t("flowGuide.toastTitle") || "맞춤 추천이 준비되었습니다"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {recommendationCount > 0
                ? t("flowGuide.toastDescriptionWithCount")?.replace("{count}", String(recommendationCount)) ||
                  `${recommendationCount}개의 맞춤형 보조기기 추천을 확인하세요.`
                : t("flowGuide.toastDescription") || "ICF 분석을 바탕으로 맞춤형 보조기기를 추천해드립니다."}
            </p>
            <div className="flex gap-2 pt-2">
              <CTAButton
                variant="recommendations"
                href={consultationId ? `/recommendations/${consultationId}` : "#"}
                size="sm"
                className="text-xs"
                onClick={handleViewRecommendations}
              >
                {t("flowGuide.viewRecommendations") || "추천 보기"}
              </CTAButton>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleContinueChat}
                className="text-xs"
              >
                {t("flowGuide.continueChat") || "계속하기"}
              </Button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("common.close") || "닫기"}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="flow-guide-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {t("flowGuide.modalTitle") || "맞춤 추천이 준비되었습니다"}
              </DialogTitle>
              <DialogDescription id="flow-guide-description" className="mt-1">
                {t("flowGuide.modalSubtitle") || "ICF 분석을 완료했습니다"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShoppingBag className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {recommendationCount > 0
                    ? t("flowGuide.recommendationCount")?.replace("{count}", String(recommendationCount)) ||
                      `${recommendationCount}개의 맞춤형 보조기기`
                    : t("flowGuide.recommendationsReady") || "맞춤형 보조기기 추천"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("flowGuide.recommendationDescription") ||
                    "링커가 분석한 ICF 코드와 ISO 9999 표준을 기반으로 최적의 보조기기를 추천해드립니다."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {t("flowGuide.step1") || "추천 페이지에서 상세 정보를 확인하세요"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {t("flowGuide.step2") || "원하는 보조기기를 선택하고 구매 링크로 이동하세요"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {t("flowGuide.step3") || "사용 후 K-IPPA 평가로 효과성을 기록하세요"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleContinueChat}
            className="w-full sm:w-auto"
          >
            {t("flowGuide.continueChat") || "나중에 보기"}
          </Button>
          <CTAButton
            variant="recommendations"
            href={consultationId ? `/recommendations/${consultationId}` : "#"}
            onClick={handleViewRecommendations}
            className="w-full sm:w-auto"
          >
            {t("flowGuide.viewRecommendations") || "추천 보기"}
          </CTAButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

