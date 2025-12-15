/**
 * Meta Pixel (Facebook Pixel) 연동 모듈
 * 
 * 구매 완료 이벤트를 Meta Pixel로 전송하여
 * Facebook/Instagram 광고와 연동합니다.
 */

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void
    _fbq: (...args: unknown[]) => void
  }
}

/**
 * Meta Pixel ID 확인
 */
const getPixelId = (): string | null => {
  if (typeof window === "undefined") return null
  return process.env.NEXT_PUBLIC_META_PIXEL_ID || null
}

/**
 * Meta Pixel이 로드되었는지 확인
 */
const isPixelAvailable = (): boolean => {
  if (typeof window === "undefined") return false
  return typeof window.fbq === "function"
}

/**
 * Meta Pixel 이벤트 전송
 * 
 * @param eventName - 이벤트 이름 (예: 'Purchase', 'AddToCart')
 * @param eventParams - 이벤트 파라미터
 * 
 * @example
 * trackMetaEvent('Purchase', {
 *   value: 50000,
 *   currency: 'KRW',
 *   content_ids: ['product123'],
 *   contents: [{ id: 'product123', quantity: 1 }]
 * })
 */
export function trackMetaEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  if (!isPixelAvailable()) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Meta Pixel] Event (fbq not available):", eventName, eventParams)
    }
    return
  }

  try {
    const pixelId = getPixelId()
    if (!pixelId) {
      console.warn("[Meta Pixel] Pixel ID not found")
      return
    }

    window.fbq("track", eventName, eventParams || {})
  } catch (error) {
    console.error("[Meta Pixel] Error tracking event:", error)
  }
}

/**
 * 구매 완료 이벤트 전송
 * 
 * @param purchaseData - 구매 데이터
 */
export function trackPurchase(purchaseData: {
  value: number
  currency?: string
  contentIds?: string[]
  contents?: Array<{ id: string; quantity: number }>
  orderId?: string
  productName?: string
}): void {
  trackMetaEvent("Purchase", {
    value: purchaseData.value,
    currency: purchaseData.currency || "KRW",
    content_ids: purchaseData.contentIds || [],
    contents: purchaseData.contents || [],
    content_name: purchaseData.productName,
    order_id: purchaseData.orderId,
  })
}

/**
 * 페이지뷰 추적
 */
export function trackPageView(): void {
  if (!isPixelAvailable()) return

  try {
    window.fbq("track", "PageView")
  } catch (error) {
    console.error("[Meta Pixel] Error tracking page view:", error)
  }
}

