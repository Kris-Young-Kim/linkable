/**
 * 쿠팡 파트너스 API 테스트 스크립트
 * 
 * 사용 방법:
 * 1. 환경 변수 설정 (.env 또는 .env.local 파일에 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 추가)
 * 2. pnpm test:coupang 실행
 */

// 환경 변수 로드
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { createCoupangClient } from "../lib/integrations/coupang"

async function testCoupangAPI() {
  console.log("🧪 쿠팡 파트너스 API 테스트 시작...\n")

  // 1. 환경 변수 확인
  const accessKey = process.env.COUPANG_ACCESS_KEY
  const secretKey = process.env.COUPANG_SECRET_KEY

  if (!accessKey || !secretKey) {
    console.error("❌ 환경 변수가 설정되지 않았습니다.")
    console.log("\n다음 환경 변수를 .env 파일에 추가하세요:")
    console.log("COUPANG_ACCESS_KEY=your_access_key_here")
    console.log("COUPANG_SECRET_KEY=your_secret_key_here")
    console.log("\n또는 실행 시 환경 변수를 직접 지정:")
    console.log("COUPANG_ACCESS_KEY=xxx COUPANG_SECRET_KEY=yyy pnpm tsx scripts/test-coupang-api.ts")
    process.exit(1)
  }

  console.log("✅ 환경 변수 확인 완료")
  console.log(`   Access Key: ${accessKey.substring(0, 8)}...`)
  console.log(`   Secret Key: ${secretKey.substring(0, 8)}...\n`)

  // 2. API 클라이언트 생성
  const client = createCoupangClient()
  if (!client) {
    console.error("❌ API 클라이언트 생성 실패")
    process.exit(1)
  }

  console.log("✅ API 클라이언트 생성 완료\n")

  // 3. 상품 검색 테스트
  console.log("📦 테스트 1: 상품 검색")
  console.log("   키워드: '휠체어', 결과 개수: 5개\n")

  let products: any[] = []
  
  try {
    products = await client.searchProducts("휠체어", 5)
    
    if (products.length === 0) {
      console.warn("⚠️  검색 결과가 없습니다.")
      console.log("   - 키워드를 변경해보세요")
      console.log("   - API 키가 올바른지 확인하세요")
    } else {
      console.log(`✅ 검색 성공: ${products.length}개 상품 발견\n`)
      
      // 첫 번째 상품 정보 출력
      const firstProduct = products[0]
      console.log("📋 첫 번째 상품 정보:")
      console.log(`   상품 ID: ${firstProduct.productId}`)
      console.log(`   상품명: ${firstProduct.productName}`)
      console.log(`   가격: ${firstProduct.productPrice?.toLocaleString()}원`)
      console.log(`   카테고리: ${firstProduct.categoryName || "N/A"}`)
      console.log(`   이미지: ${firstProduct.productImage ? "있음" : "없음"}`)
      console.log(`   URL: ${firstProduct.productUrl || "N/A"}\n`)
    }
  } catch (error) {
    console.error("❌ 상품 검색 실패:")
    if (error instanceof Error) {
      console.error(`   오류: ${error.message}`)
      
      // 일반적인 오류 원인 안내
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        console.log("\n💡 해결 방법:")
        console.log("   1. API 키가 올바른지 확인하세요")
        console.log("   2. 쿠팡 파트너스 계정이 활성화되어 있는지 확인하세요")
        console.log("   3. API 키 권한을 확인하세요")
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        console.log("\n💡 해결 방법:")
        console.log("   1. API 사용 권한을 확인하세요")
        console.log("   2. 쿠팡 파트너스 계정 상태를 확인하세요")
      } else if (error.message.includes("429") || error.message.includes("Too Many Requests")) {
        console.log("\n💡 해결 방법:")
        console.log("   1. API 호출 제한을 초과했습니다. 잠시 후 다시 시도하세요")
      }
    } else {
      console.error(`   알 수 없는 오류: ${error}`)
    }
    process.exit(1)
  }

  // 4. 상품 상세 조회 테스트 (검색 결과가 있는 경우)
  if (products.length > 0) {
    console.log("📦 테스트 2: 상품 상세 조회")
    console.log(`   상품 ID: ${products[0].productId}\n`)

    try {
      const productDetails = await client.getProductDetails(products[0].productId)
      
      if (!productDetails) {
        console.warn("⚠️  상품 상세 정보를 가져올 수 없습니다.")
      } else {
        console.log("✅ 상품 상세 조회 성공\n")
        console.log("📋 상품 상세 정보:")
        console.log(`   상품명: ${productDetails.productName}`)
        console.log(`   가격: ${productDetails.productPrice?.toLocaleString()}원`)
        if (productDetails.vendorItems && productDetails.vendorItems.length > 0) {
          console.log(`   판매처 수: ${productDetails.vendorItems.length}개`)
        }
        console.log()
      }
    } catch (error) {
      console.warn("⚠️  상품 상세 조회 실패 (계속 진행):")
      if (error instanceof Error) {
        console.warn(`   ${error.message}\n`)
      }
    }
  }

  // 5. 제휴 링크 생성 테스트
  console.log("🔗 테스트 3: 제휴 링크 생성")
  const testUrl = "https://www.coupang.com/vp/products/123456"
  const affiliateLink = client.generateAffiliateLink(testUrl)
  
  if (affiliateLink === testUrl) {
    console.warn("⚠️  LINK_ID가 설정되지 않아 원본 URL이 반환되었습니다.")
    console.log("   제휴 링크를 생성하려면 COUPANG_LINK_ID 환경 변수를 설정하세요\n")
  } else {
    console.log("✅ 제휴 링크 생성 성공")
    console.log(`   원본 URL: ${testUrl}`)
    console.log(`   제휴 링크: ${affiliateLink}\n`)
  }

  // 6. 테스트 완료
  console.log("🎉 모든 테스트 완료!")
  console.log("\n다음 단계:")
  console.log("1. 실제 상품 검색을 위해 다른 키워드로 테스트해보세요")
  console.log("2. 크롤러나 관리자 페이지에서 API를 사용하세요")
  console.log("3. n8n 워크플로우에 API 연동을 추가하세요")
}

// 스크립트 실행
testCoupangAPI().catch((error) => {
  console.error("❌ 테스트 실행 중 오류 발생:")
  console.error(error)
  process.exit(1)
})

