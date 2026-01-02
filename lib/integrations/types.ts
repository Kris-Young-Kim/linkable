/**
 * 유통업체 API 연동을 위한 타입 정의
 */

export type EcommercePlatform = "naver" | "11st" | "gmarket" | "manual"

export interface ProductSource {
  platform: EcommercePlatform
  productId?: string // 플랫폼별 상품 ID
  affiliateLink?: string // 제휴 링크
  originalLink?: string // 원본 링크
}



export interface ProductSyncResult {
  success: boolean
  created: number
  updated: number
  failed: number
  errors?: Array<{ productId: string; error: string }>
}

export interface LinkValidationResult {
  isValid: boolean
  statusCode?: number
  error?: string
  redirectedUrl?: string
}

