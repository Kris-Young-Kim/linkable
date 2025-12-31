import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import * as cheerio from "cheerio";

const mapReasonToStatus = (
  reason: "not_authenticated" | "insufficient_permissions" | "error"
) => {
  if (reason === "not_authenticated") return 401;
  if (reason === "insufficient_permissions") return 403;
  return 500;
};

interface CrawlRequest {
  url: string;
  max?: number;
}

interface CrawledProduct {
  id: string;
  name: string;
  price: number | null;
  purchase_link: string | null;
  image_url: string | null;
  manufacturer: string | null;
  description: string | null;
  category: string | null;
  iso_code: string | null;
  rating?: number | null;
  review_count?: number | null;
}

/**
 * 가격 문자열에서 숫자만 추출
 * 여러 가격이 있는 경우 (할인가 등) 가장 마지막 숫자를 할인가로 간주하여 추출
 */
function parsePrice(priceText: string | null | undefined): number | null {
  if (!priceText) return null;

  // "가격 별도 문의" 같은 경우 처리
  if (/문의|별도|협의/i.test(String(priceText))) return null;

  // 모든 공백 제거 및 줄바꿈 정리
  const text = String(priceText).replace(/\s+/g, " ");

  // 숫자와 쉼표 패턴 찾기 (예: 1,200,000)
  const matches = text.match(/(\d{1,3}(?:,\d{3})+|\d+)/g);

  if (matches && matches.length > 0) {
    // 가장 마지막에 나오는 숫자가 보통 할인가/최종가임
    const lastPrice = matches[matches.length - 1].replace(/,/g, "");
    return parseInt(lastPrice, 10);
  }

  return null;
}

/**
 * URL 정규화 (상대 경로를 절대 경로로 변환)
 */
function normalizeUrl(
  url: string | null | undefined,
  baseUrl: string
): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) {
    const base = new URL(baseUrl);
    return `${base.origin}${url}`;
  }
  return `${baseUrl}/${url}`;
}

/**
 * 페이지네이션 링크 추출
 */
function extractPaginationLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const paginationUrls: Set<string> = new Set();
  
  // 다양한 페이지네이션 패턴 시도
  const paginationSelectors = [
    ".item-page a[href*='page=']",  // willbe.kr
    ".pagination a[href*='page=']",
    ".paging a[href*='page=']",
    ".page a[href*='page=']",
    "a[href*='page=']:not([href*='page=1']):not([href*='page=0'])",
  ];

  for (const selector of paginationSelectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const normalized = normalizeUrl(href, baseUrl);
        if (normalized && !normalized.includes("page=1") && !normalized.includes("page=0")) {
          paginationUrls.add(normalized);
        }
      }
    });
  }

  // 숫자로 된 페이지 링크도 찾기
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href && /page=\d+/.test(href) && /^\d+$/.test(text)) {
      const pageNum = parseInt(text, 10);
      if (pageNum > 1 && pageNum <= 20) { // 최대 20페이지까지
        const normalized = normalizeUrl(href, baseUrl);
        if (normalized) paginationUrls.add(normalized);
      }
    }
  });

  return Array.from(paginationUrls);
}

interface CrawlResult {
  products: CrawledProduct[];
  debug?: {
    htmlLength: number;
    title: string;
    linkCount: number;
    tableCount: number;
    listCount: number;
    foundSelector: string | null;
    sampleLinks: Array<{ href: string | undefined; text: string }>;
  };
}

/**
 * 단일 페이지에서 상품 추출
 */
