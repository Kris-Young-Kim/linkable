#!/usr/bin/env tsx
/**
 * Playwright 기반 웹 크롤러
 * JavaScript 렌더링이 필요한 동적 사이트 크롤링용
 *
 * 사용법:
 *   tsx scripts/crawlers/playwright-scraper.ts --url "https://example.com/products" --max 10
 *   tsx scripts/crawlers/playwright-scraper.ts --url "https://example.com/products" --iso-code "12 22" --save
 */

import { chromium, type Browser, type Page } from "playwright";
import type { ScrapedProduct } from "./types";
import { parsePrice, normalizeUrl, delay, retry } from "./utils";
import type { SiteConfig } from "./site-config";
import { getSiteConfig } from "./site-config";

export interface PlaywrightScrapeOptions {
  url: string;
  maxResults?: number;
  delayMs?: number;
  headless?: boolean;
  timeout?: number;
  siteConfig?: SiteConfig;
  useClickNavigation?: boolean; // 목록에서 실제 클릭으로 상세 이동 (href가 없거나 JS 네비게이션인 경우)
}

export interface ProductDetail {
  name: string; // 보조기기명
  model?: string; // 모델명
  price: number | null; // 가격
  features?: string[]; // 특징
  imageUrl: string | null; // 이미지 URL
  purchaseLink: string; // 구매 링크
  manufacturer?: string; // 제조사
  description?: string; // 설명
  category?: string; // 카테고리
}

export class PlaywrightScraper {
  private browser: Browser | null = null;
  private siteConfig: SiteConfig | null = null;

  constructor(siteConfig?: SiteConfig) {
    this.siteConfig = siteConfig || null;
  }

  /**
   * 브라우저 초기화
   */
  async init(headless = true): Promise<void> {
    console.log("🚀 Playwright 브라우저 초기화 중...");
    this.browser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  /**
   * 브라우저 종료
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("✅ 브라우저 종료 완료");
    }
  }

  /**
   * 페이지 로드 및 대기
   */
  private async loadPage(url: string, timeout = 30000): Promise<Page> {
    if (!this.browser) {
      throw new Error(
        "브라우저가 초기화되지 않았습니다. init()을 먼저 호출하세요."
      );
    }

    // Context 생성 시 User-Agent 설정
    const context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // 페이지 로드 (domcontentloaded로 변경하여 더 빠르게)
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout,
    });

    // 최소 대기 (동적 콘텐츠 로딩)
    await page.waitForTimeout(1000);

