#!/usr/bin/env tsx
/**
 * 수동 상품 크롤링 및 일괄 등록 스크립트
 * 
 * 사용법:
 *   tsx scripts/manual-product-import.ts --file products.csv
 *   tsx scripts/manual-product-import.ts --file products.json
 *   tsx scripts/manual-product-import.ts --file products.csv --validate-links
 * 
 * CSV 형식:
 *   name,iso_code,price,purchase_link,image_url,manufacturer,category,description
 *   무게조절 식기 세트,15 09,25000,https://coupang.link/1,https://image.com/1.jpg,보조기기코리아,coupang,손 떨림 보조 식기
 * 
 * JSON 형식:
 *   [
 *     {
 *       "name": "무게조절 식기 세트",
 *       "iso_code": "15 09",
 *       "price": 25000,
 *       "purchase_link": "https://coupang.link/1",
 *       "image_url": "https://image.com/1.jpg",
 *       "manufacturer": "보조기기코리아",
 *       "category": "coupang",
 *       "description": "손 떨림 보조 식기"
 *     }
 *   ]
 */

// 환경 변수 로드 (import 전에 먼저 실행되어야 함)
import { config } from "dotenv"
import { resolve } from "path"

// .env.local 파일 로드
config({ path: resolve(process.cwd(), ".env.local") })
// .env 파일도 시도 (없어도 무방)
config({ path: resolve(process.cwd(), ".env") })

// 환경 변수 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  console.error("필요한 환경 변수:")
  console.error("  - NEXT_PUBLIC_SUPABASE_URL")
  console.error("  - SUPABASE_SERVICE_ROLE_KEY")
  console.error("\n.env.local 파일을 확인하세요.")
  process.exit(1)
}

import { readFileSync } from "fs"
import { join } from "path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { ProductInput } from "../lib/integrations/product-sync"
import type { ProductSyncResult } from "../lib/integrations/types"

/**
 * ISO 코드 검증
 * ISO 9999:2022 표준 형식: "XX XX" (공백 포함, 2자리 + 공백 + 2자리)
 */
function isValidIsoCodeFormat(isoCode: string): boolean {
  const normalized = isoCode.trim()
  const pattern = /^\d{2}\s\d{2}$/
  return pattern.test(normalized)
}

/**
 * ISO 코드 검증 (형식만 확인, 실제 존재 여부는 DB에서 확인)
 */
function isValidIsoCode(isoCode: string): boolean {
  return isValidIsoCodeFormat(isoCode)
}

interface ImportOptions {
  file: string
  validateLinks?: boolean
  dryRun?: boolean
}

/**
 * CSV 파일 파싱
 */
function parseCSV(filePath: string): ProductInput[] {
  const content = readFileSync(filePath, "utf-8")
  const lines = content.split("\n").filter((line) => line.trim())
  
  if (lines.length < 2) {
    throw new Error("CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.")
  }

  const headers = lines[0].split(",").map((h) => h.trim())
  const products: ProductInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    
    if (values.length !== headers.length) {
      console.warn(`⚠️  행 ${i + 1}: 컬럼 수가 맞지 않습니다. 건너뜁니다.`)
      continue
    }

    const product: Record<string, string> = {}
    headers.forEach((header, index) => {
      product[header] = values[index]?.trim() || ""
    })

    // 필수 필드 검증
    if (!product.name || !product.iso_code) {
      console.warn(`⚠️  행 ${i + 1}: name 또는 iso_code가 없습니다. 건너뜁니다.`)
      continue
    }

    // ISO 코드 검증
    if (!isValidIsoCode(product.iso_code)) {
      console.warn(`⚠️  행 ${i + 1}: 유효하지 않은 ISO 코드 "${product.iso_code}". 건너뜁니다.`)
      continue
    }

    products.push({
      name: product.name,
      iso_code: product.iso_code,
      price: product.price ? parseFloat(product.price) : null,
      purchase_link: product.purchase_link || null,
      image_url: product.image_url || null,
      manufacturer: product.manufacturer || null,
      category: product.category || null,
      description: product.description || null,
      is_active: product.is_active !== "false", // 기본값: true
    })
  }

  return products
}

/**
 * CSV 라인 파싱 (쉼표와 따옴표 처리)
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }
  
  values.push(current)
  return values
}

/**
 * JSON 파일 파싱
 */