function extractProductsFromPage(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  maxProducts: number,
  globalSeenLinks: Set<string>,
  globalSeenProducts: Set<string>,
  existingProducts: CrawledProduct[]
): { products: CrawledProduct[]; foundSelector: string | null } {
  const products: CrawledProduct[] = [];
  let foundSelector: string | null = null;

  // 다양한 셀렉터 패턴 시도 (우선순위 순)
  const productSelectors = [
    // willbe.kr 특화
    "dl.item-list",  // willbe.kr의 상품 리스트 구조
    ".item-cont dl.item-list",
    ".item-list",
    
    // 에이블라이프 및 테이블 구조
    ".prd-list table td",
    ".prd-list td",
    "table tbody td",
    "table td",
    
    // 리스트 구조
    "ul.product_list > li",
    ".product_list > li",
    ".prd-list > li",
    "ul.prd-list > li",
    "ul[class*='list'] > li",
    ".list > li",
    
    // 테이블 행
    "table tbody tr",
    "table tr",
    
    // 일반적인 상품 구조
    "li[class*='product']",
    "li[class*='item']",
    "li[class*='goods']",
    ".board_list > li",
    "[class*='product']",
    "article",
    ".item",
    "div[class*='item']",
    "div[class*='product']",
    "div[class*='goods']",
    "div[class*='prd']",
    "div[class*='list'] > div",
    "div[class*='box']",
    ".product-item",
    ".goods-item",
    
    // 링크 기반
    "tr:has(a[href*='shopdetail'])",
    "tr:has(a[href*='product'])",
    "tr:has(a[href*='detail'])",
    "td:has(a[href*='shopdetail'])",
    "td:has(a[href*='product'])",
    "td:has(a[href*='detail'])",
  ];

  // 셀렉터로 상품 요소 찾기
  for (const selector of productSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`[Crawler] 상품 목록 발견: ${selector} (${elements.length}개)`);
      foundSelector = selector;
      
      // dl.item-list 구조 특별 처리 (willbe.kr)
      if (selector === "dl.item-list" || selector.includes("dl.item-list")) {
        elements.each((index, element) => {
          if (products.length >= maxProducts) return false;
          
          const $el = $(element);
          
          // 상품 링크 찾기
          const linkEl = $el.find("dt.thumb a, a[href*='shopdetail']").first();
          if (linkEl.length === 0) return;
          
          const href = linkEl.attr("href");
          if (!href || !href.includes("shopdetail")) return;
          
          const productLink = normalizeUrl(href, baseUrl);
          if (!productLink || globalSeenLinks.has(productLink)) return;
          globalSeenLinks.add(productLink);
          
          // 상품명 추출
          const nameEl = $el.find("li.prd-name").first();
          let productName = nameEl.text().trim();
          
          // 상품명이 없으면 링크의 이미지 alt에서 찾기
          if (!productName || productName.length < 2) {
            const img = linkEl.find("img").first();
            productName = img.attr("alt") || img.attr("title") || "";
          }
          
          // 상품명이 여전히 없으면 링크 텍스트에서 찾기
          if (!productName || productName.length < 2) {
            productName = linkEl.text().trim();
          }
          
          // 가격 추출
          const priceEl = $el.find("li.prd-price").first();
          const priceText = priceEl.text().trim();
          const price = parsePrice(priceText);
          
          // 이미지 추출
          const imgEl = $el.find("dt.thumb img, img.MS_prod_img_m").first();
          const imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-original");
          const imageUrl = imgSrc ? normalizeUrl(imgSrc, baseUrl) : null;
          
          // 중복 체크
          const productKey = `${productName}|${price || 'no-price'}`;
          if (globalSeenProducts.has(productKey)) return;
          globalSeenProducts.add(productKey);
          
          // 상품명 검증
          if (productName && productName.length >= 3 && 
              !/^로그인|회원가입|장바구니|주문조회|마이페이지|공지사항|Q&A|자료실|HOME|GUIDE|TOP|검색|메뉴|카테고리|미리보기|상세보기|더보기/i.test(productName)) {
            
            products.push({
              id: `crawled-${Date.now()}-${index}`,
              name: productName.substring(0, 200),
              price,
              purchase_link: productLink,
              image_url: imageUrl,
              manufacturer: null,
              description: null,
              category: null,
              iso_code: null,
            });
          }
        });
      } else {
        // 일반적인 구조 처리
        const startIndex = selector.includes("tr") ? 1 : 0; // 테이블 행인 경우 헤더 스킵
        const elementsToProcess = elements.slice(startIndex, startIndex + maxProducts * 2);
        
        elementsToProcess.each((relativeIndex, element) => {
          if (products.length >= maxProducts) return false;
          
          const $el = $(element);
          const actualIndex = startIndex + relativeIndex;
          
          // 상품 링크 찾기
          const linkEl = $el.find("a[href*='shopdetail'], a[href*='product'], a[href*='detail']").first();
          if (linkEl.length === 0) return;
          
          const href = linkEl.attr("href");
          if (!href) return;
          
          // shopbrand, brand 링크 제외
          if (/shopbrand|brand.*html/i.test(href) && !/shopdetail/i.test(href)) return;
          
          const productLink = normalizeUrl(href, baseUrl);
          if (!productLink || globalSeenLinks.has(productLink)) return;
          globalSeenLinks.add(productLink);
          
          // 상품명 추출 (다양한 방법 시도)
          let productName = "";
          
          // 1. .dsc 클래스 (에이블라이프)
          const dscEl = $el.find(".dsc").first();
          if (dscEl.length > 0) {
            productName = dscEl.clone().children().remove().end().text().trim();
            productName = productName.replace(/^==\s*\$0\s*/, "").trim();
          }
          
          // 2. 이미지 alt 속성
          if (!productName || productName.length < 2) {
            const img = $el.find("img").first();
            productName = img.attr("alt") || img.attr("title") || "";
          }
          
          // 3. 링크 텍스트
          if (!productName || productName.length < 2) {
            productName = linkEl.text().trim();
          }
          
          // 4. 요소의 직접 텍스트
          if (!productName || productName.length < 2) {
            const directText = $el.clone()
              .find("a, img, script, style, .price, [class*='price'], strong")
              .remove()
              .end()
              .text()
              .trim();
            
            const lines = directText.split(/[\n\r]+/)
              .map(line => line.trim())
              .filter(line => line.length >= 3 && 
                !/^[\d\s,원]+$/.test(line) &&
                !line.match(/^\d{1,3}(?:,\d{3})*\s*원?$/) &&
                !/^미리보기|상세보기|더보기$/i.test(line));
            
            if (lines.length > 0) {
              productName = lines[0];
            }
          }
          
          // 가격 추출
          let price: number | null = null;
          const priceSelectors = [".price", ".prd-price", "[class*='price']", "strong", "em", ".cost"];
          for (const priceSel of priceSelectors) {
            const priceEl = $el.find(priceSel).first();
            if (priceEl.length > 0) {
              price = parsePrice(priceEl.text());
              if (price) break;
            }
          }
          
          // 가격을 찾지 못한 경우 전체 텍스트에서 찾기
          if (!price) {
            const allText = $el.text();
            const priceMatch = allText.match(/(\d{1,3}(?:,\d{3})*)\s*원?/);
            if (priceMatch) {
              price = parsePrice(priceMatch[1]);
            }
          }
          
          // 이미지 추출
          const imgEl = $el.find("img").first();
          const imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("data-lazy-src");
          const imageUrl = imgSrc ? normalizeUrl(imgSrc, baseUrl) : null;
          
          // 중복 체크
          const productKey = `${productName}|${price || 'no-price'}`;
          if (globalSeenProducts.has(productKey)) return;
          globalSeenProducts.add(productKey);
          
          // 상품명 검증
          const excludePatterns = [
            /^로그인|회원가입|장바구니|주문조회|마이페이지|공지사항|Q&A|자료실|HOME|GUIDE|TOP|검색|메뉴|카테고리|미리보기|상세보기|더보기$/i,
            /고객센터|교환|반품|환불|배송|상품.*불량|평점|리뷰|문의|별점/i,
            /총\s*상품\s*금액|미성년자|법정대리인/i,
          ];
          
          const isExcluded = excludePatterns.some(pattern => pattern.test(productName));
          
          if (productName && productName.length >= 3 && !isExcluded && productLink) {
            products.push({
              id: `crawled-${Date.now()}-${actualIndex}`,
              name: productName.substring(0, 200),
              price,
              purchase_link: productLink,
              image_url: imageUrl,
              manufacturer: null,
              description: null,
              category: null,
              iso_code: null,
            });
          }
        });
      }
      
      if (products.length > 0) {
        break; // 상품을 찾았으면 다른 셀렉터 시도하지 않음
      }
    }
  }

  // 셀렉터로 찾지 못한 경우, 링크 기반 탐색
  if (products.length === 0) {
    console.log("[Crawler] 셀렉터로 찾지 못함. 링크 기반 탐색 시도...");
    
    const allLinks = $("a[href*='shopdetail'], a[href*='product'], a[href*='detail']");
    const excludeTextPatterns = [
      /^로그인|회원가입|장바구니|주문조회|마이페이지|공지사항|Q&A|자료실|HOME|GUIDE|TOP|검색|메뉴|카테고리|미리보기|상세보기|더보기$/i,
      /고객센터|교환|반품|환불|배송|상품.*불량|평점|리뷰|문의|별점/i,
    ];
    
    allLinks.slice(0, maxProducts * 3).each((index, linkEl) => {
      if (products.length >= maxProducts) return false;
      
      const $link = $(linkEl);
      const href = $link.attr("href");
      if (!href || /shopbrand|brand.*html/i.test(href)) return;
      
      const productLink = normalizeUrl(href, baseUrl);
      if (!productLink || globalSeenLinks.has(productLink)) return;
      globalSeenLinks.add(productLink);
      
      // 상품명 추출
      let productName = $link.text().trim() || $link.attr("title") || $link.attr("alt") || "";
      
      // 이미지 alt에서 찾기
      if (!productName || productName.length < 2) {
        const img = $link.find("img").first();
        productName = img.attr("alt") || img.attr("title") || "";
      }
      
      // 부모 요소에서 찾기
      if (!productName || productName.length < 2) {
        const $parent = $link.closest("tr, li, div, dl, article");
        const parentText = $parent.clone()
          .find("a, img, script, style")
          .remove()
          .end()
          .text()
          .trim();
        
        const lines = parentText.split(/[\n\r]+/)
          .map(line => line.trim())
          .filter(line => line.length >= 3 && 
            !/^[\d\s,원]+$/.test(line) &&
            !line.match(/^\d{1,3}(?:,\d{3})*\s*원?$/));
        
        if (lines.length > 0) {
          productName = lines[0];
        }
      }
      
      // 가격 추출
      const $parent = $link.closest("tr, li, div, dl, article");
      const priceText = $parent.find(".price, .prd-price, [class*='price'], strong").first().text();
      const price = parsePrice(priceText) || parsePrice($parent.text());
      
      // 이미지 추출
      const imgEl = $link.find("img").first();
      const imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-original");
      const imageUrl = imgSrc ? normalizeUrl(imgSrc, baseUrl) : null;
      
      // 중복 체크
      const productKey = `${productName}|${price || 'no-price'}`;
      if (globalSeenProducts.has(productKey)) return;
      globalSeenProducts.add(productKey);
      
      // 검증
      const isExcluded = excludeTextPatterns.some(pattern => pattern.test(productName));
      
      if (productName && productName.length >= 3 && !isExcluded && productLink) {
        products.push({
          id: `crawled-${Date.now()}-link-${index}`,
          name: productName.substring(0, 200),
          price,
          purchase_link: productLink,
          image_url: imageUrl,
          manufacturer: null,
          description: null,
          category: null,
          iso_code: null,
        });
      }
    });
  }

  return { products, foundSelector };
}

