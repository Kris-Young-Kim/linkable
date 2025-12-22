#!/usr/bin/env tsx
/**
 * 피드백 데이터 분석 측정 스크립트
 * 
 * 사용법:
 *   tsx scripts/tests/measure-feedback-analysis.ts [dateRange]
 * 
 * 예시:
 *   tsx scripts/tests/measure-feedback-analysis.ts 30days
 */

import { writeFileSync } from "fs";
import { join } from "path";

interface FeedbackAnalysisResult {
  summary: {
    overallMatchingQuality: number;
    averageFeedbackRating: number;
    averageEffectivenessScore: number;
    clickThroughRate: number;
    purchaseConversionRate: number;
  };
  metrics: {
    consultationFeedback: {
      total: number;
      average: number;
      distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
      };
    };
    ippaEvaluation: {
      total: number;
      average: number;
      distribution: {
        negative: number;
        low: number;
        medium: number;
        high: number;
      };
    };
    recommendations: {
      total: number;
      clicked: number;
      clickRate: number;
    };
    purchases: {
      total: number;
      conversionRate: number;
      totalAmount: number;
    };
  };
  icfCodeFeedback: Array<{
    code: string;
    name: string;
    category: string;
    averageRating: number;
    feedbackCount: number;
  }>;
  isoCodeFeedback: Array<{
    code: string;
    averageFeedbackRating: number;
    feedbackCount: number;
    clickRate: number;
    purchaseRate: number;
    recommendationCount: number;
  }>;
  dailyStats: Array<{
    date: string;
    feedbackRating: number;
    effectivenessScore: number;
    clickRate: number;
    purchaseRate: number;
  }>;
  dateRange: string;
  timestamp: string;
}

