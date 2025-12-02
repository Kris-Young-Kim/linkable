#!/usr/bin/env tsx
/**
 * 제품 API 테스트 스크립트
 * 
 * 사용법:
 *   tsx scripts/test-product-api.ts
 *   tsx scripts/test-product-api.ts --iso-code "15 09"
 */

// 환경 변수 로드
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  process.exit(1)
}

interface CliOptions {
  isoCode?: string
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--iso-code" && args[i + 1]) {
      options.isoCode = args[i + 1]
      i++
    }
  }

  return options
}

async function main() {
  try {
    const options = parseArgs()
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("/rest/v1", "") || "http://localhost:3000"

    console.log("\n" + "=".repeat(50))
    console.log("제품 API 테스트")
    console.log("=".repeat(50))

    // 테스트 1: ISO 코드로 제품 조회
    if (options.isoCode) {
      console.log(`\n🔍 ISO 코드 "${options.isoCode}"로 제품 조회 테스트...`)
      const testUrl = `${baseUrl}/api/products?icf=${encodeURIComponent(options.isoCode)}&limit=5`
      console.log(`   URL: ${testUrl}`)

      try {
        const response = await fetch(testUrl)
        const data = await response.json()

        if (response.ok) {
          console.log(`   ✅ 성공: ${Array.isArray(data) ? data.length : 0}개 제품 조회`)
          if (Array.isArray(data) && data.length > 0) {
            console.log(`\n   조회된 제품:`)
            data.slice(0, 3).forEach((product: any, index: number) => {
              console.log(`   ${index + 1}. ${product.name} (ISO: ${product.iso_code})`)
            })
          }
        } else {
          console.log(`   ❌ 실패: ${data.error || "알 수 없는 오류"}`)
        }
      } catch (error) {
        console.log(`   ❌ 오류: ${error instanceof Error ? error.message : String(error)}`)
        console.log(`   ⚠️  API 서버가 실행 중이 아닐 수 있습니다.`)
      }
    }

    // 테스트 2: 전체 제품 조회
    console.log(`\n🔍 전체 제품 조회 테스트...`)
    const allProductsUrl = `${baseUrl}/api/products?limit=10`
    console.log(`   URL: ${allProductsUrl}`)

    try {
      const response = await fetch(allProductsUrl)
      const data = await response.json()

      if (response.ok) {
        console.log(`   ✅ 성공: ${Array.isArray(data) ? data.length : 0}개 제품 조회`)
        if (Array.isArray(data) && data.length > 0) {
          console.log(`\n   조회된 제품:`)
          data.slice(0, 5).forEach((product: any, index: number) => {
            console.log(`   ${index + 1}. ${product.name}`)
            console.log(`      ISO: ${product.iso_code}, 카테고리: ${product.category || "없음"}`)
          })
        }
      } else {
        console.log(`   ❌ 실패: ${data.error || "알 수 없는 오류"}`)
      }
    } catch (error) {
      console.log(`   ❌ 오류: ${error instanceof Error ? error.message : String(error)}`)
      console.log(`   ⚠️  API 서버가 실행 중이 아닐 수 있습니다.`)
      console.log(`   💡 개발 서버 실행: pnpm dev`)
    }

    // 테스트 3: 데이터베이스 직접 조회
    console.log(`\n🔍 데이터베이스 직접 조회 테스트...`)
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`   ⚠️  SUPABASE_SERVICE_ROLE_KEY가 없어서 스킵합니다.`)
    } else {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      )

      const { data, error } = await supabase
        .from("products")
        .select("id, name, iso_code, category, is_active")
        .eq("is_active", true)
        .limit(5)

      if (error) {
        console.log(`   ❌ 오류: ${error.message}`)
      } else {
        console.log(`   ✅ 성공: ${data?.length || 0}개 제품 조회`)
        if (data && data.length > 0) {
          console.log(`\n   제품 목록:`)
          data.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name} (ISO: ${product.iso_code}, 카테고리: ${product.category || "없음"})`)
          })
        }
      }
    }

    console.log("\n" + "=".repeat(50))
    console.log("✅ 테스트 완료")
    console.log("=".repeat(50))
  } catch (error) {
    console.error("❌ 오류 발생:", error)
    process.exit(1)
  }
}

main()

