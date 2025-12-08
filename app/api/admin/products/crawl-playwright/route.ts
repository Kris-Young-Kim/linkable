import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import { PlaywrightScraper } from "@/scripts/crawlers/playwright-scraper";
import { getSiteConfig } from "@/scripts/crawlers/site-config";

const mapReasonToStatus = (
  reason: "not_authenticated" | "insufficient_permissions" | "error"
) => {
  if (reason === "not_authenticated") return 401;
  if (reason === "insufficient_permissions") return 403;
  return 500;
};

/**
 * Playwright 크롤링 API
 * 웹사이트 URL만 받아서 Playwright로 크롤링
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess();

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    url: string;
    isoCode?: string;
    max?: number;
  };

  if (!body.url) {
    return NextResponse.json(
      { error: "웹사이트 URL이 필요합니다." },
      { status: 400 }
    );
  }

  // 프로토콜이 없으면 https:// 붙이기
  if (!/^https?:\/\//i.test(body.url)) {
    body.url = `https://${body.url}`;
  }

  try {
    console.log(`[Playwright Crawl] 크롤링 시작: ${body.url}`);

    // URL에서 사이트 이름 추출 (선택 사항)
    let siteName: string | undefined;
    if (body.url.includes("ablelife.co.kr")) {
      siteName = "ablelife";
    } else if (body.url.includes("wheelopia.co.kr")) {
      siteName = "wheelopia";
    } else if (body.url.includes("carelifemall.co.kr")) {
      siteName = "carelifemall";
    } else if (body.url.includes("willbe.kr")) {
      siteName = "willbe";
    } else if (body.url.includes("plusezer.com")) {
      siteName = "plusezer";
    }

    // 사이트 설정 가져오기 (있는 경우)
    const siteConfig = siteName ? getSiteConfig(siteName, body.url) : undefined;

    // Playwright 크롤러 초기화
    const scraper = new PlaywrightScraper(siteConfig || undefined);

    try {
      // 브라우저 초기화
      await scraper.init(true); // 헤드리스 모드

      // 제품 크롤링 (타임아웃 설정)
      const maxResults = Math.min(body.max || 10, 50); // 최대 50개로 제한

      // 타임아웃을 10분으로 증가 (5분 -> 10분)
      const products = await Promise.race([
        scraper.scrapeProducts({
          url: body.url,
          maxResults: maxResults,
          delayMs: 2000,
          headless: true,
          timeout: 10000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("크롤링 타임아웃 (10분 초과)")),
            600000 // 10분
          )
        ),
      ]);

      if (products.length === 0) {
        return NextResponse.json({
          success: false,
          message: "제품을 찾을 수 없습니다.",
          products: [],
        });
      }

      // ScrapedProduct 형식으로 변환
      const scrapedProducts = products.map((p) => {
        const sp = scraper.toScrapedProduct(p);
        return {
          id: p.purchaseLink || p.name,
          name: sp.name,
          price: sp.price,
          purchase_link: sp.purchase_link,
          image_url: sp.image_url,
          iso_code: body.isoCode || "00 00",
          description: sp.description,
          manufacturer: sp.manufacturer,
          category: sp.category,
        };
      });

      console.log(
        `[Playwright Crawl] 크롤링 완료: ${scrapedProducts.length}개 제품`
      );

      return NextResponse.json({
        success: true,
        message: `${scrapedProducts.length}개 제품을 찾았습니다.`,
        products: scrapedProducts,
      });
    } finally {
      await scraper.close();
    }
  } catch (error) {
    console.error("[Playwright Crawl] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "크롤링 실패",
        products: [],
      },
      { status: 500 }
    );
  }
}