/**
 * 범용 HTML 크롤러 (fetch + cheerio)
 * 페이지네이션 지원 및 다양한 웹사이트 구조 대응
 */
async function crawlProducts(
  url: string,
  maxProducts: number = 30
): Promise<CrawlResult> {
  try {
    console.log(`[Crawler] 크롤링 시작: ${url} (최대 ${maxProducts}개)`);

    const baseUrl = new URL(url).origin;
    const products: CrawledProduct[] = [];
    
    // 전역 중복 제거를 위한 Set (모든 페이지에서 공유)
    const globalSeenLinks = new Set<string>();
    const globalSeenProducts = new Set<string>();

    // 페이지네이션 처리
    let currentPage = 1;
    const maxPages = 20; // 최대 20페이지까지 크롤링
    const pagesToCrawl: string[] = [url]; // 첫 페이지는 항상 포함
    
    // 첫 페이지 로드하여 페이지네이션 링크 찾기
    try {
      const firstResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        next: { revalidate: 0 },
      });

      if (!firstResponse.ok) {
        throw new Error(`HTTP ${firstResponse.status}: ${firstResponse.statusText}`);
      }

      const firstHtml = await firstResponse.text();
      const $first = cheerio.load(firstHtml);
      
      // 페이지네이션 링크 추출
      const paginationLinks = extractPaginationLinks($first, baseUrl);
      console.log(`[Crawler] 발견된 페이지네이션 링크: ${paginationLinks.length}개`);
      
      // 중복 제거 및 정렬
      const uniquePages = Array.from(new Set(paginationLinks))
        .filter(pageUrl => {
          const pageMatch = pageUrl.match(/page=(\d+)/);
          if (pageMatch) {
            const pageNum = parseInt(pageMatch[1], 10);
            return pageNum > 1 && pageNum <= maxPages;
          }
          return false;
        })
        .sort((a, b) => {
          const pageA = parseInt(a.match(/page=(\d+)/)?.[1] || "0", 10);
          const pageB = parseInt(b.match(/page=(\d+)/)?.[1] || "0", 10);
          return pageA - pageB;
        });
      
      pagesToCrawl.push(...uniquePages.slice(0, maxPages - 1));
      console.log(`[Crawler] 크롤링할 페이지: ${pagesToCrawl.length}개 (${pagesToCrawl.map((p, i) => i + 1).join(", ")})`);
    } catch (error) {
      console.warn(`[Crawler] 페이지네이션 링크 추출 실패, 첫 페이지만 크롤링:`, error);
    }

    // 각 페이지 크롤링
    let foundSelector: string | null = null;
    for (let pageIndex = 0; pageIndex < pagesToCrawl.length && products.length < maxProducts; pageIndex++) {
      const pageUrl = pagesToCrawl[pageIndex];
      const pageNum = pageIndex + 1;
      
      console.log(`[Crawler] 페이지 ${pageNum}/${pagesToCrawl.length} 크롤링: ${pageUrl}`);
      
      try {
        const response = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          next: { revalidate: 0 },
        });

        if (!response.ok) {
          console.warn(`[Crawler] 페이지 ${pageNum} 로드 실패 (HTTP ${response.status}), 건너뜀`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        console.log(`[Crawler] 페이지 ${pageNum} HTML 길이: ${html.length} bytes`);

        // 상품 추출
        const result = extractProductsFromPage(
          $,
          baseUrl,
          maxProducts - products.length, // 남은 개수만큼만
          globalSeenLinks,
          globalSeenProducts,
          products
        );

        if (result.foundSelector && !foundSelector) {
          foundSelector = result.foundSelector;
        }

        products.push(...result.products);
        console.log(`[Crawler] 페이지 ${pageNum}에서 ${result.products.length}개 상품 추출 (누적: ${products.length}개)`);

        // 최대 개수에 도달하면 중단
        if (products.length >= maxProducts) {
          console.log(`[Crawler] 최대 수집 개수(${maxProducts}개)에 도달하여 크롤링 중단`);
          break;
        }

        // 페이지 간 딜레이 (서버 부하 방지)
        if (pageIndex < pagesToCrawl.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[Crawler] 페이지 ${pageNum} 크롤링 오류:`, error);
        // 오류가 있어도 다음 페이지 계속 시도
        continue;
      }
    }

    console.log(`[Crawler] 총 ${products.length}개 상품 추출 완료 (최대 제한: ${maxProducts}개)`);

    // 디버깅 정보 수집 (상품이 없을 때만)
    const debugInfo =
      products.length === 0
        ? {
            htmlLength: 0,
            title: "",
            linkCount: 0,
            tableCount: 0,
            listCount: 0,
            foundSelector: foundSelector || null,
            sampleLinks: [],
          }
        : undefined;

    return {
      products,
      debug: debugInfo,
    };
  } catch (error) {
    console.error("[Crawler] 크롤링 오류:", error);
    throw error;
  }
}

/**
 * HTML 크롤링 API (fetch + cheerio 기반)
 * Vercel 서버리스 환경에서 동작
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess();

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    );
  }

  try {
    const body = (await request.json()) as CrawlRequest;

    // max 값 검증 및 로깅
    const maxProducts = body.max && body.max > 0 ? body.max : 30;
    console.log(`[Crawl API] 요청 받음: URL=${body.url}, max=${body.max}, 적용된 max=${maxProducts}`);

    if (!body.url) {
      return NextResponse.json(
        { error: "URL이 필요합니다.", products: [] },
        { status: 400 }
      );
    }

    const result = await crawlProducts(body.url, maxProducts);

    return NextResponse.json({
      success: true,
      products: result.products,
      message: `${result.products.length}개 상품을 찾았습니다.`,
      debug: result.debug,
    });
  } catch (error) {
    console.error("[Crawl API] 오류:", error);
    const errorMessage =
      error instanceof Error ? error.message : "크롤링 중 오류가 발생했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        products: [],
      },
      { status: 500 }
    );
  }
}
