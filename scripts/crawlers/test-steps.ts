#!/usr/bin/env tsx
/**
 * 웹 스크래핑 크롤러 단계별 테스트 스크립트
 * 
 * 사용법:
 *   tsx scripts/crawlers/test-steps.ts --step 1  # 브라우저 초기화
 *   tsx scripts/crawlers/test-steps.ts --step 2  # 페이지 접속
 *   tsx scripts/crawlers/test-steps.ts --step 3  # 셀렉터 찾기
 *   tsx scripts/crawlers/test-steps.ts --step 4  # 상품 정보 추출
 *   tsx scripts/crawlers/test-steps.ts --step all # 전체 테스트
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { chromium, type Browser, type Page, type BrowserContext } from "playwright"

const TEST_KEYWORD = "보행기"
const TEST_URL = `https://www.ablelife.co.kr`

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null

/**
 * Step 1: 브라우저 초기화 테스트
 */
async function testStep1(): Promise<void> {
  console.log("\n" + "=".repeat(50))
  console.log("Step 1: 브라우저 초기화 테스트")
  console.log("=".repeat(50))

  try {
    console.log("🔧 Chromium 브라우저 실행 중...")
    browser = await chromium.launch({
      headless: false, // 테스트용으로 헤드 모드 (화면에 표시)
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    console.log("✅ 브라우저 초기화 성공!")

    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })

    console.log("✅ Context 생성 성공!")
    console.log("✅ User-Agent 설정 완료")
  } catch (error) {
    console.error("❌ 브라우저 초기화 실패:", error)
    throw error
  }
}

/**
 * Step 2: 페이지 접속 테스트
 */
async function testStep2(): Promise<void> {
  console.log("\n" + "=".repeat(50))
  console.log("Step 2: 페이지 접속 테스트")
  console.log("=".repeat(50))

  if (!context) {
    throw new Error("Context가 초기화되지 않았습니다. Step 1을 먼저 실행하세요.")
  }

  try {
    console.log(`🌐 페이지 접속 중: ${TEST_URL}`)
    page = await context.newPage()

    console.log("⏳ 페이지 로딩 대기 중...")
    await page.goto(TEST_URL, { waitUntil: "networkidle", timeout: 30000 })

    const title = await page.title()
    console.log(`✅ 페이지 접속 성공!`)
    console.log(`   페이지 제목: ${title}`)

    const url = page.url()
    console.log(`   현재 URL: ${url}`)
  } catch (error) {
    console.error("❌ 페이지 접속 실패:", error)
    throw error
  }
}

/**
 * Step 3: 셀렉터 찾기 테스트
 */
