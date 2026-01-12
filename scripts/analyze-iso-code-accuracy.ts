#!/usr/bin/env tsx
/**
 * ISO 코드 ID별 제품 추천 정확도 분석 스크립트
 *
 * 사용법:
 *   tsx scripts/analyze-iso-code-accuracy.ts
 *
 * 이 스크립트는:
 * 1. iso_code_id별 추천 수, 클릭률, 구매 전환율 분석
 * 2. iso_code_id별 평균 피드백 점수 분석
 * 3. iso_code_id별 효과성 점수 분석
 * 4. iso_code_id별 종합 정확도 점수 계산
 * 5. 상세 리포트 생성 (마크다운 형식)
 */

// 환경 변수 로드 (가장 먼저 실행 - 다른 모듈 import 전에)
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

config({ path: envLocalPath });
config({ path: envPath });

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error(
    "   SUPABASE_SERVICE_ROLE_KEY:",
    supabaseServiceKey ? "✓" : "✗"
  );
  console.error("\n.env.local 파일을 확인하세요.");
  process.exit(1);
}

// 환경 변수가 로드된 후에 모듈 import
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface IsoCodeAccuracyStats {
  iso_code_id: string;
  iso_code: string;
  iso_name: string;
  iso_level: string;
  // 추천 통계
  total_recommendations: number;
  total_consultations: number;
  // 클릭 통계
  total_clicks: number;
  click_rate: number;
  // 구매 통계
  total_purchases: number;
  purchase_rate: number;
  purchase_conversion_rate: number;
  // 피드백 통계
  total_feedback: number;
  average_feedback_rating: number;
  // 효과성 통계
  total_evaluations: number;
  average_effectiveness_score: number;
  // 종합 점수
  overall_accuracy_score: number;
  // 순위별 통계
  top1_recommendations: number;
  top3_recommendations: number;
  top5_recommendations: number;
  top1_clicks: number;
  top3_clicks: number;
  top5_clicks: number;
  top1_click_rate: number;
  top3_click_rate: number;
  top5_click_rate: number;
}

