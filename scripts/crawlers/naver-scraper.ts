/**
 * 네이버 쇼핑 상품 크롤러
 */

import { chromium, type Browser, type Page } from "playwright"
import type { ScrapedProduct, ScraperOptions, ScraperResult } from "./types"
import { delay, retry, parsePrice, normalizeUrl } from "./utils"

export class NaverScraper {
  private browser: Browser | null = null

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
  }

  async scrape(options: ScraperOptions): Promise<ScraperResult> {
    if (!this.browser) {
      await this.initialize()
    }

    const products: ScrapedProduct[] = []
    const errors: string[] = []

    // keyword가 없으면 빈 결과 반환
    if (!options.keyword) {
      return {
        success: false,
        products: [],
        errors: ["검색 키워드가 필요합니다."],
      }
    }

    try {
      // User-Agent 설정 (봇 차단 방지)
      const context = await this.browser!.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      })
      const page = await context.newPage()

      // 불필요한 리소스 로딩 차단 (폰트, 미디어만 차단)
      await page.route("**/*", (route) => {
        const resourceType = route.request().resourceType()
        if (["font", "media"].includes(resourceType)) {
          route.abort()
        } else {
          route.continue()
        }
      })

      // 네이버 쇼핑 검색 URL
      const searchUrl = `https://shopping.naver.com/search/all?query=${encodeURIComponent(
        options.keyword
      )}`

      console.log(`🔍 네이버 쇼핑 검색 중: ${options.keyword}`)

      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      })

      // 검색 결과 로딩 대기 (여러 셀렉터 시도)
      try {
        await page.waitForSelector(".product_list", { timeout: 15000 })
      } catch {
        await page.waitForSelector(".productList", { timeout: 15000 })
      }

      // 상품 목록 추출
      let productElements = await page.$$(".product_list > li")
      if (productElements.length === 0) {
        productElements = await page.$$(".productList_item")
      }
      if (productElements.length === 0) {
        productElements = await page.$$("[class*='product']")
      }

      const maxResults = options.maxResults || 10
      const itemsToProcess = productElements.slice(0, maxResults)

      console.log(`📦 ${itemsToProcess.length}개 상품 처리 시작`)

      for (let i = 0; i < itemsToProcess.length; i++) {
        try {
          const product = await retry(
            () => this.extractProductInfo(page, itemsToProcess[i], searchUrl),
            3
          )

          if (product && product.name && product.purchase_link) {
            products.push(product)
            console.log(
              `✅ ${i + 1}/${itemsToProcess.length}: ${product.name} (${product.price?.toLocaleString() || "가격 없음"}원)`
            )
          }

          if (i < itemsToProcess.length - 1) {
            await delay(options.delay || 1000)
          }
        } catch (error) {
          errors.push(
            `상품 ${i + 1} 추출 실패: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
          console.warn(
            `⚠️  상품 ${i + 1} 추출 실패: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      }

      await page.close()
      await context.close()
    } catch (error) {
      errors.push(
        `크롤링 실패: ${error instanceof Error ? error.message : String(error)}`
      )
      console.error("❌ 네이버 쇼핑 크롤링 오류:", error)
    }

    return {
      success: errors.length === 0,
      products,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  private async extractProductInfo(
    page: Page,
    element: any,
    baseUrl: string
  ): Promise<ScrapedProduct | null> {
    try {
      // 상품명 추출 (여러 셀렉터 시도)
      let nameElement = await element.$(".product_title")
      if (!nameElement) {
        nameElement = await element.$(".productTitle")
      }
      if (!nameElement) {
        nameElement = await element.$("a[href*='/products/']")
      }
      if (!nameElement) {
        nameElement = await element.$("a")
      }

      const name = nameElement
        ? (await nameElement.textContent())?.trim() || ""
        : ""

      if (!name) {
        return null
      }

      // 가격 추출 (여러 셀렉터 시도)
      let priceElement = await element.$(".price")
      if (!priceElement) {
        priceElement = await element.$(".price_value")
      }
      if (!priceElement) {
        priceElement = await element.$("[class*='price']")
      }

      const priceText = priceElement
        ? (await priceElement.textContent())?.trim() || ""
        : ""
      const price = parsePrice(priceText)

      // 이미지 URL 추출
      let imageElement = await element.$("img")
      if (!imageElement) {
        imageElement = await element.$("img[data-src]")
      }

      let imageUrl: string | null = null
      if (imageElement) {
        imageUrl =
          (await imageElement.getAttribute("src")) ||
          (await imageElement.getAttribute("data-src")) ||
          null
        if (imageUrl) {
          imageUrl = normalizeUrl(imageUrl, baseUrl)
        }
      }

      // 구매 링크 추출
      let linkElement = await element.$("a")
      if (!linkElement) {
        linkElement = await element.$("a[href*='/products/']")
      }

      let href: string | null = null
      if (linkElement) {
        href = await linkElement.getAttribute("href")
      }

      const purchaseLink = href
        ? normalizeUrl(href, "https://shopping.naver.com")
        : ""

      if (!purchaseLink) {
        return null
      }

      return {
        name,
        price,
        image_url: imageUrl,
        purchase_link: purchaseLink,
        category: "naver",
      }
    } catch (error) {
      throw new Error(
        `상품 정보 추출 중 오류: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