async function testStep3(): Promise<void> {
  console.log("\n" + "=".repeat(50))
  console.log("Step 3: 셀렉터 찾기 테스트")
  console.log("=".repeat(50))

  if (!page) {
    throw new Error("Page가 초기화되지 않았습니다. Step 2를 먼저 실행하세요.")
  }

  try {
    console.log("🔍 상품 목록 셀렉터 찾는 중...")

    // 페이지가 완전히 로드될 때까지 추가 대기
    console.log("   ⏳ 페이지 완전 로딩 대기 중... (3초)")
    await page.waitForTimeout(3000) // 3초 대기
    
    // 스크린샷 저장 (디버깅용)
    console.log("   📸 스크린샷 저장 중...")
    await page.screenshot({ path: "test-page-screenshot.png", fullPage: false })
    console.log("   ✅ 스크린샷 저장됨: test-page-screenshot.png")

    // 네이버 쇼핑 셀렉터 시도
    const selectors = [
      ".product_list > li",
      ".productList_item",
      "li.productList_item",
      "[class*='product']",
      "ul[class*='product'] > li",
      ".product_item",
      "li[class*='item']",
      "[data-product-id]",
      "article",
      "div[class*='product']",
    ]

    let foundElements: any[] = []
    let workingSelector = ""

    for (const selector of selectors) {
      try {
        console.log(`   시도 중: ${selector}`)
        await page.waitForSelector(selector, { timeout: 10000 }) // 타임아웃 증가
        const elements = await page.$$(selector)
        if (elements.length > 0) {
          foundElements = elements
          workingSelector = selector
          console.log(`   ✅ 발견: ${selector} (${elements.length}개 요소)`)
          break
        }
      } catch {
        console.log(`   ❌ 실패: ${selector}`)
      }
    }

    if (foundElements.length === 0) {
      console.log("\n⚠️  상품 목록을 찾을 수 없습니다.")
      
      // 페이지가 닫히지 않았는지 확인
      if (page.isClosed()) {
        console.log("❌ 페이지가 닫혔습니다. 다시 시도하세요.")
        return
      }
      
      // 모든 링크와 클래스 찾기
      console.log("\n🔍 페이지의 주요 클래스 찾기:")
      const classes = await page.evaluate(() => {
        const allElements = document.querySelectorAll("*")
        const classSet = new Set<string>()
        allElements.forEach((el) => {
          if (el.className && typeof el.className === "string") {
            el.className.split(" ").forEach((cls) => {
              if (cls.includes("product") || cls.includes("item") || cls.includes("list") || cls.includes("search")) {
                classSet.add(cls)
              }
            })
          }
        })
        return Array.from(classSet).slice(0, 30)
      })
      console.log("   발견된 클래스:", classes.join(", "))
      
      // 페이지에 있는 모든 li 요소 확인
      console.log("\n🔍 페이지의 li 요소 확인:")
      const liCount = await page.evaluate(() => {
        return document.querySelectorAll("li").length
      })
      console.log(`   총 li 요소 수: ${liCount}개`)
      
      // 페이지에 있는 모든 ul 요소 확인
      const ulCount = await page.evaluate(() => {
        return document.querySelectorAll("ul").length
      })
      console.log(`   총 ul 요소 수: ${ulCount}개`)
      
      // 페이지 제목과 URL 확인
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.innerText.substring(0, 200)
        }
      })
      console.log("\n📄 페이지 정보:")
      console.log(`   제목: ${pageInfo.title}`)
      console.log(`   URL: ${pageInfo.url}`)
      console.log(`   본문 일부: ${pageInfo.bodyText}...`)
    } else {
      console.log(`\n✅ 작동하는 셀렉터: ${workingSelector}`)
      console.log(`   발견된 상품 수: ${foundElements.length}개`)
    }
  } catch (error) {
    console.error("❌ 셀렉터 찾기 실패:", error)
    throw error
  }
}

/**
 * Step 4: 상품 정보 추출 테스트
 */
