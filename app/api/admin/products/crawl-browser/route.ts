/**
 * 크롤링 API - Puppeteer 기반
 * 
 * - 일반 페이지: fetch + cheerio
 * - JavaScript 동적 로딩 페이지: Hyperbrowser + Puppeteer
 * 
 * MCP 서버 지원:
 * - Cursor IDE의 MCP 서버를 통해 Hyperbrowser를 사용할 수 있습니다.
 * - .mcp.json 파일에 hyperbrowser 서버가 설정되어 있어야 합니다.
 * - 현재는 SDK를 직접 사용하지만, 필요시 MCP 서버로 전환 가능합니다.
 */
import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { connect } from "puppeteer-core";
import { Hyperbrowser } from "@hyperbrowser/sdk";

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
 * 바이너리 데이터를 올바른 인코딩으로 디코딩하는 헬퍼 함수
 */
function decodeHtml(buffer: Buffer, contentType: string, htmlPreview?: string): string {
  // Content-Type 헤더에서 charset 추출
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  let detectedCharset = charsetMatch?.[1]?.toLowerCase() || null;
  
  // HTML meta charset 태그 확인 (Content-Type보다 우선)
  if (htmlPreview) {
    const metaCharsetMatch = htmlPreview.match(/<meta[^>]*charset\s*=\s*["']?([^"'\s>]+)/i);
    if (metaCharsetMatch) {
      const metaCharset = metaCharsetMatch[1].toLowerCase();
      if (metaCharset) {
        detectedCharset = metaCharset;
      }
    }
  }
  
  // 인코딩에 따라 디코딩
  if (detectedCharset) {
    // EUC-KR 또는 CP949인 경우 iconv-lite 사용
    if (detectedCharset.includes("euc-kr") || detectedCharset.includes("cp949")) {
      try {
        const decoded = iconv.decode(buffer, "euc-kr");
        console.log(`[Crawler] EUC-KR/CP949 디코딩 성공 (${detectedCharset})`);
        return decoded;
      } catch (error) {
        console.warn(`[Crawler] EUC-KR/CP949 디코딩 실패, UTF-8로 시도:`, error);
        return buffer.toString("utf-8");
      }
    }
    // UTF-8 또는 기타 인코딩
    else if (detectedCharset.includes("utf-8") || detectedCharset.includes("utf8")) {
      return buffer.toString("utf-8");
    }
    // 기타 인코딩 시도
    else {
      try {
        const decoded = iconv.decode(buffer, detectedCharset);
        console.log(`[Crawler] ${detectedCharset} 디코딩 성공`);
        return decoded;
      } catch (error) {
        console.warn(`[Crawler] ${detectedCharset} 디코딩 실패, UTF-8로 시도:`, error);
        return buffer.toString("utf-8");
      }
    }
  }
  
  // charset이 없는 경우 UTF-8로 시도
  return buffer.toString("utf-8");
}

/**
 * 텍스트 추출 시 인코딩 문제 해결 헬퍼 함수
 * cheerio의 decodeEntities 옵션이 이미 HTML 엔티티를 디코딩하므로,
 * 여기서는 깨진 문자만 감지하고 처리합니다.
 */
function extractText($el: cheerio.Cheerio<any>, fallback?: string): string {
  try {
    // cheerio의 text() 메서드로 추출 (이미 HTML 엔티티가 디코딩됨)
    let text = $el.text().trim();
    
    // 깨진 문자(replacement character)가 있는지 확인
    if (/[\uFFFD]/.test(text)) {
      // 깨진 문자가 있으면 HTML에서 직접 추출 시도
      const html = $el.html() || "";
      if (html) {
        // HTML 태그 제거
        let decoded = html.replace(/<[^>]*>/g, "");
        // HTML 엔티티가 남아있으면 디코딩 (cheerio가 놓친 경우)
        decoded = decoded
          .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
          .replace(/&#x([0-9A-Fa-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;|&apos;/g, "'");
        // 연속된 공백 정리
        decoded = decoded.replace(/\s+/g, " ").trim();
        if (decoded && decoded.length > 0 && !/[\uFFFD]/.test(decoded)) {
          return decoded;
        }
      }
    }
    
    // 깨진 문자가 없으면 그대로 반환
    return text || fallback || "";
  } catch (error) {
    console.warn("[Crawler] Text extraction error:", error);
    return fallback || "";
  }
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
    // 네이버 브랜드 스토어 특화
    ".product_list_item",  // 네이버 브랜드 스토어 상품 아이템
    ".productItem",  // 네이버 브랜드 스토어
    "[class*='ProductItem']",  // 네이버 브랜드 스토어
    "[class*='product-item']",  // 네이버 브랜드 스토어
    "a[href*='/products/']",  // 네이버 브랜드 스토어 상품 링크
    ".product_list a[href*='/products/']",  // 네이버 브랜드 스토어 리스트
    "div[class*='product'] a[href*='/products/']",  // 네이버 브랜드 스토어
    
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
          
          // 상품명 추출 (인코딩 문제 해결)
          const nameEl = $el.find("li.prd-name").first();
          let productName = extractText(nameEl);
          
          // 상품명이 없으면 링크의 이미지 alt에서 찾기
          if (!productName || productName.length < 2) {
            const img = linkEl.find("img").first();
            productName = img.attr("alt")?.trim() || img.attr("title")?.trim() || "";
          }
          
          // 상품명이 여전히 없으면 링크 텍스트에서 찾기
          if (!productName || productName.length < 2) {
            productName = extractText(linkEl);
          }
          
          // 가격 추출 (인코딩 문제 해결)
          const priceEl = $el.find("li.prd-price").first();
          const priceText = extractText(priceEl);
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
            const dscTextEl = dscEl.clone().children().remove().end();
            productName = extractText(dscTextEl);
            productName = productName.replace(/^==\s*\$0\s*/, "").trim();
          }
          
          // 2. 이미지 alt 속성
          if (!productName || productName.length < 2) {
            const img = $el.find("img").first();
            productName = img.attr("alt")?.trim() || img.attr("title")?.trim() || "";
          }
          
          // 3. 링크 텍스트
          if (!productName || productName.length < 2) {
            productName = extractText(linkEl);
          }
          
          // 4. 요소의 직접 텍스트
          if (!productName || productName.length < 2) {
            const directTextEl = $el.clone()
              .find("a, img, script, style, .price, [class*='price'], strong")
              .remove()
              .end();
            const directText = extractText(directTextEl);
            
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
          
          // 가격 추출 (인코딩 문제 해결)
          let price: number | null = null;
          const priceSelectors = [".price", ".prd-price", "[class*='price']", "strong", "em", ".cost"];
          for (const priceSel of priceSelectors) {
            const priceEl = $el.find(priceSel).first();
            if (priceEl.length > 0) {
              const priceText = extractText(priceEl);
              price = parsePrice(priceText);
              if (price) break;
            }
          }
          
          // 가격을 찾지 못한 경우 전체 텍스트에서 찾기
          if (!price) {
            const allText = extractText($el);
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
    
    // 네이버 브랜드 스토어 링크 우선 탐색
    const naverBrandLinks = $("a[href*='/products/']");
    if (naverBrandLinks.length > 0) {
      console.log(`[Crawler] 네이버 브랜드 스토어 링크 발견: ${naverBrandLinks.length}개`);
      
      naverBrandLinks.slice(0, maxProducts * 2).each((index, linkEl) => {
        if (products.length >= maxProducts) return false;
        
        const $link = $(linkEl);
        const href = $link.attr("href");
        if (!href || !href.includes("/products/")) return;
        
        // 네이버 브랜드 스토어 URL 정규화
        let productLink = normalizeUrl(href, baseUrl);
        if (!productLink) {
          // normalizeUrl이 null을 반환한 경우 href를 직접 사용
          if (href.startsWith("/")) {
            productLink = `${baseUrl}${href}`;
          } else {
            productLink = `${baseUrl}/${href}`;
          }
        } else if (!productLink.startsWith("http")) {
          if (href.startsWith("/")) {
            productLink = `${baseUrl}${href}`;
          } else {
            productLink = `${baseUrl}/${href}`;
          }
        }
        
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
          const $parent = $link.closest(".product_list_item, .productItem, [class*='ProductItem'], [class*='product-item'], li, div, article");
          const parentTextEl = $parent.clone()
            .find("a, img, script, style, .price, [class*='price']")
            .remove()
            .end();
          const parentText = extractText(parentTextEl);

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
        const $parent = $link.closest(".product_list_item, .productItem, [class*='ProductItem'], [class*='product-item'], li, div, article");
        const priceEl = $parent.find(".price, .prd-price, [class*='price'], strong, em").first();
        const priceText = extractText(priceEl);
        const parentText = extractText($parent);
        const price = parsePrice(priceText) || parsePrice(parentText);
        
        // 이미지 추출
        const imgEl = $link.find("img").first();
        const imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("data-lazy-src");
        const imageUrl = imgSrc ? normalizeUrl(imgSrc, baseUrl) : null;
        
        // 중복 체크
        const productKey = `${productName}|${price || 'no-price'}`;
        if (globalSeenProducts.has(productKey)) return;
        globalSeenProducts.add(productKey);
        
        // 검증
        const excludeTextPatterns = [
          /^로그인|회원가입|장바구니|주문조회|마이페이지|공지사항|Q&A|자료실|HOME|GUIDE|TOP|검색|메뉴|카테고리|미리보기|상세보기|더보기$/i,
          /고객센터|교환|반품|환불|배송|상품.*불량|평점|리뷰|문의|별점/i,
        ];
        const isExcluded = excludeTextPatterns.some(pattern => pattern.test(productName));
        
        if (productName && productName.length >= 3 && !isExcluded && productLink) {
          products.push({
            id: `crawled-${Date.now()}-naver-${index}`,
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
      
      if (products.length > 0) {
        return { products, foundSelector: "a[href*='/products/']" };
      }
    }
    
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
        const parentTextEl = $parent.clone()
          .find("a, img, script, style")
          .remove()
          .end();
        const parentText = extractText(parentTextEl);

        const lines = parentText.split(/[\n\r]+/)
          .map(line => line.trim())
          .filter(line => line.length >= 3 && 
            !/^[\d\s,원]+$/.test(line) &&
            !line.match(/^\d{1,3}(?:,\d{3})*\s*원?$/));
        
                  if (lines.length > 0) {
                    productName = lines[0];
          }
        }

        // 가격 추출 (인코딩 문제 해결)
      const $parent = $link.closest("tr, li, div, dl, article");
      const priceEl = $parent.find(".price, .prd-price, [class*='price'], strong").first();
      const priceText = extractText(priceEl);
      const parentText = extractText($parent);
      const price = parsePrice(priceText) || parsePrice(parentText);
      
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
 * Hyperbrowser를 사용한 크롤링 (JavaScript 동적 로딩 페이지용)
 */
async function crawlWithHyperbrowser(
  url: string,
  maxProducts: number = 30
): Promise<CrawlResult> {
  const hyperbrowserApiKey = process.env.HYPERBROWSER_API_KEY;
  
  if (!hyperbrowserApiKey) {
    console.warn("[Crawler] HYPERBROWSER_API_KEY가 설정되지 않아 Hyperbrowser 크롤링을 건너뜁니다.");
    throw new Error("HYPERBROWSER_API_KEY가 설정되지 않았습니다.");
  }

  const client = new Hyperbrowser({
    apiKey: hyperbrowserApiKey,
  });

  let session: any = null;
  let browser: any = null;

  try {
    console.log(`[Crawler] Hyperbrowser 세션 생성 중...`);
    session = await client.sessions.create({
      useStealth: true,
    });

    console.log(`[Crawler] 브라우저 연결 중...`);
    browser = await connect({
      browserWSEndpoint: session.wsEndpoint,
      defaultViewport: null,
    });

    // 페이지 가져오기 또는 새로 생성
    const pages = await browser.pages();
    let page = pages[0];
    if (!page) {
      console.log(`[Crawler] 새 페이지 생성 중...`);
      page = await browser.newPage();
    }
    
    console.log(`[Crawler] 페이지 준비 완료 (기존 페이지: ${pages.length}개)`);

    const baseUrl = new URL(url).origin;
    const products: CrawledProduct[] = [];
    const globalSeenLinks = new Set<string>();
    const globalSeenProducts = new Set<string>();

    console.log(`[Crawler] 페이지 로드 중: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    
    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForTimeout(3000);

    // HTML 가져오기
    const html = await page.content();
    console.log(`[Crawler] HTML 길이: ${html.length} bytes`);

    // cheerio로 파싱
    const $ = cheerio.load(html);

    // 상품 추출
    const result = extractProductsFromPage(
      $,
      baseUrl,
      maxProducts,
      globalSeenLinks,
      globalSeenProducts,
      products
    );

    products.push(...result.products);
    console.log(`[Crawler] Hyperbrowser로 ${products.length}개 상품 추출 완료`);

    // 디버깅 정보
    let debugInfo: CrawlResult["debug"] = undefined;
    if (products.length === 0) {
      const allLinks = $("a[href]");
      const productLinks = $("a[href*='product'], a[href*='shopdetail'], a[href*='detail'], a[href*='/products/']");
      const tables = $("table");
      const lists = $("ul, ol");
      const title = $("title").text() || "";

      debugInfo = {
        htmlLength: html.length,
        title: title.substring(0, 100),
        linkCount: allLinks.length,
        tableCount: tables.length,
        listCount: lists.length,
        foundSelector: result.foundSelector || null,
        sampleLinks: [],
      };
    }

    return {
      products,
      debug: debugInfo,
    };
  } catch (error) {
    console.error("[Crawler] Hyperbrowser 크롤링 오류:", error);
    throw error;
  } finally {
    try {
      if (browser) {
        await browser.disconnect();
      }
      if (session) {
        await client.sessions.stop(session.id);
      }
    } catch (cleanupError) {
      console.warn("[Crawler] Hyperbrowser 정리 중 오류:", cleanupError);
    }
  }
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

    // 첫 페이지 로드 실패 정보 저장
    let firstPageError: { status?: number; message?: string } | null = null;

    // 페이지네이션 처리
    let currentPage = 1;
    const maxPages = 20; // 최대 20페이지까지 크롤링
    const pagesToCrawl: string[] = [url]; // 첫 페이지는 항상 포함
    
    // 첫 페이지 로드하여 페이지네이션 링크 찾기
    try {
      console.log(`[Crawler] 첫 페이지 요청: ${url}`);
      const firstResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: baseUrl,
        },
        next: { revalidate: 0 },
      });

      console.log(`[Crawler] 첫 페이지 응답: ${firstResponse.status} ${firstResponse.statusText}`);

      if (!firstResponse.ok) {
        const errorText = await firstResponse.text().catch(() => "");
        console.error(`[Crawler] 첫 페이지 로드 실패: HTTP ${firstResponse.status} ${firstResponse.statusText}`);
        console.error(`[Crawler] 응답 내용: ${errorText.substring(0, 200)}`);
        firstPageError = {
          status: firstResponse.status,
          message: `${firstResponse.statusText}: ${errorText.substring(0, 100)}`,
        };
        throw new Error(`HTTP ${firstResponse.status}: ${firstResponse.statusText}`);
      }

      // 바이너리로 받아서 인코딩 처리
      const arrayBuffer = await firstResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // 임시로 UTF-8로 디코딩하여 meta charset 확인
      const tempHtml = buffer.toString("utf-8");
      const contentType = firstResponse.headers.get("content-type") || "";
      
      // 올바른 인코딩으로 디코딩
      const html = decodeHtml(buffer, contentType, tempHtml);
      
      // cheerio로 HTML 파싱 (기본적으로 HTML 엔티티 자동 디코딩)
      const $first = cheerio.load(html);
      
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[Crawler] 페이지네이션 링크 추출 실패, 첫 페이지만 크롤링:`, errorMessage);
      
      // 첫 페이지 로드 실패 시 상품이 없으면 디버깅 정보에 포함
      if (errorMessage.includes("HTTP") && products.length === 0) {
        const statusMatch = errorMessage.match(/HTTP (\d+):/);
        const status = statusMatch ? statusMatch[1] : "unknown";
        console.log(`[Crawler] 첫 페이지 로드 실패로 인한 크롤링 불가 (HTTP ${status})`);
      }
    }

    // 각 페이지 크롤링
    let foundSelector: string | null = null;
    for (let pageIndex = 0; pageIndex < pagesToCrawl.length && products.length < maxProducts; pageIndex++) {
      const pageUrl = pagesToCrawl[pageIndex];
      const pageNum = pageIndex + 1;
      
      console.log(`[Crawler] 페이지 ${pageNum}/${pagesToCrawl.length} 크롤링: ${pageUrl}`);
      
      try {
        // HTTP 429 에러 방지를 위한 딜레이
        if (pageIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        }
        
        const response = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            Referer: baseUrl, // Referer 헤더 추가
          },
          next: { revalidate: 0 },
        });

        let responseToUse = response;
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[Crawler] 페이지 ${pageNum} 로드 실패 (HTTP 429: Too Many Requests), 5초 대기 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            // 재시도
            const retryResponse = await fetch(pageUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                Referer: baseUrl,
              },
              next: { revalidate: 0 },
            });
            
            if (!retryResponse.ok) {
              console.warn(`[Crawler] 페이지 ${pageNum} 재시도 실패 (HTTP ${retryResponse.status}), 건너뜀`);
              continue;
            }
            responseToUse = retryResponse;
          } else {
            console.warn(`[Crawler] 페이지 ${pageNum} 로드 실패 (HTTP ${response.status}), 건너뜀`);
            continue;
          }
        }

        // 바이너리로 받아서 인코딩 처리
        const arrayBuffer = await responseToUse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // 임시로 UTF-8로 디코딩하여 meta charset 확인
        const tempHtml = buffer.toString("utf-8");
        const contentType = responseToUse.headers.get("content-type") || "";
        
        // 올바른 인코딩으로 디코딩
        const html = decodeHtml(buffer, contentType, tempHtml);
        
        // cheerio로 HTML 파싱 (기본적으로 HTML 엔티티 자동 디코딩)
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
    let debugInfo: CrawlResult["debug"] = undefined;
    if (products.length === 0) {
      try {
        // 마지막으로 시도한 페이지의 HTML 분석
        const lastPageUrl = pagesToCrawl[pagesToCrawl.length - 1] || url;
        let debugResponse: Response | null = null;
        
        // HTTP 429 에러 처리
        try {
          debugResponse = await fetch(lastPageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
              Referer: baseUrl,
            },
            next: { revalidate: 0 },
          });
          
          if (debugResponse.status === 429) {
            console.log("[Crawler] 디버깅 정보 수집 시 HTTP 429 발생, 5초 대기 후 재시도...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            debugResponse = await fetch(lastPageUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                Referer: baseUrl,
              },
              next: { revalidate: 0 },
            });
          }
        } catch (fetchError) {
          console.warn("[Crawler] 디버깅 정보 수집용 fetch 실패:", fetchError);
        }

        if (debugResponse) {
          console.log(`[Crawler] 디버깅 정보 수집 응답 상태: ${debugResponse.status} ${debugResponse.statusText}`);
          
          if (debugResponse.ok) {
            const arrayBuffer = await debugResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const tempHtml = buffer.toString("utf-8");
            const contentType = debugResponse.headers.get("content-type") || "";
            const html = decodeHtml(buffer, contentType, tempHtml);
            const $debug = cheerio.load(html);

            console.log(`[Crawler] 디버깅 HTML 길이: ${html.length} bytes, Content-Type: ${contentType}`);

            // 실제 링크와 테이블 개수 계산
            const allLinks = $debug("a[href]");
            const productLinks = $debug("a[href*='product'], a[href*='shopdetail'], a[href*='detail'], a[href*='/products/']");
            const tables = $debug("table");
            const lists = $debug("ul, ol");
            const title = $debug("title").text() || "";

            // 네이버 브랜드 스토어 특정 요소 확인
            const naverBrandItems = $debug(".product_list_item, .productItem, [class*='ProductItem'], [class*='product-item']");
            
            // 샘플 링크 수집
            const sampleLinks: Array<{ href: string | undefined; text: string }> = [];
            productLinks.slice(0, 10).each((_, el) => {
              const $link = $debug(el);
              sampleLinks.push({
                href: $link.attr("href"),
                text: $link.text().trim().substring(0, 50),
              });
            });

            debugInfo = {
              htmlLength: html.length,
              title: title.substring(0, 100),
              linkCount: allLinks.length,
              tableCount: tables.length,
              listCount: lists.length,
              foundSelector: foundSelector || null,
              sampleLinks,
            };

            console.log(`[Crawler] 디버깅 정보 수집: 링크 ${allLinks.length}개, 상품 링크 ${productLinks.length}개, 테이블 ${tables.length}개, 리스트 ${lists.length}개, 네이버 브랜드 아이템 ${naverBrandItems.length}개`);
            
            // 네이버 브랜드 스토어 감지
            if (url.includes("brand.naver.com") && naverBrandItems.length === 0 && productLinks.length === 0) {
              console.warn("[Crawler] 네이버 브랜드 스토어 페이지는 JavaScript로 동적 로드되므로 fetch로는 상품 정보를 가져올 수 없을 수 있습니다.");
              console.warn("[Crawler] HTML 샘플 (처음 500자):", html.substring(0, 500));
            }
          } else {
            // 응답이 실패한 경우
            const errorText = await debugResponse.text().catch(() => "");
            console.error(`[Crawler] 디버깅 정보 수집 실패: HTTP ${debugResponse.status} ${debugResponse.statusText}`);
            console.error(`[Crawler] 응답 내용: ${errorText.substring(0, 200)}`);
            
            debugInfo = {
              htmlLength: 0,
              title: `HTTP ${debugResponse.status}: ${debugResponse.statusText}${firstPageError ? ` (첫 페이지도 실패: HTTP ${firstPageError.status})` : ""}`,
              linkCount: 0,
              tableCount: 0,
              listCount: 0,
              foundSelector: foundSelector || null,
              sampleLinks: [],
            };
          }
        } else {
          console.warn("[Crawler] 디버깅 정보 수집용 fetch가 null입니다.");
          const errorTitle = firstPageError 
            ? `첫 페이지 로드 실패: HTTP ${firstPageError.status} - ${firstPageError.message}`
            : "디버깅 정보 수집 실패: fetch 응답 없음";
          debugInfo = {
            htmlLength: 0,
            title: errorTitle,
            linkCount: 0,
            tableCount: 0,
            listCount: 0,
            foundSelector: foundSelector || null,
            sampleLinks: [],
          };
        }
      } catch (error) {
        console.warn("[Crawler] 디버깅 정보 수집 실패:", error);
        debugInfo = {
          htmlLength: 0,
          title: "",
          linkCount: 0,
          tableCount: 0,
          listCount: 0,
          foundSelector: foundSelector || null,
          sampleLinks: [],
        };
      }
    }

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
 * HTML 크롤링 API (fetch + cheerio + Puppeteer/Hyperbrowser 기반)
 * Vercel 서버리스 환경에서 동작
 * 
 * - 일반 페이지: fetch + cheerio 사용
 * - JavaScript 동적 로딩 페이지 (네이버 브랜드 스토어 등): Hyperbrowser + Puppeteer 사용
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

    // 네이버 브랜드 스토어는 Hyperbrowser 사용 (JavaScript 동적 로딩)
    const useHyperbrowser = body.url.includes("brand.naver.com");
    
    let result: CrawlResult;
    if (useHyperbrowser && process.env.HYPERBROWSER_API_KEY) {
      console.log(`[Crawl API] Hyperbrowser 사용: ${body.url}`);
      try {
        result = await crawlWithHyperbrowser(body.url, maxProducts);
      } catch (error) {
        console.warn(`[Crawl API] Hyperbrowser 실패, 일반 크롤러로 폴백:`, error);
        result = await crawlProducts(body.url, maxProducts);
      }
    } else {
      result = await crawlProducts(body.url, maxProducts);
    }

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
