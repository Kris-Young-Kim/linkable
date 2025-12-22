#!/usr/bin/env tsx
/**
 * 전환율 측정 스크립트
 * 
 * 사용법:
 *   tsx scripts/tests/measure-conversion-rates.ts
 * 
 * 이 스크립트는:
 * 1. 현재 전환율을 측정하고 목표 달성 여부를 확인
 * 2. 결과를 JSON 파일로 저장
 * 3. 목표 미달성 시 경고 출력
 */

import { writeFileSync } from "fs";
import { join } from "path";

interface ConversionRatesResult {
  timestamp: string;
  dateRange: string;
  summary: {
    recommendationClickRate: number;
    expertInquiryRate: number;
    supportProgramClickRate: number;
    purchaseConversionRate: number;
  };
  goals: {
    recommendationClickRate: {
      target: number;
      current: number;
      achieved: boolean;
      gap: number;
    };
    expertInquiryRate: {
      target: number;
      current: number;
      achieved: boolean;
      gap: number;
    };
    purchaseConversionRate: {
      target: number;
      current: number;
      achieved: boolean;
      gap: number;
    };
  };
  metrics: {
    recommendations: {
      total: number;
      clicked: number;
      clickRate: number;
    };
    expertInquiries: {
      total: number;
      inquiryRate: number;
    };
    purchases: {
      total: number;
      conversionRate: number;
      totalAmount: number;
      averageAmount: number;
    };
  };
  funnel: {
    consultations: number;
    recommendations: number;
    clicks: number;
    expertInquiries: number;
    purchases: number;
    rates: {
      consultationToRecommendation: number;
      recommendationToClick: number;
      clickToExpertInquiry: number;
      clickToPurchase: number;
      overallConversion: number;
    };
  };
}

/**
 * API에서 전환율 데이터 가져오기
 */
