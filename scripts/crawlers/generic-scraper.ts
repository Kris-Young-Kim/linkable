// Playwright 제거: 제너릭 스크레이퍼는 비활성화되어 항상 빈 결과를 반환합니다.
import type { ScraperOptions, ScraperResult } from "./types";

export class GenericScraper {
  // siteConfig 인자는 호환성을 위해 받지만 사용하지 않음
  constructor(_siteConfig?: any) {}

  async initialize(): Promise<void> {
    // no-op
  }

  async close(): Promise<void> {
    // no-op
  }

  async scrape(_options: ScraperOptions): Promise<ScraperResult> {
    return {
      success: false,
      products: [],
      errors: ["GenericScraper disabled (playwright removed)"],
    };
  }
}