function parseJSON(filePath: string): ProductInput[] {
  const content = readFileSync(filePath, "utf-8")
  const data = JSON.parse(content)

  if (!Array.isArray(data)) {
    throw new Error("JSON 파일은 배열 형식이어야 합니다.")
  }

  const products: ProductInput[] = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    // 필수 필드 검증
    if (!item.name || !item.iso_code) {
      console.warn(`⚠️  항목 ${i + 1}: name 또는 iso_code가 없습니다. 건너뜁니다.`)
      continue
    }

    // ISO 코드 검증
    if (!isValidIsoCode(item.iso_code)) {
      console.warn(`⚠️  항목 ${i + 1}: 유효하지 않은 ISO 코드 "${item.iso_code}". 건너뜁니다.`)
      continue
    }

    products.push({
      name: item.name,
      iso_code: item.iso_code,
      price: typeof item.price === "number" ? item.price : item.price ? parseFloat(String(item.price)) : null,
      purchase_link: item.purchase_link || null,
      image_url: item.image_url || null,
      manufacturer: item.manufacturer || null,
      category: item.category || null,
      description: item.description || null,
      is_active: item.is_active !== false, // 기본값: true
    })
  }

  return products
}


/**
 * 로컬 상품 동기화 함수 (스크립트 전용)
 */
async function syncProductsLocal(
  supabase: SupabaseClient,
  products: ProductInput[],
): Promise<ProductSyncResult> {
  const result: ProductSyncResult = {
    success: true,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  for (const product of products) {
    try {
      // 기존 상품 확인 (이름과 ISO 코드로)
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("name", product.name)
        .eq("iso_code", product.iso_code)
        .maybeSingle()

      if (existing) {
        // 업데이트
        const { data, error } = await supabase
          .from("products")
          .update({
            ...product,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("id")
          .single()

        if (error) {
          throw error
        }

        result.updated++
        console.log(`  🔄 업데이트: ${product.name} (ISO: ${product.iso_code})`)
      } else {
        // 신규 생성
        const { data, error } = await supabase
          .from("products")
          .insert({
            ...product,
            is_active: product.is_active ?? true,
          })
          .select("id")
          .single()

        if (error) {
          throw error
        }

        result.created++
        console.log(`  ✅ 생성: ${product.name} (ISO: ${product.iso_code})`)
      }
    } catch (error) {
      result.failed++
      result.success = false
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors?.push({
        productId: product.name,
        error: errorMessage,
      })
      console.error(`  ❌ 실패: ${product.name} - ${errorMessage}`)
    }
  }

  return result
}

/**
 * 명령줄 인자 파싱
 */
function parseArgs(): ImportOptions {
  const args = process.argv.slice(2).filter((arg) => arg !== "--") // "--" 구분자 제거
  const options: ImportOptions = {
    file: "",
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      options.file = args[i + 1]
      i++
    } else if (args[i] === "--validate-links") {
      options.validateLinks = true
    } else if (args[i] === "--dry-run") {
      options.dryRun = true
    }
  }

  if (!options.file) {
    throw new Error("--file 옵션이 필요합니다.")
  }

  return options
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    const options = parseArgs()
    const filePath = join(process.cwd(), options.file)

    console.log(`📂 파일 읽는 중: ${filePath}`)

    // 파일 확장자에 따라 파서 선택
    const extension = filePath.split(".").pop()?.toLowerCase()
    let products: ProductInput[]

    if (extension === "csv") {
      products = parseCSV(filePath)
    } else if (extension === "json") {
      products = parseJSON(filePath)
    } else {
      throw new Error(`지원하지 않는 파일 형식입니다. CSV 또는 JSON 파일을 사용하세요.`)
    }

    console.log(`✅ ${products.length}개의 상품을 파싱했습니다.`)

    if (options.dryRun) {
      console.log("\n🔍 Dry-run 모드: 실제로 등록하지 않습니다.\n")
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (ISO: ${product.iso_code})`)
      })
      return
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 데이터베이스 연결 확인
    const { error: testError } = await supabase.from("products").select("id").limit(1)
    
    if (testError) {
      throw new Error(`데이터베이스 연결 실패: ${testError.message}`)
    }

    console.log("\n📤 상품 등록 중...\n")

    // 상품 동기화 (스크립트에서 직접 구현)
    const result = await syncProductsLocal(supabase, products)

    // 결과 출력
    console.log("\n" + "=".repeat(50))
    console.log("📊 등록 결과")
    console.log("=".repeat(50))
    console.log(`✅ 생성: ${result.created}개`)
    console.log(`🔄 업데이트: ${result.updated}개`)
    console.log(`❌ 실패: ${result.failed}개`)
    console.log(`📦 전체: ${products.length}개`)

    if (result.errors && result.errors.length > 0) {
      console.log("\n❌ 에러 목록:")
      result.errors.forEach((error) => {
        console.log(`  - ${error.productId}: ${error.error}`)
      })
    }

    console.log("\n✅ 완료!")
  } catch (error) {
    console.error("\n❌ 에러:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}

export { parseCSV, parseJSON, isValidIsoCode }

