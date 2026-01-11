/**
 * 구매 링크 유효성 검증 모듈
 */

import type { LinkValidationResult } from "./types"
import { fetchWithRetry } from "../api-utils"

/**
 * URL 유효성 검증
 * @param url 검증할 URL
 * @returns 검증 결과
 */
export async function validatePurchaseLink(url: string | null | undefined): Promise<LinkValidationResult> {
  if (!url) {
    return {
      isValid: false,
      error: "URL이 제공되지 않았습니다.",
    }
  }

  try {
    // URL 형식 검증
    const urlObj = new URL(url)

    // 허용된 도메인 목록
    const allowedDomains = [
      "shopping.naver.com",
      "www.11st.co.kr",
      "www.gmarket.co.kr",
      "www.careline.co.kr",
    ]

    const hostname = urlObj.hostname.replace(/^www\./, "")
    const isAllowedDomain = allowedDomains.some((domain) => hostname.includes(domain))

    if (!isAllowedDomain) {
      return {
        isValid: false,
        error: `허용되지 않은 도메인입니다: ${hostname}`,
      }
    }

    // 실제 링크 접근 가능 여부 확인 (HEAD 요청)
    try {
      const response = await fetchWithRetry(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      }, {
        maxRetries: 2,
        initialDelay: 1000,
        // 링크 검증은 404나 403도 에러일 수 있으므로 신중히 재시도
        retryCondition: (res) => res.status >= 500
      })

      const finalUrl = response.url
      const isRedirected = finalUrl !== url

      if (response.ok) {
        return {
          isValid: true,
          statusCode: response.status,
          redirectedUrl: isRedirected ? finalUrl : undefined,
        }
      } else {
        return {
          isValid: false,
          statusCode: response.status,
          error: `HTTP ${response.status} 응답`,
        }
      }
    } catch (fetchError) {
      // 네트워크 오류는 경고만 하고 유효한 것으로 처리 (타임아웃 등)
      console.warn("[link-validator] Link validation failed after retries:", fetchError)
      return {
        isValid: true, // 네트워크 오류는 일단 유효한 것으로 처리
        error: fetchError instanceof Error ? fetchError.message : "네트워크 오류",
      }
    }
  } catch (urlError) {
    return {
      isValid: false,
      error: `잘못된 URL 형식: ${urlError instanceof Error ? urlError.message : String(urlError)}`,
    }
  }
}

/**
 * 여러 링크 일괄 검증
 */
export async function validatePurchaseLinks(
  urls: Array<{ id: string; url: string | null | undefined }>,
): Promise<Map<string, LinkValidationResult>> {
  const results = new Map<string, LinkValidationResult>()

  // 병렬 처리 (최대 5개씩)
  const batchSize = 5
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async ({ id, url }) => {
        const result = await validatePurchaseLink(url)
        return [id, result] as const
      }),
    )

    batchResults.forEach(([id, result]) => {
      results.set(id, result)
    })
  }

  return results
}

/**
 * 제휴 링크인지 확인
 * @param url 확인할 URL
 * @returns 제휴 링크 여부와 플랫폼 정보
 */
function detectAffiliateLink(url: string): {
  isAffiliateLink: boolean
  platform?: "naver" | "11st" | "gmarket" | "careline" | "unknown"
} {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathname = urlObj.pathname.toLowerCase()
    const searchParams = urlObj.searchParams

    // 네이버 파트너스 링크 확인
    if (hostname.includes("shopping.naver.com") || hostname.includes("naver.com")) {
      // 네이버 파트너스 링크 특징: linkId, NaverPcid 등의 파라미터
      if (
        searchParams.has("linkId") ||
        searchParams.has("NaverPcid") ||
        pathname.includes("/partners/") ||
        url.includes("naver.com/vp/products") ||
        url.includes("shopping.naver.com/catalog/")
      ) {
        return { isAffiliateLink: true, platform: "naver" }
      }
    }

    // 11번가 제휴 링크 확인
    if (hostname.includes("11st.co.kr")) {
      // 11번가 제휴 링크 특징: prdNo, trType 등의 파라미터
      if (
        searchParams.has("prdNo") ||
        searchParams.has("trType") ||
        pathname.includes("/products/")
      ) {
        return { isAffiliateLink: true, platform: "11st" }
      }
    }

    // G마켓 제휴 링크 확인
    if (hostname.includes("gmarket.co.kr")) {
      // G마켓 제휴 링크 특징: goodscode 등의 파라미터
      if (searchParams.has("goodscode") || pathname.includes("/item/")) {
        return { isAffiliateLink: true, platform: "gmarket" }
      }
    }

    // 케어라인 제휴 링크 확인
    if (hostname.includes("careline.co.kr")) {
      return { isAffiliateLink: true, platform: "careline" }
    }

    // 제휴 링크가 아닌 경우
    return { isAffiliateLink: false }
  } catch {
    return { isAffiliateLink: false }
  }
}

/**
 * 제휴 링크 상태 체크 함수
 * 제휴 링크인지 확인하고, 링크의 유효성을 검증합니다.
 * @param url 확인할 URL
 * @returns 제휴 링크 상태 정보
 */
export async function checkAffiliateLinkStatus(
  url: string | null | undefined,
): Promise<import("./types").AffiliateLinkStatus> {
  console.log("[link-validator] Checking affiliate link status:", url)

  if (!url) {
    return {
      isAffiliateLink: false,
      isValid: false,
      error: "URL이 제공되지 않았습니다.",
      lastChecked: new Date().toISOString(),
    }
  }

  // 제휴 링크인지 확인
  const { isAffiliateLink, platform } = detectAffiliateLink(url)

  if (!isAffiliateLink) {
    // 제휴 링크가 아니어도 일반 링크 검증 수행
    const validation = await validatePurchaseLink(url)
    return {
      isAffiliateLink: false,
      isValid: validation.isValid,
      statusCode: validation.statusCode,
      error: validation.error,
      redirectedUrl: validation.redirectedUrl,
      lastChecked: new Date().toISOString(),
    }
  }

  // 제휴 링크인 경우 상세 검증
  const validation = await validatePurchaseLink(url)

  return {
    isAffiliateLink: true,
    platform: platform || "unknown",
    isValid: validation.isValid,
    statusCode: validation.statusCode,
    error: validation.error,
    redirectedUrl: validation.redirectedUrl,
    lastChecked: new Date().toISOString(),
  }
}

/**
 * 여러 제휴 링크 상태 일괄 체크
 * @param urls 확인할 URL 배열
 * @returns 제휴 링크 상태 맵
 */
export async function checkAffiliateLinksStatus(
  urls: Array<{ id: string; url: string | null | undefined }>,
): Promise<Map<string, import("./types").AffiliateLinkStatus>> {
  const results = new Map<string, import("./types").AffiliateLinkStatus>()

  // 병렬 처리 (최대 5개씩)
  const batchSize = 5
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async ({ id, url }) => {
        const result = await checkAffiliateLinkStatus(url)
        return [id, result] as const
      }),
    )

    batchResults.forEach(([id, result]) => {
      results.set(id, result)
    })
  }

  return results
}
