import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { getSiteConfig } from "@/scripts/crawlers/site-config"
import { GenericScraper } from "@/scripts/crawlers/generic-scraper"
import { CoupangScraper } from "@/scripts/crawlers/coupang-scraper"
import { NaverScraper } from "@/scripts/crawlers/naver-scraper"
import type { ScraperOptions } from "@/scripts/crawlers/types"
import { syncProducts } from "@/lib/integrations/product-sync"
import type { ProductInput } from "@/lib/integrations/product-sync"
import { createCoupangClient } from "@/lib/integrations/coupang"

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * 크롤링 실행 API
 * 실제로 크롤링을 실행하고 결과를 반환합니다.
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    keyword?: string
    category?: string
    categories?: string
    isoCode?: string
    platform?: string
    max?: number
    productUrl?: string // 개별 제품 상세 페이지 URL
    preview?: boolean // 미리보기 모드 (DB 저장 안 함)
    selectedProducts?: string[] // 선택한 상품 ID 목록 (등록용)
  }

  // 개별 제품 URL 크롤링
  if (body.productUrl) {
    try {
      // URL에서 플랫폼 추출
      let platform = body.platform || "wheelopia"
      if (body.productUrl.includes("wheelopia.co.kr")) {
        platform = "wheelopia"
      } else if (body.productUrl.includes("ablelife.co.kr")) {
        platform = "ablelife"
      } else if (body.productUrl.includes("coupang.com")) {
        platform = "coupang"
      } else if (body.productUrl.includes("shopping.naver.com")) {
        platform = "naver"
      } else if (body.productUrl.includes("mktop.kr")) {
        platform = "mktop"
      } else if (body.productUrl.includes("plusagel.co.kr") || body.productUrl.includes("plusagel")) {
        platform = "plusagel"
      }

      const siteConfig = getSiteConfig(platform, body.productUrl)
      if (!siteConfig) {
        return NextResponse.json({ error: `지원하지 않는 플랫폼: ${platform}` }, { status: 400 })
      }

      const scraper = new GenericScraper(siteConfig)
      try {
        console.log(`[Admin Products Crawl] 개별 제품 크롤링: ${body.productUrl}`)
        const product = await scraper.scrapeProductDetail(body.productUrl)
        
        if (!product) {
          return NextResponse.json({
            success: false,
            message: "제품 정보를 추출할 수 없습니다.",
            created: 0,
            updated: 0,
            failed: 1,
            total: 0,
          })
        }

        // ISO 코드 자동 매칭
        const productName = product.name.toLowerCase()
        let isoCode = body.isoCode || "00 00"
        
        if (isoCode === "00 00") {
          if (productName.includes("전동") && productName.includes("휠체어")) {
            isoCode = "12 23"
          } else if (productName.includes("휠체어")) {
            isoCode = "12 22"
          } else if (productName.includes("스탠딩")) {
            isoCode = "12 23" // 스탠딩 휠체어는 전동휠체어
          } else if (productName.includes("워커") || productName.includes("보행기")) {
            isoCode = "12 06"
          } else if (productName.includes("식기")) {
            isoCode = "15 09"
          }
        }

        const productInput: ProductInput = {
          ...product,
          iso_code: isoCode,
        }

        // 이미지 URL 로깅
        console.log(`[Admin Products Crawl] 크롤링된 제품 정보:`, {
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          purchase_link: product.purchase_link,
        })

        const result = await syncProducts([productInput], { validateLinks: false })

        return NextResponse.json({
          success: true,
          message: `제품 크롤링 완료: ${result.created > 0 ? "생성" : "업데이트"}`,
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          total: 1,
          product: {
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            purchase_link: product.purchase_link,
          },
        })
      } finally {
        await scraper.close()
      }
    } catch (error) {
      console.error("[Admin Products Crawl] 개별 제품 크롤링 오류:", error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "제품 크롤링 실패",
          created: 0,
          updated: 0,
          failed: 1,
          total: 0,
        },
        { status: 500 }
      )
    }
  }

  if (!body.keyword && !body.category && !body.categories) {
    return NextResponse.json({ error: "키워드, 카테고리 또는 제품 URL이 필요합니다." }, { status: 400 })
  }

  try {
    const allProducts: ProductInput[] = []
    const errors: string[] = []

    // 여러 카테고리 처리
    let categories: string[] = []
    
    if (body.categories) {
      categories = body.categories.split(",").map((c) => c.trim())
    } else if (body.category) {
      categories = [body.category]
    }
    
    // "전체" 또는 "all" 옵션 처리
    if (body.platform && body.platform !== "all" && body.platform !== "coupang" && body.platform !== "naver") {
      const siteConfig = getSiteConfig(body.platform)
      if (siteConfig && siteConfig.categoryUrls) {
        // 카테고리가 "전체", "all", 또는 비어있으면 모든 카테고리 사용
        if (categories.length === 0 || categories.includes("전체") || categories.includes("all") || categories.includes("ALL")) {
          categories = Object.keys(siteConfig.categoryUrls).filter(
            (key) => key !== "휠체어" // 기본값 제외 (중복 방지)
          )
          console.log(`[Admin Products Crawl] 전체 카테고리 크롤링: ${categories.length}개 카테고리`)
        }
      }
    }

    // 카테고리별 크롤링
    if (categories.length > 0) {
      for (const category of categories) {
        const scraperOptions: ScraperOptions = {
          category,
          isoCode: body.isoCode,
          maxResults: body.max || 10,
          delay: 1000,
        }

        // 플랫폼별 크롤링
        if (body.platform === "coupang") {
          const scraper = new CoupangScraper()
          try {
            const result = await scraper.scrape(scraperOptions)
            if (result.success && result.products.length > 0) {
              allProducts.push(
                ...result.products.map((p) => ({
                  ...p,
                  iso_code: body.isoCode || "00 00",
                }))
              )
            }
            if (result.errors) {
              errors.push(...result.errors)
            }
          } finally {
            await scraper.close()
          }
        } else if (body.platform === "naver") {
          const scraper = new NaverScraper()
          try {
            const result = await scraper.scrape(scraperOptions)
            if (result.success && result.products.length > 0) {
              allProducts.push(
                ...result.products.map((p) => ({
                  ...p,
                  iso_code: body.isoCode || "00 00",
                }))
              )
            }
            if (result.errors) {
              errors.push(...result.errors)
            }
          } finally {
            await scraper.close()
          }
        } else if (body.platform && body.platform !== "all") {
          // 기타 플랫폼 (GenericScraper 사용)
          const siteConfig = getSiteConfig(body.platform)
          if (siteConfig) {
            const scraper = new GenericScraper(siteConfig)
            try {
              console.log(`[Admin Products Crawl] ${body.platform} 크롤링 시작: 카테고리 "${category}"`)
              const result = await scraper.scrape(scraperOptions)
              console.log(`[Admin Products Crawl] ${body.platform} 크롤링 결과: ${result.products.length}개 상품 수집`)
              if (result.success && result.products.length > 0) {
                allProducts.push(
                  ...result.products.map((p) => ({
                    ...p,
                    iso_code: body.isoCode || "00 00",
                  }))
                )
              }
              if (result.errors) {
                errors.push(...result.errors)
              }
            } catch (error) {
              console.error(`[Admin Products Crawl] ${body.platform} 크롤링 오류:`, error)
              errors.push(`${body.platform} 크롤링 실패: ${error instanceof Error ? error.message : String(error)}`)
            } finally {
              await scraper.close()
            }
          } else {
            // site-config에 없으면 기본 설정 생성 시도 (baseUrl이 필요하므로 경고만)
            console.warn(`[Admin Products Crawl] 알 수 없는 플랫폼: ${body.platform}. 카테고리/키워드 크롤링은 개별 제품 URL 크롤링만 지원됩니다.`)
            errors.push(`지원하지 않는 플랫폼: ${body.platform} (개별 제품 URL 크롤링만 지원)`)
          }
        }
      }
    }

    // 키워드 기반 크롤링
    if (body.keyword) {
      const scraperOptions: ScraperOptions = {
        keyword: body.keyword,
        isoCode: body.isoCode,
        maxResults: body.max || 10,
        delay: 1000,
      }

      // 쿠팡, 네이버는 키워드 검색 지원
      if (body.platform === "coupang" || body.platform === "all") {
        // 먼저 쿠팡 파트너스 API 시도
        const apiClient = createCoupangClient()
        let apiSuccess = false

        if (apiClient) {
          try {
            console.log(`[Admin Products Crawl] 쿠팡 파트너스 API 사용: ${body.keyword}`)
            const apiProducts = await apiClient.searchProducts(body.keyword, body.max || 10)
            
            if (apiProducts.length > 0) {
              // 쿠팡 API 응답을 ScrapedProduct 형식으로 변환
              const convertedProducts: ProductInput[] = apiProducts.map((p) => {
                // 제휴 링크 생성
                const affiliateLink = apiClient.generateAffiliateLink(p.productUrl)
                
                return {
                  name: p.productName,
                  purchase_link: affiliateLink,
                  price: p.productPrice,
                  image_url: p.productImage,
                  description: p.categoryName || null,
                  manufacturer: null,
                  category: "coupang",
                  iso_code: body.isoCode || "00 00",
                }
              })
              
              allProducts.push(...convertedProducts)
              apiSuccess = true
              console.log(`[Admin Products Crawl] 쿠팡 API 성공: ${apiProducts.length}개 상품 수집`)
            }
          } catch (apiError) {
            console.warn(`[Admin Products Crawl] 쿠팡 API 실패, 웹 스크래핑으로 폴백:`, apiError)
            errors.push(`쿠팡 API 실패: ${apiError instanceof Error ? apiError.message : String(apiError)}`)
          }
        }

        // API 실패 시 웹 스크래핑으로 폴백
        if (!apiSuccess) {
          console.log(`[Admin Products Crawl] 쿠팡 웹 스크래핑 사용: ${body.keyword}`)
          const scraper = new CoupangScraper()
          try {
            const result = await scraper.scrape(scraperOptions)
            if (result.success && result.products.length > 0) {
              allProducts.push(
                ...result.products.map((p) => ({
                  ...p,
                  iso_code: body.isoCode || "00 00",
                }))
              )
            }
            if (result.errors) {
              errors.push(...result.errors)
            }
          } finally {
            await scraper.close()
          }
        }
      }

      if (body.platform === "naver" || body.platform === "all") {
        const scraper = new NaverScraper()
        try {
          const result = await scraper.scrape(scraperOptions)
          if (result.success && result.products.length > 0) {
            allProducts.push(
              ...result.products.map((p) => ({
                ...p,
                iso_code: body.isoCode || "00 00",
              }))
            )
          }
          if (result.errors) {
            errors.push(...result.errors)
          }
        } finally {
          await scraper.close()
        }
      }

      // 기타 플랫폼은 키워드를 카테고리로 사용 (키워드 검색 미지원 사이트)
      if (body.platform && body.platform !== "all" && body.platform !== "coupang" && body.platform !== "naver") {
        const siteConfig = getSiteConfig(body.platform)
        if (siteConfig) {
          // 키워드를 카테고리로 사용
          const scraperOptions: ScraperOptions = {
            category: body.keyword, // 키워드를 카테고리로 사용
            isoCode: body.isoCode,
            maxResults: body.max || 10,
            delay: 1000,
          }
          const scraper = new GenericScraper(siteConfig)
          try {
            const result = await scraper.scrape(scraperOptions)
            if (result.success && result.products.length > 0) {
              allProducts.push(
                ...result.products.map((p) => ({
                  ...p,
                  iso_code: body.isoCode || "00 00",
                }))
              )
            }
            if (result.errors) {
              errors.push(...result.errors)
            }
          } catch (error) {
            console.error(`[Admin Products Crawl] ${body.platform} 크롤링 오류:`, error)
            errors.push(`${body.platform} 크롤링 실패: ${error instanceof Error ? error.message : String(error)}`)
          } finally {
            await scraper.close()
          }
        } else {
          errors.push(`지원하지 않는 플랫폼: ${body.platform}`)
        }
      }
    }

    if (allProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "수집된 상품이 없습니다.",
        created: 0,
        updated: 0,
        failed: 0,
        total: 0,
        errors: errors.length > 0 ? errors : undefined,
        products: [],
      })
    }

    // 미리보기 모드: DB 저장하지 않고 결과만 반환
    if (body.preview) {
      return NextResponse.json({
        success: true,
        message: `${allProducts.length}개 상품 수집 완료 (미리보기)`,
        created: 0,
        updated: 0,
        failed: 0,
        total: allProducts.length,
        products: allProducts.map((p, idx) => ({
          id: `preview-${idx}`,
          ...p,
        })),
        errors: errors.length > 0 ? errors : undefined,
        preview: true,
      })
    }

    // 선택한 상품만 필터링 (미리보기 모드에서 선택한 상품만 등록)
    let productsToSync = allProducts
    if (body.selectedProducts && body.selectedProducts.length > 0) {
      // selectedProducts는 preview-{index} 형식의 ID 배열
      const selectedIndices = body.selectedProducts
        .map((id) => {
          const match = id.match(/^preview-(\d+)$/)
          return match ? parseInt(match[1], 10) : -1
        })
        .filter((idx) => idx >= 0 && idx < allProducts.length)
      
      productsToSync = allProducts.filter((_, idx) => selectedIndices.includes(idx))
    }

    // 데이터베이스에 저장
    const result = await syncProducts(productsToSync, { validateLinks: false })

    return NextResponse.json({
      success: true,
      message: `크롤링 완료: ${result.created}개 생성, ${result.updated}개 업데이트`,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      total: productsToSync.length,
      errors: result.errors?.length ? result.errors.map((e) => `${e.productId}: ${e.error}`) : undefined,
    })
  } catch (error) {
    console.error("[Admin Products Crawl] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "크롤링 실행 실패",
        created: 0,
        updated: 0,
        failed: 0,
        total: 0,
      },
      { status: 500 }
    )
  }
}

