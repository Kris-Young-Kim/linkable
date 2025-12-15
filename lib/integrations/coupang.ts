/**
 * 쿠팡 파트너스 API 연동 모듈
 * 
 * 참고: 쿠팡 파트너스 API 문서
 * https://developers.coupang.com/
 */

import crypto from "crypto"
import fs from "fs"
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
   * HMAC-SHA256 서명 생성
   * @param method HTTP 메서드 (GET, POST 등)
   * @param path 요청 경로 (쿼리 문자열 포함)
   * @param timestamp 타임스탬프 (밀리초)
   * @returns Base64로 인코딩된 서명
   */
  private generateSignature(
    method: string,
    path: string,
    timestamp: string
  ): string {
    // 쿠팡 파트너스 API 서명 메시지 형식
    // 형식: {METHOD}\n{PATH}\n{timestamp}\n{ACCESS_KEY}
    // 참고: 쿠팡 파트너스 API는 줄바꿈(\n)으로 구분된 형식을 사용
    // 경로는 쿼리 파라미터를 포함하지 않을 수도 있음 (시도 1: 경로만 사용)
    const message = `${method}\n${path}\n${timestamp}\n${this.config.accessKey}`

    // HMAC-SHA256 서명 생성
    const signature = crypto
      .createHmac("sha256", this.config.secretKey)
      .update(message, "utf-8")
      .digest("base64")

    return signature
  }

  /**
   * API 요청 헤더 생성 (HMAC-SHA256 서명 기반)
   * @param method HTTP 메서드
   * @param path 요청 경로 (쿼리 문자열 포함)
   * @returns 요청 헤더
   */
  private getHeaders(method: string, path: string): HeadersInit {
    // 타임스탬프 생성 (밀리초 단위)
    const timestamp = Date.now().toString()

    // 서명 생성
    const signature = this.generateSignature(method, path, timestamp)

    // Authorization 헤더 형식: CEA algorithm=HmacSHA256, access-key={ACCESS_KEY}, signed-date={timestamp}, signature={signature}
    const authorization = `CEA algorithm=HmacSHA256, access-key=${this.config.accessKey}, signed-date=${timestamp}, signature=${signature}`

    return {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
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
      // 요청 경로 및 쿼리 파라미터 구성
      const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search"
      const queryParams = new URLSearchParams()
      queryParams.set("keyword", keyword)
      queryParams.set("limit", Math.min(Math.max(limit, 1), 50).toString())

      if (categoryId) {
        queryParams.set("categoryId", categoryId)
      }

      const queryString = queryParams.toString()
      // 전체 URL 생성 (쿼리 파라미터 포함)
      const fullPath = queryString ? `${path}?${queryString}` : path
      const url = new URL(fullPath, this.config.baseUrl)

      console.log(`[Coupang API] 검색 요청: ${keyword}, limit: ${limit}`)
      console.log(`[Coupang API Debug] 요청 경로 (쿼리 포함): ${fullPath}`)
      console.log(`[Coupang API Debug] 전체 URL: ${url.toString()}`)
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/19d8df64-73bd-42a4-84ca-a4d930766c34", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "run-hmac1",
          hypothesisId: "H3",
          location: "lib/integrations/coupang.ts:searchProducts",
          message: "Search request built",
          data: { keyword, limit, fullPath },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      // #region agent log
      try {
        fs.appendFileSync(
          ".cursor/debug.log",
          JSON.stringify({
            sessionId: "debug-session",
            runId: "run-hmac1",
            hypothesisId: "H3",
            location: "lib/integrations/coupang.ts:searchProducts",
            message: "Search request built (fs)",
            data: { keyword, limit, fullPath },
            timestamp: Date.now(),
          }) + "\n",
          { encoding: "utf-8" }
        )
      } catch {}
      // #endregion

      // HMAC-SHA256 서명 기반 헤더 생성
      // 쿠팡 파트너스 API는 경로에 쿼리 파라미터를 포함하여 서명
      // 참고: 쿠팡 API는 경로와 쿼리를 함께 서명에 포함
      // 시도 1: 경로에 쿼리 파라미터 포함
      const headers = this.getHeaders("GET", fullPath)
      console.log(`[Coupang API Debug] Authorization 헤더: ${headers.Authorization?.substring(0, 100)}...`)

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
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
      // 요청 경로 구성
      const path = `/v2/providers/affiliate_open_api/apis/openapi/v1/products/${productId}`

      // 전체 URL 생성
      const url = new URL(path, this.config.baseUrl)

      console.log(`[Coupang API] 상품 상세 조회: ${productId}`)

      // HMAC-SHA256 서명 기반 헤더 생성
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders("GET", path),
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

  /**
   * 구매 리포트 조회
   * @param startDate 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate 종료 날짜 (YYYY-MM-DD 형식)
   * @param status 주문 상태 (APPROVED: 승인됨, CANCELED: 취소됨, 기본값: APPROVED)
   * @returns 구매 리포트 데이터
   */
  async getPurchaseReport(
    startDate: string,
    endDate: string,
    status: "APPROVED" | "CANCELED" = "APPROVED"
  ): Promise<Array<{
    orderId: string
    productId: string
    productName: string
    purchaseAmount: number
    commissionAmount: number
    purchaseDate: string
    status: string
    linkId?: string
  }>> {
    try {
      // 쿠팡 파트너스 API 구매 리포트 엔드포인트
      // 참고: 실제 API 엔드포인트는 쿠팡 파트너스 API 문서 확인 필요
      const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/reports/orders"
      const queryParams = new URLSearchParams()
      queryParams.set("startDate", startDate)
      queryParams.set("endDate", endDate)
      queryParams.set("status", status)

      const queryString = queryParams.toString()
      const fullPath = queryString ? `${path}?${queryString}` : path
      const url = new URL(fullPath, this.config.baseUrl)

      console.log(`[Coupang API] 구매 리포트 조회: ${startDate} ~ ${endDate}, 상태: ${status}`)

      const headers = this.getHeaders("GET", fullPath)
      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Coupang API] 구매 리포트 조회 실패: ${response.status} ${errorText}`)
        throw new Error(`쿠팡 API 호출 실패: ${response.status} ${errorText}`)
      }

      const result: CoupangApiResponse<{
        orders?: Array<{
          orderId?: string
          productId?: string
          productName?: string
          purchaseAmount?: number
          commissionAmount?: number
          purchaseDate?: string
          status?: string
          linkId?: string
        }>
      }> = await response.json()

      if (result.rCode !== "0" && result.rCode !== undefined) {
        console.error(`[Coupang API] API 오류: ${result.rCode} - ${result.rMessage}`)
        throw new Error(`쿠팡 API 오류: ${result.rMessage || result.rCode}`)
      }

      const orders = result.data?.orders || []
      console.log(`[Coupang API] 구매 리포트 결과: ${orders.length}건 발견`)

      return orders
        .filter((o) => o.orderId && o.productId)
        .map((o) => ({
          orderId: o.orderId!,
          productId: o.productId!,
          productName: o.productName || "",
          purchaseAmount: o.purchaseAmount || 0,
          commissionAmount: o.commissionAmount || 0,
          purchaseDate: o.purchaseDate || new Date().toISOString(),
          status: o.status || status,
          linkId: o.linkId,
        }))
    } catch (error) {
      console.error("[Coupang API] 구매 리포트 조회 중 오류:", error)
      throw error
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