async function fetchFeedbackAnalysis(dateRange: string = "30days"): Promise<FeedbackAnalysisResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/admin/analytics/feedback-analysis?dateRange=${dateRange}`;
  
  console.log(`📡 API 호출: ${url}`);
  console.log("⚠️  실제 측정을 위해서는 관리자 인증이 필요합니다.");
  console.log("   로컬 테스트 시 환경 변수나 인증 토큰을 설정하세요.");
  
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ API 호출 실패:", error);
    throw error;
  }
}

function printReport(result: FeedbackAnalysisResult) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 피드백 데이터 분석 리포트");
  console.log("=".repeat(80));
  console.log(`📅 기간: ${result.dateRange}`);
  console.log(`🕐 측정 시간: ${new Date(result.timestamp).toLocaleString("ko-KR")}`);
  console.log("\n");

  // 종합 매칭 품질 점수
  console.log("🎯 종합 매칭 품질 점수");
  console.log("-".repeat(80));
  console.log(`   점수: ${result.summary.overallMatchingQuality.toFixed(2)} / 100`);
  const qualityLevel =
    result.summary.overallMatchingQuality >= 80
      ? "우수"
      : result.summary.overallMatchingQuality >= 60
      ? "양호"
      : result.summary.overallMatchingQuality >= 40
      ? "보통"
      : "개선 필요";
  console.log(`   등급: ${qualityLevel}`);
  console.log("\n");

  // 주요 지표
  console.log("📈 주요 지표");
  console.log("-".repeat(80));
  console.log(`   평균 피드백 점수: ${result.summary.averageFeedbackRating.toFixed(2)} / 5.0`);
  console.log(`   평균 효과성 점수: ${result.summary.averageEffectivenessScore.toFixed(2)}`);
  console.log(`   클릭률: ${result.summary.clickThroughRate.toFixed(2)}%`);
  console.log(`   구매 전환율: ${result.summary.purchaseConversionRate.toFixed(2)}%`);
  console.log("\n");

  // 피드백 분포
  console.log("⭐ 상담 피드백 분포");
  console.log("-".repeat(80));
  const feedbackDist = result.metrics.consultationFeedback.distribution;
  const totalFeedback = result.metrics.consultationFeedback.total;
  [5, 4, 3, 2, 1].forEach((rating) => {
    const count = feedbackDist[rating as keyof typeof feedbackDist];
    const percentage = totalFeedback > 0 ? (count / totalFeedback) * 100 : 0;
    const bar = "█".repeat(Math.round(percentage / 2));
    console.log(`   ${rating}점: ${count.toString().padStart(4)}개 (${percentage.toFixed(1).padStart(5)}%) ${bar}`);
  });
  console.log("\n");

  // 효과성 점수 분포
  console.log("📊 효과성 점수 분포");
  console.log("-".repeat(80));
  const effDist = result.metrics.ippaEvaluation.distribution;
  const totalIppa = result.metrics.ippaEvaluation.total;
  [
    { label: "높음 (≥10점)", value: effDist.high },
    { label: "중간 (5-10점)", value: effDist.medium },
    { label: "낮음 (0-5점)", value: effDist.low },
    { label: "음수 (<0점)", value: effDist.negative },
  ].forEach((item) => {
    const percentage = totalIppa > 0 ? (item.value / totalIppa) * 100 : 0;
    console.log(`   ${item.label.padEnd(15)}: ${item.value.toString().padStart(4)}개 (${percentage.toFixed(1).padStart(5)}%)`);
  });
  console.log("\n");

  // 상위 ICF 코드
  console.log("🔝 상위 ICF 코드별 피드백 (상위 10개)");
  console.log("-".repeat(80));
  result.icfCodeFeedback.slice(0, 10).forEach((item, index) => {
    console.log(
      `   ${(index + 1).toString().padStart(2)}. ${item.code.padEnd(8)} (${item.category}) - ${item.averageRating.toFixed(2)}점 (${item.feedbackCount}개 피드백)`
    );
  });
  console.log("\n");

  // 상위 ISO 코드
  console.log("🔝 상위 ISO 코드별 매칭 품질 (상위 10개)");
  console.log("-".repeat(80));
  result.isoCodeFeedback.slice(0, 10).forEach((item, index) => {
    console.log(
      `   ${(index + 1).toString().padStart(2)}. ISO ${item.code.padEnd(8)} - 피드백: ${item.averageFeedbackRating.toFixed(2)}, 클릭률: ${item.clickRate.toFixed(1)}%, 구매율: ${item.purchaseRate.toFixed(1)}%`
    );
  });
  console.log("\n");

  // 요약
  console.log("📋 요약");
  console.log("-".repeat(80));
  console.log(`   총 상담 피드백: ${result.metrics.consultationFeedback.total}개`);
  console.log(`   총 K-IPPA 평가: ${result.metrics.ippaEvaluation.total}개`);
  console.log(`   총 추천: ${result.metrics.recommendations.total}개`);
  console.log(`   총 구매: ${result.metrics.purchases.total}건`);
  console.log(`   총 구매 금액: ${result.metrics.purchases.totalAmount.toLocaleString()}원`);
  console.log("\n");

  // 개선 권장사항
  console.log("💡 개선 권장사항");
  console.log("-".repeat(80));
  if (result.summary.overallMatchingQuality < 60) {
    console.log("   ⚠️  종합 매칭 품질이 낮습니다. 다음 항목을 개선하세요:");
    if (result.summary.averageFeedbackRating < 3.5) {
      console.log("      - 상담 피드백 점수 개선 필요 (현재 평균: " + result.summary.averageFeedbackRating.toFixed(2) + "점)");
    }
    if (result.summary.clickThroughRate < 20) {
      console.log("      - 클릭률 개선 필요 (현재: " + result.summary.clickThroughRate.toFixed(2) + "%)");
    }
    if (result.summary.purchaseConversionRate < 5) {
      console.log("      - 구매 전환율 개선 필요 (현재: " + result.summary.purchaseConversionRate.toFixed(2) + "%)");
    }
  } else {
    console.log("   ✅ 종합 매칭 품질이 양호합니다. 지속적인 모니터링을 권장합니다.");
  }
  console.log("\n" + "=".repeat(80));
}

async function main() {
  try {
    const dateRange = process.argv[2] || "30days";
    console.log("🚀 피드백 데이터 분석 시작...");
    console.log(`📅 기간: ${dateRange}\n`);

    const result = await fetchFeedbackAnalysis(dateRange);
    printReport(result);

    // 결과 저장
    const outputPath = join(
      process.cwd(),
      `scripts/tests/results/feedback-analysis-${Date.now()}.json`
    );
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n💾 결과 저장: ${outputPath}`);

    const latestPath = join(
      process.cwd(),
      "scripts/tests/results/feedback-analysis-latest.json"
    );
    writeFileSync(latestPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 최신 결과 저장: ${latestPath}`);

    // 종합 점수가 낮으면 exit code 1 반환
    const hasLowQuality = result.summary.overallMatchingQuality < 60;
    if (hasLowQuality) {
      console.log("\n⚠️  매칭 품질이 목표 수준 이하입니다.");
      process.exit(1);
    } else {
      console.log("\n✅ 매칭 품질이 목표 수준 이상입니다.");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

