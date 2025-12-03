/**
 * 범용 웹 스크래핑 크롤러
 * 사이트별 설정을 기반으로 크롤링 수행
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import type { ScrapedProduct, ScraperOptions, ScraperResult } from "./types";
import { delay, retry, parsePrice, normalizeUrl } from "./utils";
import type { SiteConfig } from "./site-config";

export class GenericScraper {
  private browser: Browser | null = null;
  private siteConfig: SiteConfig;

  constructor(siteConfig: SiteConfig) {
    this.siteConfig = siteConfig;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  async scrape(options: ScraperOptions): Promise<ScraperResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const products: ScrapedProduct[] = [];
    const errors: string[] = [];

    try {
      const context = await this.browser!.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        // 불필요한 리소스 로딩 차단 (성능 향상)
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      // 불필요한 리소스 로딩 차단 (폰트, 미디어만 차단, 이미지는 유지)
      await page.route("**/*", (route) => {
        const resourceType = route.request().resourceType();
        // 폰트와 미디어만 차단 (이미지는 URL 추출을 위해 유지)
        if (["font", "media"].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // 검색 URL 생성
      const searchUrl = this.buildSearchUrl(options);
      const searchType = options.category
        ? `카테고리 "${options.category}"`
        : `키워드 "${options.keyword}"`;
      console.log(`🔍 ${this.siteConfig.name} 크롤링 중: ${searchType}`);
      console.log(`   URL: ${searchUrl}`);

      // 더 빠른 로딩 전략 사용 (domcontentloaded가 networkidle보다 빠름)
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000, // 타임아웃 증가 (30초 -> 60초)
      });

      // 페이지 로딩 대기 (필요한 경우에만)
      await page.waitForTimeout(8000); // 페이지가 완전히 로드될 때까지 대기 (5초 -> 8초)

      // 상품 목록 찾기 (타임아웃 증가)
      let productElements: any[] = [];
      let workingSelector = "";
      
      // 먼저 테이블이 있는지 확인
      const hasTable = await page.evaluate(() => {
        return document.querySelector("table") !== null;
      });
      
      if (hasTable) {
        console.log(`   📋 테이블 구조 감지됨`);
        // 테이블이 있으면 더 긴 대기 시간
        await page.waitForTimeout(3000);
      }

      for (const selector of this.siteConfig.selectors.productList) {
        try {
          console.log(`   🔍 셀렉터 시도 중: ${selector}`);
          
          // waitForSelector 대신 직접 요소 찾기 시도
          productElements = await page.$$(selector);
          
          // 링크 요소를 찾은 경우, 부모 요소(tr 또는 td)로 변환
          if (productElements.length > 0 && selector.includes("a[href")) {
            const parentElements: any[] = [];
            for (const linkEl of productElements) {
              try {
                // 부모 요소 찾기 (evaluateHandle 사용)
                const parentHandle = await linkEl.evaluateHandle((el: any) => {
                  let current = el.parentElement;
                  while (current) {
                    if (current.tagName === "TR" || current.tagName === "TD") {
                      return current;
                    }
                    current = current.parentElement;
                  }
                  return el.parentElement || el;
                });
                parentElements.push(parentHandle);
              } catch {
                // 부모 찾기 실패 시 원본 사용
                parentElements.push(linkEl);
              }
            }
            if (parentElements.length > 0) {
              productElements = parentElements;
            }
          }
          
          if (productElements.length > 0) {
            workingSelector = selector;
            console.log(
              `   ✅ 상품 목록 발견: ${selector} (${productElements.length}개)`
            );
            break;
          } else {
            console.log(`   ⚠️  ${selector}: 요소 0개`);
            // 요소가 없어도 다음 셀렉터 시도
          }
        } catch (error) {
          console.log(`   ❌ ${selector}: 오류 - ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (productElements.length === 0) {
        // 디버깅: 페이지 HTML 구조 상세 확인
        console.log(`   🔍 페이지 HTML 구조 상세 분석 중...`);

        const pageInfo = await page.evaluate(() => {
          // 모든 관련 클래스 찾기
          const allElements = document.querySelectorAll("*");
          const classSet = new Set<string>();
          const tagSet = new Set<string>();

          allElements.forEach((el) => {
            if (el.className && typeof el.className === "string") {
              el.className.split(" ").forEach((cls) => {
                if (
                  cls &&
                  (cls.includes("product") ||
                    cls.includes("item") ||
                    cls.includes("list") ||
                    cls.includes("prd") ||
                    cls.includes("goods"))
                ) {
                  classSet.add(cls);
                }
              });
            }
            if (el.tagName) {
              tagSet.add(el.tagName.toLowerCase());
            }
          });

          // 테이블 행 찾기
          const tableRows: any[] = [];
          document.querySelectorAll("table tr, tbody tr, tr").forEach((el, idx) => {
            if (idx < 20) {
              const text = el.textContent?.trim() || "";
              const hasLink = el.querySelector("a[href*='goods_view']") !== null;
              const hasImage = el.querySelector("img") !== null;
              const linkHref = el.querySelector("a[href*='goods_view']")?.getAttribute("href") || null;
              
              if (text.length > 10 && (hasLink || hasImage)) {
                tableRows.push({
                  tag: el.tagName.toLowerCase(),
                  text: text.substring(0, 100),
                  hasLink,
                  hasImage,
                  linkHref,
                  children: Array.from(el.children).slice(0, 5).map((child) => ({
                    tag: child.tagName.toLowerCase(),
                    classes: Array.from(child.classList).join(" "),
                    text: child.textContent?.trim().substring(0, 50) || "",
                  })),
                });
              }
            }
          });

          // li, ul, div 요소 중 상품 관련으로 보이는 것 찾기
          const candidateElements: any[] = [];
          document
            .querySelectorAll(
              "li, div[class*='product'], div[class*='item'], div[class*='prd']"
            )
            .forEach((el, idx) => {
              if (idx < 10) {
                const classes = Array.from(el.classList).join(" ");
                const text = el.textContent?.trim().substring(0, 100) || "";
                const children = Array.from(el.children)
                  .slice(0, 3)
                  .map((child) => ({
                    tag: child.tagName.toLowerCase(),
                    classes: Array.from(child.classList).join(" "),
                    text: child.textContent?.trim().substring(0, 50) || "",
                  }));

                if (text.length > 10) {
                  // 텍스트가 있는 요소만
                  candidateElements.push({
                    tag: el.tagName.toLowerCase(),
                    classes,
                    text,
                    children,
                  });
                }
              }
            });

          return {
            url: window.location.href,
            title: document.title,
            classes: Array.from(classSet).sort(),
            tags: Array.from(tagSet).sort(),
            tableRows,
            candidates: candidateElements,
          };
        });

        console.log(`   📄 페이지 URL: ${pageInfo.url}`);
        console.log(`   📄 페이지 제목: ${pageInfo.title}`);
        console.log(`   🔍 발견된 관련 클래스 (${pageInfo.classes.length}개):`);
        pageInfo.classes
          .slice(0, 20)
          .forEach((cls: string) => console.log(`      - ${cls}`));

        if (pageInfo.tableRows && pageInfo.tableRows.length > 0) {
          console.log(`   📋 테이블 행 발견 (${pageInfo.tableRows.length}개):`);
          pageInfo.tableRows.slice(0, 5).forEach((row: any, idx: number) => {
            console.log(`      ${idx + 1}. <${row.tag}>`);
            console.log(`         텍스트: ${row.text}`);
            if (row.hasLink) {
              console.log(`         링크: ${row.linkHref}`);
            }
            if (row.hasImage) {
              console.log(`         이미지: 있음`);
            }
            if (row.children.length > 0) {
              console.log(`         자식 요소:`);
              row.children.forEach((child: any) => {
                console.log(`           - <${child.tag}> class="${child.classes}" - ${child.text}`);
              });
            }
          });
        }

        console.log(`   🔍 상품 후보 요소 (${pageInfo.candidates.length}개):`);
        pageInfo.candidates
          .slice(0, 5)
          .forEach((candidate: any, idx: number) => {
            console.log(
              `      ${idx + 1}. <${candidate.tag}> class="${
                candidate.classes
              }"`
            );
            console.log(`         텍스트: ${candidate.text}`);
            if (candidate.children.length > 0) {
              candidate.children.forEach((child: any) => {
                console.log(
                  `         - <${child.tag}> class="${child.classes}" - ${child.text}`
                );
              });
            }
          });

        // 스크린샷 저장 (디버깅용)
        try {
          const screenshotPath = `debug-${
            this.siteConfig.name
          }-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`   📸 전체 페이지 스크린샷 저장됨: ${screenshotPath}`);
        } catch (e) {
          console.log(`   ⚠️  스크린샷 저장 실패: ${e}`);
        }

        errors.push("상품 목록을 찾을 수 없습니다.");
        console.warn(
          `   ⚠️  ${this.siteConfig.name}: 상품 목록을 찾을 수 없습니다.`
        );
        console.warn(
          `   시도한 셀렉터: ${this.siteConfig.selectors.productList.join(
            ", "
          )}`
        );
        await page.close();
        await context.close();
        return {
          success: false,
          products: [],
          errors,
        };
      }

      const maxResults = options.maxResults || 10;
      const itemsToProcess = productElements.slice(0, maxResults);

      console.log(`📦 ${itemsToProcess.length}개 상품 처리 시작`);

      for (let i = 0; i < itemsToProcess.length; i++) {
        try {
          console.log(
            `\n   📦 상품 ${i + 1}/${itemsToProcess.length} 추출 중...`
          );
          const product = await retry(
            () => this.extractProductInfo(page, itemsToProcess[i], searchUrl),
            3
          );

          if (product && product.name && product.purchase_link) {
            products.push(product);
            console.log(
              `   ✅ ${i + 1}/${itemsToProcess.length}: ${product.name} (${
                product.price?.toLocaleString() || "가격 없음"
              }원)`
            );
          } else {
            console.warn(
              `   ⚠️  상품 ${i + 1}: 정보 추출 실패 (이름: ${
                product?.name || "없음"
              }, 링크: ${product?.purchase_link || "없음"})`
            );
          }

          if (i < itemsToProcess.length - 1) {
            await delay(options.delay || 1000);
          }
        } catch (error) {
          const errorMsg = `상품 ${i + 1} 추출 실패: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
          console.warn(`   ⚠️  ${errorMsg}`);
        }
      }

      await page.close();
      await context.close();
    } catch (error) {
      errors.push(
        `크롤링 실패: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error(`❌ ${this.siteConfig.name} 크롤링 오류:`, error);
    }

    return {
      success: errors.length === 0,
      products,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 검색 URL 생성
   */
  private buildSearchUrl(options: ScraperOptions): string {
    // 카테고리 URL 우선 사용
    if (options.category && this.siteConfig.categoryUrls) {
      const categoryUrl = this.siteConfig.categoryUrls[options.category];
      if (categoryUrl) {
        return categoryUrl;
      }
    }

    // 직접 제공된 카테고리 URL 사용
    if (options.categoryUrl) {
      return options.categoryUrl;
    }

    // 검색 키워드 사용
    if (options.keyword && this.siteConfig.searchUrl) {
      // {keyword} 치환
      let url = this.siteConfig.searchUrl.replace(
        /{keyword}/g,
        encodeURIComponent(options.keyword)
      );
      // 다른 플레이스홀더가 있으면 제거 (예: {xcode}, {mcode})
      url = url.replace(/\{[^}]+\}/g, "");
      return url;
    }

    // 기본 검색 URL이 없으면 메인 페이지로 이동
    return this.siteConfig.baseUrl;
  }

  /**
   * 상품 정보 추출
   */
  private async extractProductInfo(
    page: Page,
    element: any,
    baseUrl: string
  ): Promise<ScrapedProduct | null> {
    try {
      // 상품명 추출
      let name = "";
      for (const selector of this.siteConfig.selectors.productName) {
        try {
          const nameElement = await element.$(selector);
          if (nameElement) {
            // 링크 요소인 경우 직접 텍스트 추출
            const tagName = await nameElement.evaluate((el: any) => el.tagName?.toLowerCase() || "");
            if (tagName === "a") {
              // 링크의 직접 텍스트 또는 내부 요소의 텍스트
              name = (await nameElement.textContent())?.trim() || "";
              // 링크 내부에 다른 요소가 있으면 그것의 텍스트도 시도
              if (!name || name.length < 3) {
                const innerText = await nameElement.evaluate((el: any) => {
                  const text = el.innerText?.trim() || el.textContent?.trim() || "";
                  return text;
                });
                name = innerText || name;
              }
            } else {
              name = (await nameElement.textContent())?.trim() || "";
            }
            
            if (name && name.length > 2) {
              console.log(
                `      ✅ 상품명 발견: ${name.substring(
                  0,
                  30
                )}... (셀렉터: ${selector})`
              );
              break;
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      if (!name) {
        // 디버깅: 요소의 HTML 구조 확인
        try {
          const elementHTML = await element.evaluate((el: any) => el.innerHTML);
          const elementText = await element.evaluate((el: any) => el.innerText);
          const elementClasses = await element.evaluate(
            (el: any) => el.className
          );
          console.log(`      ⚠️  상품명을 찾을 수 없습니다.`);
          console.log(`      요소 클래스: ${elementClasses}`);
          console.log(
            `      요소 텍스트 (일부): ${elementText.substring(0, 200)}...`
          );
          console.log(
            `      요소 HTML (일부): ${elementHTML.substring(0, 500)}...`
          );

          // 모든 링크 요소에서 텍스트 찾기 시도
          const allLinks = await element.$$("a");
          if (allLinks.length > 0) {
            for (let i = 0; i < Math.min(allLinks.length, 3); i++) {
              const linkText = (await allLinks[i].textContent())?.trim() || "";
              if (linkText && linkText.length > 5) {
                console.log(
                  `      🔍 링크 텍스트 발견 (${
                    i + 1
                  }번째): ${linkText.substring(0, 50)}...`
                );
                name = linkText;
                break;
              }
            }
          }

          // 모든 텍스트 노드에서 찾기
          if (!name) {
            const allText = elementText.trim();
            if (allText && allText.length > 5 && allText.length < 200) {
              console.log(
                `      🔍 전체 텍스트 사용: ${allText.substring(0, 50)}...`
              );
              name = allText.split("\n")[0].trim(); // 첫 번째 줄만 사용
            }
          }
        } catch (e) {
          console.log(
            `      ⚠️  상품명을 찾을 수 없습니다. (요소 정보 확인 실패: ${e})`
          );
        }

        if (!name) {
          return null;
        }
      }

      // 가격 추출
      let price: number | null = null;
      for (const selector of this.siteConfig.selectors.productPrice) {
        try {
          const priceElement = await element.$(selector);
          if (priceElement) {
            const priceText = (await priceElement.textContent())?.trim() || "";
            price = parsePrice(priceText);
            if (price) break;
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // 이미지 URL 추출
      let imageUrl: string | null = null;
      for (const selector of this.siteConfig.selectors.productImage) {
        try {
          const imageElement = await element.$(selector);
          if (imageElement) {
            imageUrl =
              (await imageElement.getAttribute("src")) ||
              (await imageElement.getAttribute("data-src")) ||
              null;
            if (imageUrl) {
              imageUrl = normalizeUrl(imageUrl, baseUrl);
              break;
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // 구매 링크 추출
      let purchaseLink = "";
      for (const selector of this.siteConfig.selectors.productLink) {
        try {
          const linkElement = await element.$(selector);
          if (linkElement) {
            const href = await linkElement.getAttribute("href");
            if (href) {
              purchaseLink = normalizeUrl(href, this.siteConfig.baseUrl);
              console.log(
                `      ✅ 링크 발견: ${purchaseLink.substring(
                  0,
                  50
                )}... (셀렉터: ${selector})`
              );
              break;
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      if (!purchaseLink) {
        console.log(`      ⚠️  구매 링크를 찾을 수 없습니다.`);
        // 디버깅: 모든 링크 요소 확인
        try {
          const allLinks = await element.$$("a");
          console.log(`      발견된 링크 수: ${allLinks.length}개`);
          if (allLinks.length > 0) {
            const firstLinkHref = await allLinks[0].getAttribute("href");
            console.log(`      첫 번째 링크 href: ${firstLinkHref || "없음"}`);
          }
        } catch {
          // 무시
        }
        return null;
      }

      return {
        name,
        price,
        image_url: imageUrl,
        purchase_link: purchaseLink,
        category: this.siteConfig.name.toLowerCase(),
      };
    } catch (error) {
      throw new Error(
        `상품 정보 추출 중 오류: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 개별 제품 상세 페이지에서 정보 추출
   */
  async scrapeProductDetail(productUrl: string): Promise<ScrapedProduct | null> {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      const context = await this.browser!.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      // 불필요한 리소스 로딩 차단
      await page.route("**/*", (route) => {
        const resourceType = route.request().resourceType();
        if (["font", "media"].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log(`🔍 제품 상세 페이지 크롤링: ${productUrl}`);

      await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(5000);

      // 제품명 추출
      let name = "";
      for (const selector of this.siteConfig.selectors.productName) {
        try {
          const nameElement = await page.$(selector);
          if (nameElement) {
            name = (await nameElement.textContent())?.trim() || "";
            if (name && name.length > 2) {
              break;
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // 제품명이 없으면 페이지 제목 사용
      if (!name) {
        name = await page.title();
        // 제목에서 불필요한 부분 제거
        name = name.replace(/\s*[-|]\s*.*$/, "").trim();
      }

      // 가격 추출
      let price: number | null = null;
      for (const selector of this.siteConfig.selectors.productPrice) {
        try {
          const priceElement = await page.$(selector);
          if (priceElement) {
            const priceText = (await priceElement.textContent())?.trim() || "";
            price = parsePrice(priceText);
            if (price) break;
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // wheelopia 특화 가격 추출 (테이블 형식)
      if (!price) {
        try {
          const priceText = await page.evaluate(() => {
            // "판매가격" 또는 "가격" 텍스트가 있는 행 찾기
            const rows = Array.from(document.querySelectorAll("table tr, tr"));
            for (const row of rows) {
              const text = row.textContent || "";
              if (text.includes("판매가격") || text.includes("가격") || text.includes("원")) {
                const strong = row.querySelector("strong, b");
                if (strong) {
                  return strong.textContent || "";
                }
                // strong이 없으면 전체 텍스트에서 숫자 추출
                const match = text.match(/([0-9,]+)\s*원/);
                if (match) {
                  return match[1];
                }
              }
            }
            return null;
          });
          if (priceText) {
            price = parsePrice(priceText);
          }
        } catch {
          // 무시
        }
      }

      // 이미지 URL 추출
      let imageUrl: string | null = null;
      for (const selector of this.siteConfig.selectors.productImage) {
        try {
          const imageElement = await page.$(selector);
          if (imageElement) {
            imageUrl =
              (await imageElement.getAttribute("src")) ||
              (await imageElement.getAttribute("data-src")) ||
              null;
            if (imageUrl) {
              imageUrl = normalizeUrl(imageUrl, this.siteConfig.baseUrl);
              break;
            }
          }
        } catch {
          // 다음 셀렉터 시도
        }
      }

      // wheelopia 특화 이미지 추출
      if (!imageUrl) {
        try {
          const imgSrc = await page.evaluate(() => {
            // 제품 상세 이미지 찾기
            const img = document.querySelector("img[src*='data'], img[src*='goods'], img[src*='product']");
            return img ? (img.getAttribute("src") || img.getAttribute("data-src")) : null;
          });
          if (imgSrc) {
            imageUrl = normalizeUrl(imgSrc, this.siteConfig.baseUrl);
          }
        } catch {
          // 무시
        }
      }

      await page.close();
      await context.close();

      if (!name) {
        console.warn(`⚠️  제품명을 찾을 수 없습니다: ${productUrl}`);
        return null;
      }

      return {
        name,
        price,
        image_url: imageUrl,
        purchase_link: productUrl,
        category: this.siteConfig.name.toLowerCase(),
      };
    } catch (error) {
      console.error(`❌ 제품 상세 페이지 크롤링 오류: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
