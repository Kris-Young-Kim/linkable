/**
 * 간단한 HTTP 기반 스크래퍼 (axios + cheerio)
 * JavaScript 렌더링이 필요 없는 정적 HTML 사이트용
 * Playwright보다 가볍고 빠름
 */

import axios from "axios"
import * as cheerio from "cheerio"
import type { ScrapedProduct } from "./types"
import { parsePrice, normalizeUrl } from "./utils"
import type { SiteConfig } from "./site-config"

export interface SimpleScrapeResult {
  url: string
  title: string
  headings: Array<{ tag: string; text: string }>
  links: Array<{ text: string; href: string }>
  product?: ScrapedProduct
  scrapedAt: string
}

export class SimpleScraper {
  private siteConfig: SiteConfig

  constructor(siteConfig: SiteConfig) {
    this.siteConfig = siteConfig
  }

  /**
   * 개별 제품 상세 페이지 스크래핑
   */
  async scrapeProductDetail(productUrl: string): Promise<ScrapedProduct | null> {
    try {
      console.log(`[SimpleScraper] 요청 중: ${productUrl}`)

      // 1) HTML 가져오기
      const response = await axios.get(productUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Charset": "UTF-8",
        },
        responseType: "arraybuffer", // 바이너리로 받아서 인코딩 처리
        timeout: 30000, // 30초 타임아웃
      })

      // UTF-8로 디코딩 (한글 인코딩 문제 해결)
      const html = Buffer.from(response.data).toString("utf-8")

      // 2) Cheerio로 파싱
      const $ = cheerio.load(html, { decodeEntities: false })

      // 3) 제품 정보 추출
      let productName = ""
      let price: number | null = null
      let imageUrl: string | null = null
      let description: string | null = null

      // 제품명 추출
      for (const selector of this.siteConfig.selectors.productName) {
        const element = $(selector).first()
        if (element.length > 0) {
          productName = element.text().trim()
          if (productName) {
            console.log(`✅ 제품명 발견: ${productName.substring(0, 50)}... (셀렉터: ${selector})`)
            break
          }
        }
      }

      // 가격 추출
      for (const selector of this.siteConfig.selectors.productPrice) {
        const element = $(selector).first()
        if (element.length > 0) {
          const priceText = element.text().trim()
          price = parsePrice(priceText)
          if (price) {
            console.log(`✅ 가격 발견: ${price.toLocaleString()}원 (셀렉터: ${selector})`)
            break
          }
        }
      }

      // 이미지 URL 추출
      for (const selector of this.siteConfig.selectors.productImage) {
        const element = $(selector).first()
        if (element.length > 0) {
          imageUrl =
            element.attr("src") ||
            element.attr("data-src") ||
            element.attr("data-lazy-src") ||
            null
          if (imageUrl) {
            imageUrl = normalizeUrl(imageUrl, this.siteConfig.baseUrl)
            console.log(`✅ 이미지 발견: ${imageUrl.substring(0, 60)}... (셀렉터: ${selector})`)
            break
          }
        }
      }

      // 메타 태그에서 이미지 찾기 (og:image, twitter:image)
      if (!imageUrl) {
        const ogImage = $('meta[property="og:image"]').attr("content")
        const twitterImage = $('meta[name="twitter:image"]').attr("content")
        if (ogImage) {
          imageUrl = normalizeUrl(ogImage, this.siteConfig.baseUrl)
          console.log(`✅ 메타 태그에서 이미지 발견: ${imageUrl.substring(0, 60)}...`)
        } else if (twitterImage) {
          imageUrl = normalizeUrl(twitterImage, this.siteConfig.baseUrl)
          console.log(`✅ 트위터 메타 태그에서 이미지 발견: ${imageUrl.substring(0, 60)}...`)
        }
      }

      // 설명 추출 (meta description 또는 첫 번째 p 태그)
      const metaDescription = $('meta[name="description"]').attr("content")
      if (metaDescription) {
        description = metaDescription.trim()
      } else {
        const firstParagraph = $("p").first().text().trim()
        if (firstParagraph && firstParagraph.length > 20) {
          description = firstParagraph.substring(0, 500) // 최대 500자
        }
      }

      if (!productName) {
        console.warn(`⚠️  제품명을 찾을 수 없습니다: ${productUrl}`)
        return null
      }

      const product: ScrapedProduct = {
        id: productUrl, // URL을 임시 ID로 사용
        name: productName,
        price,
        purchase_link: productUrl,
        image_url: imageUrl,
        description: description || productName,
        manufacturer: null,
        category: null,
      }

