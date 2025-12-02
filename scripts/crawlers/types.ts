/**
 * 웹 스크래핑 크롤러 공통 타입 정의
 */

export interface ScrapedProduct {
  name: string
  price: number | null
  image_url: string | null
  purchase_link: string
  manufacturer?: string | null
  description?: string | null
  category?: string | null
}

export interface ScraperOptions {
  keyword?: string // 검색 키워드 (선택)
  category?: string // 카테고리 (선택)
  categoryUrl?: string // 카테고리 URL (선택)
  isoCode?: string
  maxResults?: number
  delay?: number // 요청 간격 (ms)
}

export interface ScraperResult {
  success: boolean
  products: ScrapedProduct[]
  errors?: string[]
}

