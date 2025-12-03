#!/usr/bin/env tsx
/**
 * 웹 스크래핑 크롤러 통합 스크립트
 * 
 * 사용법:
 *   tsx scripts/crawlers/web-scraper.ts --keyword "무게조절 식기" --iso-code "15 09" --max 5
 *   tsx scripts/crawlers/web-scraper.ts --category "휠체어" --iso-code "12 22" --platform ablelife --max 10
 *   tsx scripts/crawlers/web-scraper.ts --categories "휠체어,워커,목발,보행보조" --iso-code "12 03" --platform ablelife --max 5
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

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { CoupangScraper } from "./coupang-scraper"
import { NaverScraper } from "./naver-scraper"
import { GenericScraper } from "./generic-scraper"
import { getEnabledSites, getSiteConfig, type SiteConfig } from "./site-config"
import type { ScraperOptions } from "./types"
import type { ProductInput } from "../../lib/integrations/product-sync"
import type { ProductSyncResult } from "../../lib/integrations/types"

interface CliOptions {
  keyword?: string
  category?: string // 카테고리 (예: "휠체어", "워커")
  categories?: string // 여러 카테고리 (쉼표로 구분, 예: "휠체어,워커,목발")
  isoCode?: string
  platform?: "coupang" | "naver" | "all" | string // 사이트 이름도 가능
  max?: number
  dryRun?: boolean
  listSites?: boolean // 지원 사이트 목록 보기
}

/**
 * 명령줄 인자 파싱
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    keyword: "",
    platform: "all",
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--keyword" && args[i + 1]) {
      options.keyword = args[i + 1]
      i++
    } else if (args[i] === "--category" && args[i + 1]) {
      options.category = args[i + 1]
      i++
    } else if (args[i] === "--categories" && args[i + 1]) {
      options.categories = args[i + 1]
      i++
    } else if (args[i] === "--iso-code" && args[i + 1]) {
      options.isoCode = args[i + 1]
      i++
    } else if (args[i] === "--platform" && args[i + 1]) {
      options.platform = args[i + 1] as "coupang" | "naver" | "all"
      i++
    } else if (args[i] === "--max" && args[i + 1]) {
      options.max = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === "--dry-run") {
      options.dryRun = true
    } else if (args[i] === "--list-sites") {
      options.listSites = true
    }
  }

  if (!options.listSites && !options.keyword && !options.category && !options.categories) {
    throw new Error("--keyword, --category, 또는 --categories 옵션이 필요합니다. 또는 --list-sites로 지원 사이트 목록을 확인하세요.")
  }

  return options
}

/**
 * ISO 코드 검증
 */
