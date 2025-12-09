// Playwright 제거: 네이버 스크레이퍼는 비활성화되어 항상 빈 결과를 반환합니다.
import type { ScraperOptions, ScraperResult } from "./types";

export class NaverScraper {
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
      errors: ["NaverScraper disabled (playwright removed)"],
    };
  }
}

