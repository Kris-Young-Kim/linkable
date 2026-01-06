#!/usr/bin/env tsx
/**
 * ISO 제품 추천 API 테스트 스크립트
 */

import { config } from "dotenv";
import { resolve } from "path";

// 환경 변수 로드
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// 로컬 개발 환경에서 테스트
const baseUrl = "http://localhost:3000";

/**
 * API 테스트 함수
 */
async function testIsoProductAPI() {
  const baseUrl = "http://localhost:3000";

  console.log("🚀 ISO 제품 추천 API 테스트");
  console.log(`📍 API 엔드포인트: ${baseUrl}/api/recommendations/iso-products`);
  console.log("=".repeat(60));

  // 테스트 케이스들
  const testCases = [
    {
      name: "요리 어려움 (근력 + 요리 준비)",
      icfCodes: ["b730", "d630", "d640"],
      expectedIsoCodes: ["15 03", "12 31"]
    },
    {
      name: "시각 장애",
      icfCodes: ["b210", "b215", "d110"],
      expectedIsoCodes: ["22 03"]
    },
    {
      name: "청각 장애",
      icfCodes: ["b230", "d115"],
      expectedIsoCodes: ["21 06"]
    },
    {
      name: "이동 장애",
      icfCodes: ["d450", "d465"],
      expectedIsoCodes: ["18 30", "12 31"]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 테스트: ${testCase.name}`);
    console.log(`   ICF 코드: ${testCase.icfCodes.join(", ")}`);
    console.log(`   예상 ISO: ${testCase.expectedIsoCodes.join(", ")}`);

    try {
      const response = await fetch(`${baseUrl}/api/recommendations/iso-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          icfCodes: testCase.icfCodes,
          options: {
            limit: 5,
            diversifyCategories: true
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(`   ❌ HTTP ${response.status}: ${errorData.error}`);
        continue;
      }

      const data = await response.json();

      if (!data.success) {
        console.log(`   ❌ API 오류: ${data.error}`);
        continue;
      }

      const result = data.data;
      console.log(`   ✅ 성공 (${result.processingTime}ms)`);
      console.log(`   📊 ISO 매칭: ${result.isoMatches.length}개`);

      result.isoMatches.forEach((iso: any) => {
        console.log(`      - ${iso.isoCode}: ${iso.label} (${(iso.confidence * 100).toFixed(0)}% 신뢰도)`);
      });

      console.log(`   🛒 추천 제품: ${result.recommendations.length}개`);

      result.recommendations.slice(0, 3).forEach((product: any, index: number) => {
        console.log(`      ${index + 1}. ${product.name}`);
        console.log(`         가격: ${product.price?.toLocaleString()}원`);
        console.log(`         매칭 점수: ${(product.match_score * 100).toFixed(1)}%`);
        console.log(`         이유: ${product.match_reason}`);
      });

    } catch (error) {
      console.log(`   ❌ 네트워크 오류: ${error}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ API 테스트 완료");
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    await testIsoProductAPI();
  } catch (error) {
    console.error("\n❌ 테스트 실행 중 오류 발생:");
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}