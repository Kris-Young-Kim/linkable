/**
 * 구매 링크 유효성 검증 모듈
 */

import type { LinkValidationResult } from "./types"

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
      "coupang.com",
      "www.coupang.com",
      "link.coupang.com",
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
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
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
      console.warn("[link-validator] Link validation failed:", fetchError)
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