async function analyzeIsoCodeAccuracy(): Promise<IsoCodeAccuracyStats[]> {
  console.log("🔍 ISO 코드 ID별 제품 추천 정확도 분석 시작...\n");

  // 1. 추천 데이터 조회 (iso_code_id 포함)
  console.log("📊 추천 데이터 조회 중...");
  const { data: recommendations, error: recError } = await supabase.from(
    "recommendations"
  ).select(`
      id,
      consultation_id,
      product_id,
      rank,
      is_clicked,
      purchase_completed,
      purchase_amount,
      created_at,
      products!product_id (
        id,
        name,
        iso_code_id,
        iso_codes!iso_code_id (
          id,
          code,
          name,
          level
        )
      )
    `);

  if (recError) {
    throw new Error(`추천 데이터 조회 실패: ${recError.message}`);
  }

  console.log(`   ✓ ${recommendations?.length || 0}개 추천 발견\n`);

  // 2. 피드백 데이터 조회
  console.log("💬 피드백 데이터 조회 중...");
  const { data: feedbacks, error: feedbackError } = await supabase
    .from("consultation_feedback")
    .select(
      `
      consultation_id,
      accuracy_rating
    `
    )
    .not("accuracy_rating", "is", null);

  if (feedbackError) {
    console.warn(`   ⚠️ 피드백 데이터 조회 경고: ${feedbackError.message}`);
  }

  console.log(`   ✓ ${feedbacks?.length || 0}개 피드백 발견\n`);

  // 3. 효과성 평가 데이터 조회
  console.log("📈 효과성 평가 데이터 조회 중...");
  const { data: evaluations, error: evalError } = await supabase
    .from("ippa_evaluations")
    .select(
      `
      product_id,
      effectiveness_score,
      products!product_id (
        iso_code_id
      )
    `
    )
    .not("effectiveness_score", "is", null);

  if (evalError) {
    console.warn(`   ⚠️ 효과성 평가 데이터 조회 경고: ${evalError.message}`);
  }

  console.log(`   ✓ ${evaluations?.length || 0}개 효과성 평가 발견\n`);

  // 4. ISO 코드별 통계 집계
  console.log("📊 ISO 코드별 통계 집계 중...");
  const isoStatsMap = new Map<
    string,
    {
      iso_code_id: string;
      iso_code: string;
      iso_name: string;
      iso_level: string;
      recommendations: any[];
      consultations: Set<string>;
      clicks: number;
      purchases: number;
      feedbacks: number[];
      evaluations: number[];
      top1_recs: number;
      top3_recs: number;
      top5_recs: number;
      top1_clicks: number;
      top3_clicks: number;
      top5_clicks: number;
    }
  >();

  // 추천 데이터 처리
  for (const rec of recommendations || []) {
    const product = rec.products as any;
    const isoCode = product?.iso_codes;

    if (!isoCode || !isoCode.id) {
      continue; // iso_code_id가 없는 추천은 제외
    }

    const isoCodeId = isoCode.id;
    const isoCodeStr = isoCode.code || "N/A";
    const isoName = isoCode.name || "N/A";
    const isoLevel = isoCode.level || "N/A";

    if (!isoStatsMap.has(isoCodeId)) {
      isoStatsMap.set(isoCodeId, {
        iso_code_id: isoCodeId,
        iso_code: isoCodeStr,
        iso_name: isoName,
        iso_level: isoLevel,
        recommendations: [],
        consultations: new Set(),
        clicks: 0,
        purchases: 0,
        feedbacks: [],
        evaluations: [],
        top1_recs: 0,
        top3_recs: 0,
        top5_recs: 0,
        top1_clicks: 0,
        top3_clicks: 0,
        top5_clicks: 0,
      });
    }

    const stats = isoStatsMap.get(isoCodeId)!;
    stats.recommendations.push(rec);
    stats.consultations.add(rec.consultation_id);

    if (rec.is_clicked) {
      stats.clicks++;
    }

    if (rec.purchase_completed) {
      stats.purchases++;
    }

    // 순위별 통계
    const rank = rec.rank || 999;
    if (rank <= 1) {
      stats.top1_recs++;
      if (rec.is_clicked) stats.top1_clicks++;
    }
    if (rank <= 3) {
      stats.top3_recs++;
      if (rec.is_clicked) stats.top3_clicks++;
    }
    if (rank <= 5) {
      stats.top5_recs++;
      if (rec.is_clicked) stats.top5_clicks++;
    }
  }

  // 피드백 데이터 연결
  const consultationToFeedback = new Map<string, number>();
  for (const feedback of feedbacks || []) {
    consultationToFeedback.set(
      feedback.consultation_id,
      feedback.accuracy_rating
    );
  }

  for (const [isoCodeId, stats] of isoStatsMap.entries()) {
    for (const consultationId of stats.consultations) {
      const feedback = consultationToFeedback.get(consultationId);
      if (feedback !== undefined) {
        stats.feedbacks.push(feedback);
      }
    }
  }

  // 효과성 평가 데이터 연결
  const productToEvaluation = new Map<string, number>();
  for (const eval_ of evaluations || []) {
    const product = eval_.products as any;
    if (product?.iso_code_id) {
      const productId = eval_.product_id;
      const effectivenessScore = Number(eval_.effectiveness_score) || 0;
      productToEvaluation.set(productId, effectivenessScore);
    }
  }

  for (const [isoCodeId, stats] of isoStatsMap.entries()) {
    for (const rec of stats.recommendations) {
      const evaluation = productToEvaluation.get(rec.product_id);
      if (evaluation !== undefined) {
        stats.evaluations.push(evaluation);
      }
    }
  }

  // 5. 최종 통계 계산
  const results: IsoCodeAccuracyStats[] = [];

  for (const [isoCodeId, stats] of isoStatsMap.entries()) {
    const totalRecs = stats.recommendations.length;
    const totalConsults = stats.consultations.size;
    const totalClicks = stats.clicks;
    const totalPurchases = stats.purchases;
    const totalFeedbacks = stats.feedbacks.length;
    const totalEvaluations = stats.evaluations.length;

    const clickRate = totalRecs > 0 ? (totalClicks / totalRecs) * 100 : 0;
    const purchaseRate =
      totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0;
    const purchaseConversionRate =
      totalRecs > 0 ? (totalPurchases / totalRecs) * 100 : 0;

    const avgFeedback =
      totalFeedbacks > 0
        ? stats.feedbacks.reduce((sum, f) => sum + f, 0) / totalFeedbacks
        : 0;

    const avgEffectiveness =
      totalEvaluations > 0
        ? stats.evaluations.reduce((sum, e) => sum + e, 0) / totalEvaluations
        : 0;

    const top1ClickRate =
      stats.top1_recs > 0 ? (stats.top1_clicks / stats.top1_recs) * 100 : 0;
    const top3ClickRate =
      stats.top3_recs > 0 ? (stats.top3_clicks / stats.top3_recs) * 100 : 0;
    const top5ClickRate =
      stats.top5_recs > 0 ? (stats.top5_clicks / stats.top5_recs) * 100 : 0;

    // 종합 정확도 점수 계산 (0-100점)
    // 피드백 점수 (30%): 1-5점을 0-100으로 변환
    const feedbackScore = (avgFeedback / 5) * 100;
    // 효과성 점수 (30%): 최대 20점 기준
    const effectivenessScore = Math.min((avgEffectiveness / 20) * 100, 100);
    // 클릭률 점수 (20%): 25% 클릭률 = 100점
    const clickRateScore = Math.min(clickRate * 4, 100);
    // 구매 전환율 점수 (20%): 10% 전환율 = 100점
    const purchaseRateScore = Math.min(purchaseConversionRate * 10, 100);

    const overallScore =
      feedbackScore * 0.3 +
      effectivenessScore * 0.3 +
      clickRateScore * 0.2 +
      purchaseRateScore * 0.2;

    results.push({
      iso_code_id: isoCodeId,
      iso_code: stats.iso_code,
      iso_name: stats.iso_name,
      iso_level: stats.iso_level,
      total_recommendations: totalRecs,
      total_consultations: totalConsults,
      total_clicks: totalClicks,
      click_rate: clickRate,
      total_purchases: totalPurchases,
      purchase_rate: purchaseRate,
      purchase_conversion_rate: purchaseConversionRate,
      total_feedback: totalFeedbacks,
      average_feedback_rating: avgFeedback,
      total_evaluations: totalEvaluations,
      average_effectiveness_score: avgEffectiveness,
      overall_accuracy_score: overallScore,
      top1_recommendations: stats.top1_recs,
      top3_recommendations: stats.top3_recs,
      top5_recommendations: stats.top5_recs,
      top1_clicks: stats.top1_clicks,
      top3_clicks: stats.top3_clicks,
      top5_clicks: stats.top5_clicks,
      top1_click_rate: top1ClickRate,
      top3_click_rate: top3ClickRate,
      top5_click_rate: top5ClickRate,
    });
  }

  // 종합 점수 기준으로 정렬
  results.sort((a, b) => b.overall_accuracy_score - a.overall_accuracy_score);

  console.log(`   ✓ ${results.length}개 ISO 코드 분석 완료\n`);

  return results;
}

