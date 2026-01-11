/**
 * MCP Hyperbrowser 서버 테스트 스크립트
 * 
 * 이 스크립트는 Hyperbrowser SDK가 제대로 작동하는지 테스트합니다.
 * MCP 서버는 Cursor IDE 레벨에서 동작하므로, SDK를 직접 테스트합니다.
 */

// 환경 변수 로드
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { Hyperbrowser } from "@hyperbrowser/sdk";
import { connect } from "puppeteer-core";

async function testHyperbrowser() {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  
  if (!apiKey) {
    console.error("❌ HYPERBROWSER_API_KEY가 설정되지 않았습니다.");
    console.log("💡 .env.local 파일에 HYPERBROWSER_API_KEY를 추가하세요.");
    process.exit(1);
  }

  console.log("✅ HYPERBROWSER_API_KEY가 설정되어 있습니다.");
  console.log(`🔑 API 키 길이: ${apiKey.length}자 (처음 10자: ${apiKey.substring(0, 10)}...)`);

  const client = new Hyperbrowser({
    apiKey: apiKey,
  });

  let session: any = null;
  let browser: any = null;

  try {
    console.log("\n📡 Hyperbrowser 세션 생성 중...");
    session = await client.sessions.create({
      useStealth: true,
    });
    console.log(`✅ 세션 생성 성공! 세션 ID: ${session.id}`);
    console.log(`🌐 WebSocket 엔드포인트: ${session.wsEndpoint?.substring(0, 50)}...`);

    console.log("\n🔌 브라우저 연결 중...");
    browser = await connect({
      browserWSEndpoint: session.wsEndpoint,
      defaultViewport: null,
    });
    console.log("✅ 브라우저 연결 성공!");

    console.log("\n📄 테스트 페이지 생성 중...");
    const pages = await browser.pages();
    let page = pages[0];
    if (!page) {
      page = await browser.newPage();
    }
    console.log("✅ 페이지 준비 완료!");

    console.log("\n🌐 간단한 웹페이지 로드 테스트 중...");
    const testUrl = "https://example.com";
    await page.goto(testUrl, { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`✅ 페이지 로드 성공: ${testUrl}`);

    const title = await page.title();
    console.log(`📝 페이지 제목: ${title}`);

    const url = page.url();
    console.log(`🔗 현재 URL: ${url}`);

    console.log("\n✅ 모든 테스트 통과!");
    console.log("🎉 Hyperbrowser SDK가 정상적으로 작동합니다.");
    console.log("💡 MCP 서버도 동일한 SDK를 사용하므로 정상 작동할 것입니다.");

  } catch (error: any) {
    console.error("\n❌ 테스트 실패:");
    console.error("오류 메시지:", error.message);
    if (error.stack) {
      console.error("스택 트레이스:", error.stack);
    }
    
    // HTTP 오류인 경우
    if (error.response) {
      console.error("HTTP 상태:", error.response.status);
      console.error("응답 데이터:", error.response.data);
    }
    
    process.exit(1);
  } finally {
    try {
      if (browser) {
        console.log("\n🧹 브라우저 연결 해제 중...");
        await browser.disconnect();
        console.log("✅ 브라우저 연결 해제 완료");
      }
      if (session) {
        console.log("🧹 세션 종료 중...");
        await client.sessions.stop(session.id);
        console.log("✅ 세션 종료 완료");
      }
    } catch (cleanupError: any) {
      console.warn("⚠️ 정리 중 오류:", cleanupError.message);
    }
  }
}

// 스크립트 실행
testHyperbrowser().catch((error) => {
  console.error("예상치 못한 오류:", error);
  process.exit(1);
});