async function testStep4(): Promise<void> {
  console.log("\n" + "=".repeat(50))
  console.log("Step 4: 상품 정보 추출 테스트")
  console.log("=".repeat(50))

  if (!page) {
    throw new Error("Page가 초기화되지 않았습니다. Step 2를 먼저 실행하세요.")
  }

  try {
    // 네이버 쇼핑 상품 목록 찾기
    let productElements = await page.$$(".product_list > li")
    if (productElements.length === 0) {
      productElements = await page.$$(".productList_item")
    }
    if (productElements.length === 0) {
      productElements = await page.$$("li[class*='product']")
    }
    if (productElements.length === 0) {
      productElements = await page.$$(".product_item")
    }

    if (productElements.length === 0) {
      console.log("⚠️  상품 요소를 찾을 수 없습니다.")
      return
    }

    console.log(`📦 ${productElements.length}개 상품 요소 발견`)
    console.log(`   첫 번째 상품 정보 추출 중...\n`)

    const firstProduct = productElements[0]

    // 네이버 쇼핑 상품명 추출 시도
    const nameSelectors = [".product_title", ".productTitle", "a[href*='/products/']", "a", ".title"]
    let name = ""
    for (const selector of nameSelectors) {
      try {
        const nameElement = await firstProduct.$(selector)
        if (nameElement) {
          name = (await nameElement.textContent())?.trim() || ""
          if (name) {
            console.log(`✅ 상품명: ${name} (셀렉터: ${selector})`)
            break
          }
        }
      } catch {
        // 다음 셀렉터 시도
      }
    }

    if (!name) {
      console.log("⚠️  상품명을 찾을 수 없습니다.")
    }

    // 네이버 쇼핑 가격 추출 시도
    const priceSelectors = [".price", ".price_value", "[class*='price']", ".num"]
    let price = ""
    for (const selector of priceSelectors) {
      try {
        const priceElement = await firstProduct.$(selector)
        if (priceElement) {
          price = (await priceElement.textContent())?.trim() || ""
          if (price) {
            console.log(`✅ 가격: ${price} (셀렉터: ${selector})`)
            break
          }
        }
      } catch {
        // 다음 셀렉터 시도
      }
    }

    if (!price) {
      console.log("⚠️  가격을 찾을 수 없습니다.")
    }

    // 이미지 추출 시도
    const imageElement = await firstProduct.$("img")
    if (imageElement) {
      const imageUrl =
        (await imageElement.getAttribute("src")) ||
        (await imageElement.getAttribute("data-src")) ||
        ""
      if (imageUrl) {
        console.log(`✅ 이미지 URL: ${imageUrl.substring(0, 50)}...`)
      } else {
        console.log("⚠️  이미지 URL을 찾을 수 없습니다.")
      }
    } else {
      console.log("⚠️  이미지 요소를 찾을 수 없습니다.")
    }

    // 링크 추출 시도
    const linkElement = await firstProduct.$("a")
    if (linkElement) {
      const href = await linkElement.getAttribute("href")
      if (href) {
        const fullLink = href.startsWith("http")
          ? href
          : `https://shopping.naver.com${href}`
        console.log(`✅ 구매 링크: ${fullLink.substring(0, 50)}...`)
      } else {
        console.log("⚠️  링크를 찾을 수 없습니다.")
      }
    } else {
      console.log("⚠️  링크 요소를 찾을 수 없습니다.")
    }

    // 첫 번째 상품의 HTML 구조 출력 (디버깅용)
    console.log("\n📄 첫 번째 상품 HTML 구조 (일부):")
    const productHTML = await firstProduct.evaluate((el) => el.innerHTML)
    console.log(productHTML.substring(0, 500) + "...")
  } catch (error) {
    console.error("❌ 상품 정보 추출 실패:", error)
    throw error
  }
}

/**
 * 전체 테스트
 */
async function testAll(): Promise<void> {
  console.log("\n" + "=".repeat(50))
  console.log("전체 테스트 시작")
  console.log("=".repeat(50))

  try {
    await testStep1()
    await testStep2()
    await testStep3()
    await testStep4()
    console.log("\n✅ 모든 테스트 완료!")
  } catch (error) {
    console.error("\n❌ 테스트 실패:", error)
    throw error
  } finally {
    await cleanup()
  }
}

/**
 * 정리 작업
 */
async function cleanup(): Promise<void> {
  console.log("\n🧹 정리 중...")
  if (page) {
    await page.close()
    page = null
  }
  if (context) {
    await context.close()
    context = null
  }
  if (browser) {
    await browser.close()
    browser = null
  }
  console.log("✅ 정리 완료")
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2)
  let step = "all"

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--step" && args[i + 1]) {
      step = args[i + 1]
      break
    }
  }

  try {
    switch (step) {
      case "1":
        await testStep1()
        console.log("\n✅ Step 1 완료! 다음 단계: --step 2")
        break
      case "2":
        await testStep1() // Step 2를 위해 Step 1도 필요
        await testStep2()
        console.log("\n✅ Step 2 완료! 다음 단계: --step 3")
        break
      case "3":
        await testStep1()
        await testStep2()
        await testStep3()
        console.log("\n✅ Step 3 완료! 다음 단계: --step 4")
        break
      case "4":
        await testStep1()
        await testStep2()
        await testStep3()
        await testStep4()
        console.log("\n✅ Step 4 완료!")
        break
      case "all":
        await testAll()
        break
      default:
        console.error(`❌ 알 수 없는 단계: ${step}`)
        console.log("사용 가능한 단계: 1, 2, 3, 4, all")
        process.exit(1)
    }
  } catch (error) {
    console.error("\n❌ 테스트 중 오류 발생:", error)
    process.exit(1)
  } finally {
    await cleanup()
  }
}

// Ctrl+C 처리
process.on("SIGINT", async () => {
  console.log("\n\n⚠️  사용자에 의해 중단됨")
  await cleanup()
  process.exit(0)
})

main()