      console.log(`✅ 제품 정보 추출 완료: ${productName}`)
      return product
    } catch (error) {
      console.error(`[SimpleScraper] 스크래핑 오류:`, error)
      if (axios.isAxiosError(error)) {
        console.error(`  상태 코드: ${error.response?.status}`)
        console.error(`  메시지: ${error.message}`)
      }
      return null
    }
  }

  /**
   * 페이지 기본 정보 추출 (디버깅/분석용)
   */
  async scrapePageInfo(url: string): Promise<SimpleScrapeResult> {
    try {
      console.log(`[SimpleScraper] 페이지 정보 추출 중: ${url}`)

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Charset": "UTF-8",
        },
        responseType: "arraybuffer", // 바이너리로 받아서 인코딩 처리
        timeout: 30000,
      })

      // UTF-8로 디코딩 (한글 인코딩 문제 해결)
      const html = Buffer.from(response.data).toString("utf-8")
      const $ = cheerio.load(html, { decodeEntities: false })

      // 페이지 제목
      const title = $("title").text().trim()

      // 주요 헤딩들 (H1 ~ H3)
      const headings: Array<{ tag: string; text: string }> = []
      $("h1, h2, h3").each((i, el) => {
        headings.push({
          tag: el.tagName,
          text: $(el).text().trim(),
        })
      })

      // 상위 20개 링크
      const links: Array<{ text: string; href: string }> = []
      $("a")
        .slice(0, 20)
        .each((i, el) => {
          const text = $(el).text().trim()
          const href = $(el).attr("href")
          if (href) {
            links.push({ text, href: normalizeUrl(href, this.siteConfig.baseUrl) })
          }
        })

      // 제품 정보도 함께 추출 시도
      const product = await this.scrapeProductDetail(url)

      const result: SimpleScrapeResult = {
        url,
        title,
        headings,
        links,
        product: product || undefined,
        scrapedAt: new Date().toISOString(),
      }

      return result
    } catch (error) {
      console.error(`[SimpleScraper] 페이지 정보 추출 오류:`, error)
      throw error
    }
  }

  /**
   * 웹사이트 URL에서 제품 목록 추출
   * 직접 URL을 제공하거나 검색 옵션을 사용할 수 있습니다.
   */
  async scrapeProductList(options: {
    url?: string // 직접 URL 제공 (우선 사용)
    keyword?: string
    category?: string
    max?: number
  }): Promise<ScrapedProduct[]> {
    try {
      // 직접 URL이 제공되면 사용, 없으면 검색 URL 생성
      const targetUrl = options.url || this.buildSearchUrl(options)
      console.log(`[SimpleScraper] 제품 목록 크롤링: ${targetUrl}`)

      const response = await axios.get(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Charset": "UTF-8",
        },
        responseType: "arraybuffer", // 바이너리로 받아서 인코딩 처리
        timeout: 30000,
      })

      // UTF-8로 디코딩 (한글 인코딩 문제 해결)
      const html = Buffer.from(response.data).toString("utf-8")
      const $ = cheerio.load(html, { decodeEntities: false })

      const products: ScrapedProduct[] = []

      // 상품 목록 찾기
      for (const selector of this.siteConfig.selectors.productList) {
        const elements = $(selector)
        if (elements.length > 0) {
          console.log(`✅ 상품 목록 발견: ${elements.length}개 (셀렉터: ${selector})`)

          // 실제 제품 링크가 있는 요소만 필터링 (카테고리 링크 제외)
          let productElements = elements.filter((i, el) => {
            const $el = $(el)
            // goods_view.php 링크가 있는지 확인
            const hasProductLink = $el.find("a[href*='goods_view.php']").length > 0
            return hasProductLink
          })

          if (productElements.length === 0) {
            console.log(`⚠️  실제 제품 링크를 찾을 수 없습니다. 모든 요소를 시도합니다...`)
            // 필터링 실패 시 원래 요소 사용
            productElements = elements
          } else {
            console.log(`✅ 실제 제품 링크 발견: ${productElements.length}개`)
          }

          productElements.slice(0, options.max || 20).each((i, el) => {
            try {
              const $el = $(el)

              // 링크 먼저 확인 (제품 링크가 있는지)
              let link = ""
              for (const linkSelector of this.siteConfig.selectors.productLink) {
                const linkEl = $el.find(linkSelector).first()
                if (linkEl.length === 0) {
                  const parentLinkEl = $el.closest("tr, li, div").find(linkSelector).first()
                  if (parentLinkEl.length > 0) {
                    link = parentLinkEl.attr("href") || ""
                    break
                  }
                } else {
                  link = linkEl.attr("href") || ""
                  break
                }
              }

              // goods_view.php 링크가 아니면 스킵
              if (link && !link.includes("goods_view.php")) {
                return // continue와 동일
              }

              // 제품명
              let name = ""
              
              // 먼저 링크 텍스트를 제품명으로 시도
              if (link) {
                const linkEl = $el.find(`a[href*='goods_view.php']`).first()
                if (linkEl.length > 0) {
                  name = linkEl.text().trim()
                }
              }
              
              // product_box 내부에서 제품명 찾기 (휠로피아 특화)
              if (!name) {
                const productBox = $el.find(".product_box").first()
                if (productBox.length > 0) {
                  // product_box 내부의 모든 텍스트를 가져오되, 링크와 이미지 제외
                  const productBoxClone = productBox.clone()
                  productBoxClone.find("a, img").remove()
                  const boxText = productBoxClone.text().trim()
                  // 의미있는 텍스트만 추출 (너무 짧거나 숫자만 있는 것은 제외)
                  if (boxText && boxText.length > 2 && !/^\d+$/.test(boxText)) {
                    name = boxText.split("\n")[0].trim() // 첫 번째 줄만 사용
                  }
                }
              }
              
              // 제품명 셀렉터로 찾기
              if (!name) {
                for (const nameSelector of this.siteConfig.selectors.productName) {
                  const nameEl = $el.find(nameSelector).first()
                  if (nameEl.length === 0) {
                    // 부모 요소에서 찾기
                    const parentNameEl = $el.closest("tr, li, div").find(nameSelector).first()
                    if (parentNameEl.length > 0) {
                      name = parentNameEl.text().trim()
                      if (name) break
                    }
                  } else {
                    name = nameEl.text().trim()
                    if (name) break
                  }
                }
              }
              
              // td 내부의 모든 텍스트에서 제품명 찾기 (마지막 시도)
              if (!name) {
                const allText = $el.text().trim()
                const lines = allText.split("\n").map(line => line.trim()).filter(line => line.length > 0)
                // 의미있는 텍스트 라인 찾기 (링크나 숫자만 있는 라인 제외)
                for (const line of lines) {
                  if (line.length > 3 && !/^[\d\s,원]+$/.test(line) && !line.includes("goods_view")) {
                    name = line
                    break
                  }
                }
              }

              // 가격
              let price: number | null = null
              for (const priceSelector of this.siteConfig.selectors.productPrice) {
                const priceEl = $el.find(priceSelector).first()
                if (priceEl.length === 0) {
                  const parentPriceEl = $el.closest("tr, li, div").find(priceSelector).first()
                  if (parentPriceEl.length > 0) {
                    price = parsePrice(parentPriceEl.text().trim())
                    if (price) break
                  }
                } else {
                  price = parsePrice(priceEl.text().trim())
                  if (price) break
                }
              }

              // 이미지
              let imageUrl: string | null = null
              for (const imageSelector of this.siteConfig.selectors.productImage) {
                const imageEl = $el.find(imageSelector).first()
                if (imageEl.length > 0) {
                  imageUrl =
                    imageEl.attr("src") ||
                    imageEl.attr("data-src") ||
                    imageEl.attr("data-lazy-src") ||
                    null
                  if (imageUrl) {
                    imageUrl = normalizeUrl(imageUrl, this.siteConfig.baseUrl)
                    break
                  }
                }
              }

              // 제품명과 링크가 모두 있어야 제품으로 인정
              if (name && link && link.includes("goods_view.php")) {
                products.push({
                  id: link,
                  name: name.trim(),
                  price,
                  purchase_link: normalizeUrl(link, this.siteConfig.baseUrl),
                  image_url: imageUrl,
                  description: name,
                  manufacturer: null,
                  category: null,
                })
              }
            } catch (err) {
              console.warn(`[SimpleScraper] 제품 추출 오류:`, err)
            }
          })

          if (products.length > 0) {
            break // 첫 번째로 작동하는 셀렉터 사용
          }
        }
      }

      console.log(`✅ 제품 목록 추출 완료: ${products.length}개 제품`)
      return products
    } catch (error) {
      console.error(`[SimpleScraper] 제품 목록 크롤링 오류:`, error)
      return []
    }
  }

  /**
   * 검색 결과 페이지에서 제품 목록 추출 (하위 호환성)
   * @deprecated scrapeProductList를 사용하세요
   */
  async scrapeSearchResults(options: {
    keyword?: string
    category?: string
    max?: number
  }): Promise<ScrapedProduct[]> {
    return this.scrapeProductList(options)
  }

  /**
   * 검색 URL 생성
   */
  private buildSearchUrl(options: { keyword?: string; category?: string }): string {
    const baseUrl = this.siteConfig.baseUrl

    if (options.category) {
      // 카테고리 기반 검색 (사이트별로 다를 수 있음)
      return `${baseUrl}/search?category=${encodeURIComponent(options.category)}`
    } else if (options.keyword) {
      // 키워드 기반 검색
      return `${baseUrl}/search?q=${encodeURIComponent(options.keyword)}`
    }

    return baseUrl
  }
}

