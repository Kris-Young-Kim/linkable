#!/usr/bin/env tsx
/**
 * 각 사이트별 실제 HTML 구조 확인 및 셀렉터 테스트 스크립트
 * 
 * 사용법:
 *   tsx scripts/crawlers/test-site-selectors.ts --site ablelife
 *   tsx scripts/crawlers/test-site-selectors.ts --site all
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { SITE_CONFIGS, type SiteConfig } from "./site-config"

interface TestResult {
  site: string
  url: string
  productListSelector: string | null
  productCount: number
  sampleProduct: {
    name: string | null
    price: string | null
    image: string | null
    link: string | null
  }
  allClasses: string[]
  errors: string[]
}

/**
 * 사이트 테스트
 */
async function testSite(
  browser: Browser,
  siteConfig: SiteConfig,
  siteKey: string
): Promise<TestResult> {
  const result: TestResult = {
    site: siteConfig.name,
    url: siteConfig.baseUrl,
    productListSelector: null,
    productCount: 0,
    sampleProduct: {
      name: null,
      price: null,
      image: null,
      link: null,
    },
    allClasses: [],
    errors: [],
  }

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  })

  const page = await context.newPage()

  try {
    // 카테고리 URL이 있으면 사용, 없으면 메인 페이지
    let testUrl = siteConfig.baseUrl
    if (siteConfig.categoryUrls && Object.keys(siteConfig.categoryUrls).length > 0) {
      const firstCategory = Object.keys(siteConfig.categoryUrls)[0]
      testUrl = siteConfig.categoryUrls[firstCategory]
      console.log(`   📍 카테고리 URL 사용: ${firstCategory}`)
    }

    console.log(`   🌐 접속 중: ${testUrl}`)
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
    await page.waitForTimeout(3000) // 페이지 로딩 대기

    // 페이지의 모든 클래스 수집 (product, item, list 관련)
    const classes = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*")
      const classSet = new Set<string>()
      allElements.forEach((el) => {
        if (el.className && typeof el.className === "string") {
          el.className.split(" ").forEach((cls) => {
            if (cls && (cls.includes("product") || cls.includes("item") || cls.includes("list") || cls.includes("goods"))) {
              classSet.add(cls)
            }
          })
        }
      })
      return Array.from(classSet).sort()
    })
    result.allClasses = classes

    // 상품 목록 셀렉터 테스트
    let productElements: any[] = []
    for (const selector of siteConfig.selectors.productList) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 })
        productElements = await page.$$(selector)
        if (productElements.length > 0) {
          result.productListSelector = selector
          result.productCount = productElements.length
          console.log(`   ✅ 상품 목록 발견: ${selector} (${productElements.length}개)`)
          break
        }
      } catch {
        // 다음 셀렉터 시도
      }
    }

    if (productElements.length === 0) {
      result.errors.push("상품 목록을 찾을 수 없습니다.")
      console.log(`   ⚠️  상품 목록을 찾을 수 없습니다.`)
      console.log(`   발견된 관련 클래스: ${classes.slice(0, 10).join(", ")}`)
    } else {
      // 첫 번째 상품 정보 추출 테스트
      const firstProduct = productElements[0]

      // 상품명 추출
      for (const selector of siteConfig.selectors.productName) {
        try {
          const nameElement = await firstProduct.$(selector)
          if (nameElement) {
            const name = (await nameElement.textContent())?.trim() || ""
            if (name) {
              result.sampleProduct.name = name
              console.log(`   ✅ 상품명: ${name.substring(0, 40)}...`)
              break
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // 가격 추출
      for (const selector of siteConfig.selectors.productPrice) {
        try {
          const priceElement = await firstProduct.$(selector)
          if (priceElement) {
            const price = (await priceElement.textContent())?.trim() || ""
            if (price) {
              result.sampleProduct.price = price
              console.log(`   ✅ 가격: ${price}`)
              break
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // 이미지 추출
      for (const selector of siteConfig.selectors.productImage) {
        try {
          const imageElement = await firstProduct.$(selector)
          if (imageElement) {
            const imageUrl =
              (await imageElement.getAttribute("src")) ||
              (await imageElement.getAttribute("data-src")) ||
              null
            if (imageUrl) {
              result.sampleProduct.image = imageUrl
              console.log(`   ✅ 이미지: ${imageUrl.substring(0, 50)}...`)
              break
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // 링크 추출
      for (const selector of siteConfig.selectors.productLink) {
        try {
          const linkElement = await firstProduct.$(selector)
          if (linkElement) {
            const href = await linkElement.getAttribute("href")
            if (href) {
              const fullLink = href.startsWith("http")
                ? href
                : new URL(href, siteConfig.baseUrl).href
              result.sampleProduct.link = fullLink
              console.log(`   ✅ 링크: ${fullLink.substring(0, 50)}...`)
              break
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }
    }

    await page.close()
    await context.close()
  } catch (error) {
    result.errors.push(
      `테스트 실패: ${error instanceof Error ? error.message : String(error)}`
    )
    console.error(`   ❌ 오류:`, error)
    await page.close()
    await context.close()
  }

  return result
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2)
  let targetSite = "all"

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--site" && args[i + 1]) {
      targetSite = args[i + 1]
      break
    }
  }

  console.log("\n" + "=".repeat(70))
  console.log("각 사이트별 HTML 구조 확인 및 셀렉터 테스트")
  console.log("=".repeat(70))

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const results: TestResult[] = []

  try {
    const sitesToTest =
      targetSite === "all"
        ? Object.entries(SITE_CONFIGS)
        : [[targetSite, SITE_CONFIGS[targetSite]]].filter(([_, config]) => config) as Array<[string, SiteConfig]>

    if (sitesToTest.length === 0) {
      console.error(`❌ 사이트를 찾을 수 없습니다: ${targetSite}`)
      process.exit(1)
    }

    for (const [siteKey, siteConfig] of sitesToTest) {
      if (!siteConfig.enabled) {
        console.log(`\n⏭️  ${siteConfig.name} (비활성화됨)`)
        continue
      }

      console.log(`\n${"=".repeat(70)}`)
      console.log(`🔍 ${siteConfig.name} (${siteKey}) 테스트 중...`)
      console.log("=".repeat(70))

      const result = await testSite(browser, siteConfig, siteKey)
      results.push(result)

      // 결과 요약 출력
      console.log(`\n📊 결과 요약:`)
      console.log(`   상품 목록: ${result.productCount > 0 ? `✅ ${result.productCount}개` : "❌ 없음"}`)
      console.log(`   상품명: ${result.sampleProduct.name ? `✅ ${result.sampleProduct.name.substring(0, 30)}...` : "❌ 없음"}`)
      console.log(`   가격: ${result.sampleProduct.price ? `✅ ${result.sampleProduct.price}` : "❌ 없음"}`)
      console.log(`   이미지: ${result.sampleProduct.image ? "✅ 있음" : "❌ 없음"}`)
      console.log(`   링크: ${result.sampleProduct.link ? "✅ 있음" : "❌ 없음"}`)
      if (result.errors.length > 0) {
        console.log(`   오류: ${result.errors.join(", ")}`)
      }
    }

    // 전체 결과 요약
    console.log("\n" + "=".repeat(70))
    console.log("전체 테스트 결과 요약")
    console.log("=".repeat(70))

    const successCount = results.filter((r) => r.productCount > 0).length
    const totalCount = results.length

    console.log(`\n✅ 성공: ${successCount}/${totalCount} 사이트`)
    console.log(`❌ 실패: ${totalCount - successCount}/${totalCount} 사이트\n`)

    for (const result of results) {
      const status = result.productCount > 0 ? "✅" : "❌"
      console.log(
        `${status} ${result.site.padEnd(20)} | 상품: ${String(result.productCount).padStart(3)}개 | 셀렉터: ${result.productListSelector || "없음"}`
      )
    }

    // 상세 결과를 JSON 파일로 저장
    const fs = await import("fs/promises")
    await fs.writeFile(
      "test-selectors-results.json",
      JSON.stringify(results, null, 2),
      "utf-8"
    )
    console.log(`\n📄 상세 결과 저장: test-selectors-results.json`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error)
  process.exit(1)
})

