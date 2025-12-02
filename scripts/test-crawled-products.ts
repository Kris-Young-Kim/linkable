#!/usr/bin/env tsx
/**
 * 크롤링된 제품 확인 스크립트
 * 
 * 사용법:
 *   tsx scripts/test-crawled-products.ts
 *   tsx scripts/test-crawled-products.ts --limit 10
 *   tsx scripts/test-crawled-products.ts --category ablelife
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

interface CliOptions {
  limit?: number
  category?: string
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === "--category" && args[i + 1]) {
      options.category = args[i + 1]
      i++
    }
  }

  return options
}

async function main() {
  try {
    const options = parseArgs()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    console.log("\n" + "=".repeat(50))
    console.log("크롤링된 제품 확인")
    console.log("=".repeat(50))

    // 전체 제품 수 확인
    const { count: totalCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })

    const { count: activeCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    console.log(`\n📊 전체 통계:`)
    console.log(`   전체 제품 수: ${totalCount || 0}개`)
    console.log(`   활성 제품 수: ${activeCount || 0}개`)
    console.log(`   비활성 제품 수: ${(totalCount || 0) - (activeCount || 0)}개`)

    // 카테고리별 통계
    const { data: categoryData } = await supabase
      .from("products")
      .select("category")
      .not("category", "is", null)

    if (categoryData && categoryData.length > 0) {
      const categoryCounts = categoryData.reduce((acc, p) => {
        const cat = p.category || "unknown"
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log(`\n📦 카테고리별 통계:`)
      Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count}개`)
        })
    }

    // 최근 제품 조회
    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        iso_code,
        category,
        price,
        purchase_link,
        image_url,
        manufacturer,
        is_active,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false })

    if (options.category) {
      query = query.eq("category", options.category)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    } else {
      query = query.limit(20)
    }

    const { data: products, error } = await query

    if (error) {
      throw error
    }

    if (!products || products.length === 0) {
      console.log("\n⚠️  등록된 제품이 없습니다.")
      return
    }

    console.log(`\n📋 최근 제품 목록 (${products.length}개):`)
    console.log("=".repeat(50))

    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`)
      console.log(`   ID: ${product.id}`)
      console.log(`   ISO 코드: ${product.iso_code}`)
      if (product.category) {
        console.log(`   카테고리: ${product.category}`)
      }
      if (product.manufacturer) {
        console.log(`   제조사: ${product.manufacturer}`)
      }
      if (product.price) {
        console.log(`   가격: ${product.price.toLocaleString()}원`)
      }
      if (product.purchase_link) {
        console.log(`   구매 링크: ${product.purchase_link.substring(0, 50)}...`)
      } else {
        console.log(`   구매 링크: 없음`)
      }
      if (product.image_url) {
        console.log(`   이미지: 있음`)
      } else {
        console.log(`   이미지: 없음`)
      }
      console.log(`   상태: ${product.is_active ? "활성" : "비활성"}`)
      console.log(`   생성일: ${new Date(product.created_at).toLocaleString("ko-KR")}`)
      if (product.updated_at) {
        console.log(`   수정일: ${new Date(product.updated_at).toLocaleString("ko-KR")}`)
      }
    })

    // 데이터 품질 체크
    console.log("\n" + "=".repeat(50))
    console.log("데이터 품질 체크")
    console.log("=".repeat(50))

    const withImage = products.filter((p) => p.image_url).length
    const withLink = products.filter((p) => p.purchase_link).length
    const withPrice = products.filter((p) => p.price).length
    const withManufacturer = products.filter((p) => p.manufacturer).length

    console.log(`\n✅ 이미지 URL: ${withImage}/${products.length}개 (${Math.round((withImage / products.length) * 100)}%)`)
    console.log(`✅ 구매 링크: ${withLink}/${products.length}개 (${Math.round((withLink / products.length) * 100)}%)`)
    console.log(`✅ 가격 정보: ${withPrice}/${products.length}개 (${Math.round((withPrice / products.length) * 100)}%)`)
    console.log(`✅ 제조사 정보: ${withManufacturer}/${products.length}개 (${Math.round((withManufacturer / products.length) * 100)}%)`)

    console.log("\n" + "=".repeat(50))
  } catch (error) {
    console.error("❌ 오류 발생:", error)
    process.exit(1)
  }
}

main()

