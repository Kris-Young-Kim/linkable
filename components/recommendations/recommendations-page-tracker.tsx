"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

interface RecommendationsPageTrackerProps {
  consultationId: string
  productCount: number
}

/**
 * 추천 페이지 방문 추적 컴포넌트
 * 
 * 상담 완료 후 추천 페이지로 이동한 사용자를 추적하여
 * 상담→추천 플로우 완료율을 측정합니다.
 */
export function RecommendationsPageTracker({
  consultationId,
  productCount,
}: RecommendationsPageTrackerProps) {
  useEffect(() => {
    // 추천 페이지 방문 추적
    trackEvent("recommendations_viewed", {
      consultation_id: consultationId,
      count: productCount,
    })

    console.log("[Recommendations Tracker] 추천 페이지 방문 추적:", {
      consultationId,
      productCount,
    })
  }, [consultationId, productCount])

  return null
}