    return page;
  }

  /**
   * 제품 목록 페이지에서 제품 링크 추출
   */
  async scrapeProductList(options: PlaywrightScrapeOptions): Promise<string[]> {
    const {
      url,
      maxResults = 20,
      delayMs = 1000,
      useClickNavigation = false,
    } = options;

    console.log(`\n📋 제품 목록 크롤링 시작: ${url}`);

    const page = await this.loadPage(url, options.timeout || 30000);
    const productLinks: string[] = [];
    const startTime = Date.now();
    const MAX_SEARCH_TIME = 30000; // 30초 타임아웃

    try {
      // 사이트 설정이 있으면 해당 셀렉터 사용
      const selectors = this.siteConfig?.selectors.productList || [
        'a[href*="product"]',
        'a[href*="detail"]',
        'a[href*="item"]',
        ".product-item a",
        ".product-list a",
      ];

      // 제품 링크 찾기
      for (const selector of selectors) {
        // 타임아웃 체크
        if (Date.now() - startTime > MAX_SEARCH_TIME) {
          console.log(`⏱️  제품 검색 타임아웃 (${MAX_SEARCH_TIME}ms)`);
          break;
        }

        try {
          const locator = page.locator(selector);
          const count = await locator.count();

          if (count > 0) {
            console.log(`✅ 셀렉터 "${selector}"로 ${count}개 요소 발견`);

            const limit = Math.min(count, maxResults * 2);
            for (let i = 0; i < limit; i++) {
              if (productLinks.length >= maxResults) break;
              if (Date.now() - startTime > MAX_SEARCH_TIME) break;

              let href: string | null = null;
              const link = locator.nth(i);

              // 직접 링크 시도
              try {
                const tagName = await link.evaluate((el) =>
                  el.tagName.toLowerCase()
                );
                if (tagName === "a") {
                  href = await link.getAttribute("href");
                } else {
                  const linkElement = link.locator("a").first();
                  if ((await linkElement.count()) > 0) {
                    href = await linkElement.getAttribute("href");
                  }
                }
              } catch {
                href = null;
              }

              // 링크 필터링 조건 완화 (plusezer.com 등 다양한 사이트 지원)
              if (href) {
                const hrefLower = href.toLowerCase();
                const isValidProductLink =
                  hrefLower.includes("shopdetail") ||
                  hrefLower.includes("goods_view") ||
                  hrefLower.includes("product") ||
                  hrefLower.includes("detail") ||
                  hrefLower.includes("goods") ||
                  (hrefLower.includes("view") && !hrefLower.includes("list"));

                if (isValidProductLink) {
                  const fullUrl = normalizeUrl(href, url);
                  if (fullUrl && !productLinks.includes(fullUrl)) {
                    productLinks.push(fullUrl);
                    console.log(`  📌 링크 발견: ${fullUrl}`);
                  }
                }
              } else if (useClickNavigation) {
                // 클릭 기반 네비게이션 시도 (href가 없거나 JS 네비게이션인 경우)
                try {
                  const [nav] = await Promise.all([
                    page
                      .waitForNavigation({
                        waitUntil: "domcontentloaded",
                        timeout: 10000,
                      })
                      .catch(() => null),
                    link.click({ button: "left" }),
                  ]);
                  const currentUrl = page.url();
                  if (currentUrl && currentUrl !== url) {
                    const normalized = normalizeUrl(currentUrl, url);
                    if (normalized && !productLinks.includes(normalized)) {
                      productLinks.push(normalized);
                    }
                  }
                  // 목록 페이지로 복귀
                  await page
                    .goBack({ waitUntil: "domcontentloaded", timeout: 10000 })
                    .catch(async () => {
                      await page.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: 15000,
                      });
                    });
                  // 클릭 후 짧은 대기
                  await page.waitForTimeout(delayMs);
                } catch (clickError) {
                  // 클릭 실패는 무시하고 다음 요소로
                  continue;
                }
              }
            }

            if (productLinks.length >= maxResults) break;
          }
        } catch (error) {
          // 셀렉터 오류는 무시하고 다음 시도
          console.log(
            `  ⚠️  셀렉터 "${selector}" 실패: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          continue;
        }
      }

      // 중복 제거
      const uniqueLinks = [...new Set(productLinks)];
      console.log(`✅ 총 ${uniqueLinks.length}개 제품 링크 발견\n`);

      if (uniqueLinks.length === 0) {
        console.log(
          "⚠️  제품 링크를 찾을 수 없습니다. 페이지 구조를 확인해주세요."
        );
      }

      return uniqueLinks.slice(0, maxResults);
    } finally {
      await page.close();
    }
  }

  /**
   * 개별 제품 상세 페이지에서 정보 추출
   */
  async scrapeProductDetail(
    productUrl: string,
    timeout = 20000
  ): Promise<ProductDetail | null> {
    if (!this.browser) {
      throw new Error("브라우저가 초기화되지 않았습니다.");
    }

    console.log(`\n🔍 제품 상세 정보 추출 중: ${productUrl}`);

    return retry(
      async () => {
        const page = await this.loadPage(productUrl, timeout);

        try {
          const product: ProductDetail = {
            name: "",
            price: null,
            imageUrl: null,
            purchaseLink: productUrl,
            features: [],
          };

          // 제품명 추출 (타임아웃 설정)
          const nameSelectors = this.siteConfig?.selectors.productName || [
            "h1",
            ".product-name",
            ".product-title",
            '[class*="name"]',
            '[class*="title"]',
          ];

          for (const selector of nameSelectors) {
            try {
              const element = page.locator(selector).first();
              await element
                .waitFor({ state: "visible", timeout: 3000 })
                .catch(() => null);
              if (await element.isVisible().catch(() => false)) {
                const text = await element.textContent();
                if (text?.trim()) {
                  product.name = text.trim();
                  console.log(`  ✅ 제품명: ${product.name}`);
                  break;
                }
              }
            } catch {
              continue;
            }
          }

          // 모델명 추출 (제품명에서 분리하거나 별도 필드에서)
          const modelSelectors = [
            '[class*="model"]',
            '[class*="model-name"]',
            ".model",
            'dt:has-text("모델") + dd',
            'th:has-text("모델") + td',
          ];

          for (const selector of modelSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text?.trim()) {
                product.model = text.trim();
                console.log(`  ✅ 모델명: ${product.model}`);
                break;
              }
            }
          }

          // 가격 추출 (타임아웃 설정)
          const priceSelectors = this.siteConfig?.selectors.productPrice || [
            ".price",
            '[class*="price"]',
            '[class*="cost"]',
            'strong:has-text("원")',
            'span:has-text("원")',
          ];

          for (const selector of priceSelectors) {
            try {
              const element = page.locator(selector).first();
              await element
                .waitFor({ state: "visible", timeout: 3000 })
                .catch(() => null);
              if (await element.isVisible().catch(() => false)) {
                const text = await element.textContent();
                if (text) {
                  const price = parsePrice(text);
                  if (price) {
                    product.price = price;
                    console.log(`  ✅ 가격: ${price.toLocaleString()}원`);
                    break;
                  }
                }
              }
            } catch {
              continue;
            }
          }

          // 이미지 추출
          const imageSelectors = this.siteConfig?.selectors.productImage || [
            ".product-image img",
            ".product-img img",
            '[class*="image"] img',
            'img[src*="product"]',
            "img",
          ];

          for (const selector of imageSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              const src = await element.getAttribute("src");
              if (src) {
                product.imageUrl = normalizeUrl(src, productUrl);
                console.log(`  ✅ 이미지: ${product.imageUrl}`);
                break;
              }
            }
          }

          // 특징/스펙 추출
          const featureSelectors = [
            ".features",
            ".spec",
            '[class*="feature"]',
            '[class*="spec"]',
            "dl dt",
            "table th",
          ];

          const features: string[] = [];
          for (const selector of featureSelectors) {
            const elements = await page.locator(selector).all();
            if (elements.length > 0) {
              for (const element of elements.slice(0, 10)) {
                const text = await element.textContent();
                if (text?.trim() && text.trim().length < 100) {
                  features.push(text.trim());
                }
              }
              if (features.length > 0) break;
            }
          }
          product.features = features;

          // 설명 추출
          const descriptionSelectors = [
            ".description",
            ".product-description",
            '[class*="description"]',
            ".detail",
            "p",
          ];

          for (const selector of descriptionSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text?.trim() && text.trim().length > 20) {
                product.description = text.trim().substring(0, 500);
                break;
              }
            }
          }

          // 제조사 추출
          const manufacturerSelectors = [
            '[class*="manufacturer"]',
            '[class*="brand"]',
            'dt:has-text("제조사") + dd',
            'th:has-text("제조사") + td',
          ];

          for (const selector of manufacturerSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text?.trim()) {
                product.manufacturer = text.trim();
                break;
              }
            }
          }

          if (!product.name) {
            console.log("  ⚠️  제품명을 찾을 수 없습니다.");
            return null;
          }

          console.log(`  ✅ 제품 정보 추출 완료: ${product.name}`);
          return product;
        } finally {
          await page.close();
        }
      },
      3,
      2000
    );
  }

  /**
   * 제품 목록 페이지에서 모든 제품 정보 추출
   */
  async scrapeProducts(
    options: PlaywrightScrapeOptions
  ): Promise<ProductDetail[]> {
    const {
      url,
      maxResults = 20,
      delayMs = 2000,
      useClickNavigation = false,
    } = options;

    console.log(`\n🚀 크롤링 시작: ${url}`);
    console.log(`📊 최대 ${maxResults}개 제품 추출\n`);

    const startTime = Date.now();
    const MAX_TOTAL_TIME = 300000; // 5분 전체 타임아웃

    // 제품 링크 추출
    const productLinks = await this.scrapeProductList({
      ...options,
      maxResults,
      useClickNavigation,
    });

    if (productLinks.length === 0) {
      console.log("⚠️  제품 링크를 찾을 수 없습니다.");
      return [];
    }

    // 각 제품 상세 정보 추출
    const products: ProductDetail[] = [];

    for (let i = 0; i < productLinks.length; i++) {
      // 전체 타임아웃 체크
      if (Date.now() - startTime > MAX_TOTAL_TIME) {
        console.log(`\n⏱️  전체 크롤링 타임아웃 (${MAX_TOTAL_TIME}ms)`);
        console.log(
          `✅ ${products.length}개 제품 추출 완료 (${i}/${productLinks.length} 처리)\n`
        );
        return products;
      }

      const link = productLinks[i];
      console.log(
        `\n[${i + 1}/${productLinks.length}] 처리 중: ${link.substring(
          0,
          80
        )}...`
      );

      try {
        // 타임아웃을 10초로 줄임 (빠른 실패)
        const product = await this.scrapeProductDetail(link, 10000);
        if (product) {
          products.push(product);
          console.log(`  ✅ 제품 추출 성공: ${product.name}`);
        } else {
          console.log(`  ⚠️  제품 정보 추출 실패`);
        }
      } catch (error) {
        console.error(
          `  ❌ 오류 발생: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Rate limit 방지
      if (i < productLinks.length - 1) {
        await delay(delayMs);
      }
    }

    console.log(`\n✅ 크롤링 완료: ${products.length}개 제품 추출\n`);
    return products;
  }

  /**
   * ScrapedProduct 형식으로 변환
   */
  toScrapedProduct(product: ProductDetail): ScrapedProduct {
    return {
      name: product.model ? `${product.name} (${product.model})` : product.name,
      price: product.price,
      image_url: product.imageUrl,
      purchase_link: product.purchaseLink,
      manufacturer: product.manufacturer || null,
      description: product.description || product.features?.join(", ") || null,
      category: product.category || null,
    };
  }
}
