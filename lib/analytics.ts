/**
 * Google Analytics 4 (GA4) 이벤트 추적 유틸리티
 * 
 * 브라우저 환경에서만 동작하며, gtag가 로드된 후에 사용해야 합니다.
 */

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

/**
 * GA4 측정 ID 확인
 */
const getMeasurementId = (): string | null => {
  if (typeof window === "undefined") return null
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-EV15PW3ERH"
}

/**
 * gtag 함수가 사용 가능한지 확인
 */
const isGtagAvailable = (): boolean => {
  if (typeof window === "undefined") return false
  return typeof window.gtag === "function"
}

/**
 * GA4 이벤트 전송
 * 
 * @param eventName - 이벤트 이름 (예: 'chat_started', 'product_clicked')
 * @param eventParams - 이벤트 파라미터 (선택적)
 * 
 * @example
 * trackEvent('chat_started', { consultation_id: '123' })
 * trackEvent('product_clicked', { product_id: '456', product_name: '보조기기' })
 */
export function trackEvent(eventName: string, eventParams?: Record<string, unknown>): void {
  if (!isGtagAvailable()) {
    // 개발 환경에서만 콘솔 로그 출력
    if (process.env.NODE_ENV === "development") {
      console.log("[GA4] Event (gtag not available):", eventName, eventParams)
    }
    return
  }

  try {
    const measurementId = getMeasurementId()
    if (!measurementId) {
      console.warn("[GA4] Measurement ID not found")
      return
    }

    window.gtag("event", eventName, {
      ...eventParams,
      // 기본 파라미터
      send_to: measurementId,
    })
  } catch (error) {
    console.error("[GA4] Error tracking event:", error)
  }
}

/**
 * 페이지뷰 추적 (자동으로 처리되지만 필요시 수동 호출 가능)
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isGtagAvailable()) return

  try {
    const measurementId = getMeasurementId()
    if (!measurementId) return

    window.gtag("config", measurementId, {
      page_path: pagePath,
      page_title: pageTitle,
    })
  } catch (error) {
    console.error("[GA4] Error tracking page view:", error)
  }
}

/**
 * 사용자 속성 설정
 */
export function setUserProperty(propertyName: string, value: string | number | boolean): void {
  if (!isGtagAvailable()) return

  try {
    window.gtag("set", "user_properties", {
      [propertyName]: value,
    })
  } catch (error) {
    console.error("[GA4] Error setting user property:", error)
  }
}

/**
 * 커스텀 이벤트 타입 정의
 */
export type AnalyticsEvent =
  | { name: "chat_started"; params?: { consultation_id?: string } }
  | { name: "chat_message_sent"; params?: { consultation_id?: string; message_length?: number } }
  | { name: "consultation_completed"; params?: { consultation_id: string; has_recommendations?: boolean } }
  | { name: "product_clicked"; params: { product_id: string; product_name?: string; recommendation_id?: string; source?: string } }
  | { name: "ippa_submitted"; params: { evaluation_id: string; product_id: string; effectiveness_score: number; points_earned: number } }
  | { name: "recommendations_viewed"; params?: { consultation_id?: string; count?: number } }

/**
 * 타입 안전한 이벤트 추적
 */
export function trackTypedEvent(event: AnalyticsEvent): void {
  trackEvent(event.name, event.params)
}

