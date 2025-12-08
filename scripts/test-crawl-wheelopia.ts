/**
 * Wheelopia 웹사이트 크롤링 테스트 스크립트
 * 사용법: pnpm tsx scripts/test-crawl-wheelopia.ts
 */

import { getSiteConfig } from "./crawlers/site-config"
import { SimpleScraper } from "./crawlers/simple-scraper"

async function main() {
  const url = process.argv[2] || "https://www.wheelopia.co.kr/shop/goods/goods_list.php"
  
  console.log(`\n🔍 크롤링 시작: ${url}\n`)

  try {
    // Wheelopia 사이트 설정 가져오기
    const siteConfig = getSiteConfig("wheelopia", url)
    
    if (!siteConfig) {
      console.error("❌ Wheelopia 사이트 설정을 찾을 수 없습니다.")
      process.exit(1)
    }

    console.log(`✅ 사이트 설정 로드 완료: ${siteConfig.name}`)
    console.log(`📍 Base URL: ${siteConfig.baseUrl}\n`)

    // SimpleScraper로 제품 목록 크롤링
    const scraper = new SimpleScraper(siteConfig)
    
    console.log("📦 제품 목록 크롤링 중...\n")
    const products = await scraper.scrapeProductList({
      url: url,
      max: 20, // 최대 20개 제품
    })

    if (products.length === 0) {
      console.log("⚠️  제품을 찾을 수 없습니다.")
      console.log("\n💡 가능한 원인:")
      console.log("   - 페이지 구조가 변경되었을 수 있습니다")
      console.log("   - JavaScript로 동적 로딩되는 경우 Playwright가 필요할 수 있습니다")
      console.log("   - 셀렉터가 페이지 구조와 맞지 않을 수 있습니다")
      process.exit(0)
    }

    console.log(`\n✅ ${products.length}개 제품 발견!\n`)
    console.log("=" .repeat(80))
    
    // 제품 정보 출력
    products.forEach((product, index) => {
      console.log(`\n📦 제품 #${index + 1}`)
      console.log(`   이름: ${product.name || "(이름 없음)"}`)
      console.log(`   가격: ${product.price ? `${product.price.toLocaleString()}원` : "(가격 없음)"}`)
      console.log(`   링크: ${product.purchase_link || "(링크 없음)"}`)
      console.log(`   이미지: ${product.image_url || "(이미지 없음)"}`)
      if (product.description) {
        console.log(`   설명: ${product.description.substring(0, 50)}...`)
      }
    })

    console.log("\n" + "=".repeat(80))
    console.log(`\n✅ 크롤링 완료: ${products.length}개 제품\n`)

  } catch (error) {
    console.error("\n❌ 크롤링 오류:", error)
    if (error instanceof Error) {
      console.error("   메시지:", error.message)
      console.error("   스택:", error.stack)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("❌ 예상치 못한 오류:", error)
  process.exit(1)
})

