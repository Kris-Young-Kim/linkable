#!/usr/bin/env tsx
/**
 * 추천 시스템 테스트 스크립트
 * 
 * 사용법:
 *   tsx scripts/test-recommendation-system.ts
 *   tsx scripts/test-recommendation-system.ts --iso-code "15 09"
 */

// 환경 변수 로드
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  process.exit(1)
}

import { createClient } from "@supabase/supabase-js"
import { getIsoMatches } from "@/core/matching/iso-mapping"

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

    console.log("\n" + "=".repeat(50))
    console.log("추천 시스템 테스트")
    console.log("=".repeat(50))

    // 테스트 1: ISO 코드 매칭 테스트
    const testIsoCode = options.isoCode || "15 09"
    console.log(`\n🔍 ISO 코드 "${testIsoCode}" 매칭 테스트...`)

    // ICF 코드를 ISO 코드로 변환하는 로직 테스트
    const mockIcfCodes = ["b730", "d550"] // 예시 ICF 코드
    const isoMatches = getIsoMatches(mockIcfCodes)
    
    console.log(`   ICF 코드: ${mockIcfCodes.join(", ")}`)
    console.log(`   매칭된 ISO 코드: ${isoMatches.map(m => m.isoCode).join(", ")}`)

    // 테스트 2: 데이터베이스에서 제품 조회
    console.log(`\n🔍 ISO 코드 "${testIsoCode}"로 제품 조회...`)

    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        iso_code,
        description,
        image_url,
        purchase_link,
        price,
        category,
        manufacturer,
        is_active
      `)
      .eq("iso_code", testIsoCode)
      .eq("is_active", true)
      .limit(10)

    if (error) {
      console.error(`   ❌ 오류: ${error.message}`)
      return
    }

    if (!products || products.length === 0) {
      console.log(`   ⚠️  ISO 코드 "${testIsoCode}"에 해당하는 제품이 없습니다.`)
      console.log(`\n   💡 사용 가능한 ISO 코드 확인:`)
      
      const { data: allProducts } = await supabase
        .from("products")
        .select("iso_code")
        .eq("is_active", true)
        .limit(100)

      if (allProducts) {
        const uniqueIsoCodes = [...new Set(allProducts.map(p => p.iso_code))]
        console.log(`   ${uniqueIsoCodes.join(", ")}`)
      }
      return
    }

    console.log(`   ✅ ${products.length}개 제품 조회 성공\n`)

    // 제품 상세 정보 출력
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`)
      console.log(`   ID: ${product.id}`)
      console.log(`   ISO 코드: ${product.iso_code}`)
      if (product.category) {
        console.log(`   카테고리: ${product.category}`)
      }
      if (product.manufacturer) {
        console.log(`   제조사: ${product.manufacturer}`)
      }
      if (product.description) {
        console.log(`   설명: ${product.description.substring(0, 50)}...`)
      }
      if (product.image_url) {
        console.log(`   이미지: ✅`)
      } else {
        console.log(`   이미지: ❌`)
      }
      if (product.purchase_link) {
        console.log(`   구매 링크: ✅`)
      } else {
        console.log(`   구매 링크: ❌`)
      }
      console.log("")
    })

    // 테스트 3: 추천 시스템 로직 테스트
    console.log("=".repeat(50))
    console.log("추천 시스템 로직 테스트")
    console.log("=".repeat(50))

    // ISO 코드별 제품 수 확인
    const { data: allProducts } = await supabase
      .from("products")
      .select("iso_code, category")
      .eq("is_active", true)

    if (allProducts) {
      const isoCodeCounts = allProducts.reduce((acc, p) => {
        acc[p.iso_code] = (acc[p.iso_code] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log(`\n📊 ISO 코드별 제품 수:`)
      Object.entries(isoCodeCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([isoCode, count]) => {
          console.log(`   ${isoCode}: ${count}개`)
        })

      const categoryCounts = allProducts.reduce((acc, p) => {
        const cat = p.category || "없음"
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log(`\n📦 카테고리별 제품 수:`)
      Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count}개`)
        })
    }

    console.log("\n" + "=".repeat(50))
    console.log("✅ 테스트 완료")
    console.log("=".repeat(50))
    console.log("\n💡 다음 단계:")
    console.log("   1. 실제 크롤링 실행: pnpm crawl:products --keyword '검색어' --iso-code '15 09' --platform ablelife")
    console.log("   2. 제품 확인: pnpm test:products")
    console.log("   3. 추천 시스템 테스트: pnpm test:api --iso-code '15 09'")
  } catch (error) {
    console.error("❌ 오류 발생:", error)
    process.exit(1)
  }
}

main()

