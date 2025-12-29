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
}

/**
 * 가격 문자열에서 숫자만 추출
 * 여러 가격이 있는 경우 (할인가 등) 가장 마지막 숫자를 할인가로 간주하여 추출
 */
function parsePrice(priceText: string | null | undefined): number | null {
  if (!priceText) return null;
  
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
 * 범용 HTML 크롤러 (fetch + cheerio)
 * Vercel 서버리스 환경에서 동작하는 간단한 크롤러
 */
async function crawlProducts(
  url: string,
  maxProducts: number = 30
): Promise<CrawlResult> {
  try {
    console.log(`[Crawler] 크롤링 시작: ${url}`);

    // HTML 가져오기
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 0 }, // 캐시 비활성화
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url).origin;
    const products: CrawledProduct[] = [];

    console.log(`[Crawler] HTML 길이: ${html.length} bytes`);

    // 다양한 셀렉터 패턴 시도
    const productSelectors = [
      ".prd-list table td", // 에이블라이프와 같은 테이블 그리드 구조 대응
      ".prd-list td",
      "table tbody td",
      "table td",
      "ul.product_list > li",
      ".product_list > li",
      ".prd-list > li",
      "ul.prd-list > li",
      "table tbody tr",
      "table tr",
      "li[class*='product']",
      ".board_list > li",
      "[class*='product']",
      "article",
      ".item",
      "div[class*='item']",
      "div[class*='product']",
      "tr[class*='item']",
      "tr[class*='product']",
    ];

    let productElements: cheerio.Cheerio<any> | null = null;
    let foundSelector: string | null = null;

    for (const selector of productSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(
          `[Crawler] 상품 목록 발견: ${selector} (${elements.length}개)`
        );
        productElements = elements;
        foundSelector = selector;
        break;
      }
    }

    // 셀렉터로 찾지 못한 경우, 링크 기반 탐색 시도
    if (!productElements || productElements.length === 0) {
      console.log("[Crawler] 일반 셀렉터로 찾지 못함. 링크 기반 탐색 시도...");

      // 상품 링크 패턴이 있는 모든 링크 찾기
      const productLinkPatterns = [
        /shopdetail/i,
        /product/i,
        /detail/i,
        /item/i,
        /goods/i,
        /prd/i,
        /view/i,
      ];

      const allLinks = $("a[href]");
      console.log(`[Crawler] 전체 링크 개수: ${allLinks.length}`);

      const productLinks = allLinks.filter((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        // 링크 패턴이 있거나, 텍스트가 있고 href가 있는 경우
        const matchesPattern = productLinkPatterns.some((pattern) =>
          pattern.test(href)
        );
        const hasValidText = Boolean(
          text.length > 2 &&
            href &&
            !href.startsWith("#") &&
            !href.startsWith("javascript:")
        );
        return Boolean(matchesPattern || hasValidText);
      });

      console.log(`[Crawler] 필터링된 링크: ${productLinks.length}개`);

      if (productLinks.length > 0) {
        console.log(
          `[Crawler] 링크 패턴으로 ${productLinks.length}개 링크 발견`
        );
        // 링크의 부모 요소들을 상품 컨테이너로 사용
        productLinks.slice(0, maxProducts).each((index, linkEl) => {
          const $link = $(linkEl);
          // 부모 요소 찾기 (tr, li, div 등)
          const $parent = $link.closest(
            "tr, li, div, article, section, td, th"
          );
          const $container = $parent.length > 0 ? $parent : $link.parent();

          const productId = `crawled-${Date.now()}-${index}`;
          let productName =
            $link.text().trim() ||
            $link.attr("title") ||
            $link.attr("alt") ||
            "";

          // 상품명이 없으면 부모 컨테이너에서 찾기
          if (!productName || productName.length < 2) {
            // 컨테이너의 모든 텍스트에서 의미있는 텍스트 추출
            const containerText = $container
              .clone()
              .find("a, img, script, style")
              .remove()
              .end()
              .text()
              .trim();
            const lines = containerText
              .split(/\s+/)
              .filter((line) => line.length > 1);
            if (lines.length > 0) {
              productName = lines[0].substring(0, 100); // 첫 번째 의미있는 단어
            }
          }

          const href = $link.attr("href");
          const productLink = href ? normalizeUrl(href, baseUrl) : null;

          // 상품명이 최소 2글자 이상이어야 함
          if (productName && productName.length >= 2) {
            // 가격 찾기 (컨테이너 전체에서)
            let price: number | null = null;
            const priceText = $container
              .find(".price, [class*='price'], strong, em, .cost")
              .first()
              .text();
            if (!priceText) {
              // 숫자 패턴이 있는 텍스트 찾기
              const allText = $container.text();
              const priceMatch = allText.match(/(\d{1,3}(?:,\d{3})*)\s*원?/);
              if (priceMatch) {
                price = parsePrice(priceMatch[1]);
              }
            } else {
              price = parsePrice(priceText);
            }

            // 이미지 찾기 (컨테이너 전체에서)
            let imageUrl: string | null = null;
            const img = $container.find("img").first();
            if (img.length > 0) {
              const src =
                img.attr("src") ||
                img.attr("data-src") ||
                img.attr("data-original") ||
                img.attr("data-lazy-src");
              imageUrl = src ? normalizeUrl(src, baseUrl) : null;
            }

            products.push({
              id: productId,
              name: productName,
              price,
              purchase_link: productLink,
              image_url: imageUrl,
              manufacturer: null,
              description: null,
              category: null,
              iso_code: null, // ISO 코드는 추후 자동 매칭 로직에서 처리
            });
          }
        });
      } else {
        // 링크도 없으면 테이블 행이나 리스트 항목을 모두 시도
        console.log(
          "[Crawler] 링크 기반 탐색도 실패. 테이블/리스트 기반 탐색 시도..."
        );

        const fallbackSelectors = [
          "tr",
          "li",
          "div[class*='item']",
          "div[class*='product']",
        ];
        for (const selector of fallbackSelectors) {
          const elements = $(selector);
          if (elements.length > 0 && elements.length <= 100) {
            // 너무 많지 않은 경우에만 시도
            console.log(
              `[Crawler] 폴백 셀렉터 시도: ${selector} (${elements.length}개)`
            );
            elements.slice(0, maxProducts).each((index, element) => {
              const $el = $(element);
              const text = $el.text().trim();

              // 의미있는 텍스트가 있는 경우만
              if (text.length > 5 && text.length < 500) {
                const productId = `crawled-${Date.now()}-${index}`;
                const link = $el.find("a[href]").first();
                const href = link.attr("href");

                products.push({
                  id: productId,
                  name: text.split("\n")[0].trim().substring(0, 200),
                  price: parsePrice(text),
                  purchase_link: href ? normalizeUrl(href, baseUrl) : null,
                  image_url: null,
                  manufacturer: null,
                  description: null,
                  category: null,
                  iso_code: null, // ISO 코드는 추후 자동 매칭 로직에서 처리
                });
              }
            });

            if (products.length > 0) break;
          }
        }
      }
    }

    // 셀렉터로 찾은 경우 각 상품 요소에서 정보 추출
    if (productElements && productElements.length > 0) {
      // 테이블 행(tr)인 경우만 첫 번째 행(헤더) 스킵 시도
      const isTableRow = foundSelector?.toLowerCase().includes("tr");
      const startIndex = isTableRow ? 1 : 0;
      
      const elementsToProcess = productElements.slice(
        startIndex,
        startIndex + maxProducts
      );

      elementsToProcess.each((relativeIndex, element) => {
        const $el = $(element);
        const actualIndex = startIndex + relativeIndex;
        const productId = `crawled-${Date.now()}-${actualIndex}`;

        // 상품명 추출을 위한 이미지 요소 먼저 찾기
        const productImageEl = $el.find("img").first();

        // 상품명 추출 (에이블라이프 특화 + 범용)
        let productName = "";

        // 0. 에이블라이프 특화: .dsc 클래스 요소에서 직접 추출
        const dscElement = $el.find(".dsc").first();
        if (dscElement.length > 0) {
          // .dsc 요소의 모든 텍스트 노드 추출 (자식 요소 제외)
          const dscText = dscElement
            .clone()
            .children() // 모든 자식 요소 제거
            .remove()
            .end()
            .text()
            .trim();

          // 따옴표 제거 및 정리
          const cleanedText = dscText.replace(/^["\s]+|["\s]+$/g, "");

          if (cleanedText && cleanedText.length > 5) {
            // "== $0" 같은 불필요한 텍스트 제거
            const meaningfulText = cleanedText.replace(/^==\s*\$0\s*/, "").trim();
            if (meaningfulText.length > 5) {
              productName = meaningfulText;
            }
          }
        }

        // 1. 이미지 alt 속성에서 추출 (에이블라이프는 이미지 alt에 상품명이 있음)
        if (!productName) {
          if (productImageEl.length > 0) {
            productName =
              productImageEl.attr("alt") || productImageEl.attr("title") || "";
            if (productName) {
              productName = productName.trim();
            }
          }
        }

        // 2. 링크 텍스트에서 추출
        if (!productName) {
          const nameSelectors = [
            "a[href*='shopdetail']",
            "a[href*='product']",
            "a[href*='detail']",
            "a[href*='item']",
            "a[href*='goods']",
            "a[href]",
          ];

          for (const selector of nameSelectors) {
            const nameEl = $el.find(selector).first();
            if (nameEl.length > 0) {
              const linkText = nameEl.text().trim();
              // 링크 텍스트가 있고, URL이 아니고, 너무 짧지 않으면 사용
              if (
                linkText &&
                linkText.length > 2 &&
                !linkText.startsWith("http")
              ) {
                productName = linkText;
                break;
              }
            }
          }
        }

        // 3. 링크의 title이나 alt 속성 시도
        if (!productName) {
          const linkEl = $el.find("a[href]").first();
          if (linkEl.length > 0) {
            productName = linkEl.attr("title") || linkEl.attr("alt") || "";
            if (productName) {
              productName = productName.trim();
            }
          }
        }

        // 4. 테이블 셀(td)에서 직접 추출 시도 (에이블라이프 특화)
        if (!productName) {
          const tds = $el.find("td");
          if (tds.length > 0) {
            // 각 td를 순회하며 의미있는 텍스트 찾기
            tds.each((_, tdEl) => {
              const $td = $(tdEl);

              // td 내부의 모든 텍스트 노드 추출 (자식 요소 제외)
              const tdText = $td
                .clone()
                .children()
                .remove()
                .end()
                .text()
                .trim();

              // 링크가 있는 td의 경우, 링크 텍스트 우선
              const linkInTd = $td.find("a[href]").first();
              if (linkInTd.length > 0) {
                const linkText = linkInTd.text().trim();
                if (
                  linkText &&
                  linkText.length > 2 &&
                  !linkText.startsWith("http")
                ) {
                  productName = linkText;
                  return false; // break
                }
              }

              // td 자체 텍스트가 의미있으면 사용
              if (!productName && tdText && tdText.length > 3) {
                // 숫자만 있거나, URL, 또는 너무 짧은 텍스트는 제외
                if (
                  !/^[\d\s,원]+$/.test(tdText) &&
                  !tdText.startsWith("http") &&
                  !tdText.match(/^\d+$/)
                ) {
                  // 여러 줄 중 첫 번째 의미있는 줄 선택
                  const lines = tdText
                    .split(/\s+/)
                    .filter((line) => line.length > 1);
                  if (lines.length > 0) {
                    productName = lines[0];
                    return false; // break
                  }
                }
              }
            });
          }
        }

        // 5. 전체 요소의 텍스트에서 첫 번째 의미있는 줄 추출 (최후의 수단)
        if (!productName) {
          // 자식 요소를 제거하고 순수 텍스트만 추출
          const $clone = $el.clone();
          $clone.find("script, style, img").remove();
          const allText = $clone.text().trim();

          // 줄바꿈이나 공백으로 분리
          const lines = allText
            .split(/[\n\r]+/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          for (const line of lines) {
            // 의미있는 텍스트인지 확인
            // - 최소 3글자 이상
            // - 숫자만 있지 않음
            // - URL이 아님
            // - 가격 패턴이 아님 (예: "3,800,000원")
            if (
              line.length >= 3 &&
              !/^[\d\s,원]+$/.test(line) &&
              !line.startsWith("http") &&
              !line.match(/^\d{1,3}(?:,\d{3})*\s*원?$/)
            ) {
              productName = line;
              break;
            }
          }
        }

        // 상품명이 없으면 스킵
        if (!productName || productName.length < 2) {
          console.log(
            `[Crawler] 상품명을 찾을 수 없어 스킵: index ${actualIndex}`,
            {
              elementText: $el.text().trim().substring(0, 150),
              hasLink: $el.find("a[href]").length > 0,
              tdCount: $el.find("td").length,
              imgAlt: $el.find("img").first().attr("alt") || "없음",
              linkHref: $el.find("a[href]").first().attr("href") || "없음",
            }
          );
          return;
        }

        // 링크 추출
        let productLink: string | null = null;
        const linkEl = $el.find("a[href]").first();
        if (linkEl.length > 0) {
          const href = linkEl.attr("href");
          if (href) {
            productLink = normalizeUrl(href, baseUrl);
          }
        }

        // 가격 추출
        let price: number | null = null;
        const priceSelectors = [
          ".price",
          ".product_price",
          "[class*='price']",
          "strong",
          "td strong",
          "th strong",
          ".cost",
          "em",
        ];

        // 1. 특정 셀렉터로 가격 찾기
        for (const selector of priceSelectors) {
          const priceEl = $el.find(selector).first();
          if (priceEl.length > 0) {
            const priceText = priceEl.text().trim();
            price = parsePrice(priceText);
            if (price) break;
          }
        }

        // 2. 가격을 찾지 못한 경우, 전체 텍스트에서 숫자 패턴 검색 (에이블라이프 특화)
        if (!price) {
          const allText = $el.text();
          // "2,096,000원" 같은 패턴 찾기
          const priceMatch = allText.match(/(\d{1,3}(?:,\d{3})*)\s*원?/);
          if (priceMatch) {
            price = parsePrice(priceMatch[1]);
          }
        }

        // 이미지 추출 (위에서 찾은 productImageEl 재사용)
        let imageUrl: string | null = null;
        if (productImageEl.length > 0) {
          const src =
            productImageEl.attr("src") ||
            productImageEl.attr("data-src") ||
            productImageEl.attr("data-original") ||
            productImageEl.attr("data-lazy-src");
          if (src) {
            imageUrl = normalizeUrl(src, baseUrl);
          }
        }

        products.push({
          id: productId,
          name: productName,
          price,
          purchase_link: productLink,
          image_url: imageUrl,
          manufacturer: null,
          description: null,
          category: null,
          iso_code: null, // ISO 코드는 추후 자동 매칭 로직에서 처리
        });
      });
    }

    console.log(`[Crawler] 총 ${products.length}개 상품 추출 완료`);

    // 디버깅 정보 수집 (상품이 없을 때만)
    const debugInfo =
      products.length === 0
        ? {
            htmlLength: html.length,
            title: $("title").text().trim(),
            linkCount: $("a[href]").length,
            tableCount: $("table").length,
            listCount: $("ul, ol").length,
            foundSelector: foundSelector || null,
            sampleLinks: $("a[href]")
              .slice(0, 5)
              .map((_, el) => {
                const href = $(el).attr("href");
                const text = $(el).text().trim();
                return { href, text: text.substring(0, 50) };
              })
              .get(),
          }
        : undefined;

    if (debugInfo) {
      console.log("[Crawler] 디버깅 정보:", JSON.stringify(debugInfo, null, 2));
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

    if (!body.url) {
      return NextResponse.json(
        { error: "URL이 필요합니다.", products: [] },
        { status: 400 }
      );
    }

    const maxProducts = body.max || 30;
    const result = await crawlProducts(body.url, maxProducts);

    // ISO 코드는 추후 자동 매칭 로직에서 처리되므로 여기서는 null로 유지

    return NextResponse.json({
      success: true,
      products: result.products,
      message: `${result.products.length}개 상품을 찾았습니다.`,
      debug: result.debug, // 디버깅 정보는 crawlProducts에서 반환
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