function isValidIsoCodeFormat(isoCode: string): boolean {
  const normalized = isoCode.trim()
  const pattern = /^\d{2}\s\d{2}$/
  return pattern.test(normalized)
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
 * 메인 실행 함수
 */
async function main() {
  try {
    const options = parseArgs()

    // 지원 사이트 목록 출력
    if (options.listSites) {
      console.log("\n" + "=".repeat(50))
      console.log("지원하는 크롤링 사이트 목록")
      console.log("=".repeat(50))
      const sites = getEnabledSites()
      sites.forEach((site, index) => {
        console.log(`${index + 1}. ${site.name} (${site.baseUrl})`)
        if (site.notes) {
          console.log(`   ${site.notes}`)
        }
      })
      console.log("\n사용법:")
      console.log('  pnpm crawl:products --keyword "검색어" --platform ablelife')
      console.log('  pnpm crawl:products --keyword "검색어" --platform all')
      return
    }

    // ISO 코드 검증
    if (options.isoCode && !isValidIsoCodeFormat(options.isoCode)) {
      console.warn(
        `⚠️  ISO 코드 형식이 올바르지 않습니다: ${options.isoCode}`
      )
      console.warn("올바른 형식: 'XX XX' (예: '15 09')")
      console.warn("계속 진행하지만 상품은 추천에 사용되지 않을 수 있습니다.\n")
    }

    if (!options.isoCode) {
      console.warn(
        "⚠️  ISO 코드가 지정되지 않았습니다. 상품은 등록되지만 추천에 사용되지 않을 수 있습니다.\n"
      )
    }

    // 여러 카테고리 처리
    const categories = options.categories 
      ? options.categories.split(",").map(c => c.trim())
      : options.category 
        ? [options.category]
        : []

    const allProducts: ProductInput[] = []

    // 카테고리별 크롤링
    if (categories.length > 0) {
      for (const category of categories) {
        console.log(`\n📂 카테고리 "${category}" 크롤링 시작...`)
        
        const scraperOptions: ScraperOptions = {
          category,
          isoCode: options.isoCode,
          maxResults: options.max || 10,
          delay: 1000,
        }

        // 보조기기 전문 쇼핑몰 크롤링
        if (options.platform === "all" || (options.platform !== "coupang" && options.platform !== "naver")) {
          const sites = options.platform === "all" 
            ? getEnabledSites() 
            : (() => {
                if (!options.platform) return []
                const config = getSiteConfig(options.platform)
                return config ? [config] : []
              })()

          for (const site of sites) {
            console.log(`\n🛒 ${site.name} (${category}) 크롤링 시작...`)
            const scraper = new GenericScraper(site)
            try {
              const result = await scraper.scrape(scraperOptions)
              if (result.success && result.products.length > 0) {
                console.log(`✅ ${site.name} (${category}): ${result.products.length}개 상품 수집`)
                allProducts.push(
                  ...result.products.map((p) => ({
                    ...p,
                    iso_code: options.isoCode || "00 00",
                  }))
                )
              } else if (result.products.length === 0) {
                console.warn(`⚠️  ${site.name} (${category}): 수집된 상품이 없습니다.`)
              }
              if (result.errors && result.errors.length > 0) {
                console.warn(`⚠️  ${site.name} (${category}) 에러: ${result.errors.join(", ")}`)
              }
            } catch (error) {
              console.error(`❌ ${site.name} (${category}) 크롤링 중 오류:`, error)
            } finally {
              await scraper.close()
            }
          }
        }
      }
    }

    // 키워드 기반 크롤링 (기존 로직)
    if (options.keyword) {
      const scraperOptions: ScraperOptions = {
        keyword: options.keyword,
        isoCode: options.isoCode,
        maxResults: options.max || 10,
        delay: 1000, // 1초 간격
      }

      // 쿠팡 크롤링
      if (options.platform === "coupang" || options.platform === "all") {
        console.log("\n🛒 쿠팡 크롤링 시작...")
        const coupangScraper = new CoupangScraper()
        try {
          const result = await coupangScraper.scrape(scraperOptions)
          if (result.success && result.products.length > 0) {
            console.log(`✅ 쿠팡: ${result.products.length}개 상품 수집`)
            allProducts.push(
              ...result.products.map((p) => ({
                ...p,
                iso_code: options.isoCode || "00 00", // 기본값
              }))
            )
          } else if (result.products.length === 0) {
            console.warn("⚠️  쿠팡: 수집된 상품이 없습니다.")
          }
          if (result.errors && result.errors.length > 0) {
            console.warn(`⚠️  쿠팡 에러: ${result.errors.join(", ")}`)
          }
        } catch (error) {
          console.error("❌ 쿠팡 크롤링 중 오류:", error)
        } finally {
          await coupangScraper.close()
        }
      }

      // 네이버 쇼핑 크롤링
      if (options.platform === "naver" || options.platform === "all") {
        console.log("\n🛒 네이버 쇼핑 크롤링 시작...")
        const naverScraper = new NaverScraper()
        try {
          const result = await naverScraper.scrape(scraperOptions)
          if (result.success && result.products.length > 0) {
            console.log(`✅ 네이버: ${result.products.length}개 상품 수집`)
            allProducts.push(
              ...result.products.map((p) => ({
                ...p,
                iso_code: options.isoCode || "00 00",
              }))
            )
          } else if (result.products.length === 0) {
            console.warn("⚠️  네이버: 수집된 상품이 없습니다.")
          }
          if (result.errors && result.errors.length > 0) {
            console.warn(`⚠️  네이버 에러: ${result.errors.join(", ")}`)
          }
        } catch (error) {
          console.error("❌ 네이버 쇼핑 크롤링 중 오류:", error)
        } finally {
          await naverScraper.close()
        }
      }
    }

    // 보조기기 전문 쇼핑몰 크롤링 (키워드 기반)
    if (options.keyword && (options.platform === "all" || options.platform !== "coupang" && options.platform !== "naver")) {
      const scraperOptions: ScraperOptions = {
        keyword: options.keyword,
        isoCode: options.isoCode,
        maxResults: options.max || 10,
        delay: 1000,
      }

      const sites = options.platform === "all" 
        ? getEnabledSites() 
        : (() => {
            if (!options.platform) return []
            const config = getSiteConfig(options.platform)
            return config ? [config] : []
          })()

      for (const site of sites) {
        console.log(`\n🛒 ${site.name} 크롤링 시작...`)
        const scraper = new GenericScraper(site)
        try {
          const result = await scraper.scrape(scraperOptions)
          if (result.success && result.products.length > 0) {
            console.log(`✅ ${site.name}: ${result.products.length}개 상품 수집`)
            allProducts.push(
              ...result.products.map((p) => ({
                ...p,
                iso_code: options.isoCode || "00 00",
              }))
            )
          } else if (result.products.length === 0) {
            console.warn(`⚠️  ${site.name}: 수집된 상품이 없습니다.`)
          }
          if (result.errors && result.errors.length > 0) {
            console.warn(`⚠️  ${site.name} 에러: ${result.errors.join(", ")}`)
          }
        } catch (error) {
          console.error(`❌ ${site.name} 크롤링 중 오류:`, error)
        } finally {
          await scraper.close()
        }
      }
    }

    if (allProducts.length === 0) {
      console.log("\n❌ 수집된 상품이 없습니다.")
      return
    }

    console.log(`\n📊 총 ${allProducts.length}개 상품 수집 완료`)

    if (options.dryRun) {
      console.log("\n🔍 Dry-run 모드: 실제로 등록하지 않습니다.\n")
      allProducts.forEach((p, i) => {
        console.log(
          `${i + 1}. ${p.name} (${p.price?.toLocaleString() || "가격 없음"}원) - ${p.purchase_link}`
        )
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
    console.log("\n🔌 데이터베이스 연결 확인 중...")
    const { error: testError } = await supabase.from("products").select("id").limit(1)

    if (testError) {
      console.error(`❌ 데이터베이스 연결 실패: ${testError.message}`)
      console.error(`   Supabase URL: ${supabaseUrl}`)
      console.error(`   Service Role Key: ${serviceRoleKey ? "설정됨" : "설정되지 않음"}`)
      throw new Error(`데이터베이스 연결 실패: ${testError.message}`)
    }

    console.log("✅ 데이터베이스 연결 성공")

    // 데이터베이스에 등록
    console.log(`\n📤 ${allProducts.length}개 상품을 데이터베이스에 등록 중...\n`)
    const result = await syncProductsLocal(supabase, allProducts)

    console.log("\n" + "=".repeat(50))
    console.log("📊 등록 결과")
    console.log("=".repeat(50))
    console.log(`✅ 생성: ${result.created}개`)
    console.log(`🔄 업데이트: ${result.updated}개`)
    if (result.failed > 0) {
      console.log(`❌ 실패: ${result.failed}개`)
      if (result.errors) {
        result.errors.forEach((e) => {
          console.log(`   - ${e.productId}: ${e.error}`)
        })
      }
    }
    console.log("=".repeat(50))
    
    // 최종 확인: 실제로 저장되었는지 확인
    if (result.created > 0 || result.updated > 0) {
      console.log("\n🔍 저장 확인 중...")
      const { count: savedCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
      
      console.log(`✅ 데이터베이스에 활성 제품 ${savedCount || 0}개가 저장되어 있습니다.`)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error("❌ 오류 발생:", errorMessage)
    if (err instanceof Error && err.stack) {
      console.error("스택 트레이스:", err.stack)
    }
    process.exit(1)
  }
}

main()
