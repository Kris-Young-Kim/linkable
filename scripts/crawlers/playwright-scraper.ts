// Playwright 제거: 이 스크레이퍼는 비활성화되어 항상 빈 결과를 반환합니다.
import type { ScrapedProduct } from "./types";
import type { SiteConfig } from "./site-config";

export class PlaywrightScraper {
  constructor(_siteConfig?: SiteConfig) {}

  async init(_headless = true) {
    // no-op
  }

  async close() {
    // no-op
  }

  async scrapeProducts(): Promise<ScrapedProduct[]> {
    return [];
  }

  toScrapedProduct(product: ScrapedProduct): ScrapedProduct {
    return product;
  }
}

