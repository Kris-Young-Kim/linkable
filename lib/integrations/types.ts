/**
 * 쿠팡/유통업체 API 연동을 위한 타입 정의
 */

export type EcommercePlatform = "coupang" | "naver" | "11st" | "gmarket" | "manual"

export interface ProductSource {
  platform: EcommercePlatform
  productId?: string // 플랫폼별 상품 ID
  affiliateLink?: string // 제휴 링크
  originalLink?: string // 원본 링크
}

export interface CoupangProduct {
  productId: string
  productName: string
  productPrice: number
  productImage: string
  productUrl: string
  categoryName: string
  vendorItems?: Array<{
    vendorItemId: string
    vendorItemName: string
    vendorItemPrice: number
  }>
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