async function fetchConversionRates(dateRange: string = "30days"): Promise<ConversionRatesResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/admin/analytics/conversion-rates?dateRange=${dateRange}`;

  // 실제로는 인증 토큰이 필요하지만, 스크립트에서는 직접 DB 조회하는 방식으로 변경
  // 여기서는 API 호출 예시만 제공
  console.log(`📡 API 호출: ${url}`);
  console.log("⚠️  실제 측정을 위해서는 관리자 인증이 필요합니다.");
  console.log("   대신 데이터베이스를 직접 조회하는 방식으로 구현하세요.");

  // 임시 응답 (실제로는 API 호출 또는 DB 직접 조회)
  return {
    timestamp: new Date().toISOString(),
    dateRange,
    summary: {
      recommendationClickRate: 0,
      expertInquiryRate: 0,
      supportProgramClickRate: 0,
      purchaseConversionRate: 0,
    },
    goals: {
      recommendationClickRate: {
        target: 25,
        current: 0,
        achieved: false,
        gap: 25,
      },
      expertInquiryRate: {
        target: 10,
        current: 0,
        achieved: false,
        gap: 10,
      },
      purchaseConversionRate: {
        target: 5,
        current: 0,
        achieved: false,
        gap: 5,
      },
    },
    metrics: {
      recommendations: {
        total: 0,
        clicked: 0,
        clickRate: 0,
      },
      expertInquiries: {
        total: 0,
        inquiryRate: 0,
      },
      purchases: {
        total: 0,
        conversionRate: 0,
        totalAmount: 0,
        averageAmount: 0,
      },
    },
    funnel: {
      consultations: 0,
      recommendations: 0,
      clicks: 0,
      expertInquiries: 0,
      purchases: 0,
      rates: {
        consultationToRecommendation: 0,
        recommendationToClick: 0,
        clickToExpertInquiry: 0,
        clickToPurchase: 0,
        overallConversion: 0,
      },
    },
  };
}

/**
 * 결과 리포트 출력
 */
function printReport(result: ConversionRatesResult) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 전환율 측정 결과");
  console.log("=".repeat(60));

  console.log(`\n📈 전환율 요약 (${result.dateRange}):`);
  console.log(`  추천 CTA 클릭률: ${result.summary.recommendationClickRate.toFixed(2)}%`);
  console.log(`  문의 연결율: ${result.summary.expertInquiryRate.toFixed(2)}%`);
  console.log(`  구매 전환율: ${result.summary.purchaseConversionRate.toFixed(2)}%`);

  console.log(`\n🎯 목표 달성 현황:`);
  const goals = [
    {
      name: "추천 CTA 클릭률",
      goal: result.goals.recommendationClickRate,
    },
    {
      name: "문의 연결율",
      goal: result.goals.expertInquiryRate,
    },
    {
      name: "구매 전환율",
      goal: result.goals.purchaseConversionRate,
    },
  ];

  goals.forEach(({ name, goal }) => {
    const status = goal.achieved ? "✅" : "❌";
    console.log(`  ${status} ${name}:`);
    console.log(`    현재: ${goal.current.toFixed(2)}%`);
    console.log(`    목표: ${goal.target}%`);
    if (!goal.achieved) {
      console.log(`    부족: ${goal.gap.toFixed(2)}%`);
    }
  });

  console.log(`\n📊 전환 퍼널:`);
  console.log(`  상담 → 추천: ${result.funnel.consultations} → ${result.funnel.recommendations} (${result.funnel.rates.consultationToRecommendation.toFixed(2)}%)`);
  console.log(`  추천 → 클릭: ${result.funnel.recommendations} → ${result.funnel.clicks} (${result.funnel.rates.recommendationToClick.toFixed(2)}%)`);
  console.log(`  클릭 → 문의: ${result.funnel.clicks} → ${result.funnel.expertInquiries} (${result.funnel.rates.clickToExpertInquiry.toFixed(2)}%)`);
  console.log(`  클릭 → 구매: ${result.funnel.clicks} → ${result.funnel.purchases} (${result.funnel.rates.clickToPurchase.toFixed(2)}%)`);
  console.log(`  전체 전환율: ${result.funnel.rates.overallConversion.toFixed(2)}%`);

  console.log(`\n💰 구매 통계:`);
  console.log(`  총 구매 건수: ${result.metrics.purchases.total}`);
  console.log(`  총 구매 금액: ${result.metrics.purchases.totalAmount.toLocaleString()}원`);
  console.log(`  평균 구매 금액: ${result.metrics.purchases.averageAmount.toLocaleString()}원`);

  // 목표 미달성 경고
  const failedGoals = goals.filter(({ goal }) => !goal.achieved);
  if (failedGoals.length > 0) {
    console.log(`\n⚠️  목표 미달성 항목:`);
    failedGoals.forEach(({ name, goal }) => {
      console.log(`  - ${name}: 목표까지 ${goal.gap.toFixed(2)}% 부족`);
    });
  } else {
    console.log(`\n🎉 모든 목표 달성!`);
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 전환율 측정 시작");
    console.log("=".repeat(60));

    const dateRange = process.argv[2] || "30days";
    console.log(`📅 측정 기간: ${dateRange}`);

    const result = await fetchConversionRates(dateRange);
    printReport(result);

    // 결과를 JSON 파일로 저장
    const outputPath = join(
      process.cwd(),
      `scripts/tests/results/conversion-rates-${Date.now()}.json`
    );
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n💾 결과 저장: ${outputPath}`);

    // 최신 결과를 latest.json으로도 저장
    const latestPath = join(
      process.cwd(),
      "scripts/tests/results/conversion-rates-latest.json"
    );
    writeFileSync(latestPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 최신 결과 저장: ${latestPath}`);

    // 목표 미달성 시 경고 코드로 종료
    const hasFailedGoals = Object.values(result.goals).some((goal) => !goal.achieved);
    process.exit(hasFailedGoals ? 1 : 0);
  } catch (error) {
    console.error("\n❌ 측정 실행 중 오류 발생:");
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

