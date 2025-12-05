/**
 * 쿠팡 파트너스 API 연동 모듈
 * 
 * 참고: 쿠팡 파트너스 API 문서
 * https://developers.coupang.com/
 */

import type { CoupangProduct, ProductSource } from "./types"

export interface CoupangApiConfig {
  accessKey: string
  secretKey: string
  linkId?: string // 제휴 링크 ID (선택)
  baseUrl?: string
}

/**
 * 쿠팡 파트너스 API 응답 타입
 */
interface CoupangApiResponse<T> {
  rCode?: string
  rMessage?: string
  data?: T
}

interface CoupangSearchResponse {
  products?: Array<{
    productId?: string
    productName?: string
    productPrice?: number
    productImage?: string
    productUrl?: string
    categoryName?: string
    vendorItems?: Array<{
      vendorItemId?: string
      vendorItemName?: string
      vendorItemPrice?: number
    }>
  }>
  totalCount?: number
}

/**
 * 쿠팡 API 클라이언트 클래스
 */
export class CoupangApiClient {
  private config: CoupangApiConfig

  constructor(config: CoupangApiConfig) {
    this.config = {
      baseUrl: "https://api-gateway.coupang.com",
      ...config,
    }
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): HeadersInit {
    const auth = `${this.config.accessKey}:${this.config.secretKey}`
    return {
      "Authorization": `Bearer ${Buffer.from(auth).toString("base64")}`,
      "Content-Type": "application/json",
    }
  }

  /**
   * 상품 검색
   * @param keyword 검색 키워드
   * @param limit 결과 개수 (기본값: 10, 최대: 50)
   * @param categoryId 카테고리 ID (선택)
   * @returns 상품 목록
   */
  async searchProducts(
    keyword: string,
    limit: number = 10,
    categoryId?: string
  ): Promise<CoupangProduct[]> {
    try {
      const url = new URL(
        `${this.config.baseUrl}/v2/providers/affiliate_open_api/apis/openapi/v1/products/search`
      )
      url.searchParams.set("keyword", keyword)
      url.searchParams.set("limit", Math.min(Math.max(limit, 1), 50).toString())

      if (categoryId) {
        url.searchParams.set("categoryId", categoryId)
      }

      console.log(`[Coupang API] 검색 요청: ${keyword}, limit: ${limit}`)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Coupang API] 검색 실패: ${response.status} ${errorText}`)
        throw new Error(`쿠팡 API 호출 실패: ${response.status} ${errorText}`)
      }

      const result: CoupangApiResponse<CoupangSearchResponse> = await response.json()

      if (result.rCode !== "0" && result.rCode !== undefined) {
        console.error(`[Coupang API] API 오류: ${result.rCode} - ${result.rMessage}`)
        throw new Error(`쿠팡 API 오류: ${result.rMessage || result.rCode}`)
      }

      const products = result.data?.products || []
      console.log(`[Coupang API] 검색 결과: ${products.length}개 상품 발견`)

      return products
        .filter((p) => p.productId && p.productName)
        .map((p) => ({
          productId: p.productId!,
          productName: p.productName!,
          productPrice: p.productPrice || 0,
          productImage: p.productImage || "",
          productUrl: p.productUrl || "",
          categoryName: p.categoryName || "",
          vendorItems: p.vendorItems?.map((v) => ({
            vendorItemId: v.vendorItemId || "",
            vendorItemName: v.vendorItemName || "",
            vendorItemPrice: v.vendorItemPrice || 0,
          })),
        }))
    } catch (error) {
      console.error("[Coupang API] 검색 중 오류:", error)
      throw error
    }
  }

  /**
   * 상품 상세 정보 조회
   * @param productId 쿠팡 상품 ID
   * @returns 상품 상세 정보
   */
  async getProductDetails(productId: string): Promise<CoupangProduct | null> {
    try {
      const url = new URL(
        `${this.config.baseUrl}/v2/providers/affiliate_open_api/apis/openapi/v1/products/${productId}`
      )

      console.log(`[Coupang API] 상품 상세 조회: ${productId}`)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Coupang API] 상세 조회 실패: ${response.status} ${errorText}`)
        return null
      }

      const result: CoupangApiResponse<CoupangProduct> = await response.json()

      if (result.rCode !== "0" && result.rCode !== undefined) {
        console.error(`[Coupang API] API 오류: ${result.rCode} - ${result.rMessage}`)
        return null
      }

      return result.data || null
    } catch (error) {
      console.error("[Coupang API] 상세 조회 중 오류:", error)
      return null
    }
  }

  /**
   * 제휴 링크 생성
   * @param productUrl 원본 상품 URL
   * @returns 제휴 링크
   */
  generateAffiliateLink(productUrl: string): string {
    if (!this.config.linkId) {
      console.warn("[Coupang API] LINK_ID가 설정되지 않아 원본 URL 반환")
      return productUrl
    }

    // 쿠팡 파트너스 링크 형식: https://link.coupang.com/a/{linkId}?url={encodedUrl}
    try {
      const encodedUrl = encodeURIComponent(productUrl)
      return `https://link.coupang.com/a/${this.config.linkId}?url=${encodedUrl}`
    } catch (error) {
      console.error("[Coupang API] 제휴 링크 생성 실패:", error)
      return productUrl
    }
  }
}

/**
 * 쿠팡 API 클라이언트 인스턴스 생성 (환경 변수 기반)
 */
export function createCoupangClient(): CoupangApiClient | null {
  const accessKey = process.env.COUPANG_ACCESS_KEY
  const secretKey = process.env.COUPANG_SECRET_KEY
  const linkId = process.env.COUPANG_LINK_ID

  if (!accessKey || !secretKey) {
    console.warn("[Coupang API] ACCESS_KEY 또는 SECRET_KEY가 설정되지 않음")
    return null
  }

  return new CoupangApiClient({
    accessKey,
    secretKey,
    linkId,
  })
}

