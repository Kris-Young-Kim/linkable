#!/usr/bin/env tsx
/**
 * 상품 데이터 검증 유닛 테스트
 * 
 * 사용법:
 *   tsx scripts/tests/product-validation.test.ts
 * 
 * 이 스크립트는 다음을 테스트합니다:
 * 1. ProductInput 데이터 검증 (필수 필드, 타입 검증)
 * 2. ISO 코드 검증
 * 3. 가격 검증
 * 4. URL 검증
 * 5. 이미지 URL 검증
 */

import type { ProductInput } from "@/lib/integrations/product-sync"
import { getIsoCodeLevel } from "@/lib/utils/iso-code-converter"

// 테스트 결과 타입
type TestResult = {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const testResults: TestResult[] = []

// 테스트 헬퍼 함수
function assert(condition: boolean, message: string, details?: any): void {
  if (condition) {
    testResults.push({ name: message, passed: true, details })
    console.log(`✅ ${message}`)
  } else {
    testResults.push({ name: message, passed: false, error: "Assertion failed", details })
    console.error(`❌ ${message}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const passed = actual === expected
  assert(passed, message, { actual, expected })
}

function assertIncludes<T>(array: T[], item: T, message: string): void {
  const passed = array.includes(item)
  assert(passed, message, { array, item, found: passed })
}

/**
 * 상품 데이터 검증 함수
 */
function validateProductInput(product: ProductInput): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 1. 필수 필드 검증
  if (!product.name || !product.name.trim()) {
    errors.push("상품 이름은 필수입니다.")
  }

  // 2. 이름 길이 검증
  if (product.name && product.name.trim().length < 2) {
    errors.push("상품 이름은 최소 2자 이상이어야 합니다.")
  }

  if (product.name && product.name.trim().length > 200) {
    errors.push("상품 이름은 최대 200자까지 가능합니다.")
  }

  // 3. ISO 코드 검증
  if (product.iso_code) {
    const { level } = getIsoCodeLevel(product.iso_code)
    if (level === "invalid") {
      errors.push(`유효하지 않은 ISO 코드 형식입니다: ${product.iso_code}`)
    }
  }

  // 4. 가격 검증
  if (product.price !== null && product.price !== undefined) {
    if (typeof product.price !== "number") {
      errors.push("가격은 숫자여야 합니다.")
    } else if (product.price < 0) {
      errors.push("가격은 0 이상이어야 합니다.")
    } else if (product.price > 100000000) {
      errors.push("가격은 1억원을 초과할 수 없습니다.")
    }
  }

  // 5. 구매 링크 URL 검증
  if (product.purchase_link) {
    try {
      const url = new URL(product.purchase_link)
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push("구매 링크는 http:// 또는 https://로 시작해야 합니다.")
      }
    } catch {
      errors.push(`유효하지 않은 구매 링크 URL 형식입니다: ${product.purchase_link}`)
    }
  }

  // 6. 이미지 URL 검증
  if (product.image_url) {
    try {
      const url = new URL(product.image_url)
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push("이미지 URL은 http:// 또는 https://로 시작해야 합니다.")
      }
    } catch {
      errors.push(`유효하지 않은 이미지 URL 형식입니다: ${product.image_url}`)
    }
  }

  // 7. 설명 길이 검증
  if (product.description && product.description.length > 5000) {
    errors.push("설명은 최대 5000자까지 가능합니다.")
  }

  // 8. 제조사 길이 검증
  if (product.manufacturer && product.manufacturer.length > 100) {
    errors.push("제조사명은 최대 100자까지 가능합니다.")
  }

  // 9. 카테고리 길이 검증
  if (product.category && product.category.length > 100) {
    errors.push("카테고리는 최대 100자까지 가능합니다.")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 테스트 1: 필수 필드 검증
 */
function testRequiredFields() {
  console.log("\n📋 테스트 1: 필수 필드 검증")
  console.log("-".repeat(60))

  // 이름이 없는 경우
  const productWithoutName: ProductInput = {
    name: "",
    iso_code: "15 09",
  }
  const result1 = validateProductInput(productWithoutName)
  assert(!result1.isValid, "이름이 없는 상품은 검증 실패해야 함")
  assertIncludes(result1.errors, "상품 이름은 필수입니다.", "이름 필수 오류 메시지 확인")

  // 이름이 공백만 있는 경우
  const productWithWhitespace: ProductInput = {
    name: "   ",
    iso_code: "15 09",
  }
  const result2 = validateProductInput(productWithWhitespace)
  assert(!result2.isValid, "공백만 있는 이름은 검증 실패해야 함")

  // 이름이 있는 경우
  const validProduct: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
  }
  const result3 = validateProductInput(validProduct)
  assert(result3.isValid, "필수 필드가 모두 있는 상품은 검증 통과해야 함")
}

/**
 * 테스트 2: 이름 길이 검증
 */
function testNameLength() {
  console.log("\n📋 테스트 2: 이름 길이 검증")
  console.log("-".repeat(60))

  // 이름이 너무 짧은 경우
  const shortName: ProductInput = {
    name: "A",
    iso_code: "15 09",
  }
  const result1 = validateProductInput(shortName)
  assert(!result1.isValid, "1자 이름은 검증 실패해야 함")
  assertIncludes(result1.errors, "상품 이름은 최소 2자 이상이어야 합니다.", "최소 길이 오류 확인")

  // 이름이 너무 긴 경우
  const longName: ProductInput = {
    name: "A".repeat(201),
    iso_code: "15 09",
  }
  const result2 = validateProductInput(longName)
  assert(!result2.isValid, "201자 이름은 검증 실패해야 함")
  assertIncludes(result2.errors, "상품 이름은 최대 200자까지 가능합니다.", "최대 길이 오류 확인")

  // 정상적인 이름 길이
  const validName: ProductInput = {
    name: "정상적인 상품 이름",
    iso_code: "15 09",
  }
  const result3 = validateProductInput(validName)
  assert(result3.isValid, "정상적인 이름 길이는 검증 통과해야 함")
}

/**
 * 테스트 3: ISO 코드 검증
 */
function testIsoCode() {
  console.log("\n📋 테스트 3: ISO 코드 검증")
  console.log("-".repeat(60))

  // 유효한 ISO 코드 (Division)
  const validDivision: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09 13",
  }
  const result1 = validateProductInput(validDivision)
  assert(result1.isValid, "유효한 Division ISO 코드는 검증 통과해야 함")

  // 유효한 ISO 코드 (Subclass)
  const validSubclass: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
  }
  const result2 = validateProductInput(validSubclass)
  assert(result2.isValid, "유효한 Subclass ISO 코드는 검증 통과해야 함")

  // 유효한 ISO 코드 (Class)
  const validClass: ProductInput = {
    name: "테스트 상품",
    iso_code: "15",
  }
  const result3 = validateProductInput(validClass)
  assert(result3.isValid, "유효한 Class ISO 코드는 검증 통과해야 함")

  // 유효하지 않은 ISO 코드
  const invalidIso: ProductInput = {
    name: "테스트 상품",
    iso_code: "999",
  }
  const result4 = validateProductInput(invalidIso)
  assert(!result4.isValid, "유효하지 않은 ISO 코드는 검증 실패해야 함")

  // ISO 코드가 없는 경우 (선택 사항이므로 통과)
  const noIso: ProductInput = {
    name: "테스트 상품",
    iso_code: "",
  }
  const result5 = validateProductInput(noIso)
  assert(result5.isValid, "ISO 코드가 없어도 검증 통과해야 함")
}

/**
 * 테스트 4: 가격 검증
 */
function testPrice() {
  console.log("\n📋 테스트 4: 가격 검증")
  console.log("-".repeat(60))

  // 정상적인 가격
  const validPrice: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    price: 50000,
  }
  const result1 = validateProductInput(validPrice)
  assert(result1.isValid, "정상적인 가격은 검증 통과해야 함")

  // 가격이 0인 경우
  const zeroPrice: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    price: 0,
  }
  const result2 = validateProductInput(zeroPrice)
  assert(result2.isValid, "가격이 0이어도 검증 통과해야 함")

  // 음수 가격
  const negativePrice: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    price: -1000,
  }
  const result3 = validateProductInput(negativePrice)
  assert(!result3.isValid, "음수 가격은 검증 실패해야 함")
  assertIncludes(result3.errors, "가격은 0 이상이어야 합니다.", "음수 가격 오류 확인")

  // 가격이 너무 큰 경우
  const tooLargePrice: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    price: 100000001,
  }
  const result4 = validateProductInput(tooLargePrice)
  assert(!result4.isValid, "1억원 초과 가격은 검증 실패해야 함")
  assertIncludes(result4.errors, "가격은 1억원을 초과할 수 없습니다.", "최대 가격 오류 확인")

  // 가격이 null인 경우 (선택 사항)
  const nullPrice: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    price: null,
  }
  const result5 = validateProductInput(nullPrice)
  assert(result5.isValid, "가격이 null이어도 검증 통과해야 함")
}

/**
 * 테스트 5: URL 검증
 */
function testUrls() {
  console.log("\n📋 테스트 5: URL 검증")
  console.log("-".repeat(60))

  // 유효한 구매 링크
  const validPurchaseLink: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    purchase_link: "https://shopping.naver.com/products/123",
  }
  const result1 = validateProductInput(validPurchaseLink)
  assert(result1.isValid, "유효한 구매 링크는 검증 통과해야 함")

  // 유효한 이미지 URL
  const validImageUrl: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    image_url: "https://example.com/image.jpg",
  }
  const result2 = validateProductInput(validImageUrl)
  assert(result2.isValid, "유효한 이미지 URL은 검증 통과해야 함")

  // 유효하지 않은 구매 링크
  const invalidPurchaseLink: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    purchase_link: "not-a-url",
  }
  const result3 = validateProductInput(invalidPurchaseLink)
  assert(!result3.isValid, "유효하지 않은 구매 링크는 검증 실패해야 함")

  // http가 아닌 프로토콜
  const invalidProtocol: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    purchase_link: "ftp://example.com/file",
  }
  const result4 = validateProductInput(invalidProtocol)
  assert(!result4.isValid, "http/https가 아닌 프로토콜은 검증 실패해야 함")

  // URL이 null인 경우 (선택 사항)
  const nullUrl: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    purchase_link: null,
    image_url: null,
  }
  const result5 = validateProductInput(nullUrl)
  assert(result5.isValid, "URL이 null이어도 검증 통과해야 함")
}

/**
 * 테스트 6: 설명 및 메타데이터 검증
 */
function testMetadata() {
  console.log("\n📋 테스트 6: 설명 및 메타데이터 검증")
  console.log("-".repeat(60))

  // 정상적인 설명
  const validDescription: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    description: "이것은 테스트 상품입니다.",
  }
  const result1 = validateProductInput(validDescription)
  assert(result1.isValid, "정상적인 설명은 검증 통과해야 함")

  // 설명이 너무 긴 경우
  const longDescription: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    description: "A".repeat(5001),
  }
  const result2 = validateProductInput(longDescription)
  assert(!result2.isValid, "5001자 설명은 검증 실패해야 함")
  assertIncludes(result2.errors, "설명은 최대 5000자까지 가능합니다.", "최대 설명 길이 오류 확인")

  // 정상적인 제조사
  const validManufacturer: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    manufacturer: "테스트 제조사",
  }
  const result3 = validateProductInput(validManufacturer)
  assert(result3.isValid, "정상적인 제조사는 검증 통과해야 함")

  // 제조사가 너무 긴 경우
  const longManufacturer: ProductInput = {
    name: "테스트 상품",
    iso_code: "15 09",
    manufacturer: "A".repeat(101),
  }
  const result4 = validateProductInput(longManufacturer)
  assert(!result4.isValid, "101자 제조사는 검증 실패해야 함")
  assertIncludes(result4.errors, "제조사명은 최대 100자까지 가능합니다.", "최대 제조사 길이 오류 확인")
}

/**
 * 테스트 7: 통합 시나리오
 */
function testIntegrationScenario() {
  console.log("\n📋 테스트 7: 통합 시나리오")
  console.log("-".repeat(60))

  // 완전한 유효한 상품
  const completeProduct: ProductInput = {
    name: "고급 보행 보조기",
    iso_code: "12 06",
    description: "안정적인 보행을 위한 고급 보행 보조기입니다.",
    price: 150000,
    purchase_link: "https://shopping.naver.com/products/123456",
    image_url: "https://example.com/images/walker.jpg",
    manufacturer: "보조기기 전문",
    category: "보행 보조기",
    is_active: true,
  }
  const result1 = validateProductInput(completeProduct)
  assert(result1.isValid, "완전한 유효한 상품은 검증 통과해야 함")
  assertEqual(result1.errors.length, 0, "오류가 없어야 함")

  // 여러 오류가 있는 상품
  const invalidProduct: ProductInput = {
    name: "A", // 너무 짧음
    iso_code: "999", // 유효하지 않음
    price: -1000, // 음수
    purchase_link: "not-a-url", // 유효하지 않은 URL
    description: "A".repeat(5001), // 너무 김
  }
  const result2 = validateProductInput(invalidProduct)
  assert(!result2.isValid, "여러 오류가 있는 상품은 검증 실패해야 함")
  assert(result2.errors.length >= 4, "최소 4개의 오류가 있어야 함")
}

/**
 * 결과 요약 출력
 */
function printSummary() {
  console.log("\n" + "=".repeat(60))
  console.log("📊 테스트 결과 요약")
  console.log("=".repeat(60))

  const passed = testResults.filter((r) => r.passed).length
  const failed = testResults.filter((r) => !r.passed).length
  const total = testResults.length

  console.log(`총 테스트: ${total}`)
  console.log(`✅ 통과: ${passed}`)
  console.log(`❌ 실패: ${failed}`)
  console.log(`정확도: ${((passed / total) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log("\n❌ 실패한 테스트:")
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}`)
        if (r.error) {
          console.log(`    오류: ${r.error}`)
        }
        if (r.details) {
          console.log(`    상세: ${JSON.stringify(r.details, null, 2)}`)
        }
      })
  }

  console.log("\n" + "=".repeat(60))

  if (failed === 0) {
    console.log("🎉 모든 테스트 통과!")
    process.exit(0)
  } else {
    console.log("⚠️  일부 테스트 실패")
    process.exit(1)
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log("🚀 상품 데이터 검증 유닛 테스트 시작")
  console.log("=".repeat(60))

  try {
    // 테스트 실행
    testRequiredFields()
    testNameLength()
    testIsoCode()
    testPrice()
    testUrls()
    testMetadata()
    testIntegrationScenario()

    // 결과 요약
    printSummary()
  } catch (error) {
    console.error("\n❌ 테스트 실행 중 오류 발생:")
    console.error(error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}
