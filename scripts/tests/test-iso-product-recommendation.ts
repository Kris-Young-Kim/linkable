#!/usr/bin/env tsx
/**
 * ISO 코드 기반 보조기기 추천 테스트 스크립트
 *
 * ISO 코드를 기반으로 제품 추천 로직을 테스트합니다.
 */

import { config } from "dotenv";
import { resolve } from "path";
import {
  recommendProductsByIsoCode,
  recommendProductsByMultipleIsoCodes,
  formatProductRecommendations
} from "@/core/matching/iso-product-recommender";
import type { IsoMatch } from "@/core/matching/iso-mapping";

// 환경 변수 로드
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * 샘플 제품 데이터 생성 (실제 데이터베이스 대신)
 */
async function createSampleProducts() {
  const sampleProducts = [
    // 시각 보조기기 (22 03)
    {
      id: "prod-001",
      name: "전자 확대경",
      iso_code: "22 03",
      category: "시각",
      manufacturer: "Samsung",
      price: 150000,
      description: "시력이 낮은 분들을 위한 고화질 확대경"
    },
    {
      id: "prod-002",
      name: "점자 디스플레이",
      iso_code: "22 03",
      category: "시각",
      manufacturer: "LG",
      price: 300000,
      description: "점자를 음성으로 변환하는 디스플레이"
    },

    // 청각 보조기기 (21 06)
    {
      id: "prod-003",
      name: "디지털 보청기",
      iso_code: "21 06",
      category: "청각",
      manufacturer: "Siemens",
      price: 800000,
      description: "난청을 위한 고성능 보청기"
    },

    // 요리 보조기기 (15 03)
    {
      id: "prod-004",
      name: "무게 조절 식기 세트",
      iso_code: "15 03",
      category: "식사",
      manufacturer: "CookAid",
      price: 45000,
      description: "손 떨림이 있는 분들을 위한 가벼운 식기"
    },
    {
      id: "prod-005",
      name: "원핸드 캔 오프너",
      iso_code: "15 03",
      category: "식사",
      manufacturer: "EasyOpen",
      price: 25000,
      description: "한 손으로 사용할 수 있는 캔 오프너"
    },
    {
      id: "prod-006",
      name: "요리 타이머 (대형 버튼)",
      iso_code: "15 03",
      category: "식사",
      manufacturer: "BigTimer",
      price: 35000,
      description: "시력이 낮은 분들을 위한 대형 버튼 타이머"
    },

    // 이동 보조기기 (12 31)
    {
      id: "prod-007",
      name: "전동 체위 변경 리프트",
      iso_code: "12 31",
      category: "이동",
      manufacturer: "MediLift",
      price: 1200000,
      description: "침대에서 휠체어로 이동을 돕는 전동 리프트"
    },

    // 관련 제품들 (부분 매칭용)
    {
      id: "prod-008",
      name: "요리용 그립 보조기",
      iso_code: "15 12",
      category: "식사",
      manufacturer: "GripMaster",
      price: 15000,
      description: "도마와 냄비를 고정하는 그립 도구"
    }
  ];

  return sampleProducts;
}

/**
 * 단일 ISO 코드 추천 테스트
 */
async function testSingleIsoRecommendation() {
  console.log("🔍 단일 ISO 코드 추천 테스트");
  console.log("=".repeat(50));

  const testCases = [
    { isoCode: "15 03", description: "요리 보조기기" },
    { isoCode: "22 03", description: "시각 보조기기" },
    { isoCode: "21 06", description: "청각 보조기기" },
    { isoCode: "12 31", description: "체위 변경 보조기기" },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.description} (${testCase.isoCode})`);

    try {
      // 실제로는 데이터베이스에서 조회하지만, 여기서는 샘플 데이터 사용
      const result = await recommendProductsByIsoCode(testCase.isoCode, {
        limit: 5,
        minScore: 0.1
      });

      console.log(`   찾은 제품: ${result.products.length}개`);
      console.log(`   신뢰도: ${(result.confidence * 100).toFixed(1)}%`);

      if (result.products.length > 0) {
        result.products.slice(0, 3).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name}`);
          console.log(`      점수: ${(product.score * 100).toFixed(1)}%, 우선순위: ${product.priority}`);
          console.log(`      이유: ${product.match_reason}`);
        });
      } else {
        console.log("   ❌ 추천 제품 없음");
      }

    } catch (error) {
      console.log(`   ❌ 오류 발생: ${error}`);
    }
  }
}

/**
 * 다중 ISO 코드 추천 테스트
 */
async function testMultipleIsoRecommendation() {
  console.log("\n🔍 다중 ISO 코드 추천 테스트");
  console.log("=".repeat(50));

  // 요리 어려움 시나리오 (ICF: b730 근력, d630 요리 준비, d640 가정생활)
  // ISO 매칭 결과: 15 03 (요리), 12 31 (체위 변경)
  const isoMatches: IsoMatch[] = [
    {
      isoCode: "15 03",
      label: "음식 및 음료 준비 보조기기",
      description: "요리 및 음식 준비를 돕는 보조기기",
      score: 0.85,
      matchedIcf: [
        { code: "d630", description: "식사 준비하기" },
        { code: "d640", description: "가사 일하기" }
      ],
      reason: "ICF 코드 직접 매핑"
    },
    {
      isoCode: "12 31",
      label: "체위 변경 보조기기",
      description: "서기/앉기/누우기를 돕는 보조기",
      score: 0.75,
      matchedIcf: [
        { code: "b730", description: "근력" }
      ],
      reason: "근력 저하 관련 매핑"
    }
  ];

  console.log("📋 시나리오: 요리하기가 어려운 환자");
  console.log("   ICF 코드: b730(근력), d630(요리 준비), d640(가정생활)");
  console.log("   ISO 매칭: 15 03(요리), 12 31(체위 변경)");

  try {
    const result = await recommendProductsByMultipleIsoCodes(isoMatches, {
      limit: 8,
      maxProductsPerIso: 4,
      diversifyCategories: true
    });

    console.log(`\n📊 추천 결과:`);
    console.log(`   총 추천 제품: ${result.recommendations.length}개`);
    console.log(`   ISO 코드별 분류: ${result.isoBreakdown.length}개`);

    // ISO 코드별 분류 출력
    result.isoBreakdown.forEach(isoResult => {
      console.log(`\n   🔸 ${isoResult.isoCode}: ${isoResult.products.length}개 제품`);
    });

    // 상위 추천 제품 출력
    console.log(`\n🏆 상위 추천 제품:`);
    const formatted = formatProductRecommendations(result.recommendations.slice(0, 5));
    formatted.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name}`);
      console.log(`      카테고리: ${product.category}`);
      console.log(`      가격: ${product.price?.toLocaleString()}원`);
      console.log(`      매칭 점수: ${product.match_score}`);
      console.log(`      매칭 이유: ${product.match_reason}`);
    });

  } catch (error) {
    console.log(`❌ 오류 발생: ${error}`);
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 ISO 코드 기반 보조기기 추천 시스템 테스트");
    console.log("=".repeat(60));

    // 샘플 데이터 생성 (실제로는 데이터베이스에서 로드)
    const sampleProducts = await createSampleProducts();
    console.log(`📦 샘플 제품 데이터 로드: ${sampleProducts.length}개`);

    // 단일 ISO 테스트
    await testSingleIsoRecommendation();

    // 다중 ISO 테스트
    await testMultipleIsoRecommendation();

    console.log("\n" + "=".repeat(60));
    console.log("✅ ISO 제품 추천 테스트 완료");

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