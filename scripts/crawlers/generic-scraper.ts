import type { ScraperOptions, ScraperResult } from "./types";
import { SimpleScraper } from "./simple-scraper";
import { SITE_CONFIGS } from "./site-config";

export class GenericScraper {
  private scraper: SimpleScraper | null = null;
  private siteConfig: any;

  constructor(siteConfig?: any) {
    this.siteConfig = siteConfig;
    if (siteConfig) {
      this.scraper = new SimpleScraper(siteConfig);
    }
  }

  async initialize(): Promise<void> {
    // no-op (SimpleScraper doesn't need initialization)
  }

  async close(): Promise<void> {
    // no-op
  }

  async scrape(options: ScraperOptions): Promise<ScraperResult> {
    if (!this.scraper) {
      return {
        success: false,
        products: [],
        errors: ["Scraper not initialized with site config"],
      };
    }

    try {
      const products = await this.scraper.scrapeProductList({
        keyword: options.keyword,
        category: options.category,
        max: options.maxResults,
        url: options.productUrl || options.categoryUrl,
      });

      return {
        success: true,
        products: products,
      };
    } catch (error: any) {
      return {
        success: false,
        products: [],
        errors: [error.message],
      };
    }
  }
}

