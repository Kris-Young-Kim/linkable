/**
 * 웹 스크래핑 크롤러 유틸리티 함수
 */

/**
 * Rate Limit 방지: 요청 간격 조절
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 재시도 로직 (최대 3회)
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await delay(delayMs * (i + 1)) // 지수 백오프
    }
  }
  throw new Error("재시도 실패")
}

/**
 * 가격 문자열을 숫자로 변환
 * 예: "25,000원" -> 25000
 */
export function parsePrice(priceText: string): number | null {
  const cleaned = priceText.replace(/[^\d]/g, "")
  const price = parseInt(cleaned, 10)
  return isNaN(price) ? null : price
}

/**
 * URL 정규화 (상대 경로를 절대 경로로 변환)
 */
export function normalizeUrl(url: string | null, baseUrl: string): string {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  if (url.startsWith("//")) {
    return `https:${url}`
  }
  if (url.startsWith("/")) {
    const base = new URL(baseUrl)
    return `${base.origin}${url}`
  }
  return url
}