function generateMarkdownReport(results: IsoCodeAccuracyStats[]): string {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let markdown = `# ISO 코드 ID별 제품 추천 정확도 분석

**분석 일시**: ${dateStr}  
**데이터 기간**: 전체 (프로덕션 데이터)  
**분석 대상**: ISO 코드 ID별 제품 추천 성과

---

## 📊 전체 요약

| 지표 | 값 |
|------|-----|
| **분석된 ISO 코드 수** | ${results.length}개 |
| **총 추천 수** | ${results
    .reduce((sum, r) => sum + r.total_recommendations, 0)
    .toLocaleString()}개 |
| **총 상담 수** | ${results
    .reduce((sum, r) => sum + r.total_consultations, 0)
    .toLocaleString()}개 |
| **평균 클릭률** | ${(
    results.reduce((sum, r) => sum + r.click_rate, 0) / results.length
  ).toFixed(2)}% |
| **평균 구매 전환율** | ${(
    results.reduce((sum, r) => sum + r.purchase_conversion_rate, 0) /
    results.length
  ).toFixed(2)}% |
| **평균 피드백 점수** | ${(
    results.reduce((sum, r) => sum + r.average_feedback_rating, 0) /
      results.filter((r) => r.total_feedback > 0).length || 1
  ).toFixed(2)}/5.0 |
| **평균 종합 정확도** | ${(
    results.reduce((sum, r) => sum + r.overall_accuracy_score, 0) /
    results.length
  ).toFixed(2)}점 |

---

## 🏆 상위 20개 ISO 코드 (종합 정확도 기준)

| 순위 | ISO 코드 | ISO 이름 | 레벨 | 추천 수 | 클릭률 | 구매율 | 피드백 | 효과성 | 종합 점수 |
|------|----------|----------|------|---------|--------|--------|--------|--------|-----------|
`;

  const top20 = results.slice(0, 20);
  top20.forEach((result, index) => {
    const rank = index + 1;
    const clickRateStr =
      result.total_recommendations > 0
        ? `${result.click_rate.toFixed(2)}%`
        : "N/A";
    const purchaseRateStr =
      result.total_clicks > 0 ? `${result.purchase_rate.toFixed(2)}%` : "N/A";
    const feedbackStr =
      result.total_feedback > 0
        ? `${result.average_feedback_rating.toFixed(2)}/5.0`
        : "N/A";
    const effectivenessStr =
      result.total_evaluations > 0
        ? `${result.average_effectiveness_score.toFixed(2)}`
        : "N/A";

    markdown += `| ${rank} | ${result.iso_code} | ${result.iso_name.substring(
      0,
      30
    )}${result.iso_name.length > 30 ? "..." : ""} | ${result.iso_level} | ${
      result.total_recommendations
    } | ${clickRateStr} | ${purchaseRateStr} | ${feedbackStr} | ${effectivenessStr} | **${result.overall_accuracy_score.toFixed(
      2
    )}점** |\n`;
  });

  markdown += `\n---\n\n## 📈 순위별 클릭률 분석\n\n`;

  // 순위별 클릭률 통계
  const top1Total = results.reduce((sum, r) => sum + r.top1_recommendations, 0);
  const top1Clicks = results.reduce((sum, r) => sum + r.top1_clicks, 0);
  const top3Total = results.reduce((sum, r) => sum + r.top3_recommendations, 0);
  const top3Clicks = results.reduce((sum, r) => sum + r.top3_clicks, 0);
  const top5Total = results.reduce((sum, r) => sum + r.top5_recommendations, 0);
  const top5Clicks = results.reduce((sum, r) => sum + r.top5_clicks, 0);

  markdown += `| 순위 | 추천 수 | 클릭 수 | 클릭률 |
|------|---------|---------|--------|
| Top 1 | ${top1Total.toLocaleString()} | ${top1Clicks.toLocaleString()} | ${
    top1Total > 0 ? ((top1Clicks / top1Total) * 100).toFixed(2) : "0.00"
  }% |
| Top 3 | ${top3Total.toLocaleString()} | ${top3Clicks.toLocaleString()} | ${
    top3Total > 0 ? ((top3Clicks / top3Total) * 100).toFixed(2) : "0.00"
  }% |
| Top 5 | ${top5Total.toLocaleString()} | ${top5Clicks.toLocaleString()} | ${
    top5Total > 0 ? ((top5Clicks / top5Total) * 100).toFixed(2) : "0.00"
  }% |

---

## 📋 상세 통계 (전체 ISO 코드)

| ISO 코드 | ISO 이름 | 레벨 | 추천 | 상담 | 클릭 | 클릭률 | 구매 | 구매율 | 피드백 | 평균 피드백 | 효과성 | 평균 효과성 | Top1 | Top3 | Top5 | 종합 점수 |
|----------|----------|------|------|------|------|--------|------|--------|--------|-------------|--------|-------------|------|------|------|-----------|
`;

  results.forEach((result) => {
    const clickRateStr =
      result.total_recommendations > 0
        ? `${result.click_rate.toFixed(2)}%`
        : "0.00%";
    const purchaseRateStr =
      result.total_clicks > 0 ? `${result.purchase_rate.toFixed(2)}%` : "0.00%";
    const feedbackStr =
      result.total_feedback > 0
        ? `${result.average_feedback_rating.toFixed(2)}`
        : "N/A";
    const effectivenessStr =
      result.total_evaluations > 0
        ? `${result.average_effectiveness_score.toFixed(2)}`
        : "N/A";

    markdown += `| ${result.iso_code} | ${result.iso_name.substring(0, 20)}${
      result.iso_name.length > 20 ? "..." : ""
    } | ${result.iso_level} | ${result.total_recommendations} | ${
      result.total_consultations
    } | ${result.total_clicks} | ${clickRateStr} | ${
      result.total_purchases
    } | ${purchaseRateStr} | ${result.total_feedback} | ${feedbackStr} | ${
      result.total_evaluations
    } | ${effectivenessStr} | ${result.top1_recommendations} | ${
      result.top3_recommendations
    } | ${
      result.top5_recommendations
    } | ${result.overall_accuracy_score.toFixed(2)} |\n`;
  });

  markdown += `\n---\n\n## 💡 주요 인사이트\n\n`;

  // 인사이트 생성
  const highPerformers = results
    .filter((r) => r.overall_accuracy_score >= 60)
    .slice(0, 5);
  const lowPerformers = results
    .filter(
      (r) => r.overall_accuracy_score < 30 && r.total_recommendations >= 5
    )
    .slice(0, 5);
  const highClickRate = results
    .filter((r) => r.click_rate >= 20 && r.total_recommendations >= 5)
    .slice(0, 5);
  const lowClickRate = results
    .filter((r) => r.click_rate < 5 && r.total_recommendations >= 10)
    .slice(0, 5);

  markdown += `### ✅ 우수 성과 ISO 코드 (종합 점수 60점 이상)\n\n`;
  if (highPerformers.length > 0) {
    highPerformers.forEach((r, i) => {
      markdown += `${i + 1}. **${r.iso_code}** (${
        r.iso_name
      }): 종합 점수 ${r.overall_accuracy_score.toFixed(
        2
      )}점, 클릭률 ${r.click_rate.toFixed(2)}%\n`;
    });
  } else {
    markdown += `현재 종합 점수 60점 이상인 ISO 코드가 없습니다.\n`;
  }

  markdown += `\n### ⚠️ 개선 필요 ISO 코드 (종합 점수 30점 미만, 추천 5개 이상)\n\n`;
  if (lowPerformers.length > 0) {
    lowPerformers.forEach((r, i) => {
      markdown += `${i + 1}. **${r.iso_code}** (${
        r.iso_name
      }): 종합 점수 ${r.overall_accuracy_score.toFixed(
        2
      )}점, 클릭률 ${r.click_rate.toFixed(2)}%\n`;
    });
  } else {
    markdown += `개선이 필요한 ISO 코드가 없습니다.\n`;
  }

  markdown += `\n### 📊 높은 클릭률 ISO 코드 (20% 이상, 추천 5개 이상)\n\n`;
  if (highClickRate.length > 0) {
    highClickRate.forEach((r, i) => {
      markdown += `${i + 1}. **${r.iso_code}** (${
        r.iso_name
      }): 클릭률 ${r.click_rate.toFixed(2)}%, 추천 ${
        r.total_recommendations
      }개\n`;
    });
  } else {
    markdown += `클릭률 20% 이상인 ISO 코드가 없습니다.\n`;
  }

  markdown += `\n### 📉 낮은 클릭률 ISO 코드 (5% 미만, 추천 10개 이상)\n\n`;
  if (lowClickRate.length > 0) {
    lowClickRate.forEach((r, i) => {
      markdown += `${i + 1}. **${r.iso_code}** (${
        r.iso_name
      }): 클릭률 ${r.click_rate.toFixed(2)}%, 추천 ${
        r.total_recommendations
      }개\n`;
    });
  } else {
    markdown += `클릭률 5% 미만인 ISO 코드가 없습니다.\n`;
  }

  markdown += `\n---\n\n## 📝 종합 정확도 점수 계산 방법\n\n`;
  markdown += `종합 정확도 점수는 다음 공식으로 계산됩니다:\n\n`;
  markdown += `\`\`\`\n`;
  markdown += `종합 점수 = (피드백 점수 × 30%) + (효과성 점수 × 30%) + (클릭률 점수 × 20%) + (구매율 점수 × 20%)\n\n`;
  markdown += `- 피드백 점수: (평균 피드백 / 5.0) × 100 (최대 100점)\n`;
  markdown += `- 효과성 점수: (평균 효과성 / 20.0) × 100 (최대 100점)\n`;
  markdown += `- 클릭률 점수: 클릭률 × 4 (25% 클릭률 = 100점)\n`;
  markdown += `- 구매율 점수: 구매 전환율 × 10 (10% 전환율 = 100점)\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `---\n\n`;
  markdown += `**다음 분석 일시**: ${new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("ko-KR")} (1개월 후)  \n`;
  markdown += `**분석 담당**: AI Assistant  \n`;
  markdown += `**문서 버전**: 1.0\n`;

  return markdown;
}

// 메인 실행
async function main() {
  try {
    const results = await analyzeIsoCodeAccuracy();

    console.log("\n" + "=".repeat(60));
    console.log("📊 ISO 코드 ID별 제품 추천 정확도 분석 결과");
    console.log("=".repeat(60) + "\n");

    console.log("📈 전체 통계:");
    console.log(`   - 분석된 ISO 코드 수: ${results.length}개`);
    console.log(
      `   - 총 추천 수: ${results
        .reduce((sum, r) => sum + r.total_recommendations, 0)
        .toLocaleString()}개`
    );
    console.log(
      `   - 총 상담 수: ${results
        .reduce((sum, r) => sum + r.total_consultations, 0)
        .toLocaleString()}개`
    );
    console.log(
      `   - 평균 클릭률: ${(
        results.reduce((sum, r) => sum + r.click_rate, 0) / results.length
      ).toFixed(2)}%`
    );
    console.log(
      `   - 평균 종합 정확도: ${(
        results.reduce((sum, r) => sum + r.overall_accuracy_score, 0) /
        results.length
      ).toFixed(2)}점\n`
    );

    console.log("🏆 상위 10개 ISO 코드 (종합 정확도 기준):");
    results.slice(0, 10).forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${result.iso_code} (${result.iso_name.substring(
          0,
          30
        )}): ${result.overall_accuracy_score.toFixed(2)}점`
      );
      console.log(
        `      - 추천: ${
          result.total_recommendations
        }개, 클릭률: ${result.click_rate.toFixed(
          2
        )}%, 피드백: ${result.average_feedback_rating.toFixed(2)}/5.0`
      );
    });

    // 마크다운 리포트 생성
    const markdown = generateMarkdownReport(results);
    const reportPath = resolve(
      process.cwd(),
      "docs",
      "iso-code-accuracy-analysis.md"
    );
    writeFileSync(reportPath, markdown, "utf-8");
    console.log(`\n📄 상세 리포트가 생성되었습니다: ${reportPath}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ 분석 완료!");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    if (error instanceof Error) {
      console.error("   메시지:", error.message);
      console.error("   스택:", error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { analyzeIsoCodeAccuracy };
