#!/usr/bin/env tsx
/**
 * ICF-ISO-Products 매칭 정확도 검사 스크립트
 * 
 * 사용법:
 *   tsx scripts/check-matching-accuracy.ts
 * 
 * 이 스크립트는:
 * 1. 실제 상담 데이터를 기반으로 ICF-ISO 매칭 정확도 측정
 * 2. 추천된 상품과 ISO 코드 매칭 정확도 검사
 * 3. 하이브리드 매칭 시스템의 성능 평가
 * 4. 상세 리포트 생성
 */

// 환경 변수 로드 (가장 먼저 실행 - 다른 모듈 import 전에)
import { config } from "dotenv";
import { resolve } from "path";

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
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
  console.error("\n.env.local 파일을 확인하세요.");
  process.exit(1);
}

// 환경 변수가 로드된 후에 모듈 import
import { createClient } from "@supabase/supabase-js";
import { hybridMatch } from "@/core/matching/hybrid-matcher";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface MatchingAccuracyResult {
  timestamp: string;
  totalConsultations: number;
  consultationsWithRecommendations: number;
  totalRecommendations: number;
  icfIsoMatching: {
    totalIcfCombinations: number;
    matchedIsoCodes: number;
    averageMatchesPerIcf: number;
    top1Accuracy: number;
    top3Accuracy: number;
    top5Accuracy: number;
  };
  isoProductMatching: {
    totalProducts: number;
    productsWithIso: number;
    productsWithoutIso: number;
    recommendationsWithMatchingIso: number;
    recommendationsWithoutMatchingIso: number;
    isoMatchingRate: number;
  };
  hybridMatchingPerformance: {
    averageResponseTime: number;
    cacheHitRate: number;
    ruleBasedMatches: number;
    semanticMatches: number;
    knowledgeGraphMatches: number;
    keywordMatches: number;
  };
  categoryBreakdown: Record<string, {
    count: number;
    accuracy: number;
    avgMatches: number;
  }>;
  issues: string[];
  recommendations: string[];
}

async function checkMatchingAccuracy(): Promise<MatchingAccuracyResult> {
  console.log("🔍 ICF-ISO-Products 매칭 정확도 검사 시작...\n");
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 1. 상담 데이터 조회
  console.log("📊 상담 데이터 조회 중...");
  const { data: consultations, error: consultationsError } = await supabase
    .from("consultations")
    .select("id, icf_codes, created_at")
    .not("icf_codes", "is", null)
    .limit(100);

  if (consultationsError) {
    throw new Error(`상담 데이터 조회 실패: ${consultationsError.message}`);
  }

  console.log(`   ✓ ${consultations?.length || 0}개 상담 발견\n`);

  // 2. 추천 데이터 조회
  console.log("📦 추천 데이터 조회 중...");
  const { data: recommendationsData, error: recommendationsError } = await supabase
    .from("recommendations")
    .select(`
      id,
      consultation_id,
      product_id,
      score,
      created_at,
      product:product_id (
        id,
        name,
        iso_code,
        is_active
      )
    `)
    .limit(500);

  if (recommendationsError) {
    throw new Error(`추천 데이터 조회 실패: ${recommendationsError.message}`);
  }

  console.log(`   ✓ ${recommendationsData?.length || 0}개 추천 발견\n`);

  // 3. 상품 데이터 조회
  console.log("🛍️ 상품 데이터 조회 중...");
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, iso_code, is_active")
    .eq("is_active", true)
    .limit(1000);

  if (productsError) {
    throw new Error(`상품 데이터 조회 실패: ${productsError.message}`);
  }

  console.log(`   ✓ ${products?.length || 0}개 활성 상품 발견\n`);

  // 4. ICF-ISO 매칭 정확도 측정
  console.log("🎯 ICF-ISO 매칭 정확도 측정 중...");
  const icfIsoResults = {
    totalIcfCombinations: 0,
    matchedIsoCodes: 0,
    totalMatches: 0,
    top1Accurate: 0,
    top3Accurate: 0,
    top5Accurate: 0,
  };

  const categoryBreakdown: Record<string, {
    count: number;
    totalMatches: number;
    accurateMatches: number;
  }> = {};

  for (const consultation of consultations || []) {
    if (!consultation.icf_codes || consultation.icf_codes.length === 0) continue;

    const icfCodes = Array.isArray(consultation.icf_codes) 
      ? consultation.icf_codes 
      : JSON.parse(consultation.icf_codes as any);

    if (!Array.isArray(icfCodes) || icfCodes.length === 0) continue;

    icfIsoResults.totalIcfCombinations++;

    try {
      const matches = await hybridMatch({
        icfCodes,
        userMessage: "",
      });

      if (matches && matches.length > 0) {
        icfIsoResults.matchedIsoCodes++;
        icfIsoResults.totalMatches += matches.length;

        // 카테고리별 통계
        const category = icfCodes[0]?.substring(0, 1) || "unknown";
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = {
            count: 0,
            totalMatches: 0,
            accurateMatches: 0,
          };
        }
        categoryBreakdown[category].count++;
        categoryBreakdown[category].totalMatches += matches.length;

        // Top-K 정확도 (실제 추천과 비교)
        const consultationRecommendations = recommendationsData?.filter(
          (r) => r.consultation_id === consultation.id
        ) || [];

        if (consultationRecommendations.length > 0) {
          const recommendedIsoCodes = consultationRecommendations
            .map((r) => (r.product as any)?.iso_code)
            .filter(Boolean);

          const matchedIsoCodes = matches.map((m) => m.iso);
          const top1Match = matchedIsoCodes[0];
          const top3Matches = matchedIsoCodes.slice(0, 3);
          const top5Matches = matchedIsoCodes.slice(0, 5);

          if (recommendedIsoCodes.includes(top1Match)) {
            icfIsoResults.top1Accurate++;
            categoryBreakdown[category].accurateMatches++;
          }
          if (top3Matches.some((iso) => recommendedIsoCodes.includes(iso))) {
            icfIsoResults.top3Accurate++;
          }
          if (top5Matches.some((iso) => recommendedIsoCodes.includes(iso))) {
            icfIsoResults.top5Accurate++;
          }
        }
      }
    } catch (error) {
      console.error(`   ⚠️ 상담 ${consultation.id} 매칭 실패:`, error);
      issues.push(`상담 ${consultation.id}: 매칭 실패 - ${error}`);
    }
  }

  const icfIsoMatching = {
    totalIcfCombinations: icfIsoResults.totalIcfCombinations,
    matchedIsoCodes: icfIsoResults.matchedIsoCodes,
    averageMatchesPerIcf: icfIsoResults.totalIcfCombinations > 0
      ? icfIsoResults.totalMatches / icfIsoResults.totalIcfCombinations
      : 0,
    top1Accuracy: icfIsoResults.matchedIsoCodes > 0
      ? (icfIsoResults.top1Accurate / icfIsoResults.matchedIsoCodes) * 100
      : 0,
    top3Accuracy: icfIsoResults.matchedIsoCodes > 0
      ? (icfIsoResults.top3Accurate / icfIsoResults.matchedIsoCodes) * 100
      : 0,
    top5Accuracy: icfIsoResults.matchedIsoCodes > 0
      ? (icfIsoResults.top5Accurate / icfIsoResults.matchedIsoCodes) * 100
      : 0,
  };

  console.log(`   ✓ ICF-ISO 매칭 완료:`);
  console.log(`     - 총 ICF 조합: ${icfIsoMatching.totalIcfCombinations}개`);
  console.log(`     - 매칭된 ISO 코드: ${icfIsoMatching.matchedIsoCodes}개`);
  console.log(`     - 평균 매칭 수: ${icfIsoMatching.averageMatchesPerIcf.toFixed(2)}개`);
  console.log(`     - Top-1 정확도: ${icfIsoMatching.top1Accuracy.toFixed(2)}%`);
  console.log(`     - Top-3 정확도: ${icfIsoMatching.top3Accuracy.toFixed(2)}%`);
  console.log(`     - Top-5 정확도: ${icfIsoMatching.top5Accuracy.toFixed(2)}%\n`);

  // 5. ISO-Product 매칭 정확도 측정
  console.log("🔗 ISO-Product 매칭 정확도 측정 중...");
  const productsWithIso = products?.filter(
    (p) => p.iso_code && p.iso_code !== "N999999" && p.iso_code.trim() !== ""
  ) || [];
  const productsWithoutIso = products?.filter(
    (p) => !p.iso_code || p.iso_code === "N999999" || p.iso_code.trim() === ""
  ) || [];

  const recommendationsWithMatchingIso = recommendationsData?.filter((r) => {
    const product = r.product as any;
    return product?.iso_code && product.iso_code !== "N999999" && product.iso_code.trim() !== "";
  }) || [];
  const recommendationsWithoutMatchingIso = recommendationsData?.filter((r) => {
    const product = r.product as any;
    return !product?.iso_code || product.iso_code === "N999999" || product.iso_code.trim() === "";
  }) || [];

  const isoProductMatching = {
    totalProducts: products?.length || 0,
    productsWithIso: productsWithIso.length,
    productsWithoutIso: productsWithoutIso.length,
    recommendationsWithMatchingIso: recommendationsWithMatchingIso.length,
    recommendationsWithoutMatchingIso: recommendationsWithoutMatchingIso.length,
    isoMatchingRate: recommendationsData && recommendationsData.length > 0
      ? (recommendationsWithMatchingIso.length / recommendationsData.length) * 100
      : 0,
  };

  console.log(`   ✓ ISO-Product 매칭 완료:`);
  console.log(`     - 총 상품: ${isoProductMatching.totalProducts}개`);
  console.log(`     - ISO 코드 있는 상품: ${isoProductMatching.productsWithIso}개`);
  console.log(`     - ISO 코드 없는 상품: ${isoProductMatching.productsWithoutIso}개`);
  console.log(`     - ISO 매칭된 추천: ${isoProductMatching.recommendationsWithMatchingIso}개`);
  console.log(`     - ISO 미매칭 추천: ${isoProductMatching.recommendationsWithoutMatchingIso}개`);
  console.log(`     - ISO 매칭률: ${isoProductMatching.isoMatchingRate.toFixed(2)}%\n`);

  // 6. 문제점 및 개선 사항 분석
  if (isoProductMatching.productsWithoutIso > 0) {
    issues.push(
      `${isoProductMatching.productsWithoutIso}개 상품에 ISO 코드가 없습니다.`
    );
    recommendations.push(
      "ISO 코드 없는 상품에 대해 자동 추론 기능을 사용하세요."
    );
  }

  if (isoProductMatching.isoMatchingRate < 80) {
    issues.push(
      `ISO 매칭률이 ${isoProductMatching.isoMatchingRate.toFixed(2)}%로 낮습니다.`
    );
    recommendations.push(
      "추천 시스템에서 ISO 코드 매칭을 강화하세요."
    );
  }

  if (icfIsoMatching.top1Accuracy < 70) {
    issues.push(
      `Top-1 정확도가 ${icfIsoMatching.top1Accuracy.toFixed(2)}%로 낮습니다.`
    );
    recommendations.push(
      "하이브리드 매칭 시스템의 가중치를 조정하세요."
    );
  }

  // 7. 카테고리별 통계 정리
  const categoryBreakdownFormatted: Record<string, {
    count: number;
    accuracy: number;
    avgMatches: number;
  }> = {};

  Object.entries(categoryBreakdown).forEach(([category, stats]) => {
    categoryBreakdownFormatted[category] = {
      count: stats.count,
      accuracy: stats.count > 0
        ? (stats.accurateMatches / stats.count) * 100
        : 0,
      avgMatches: stats.count > 0
        ? stats.totalMatches / stats.count
        : 0,
    };
  });

  const result: MatchingAccuracyResult = {
    timestamp: new Date().toISOString(),
    totalConsultations: consultations?.length || 0,
    consultationsWithRecommendations: new Set(
      recommendationsData?.map((r) => r.consultation_id) || []
    ).size,
    totalRecommendations: recommendationsData?.length || 0,
    icfIsoMatching,
    isoProductMatching,
    hybridMatchingPerformance: {
      averageResponseTime: 0, // TODO: 실제 측정 필요
      cacheHitRate: 0, // TODO: 실제 측정 필요
      ruleBasedMatches: 0, // TODO: 실제 측정 필요
      semanticMatches: 0, // TODO: 실제 측정 필요
      knowledgeGraphMatches: 0, // TODO: 실제 측정 필요
      keywordMatches: 0, // TODO: 실제 측정 필요
    },
    categoryBreakdown: categoryBreakdownFormatted,
    issues,
    recommendations,
  };

  return result;
}

// 메인 실행
async function main() {
  try {
    const result = await checkMatchingAccuracy();

    console.log("\n" + "=".repeat(60));
    console.log("📊 매칭 정확도 검사 결과");
    console.log("=".repeat(60) + "\n");

    console.log("📈 전체 통계:");
    console.log(`   - 총 상담 수: ${result.totalConsultations}개`);
    console.log(`   - 추천이 있는 상담: ${result.consultationsWithRecommendations}개`);
    console.log(`   - 총 추천 수: ${result.totalRecommendations}개\n`);

    console.log("🎯 ICF-ISO 매칭:");
    console.log(`   - Top-1 정확도: ${result.icfIsoMatching.top1Accuracy.toFixed(2)}%`);
    console.log(`   - Top-3 정확도: ${result.icfIsoMatching.top3Accuracy.toFixed(2)}%`);
    console.log(`   - Top-5 정확도: ${result.icfIsoMatching.top5Accuracy.toFixed(2)}%`);
    console.log(`   - 평균 매칭 수: ${result.icfIsoMatching.averageMatchesPerIcf.toFixed(2)}개\n`);

    console.log("🔗 ISO-Product 매칭:");
    console.log(`   - ISO 매칭률: ${result.isoProductMatching.isoMatchingRate.toFixed(2)}%`);
    console.log(`   - ISO 코드 있는 상품: ${result.isoProductMatching.productsWithIso}개`);
    console.log(`   - ISO 코드 없는 상품: ${result.isoProductMatching.productsWithoutIso}개\n`);

    if (Object.keys(result.categoryBreakdown).length > 0) {
      console.log("📂 카테고리별 통계:");
      Object.entries(result.categoryBreakdown).forEach(([category, stats]) => {
        console.log(`   - ${category} 카테고리: ${stats.count}개, 정확도: ${stats.accuracy.toFixed(2)}%, 평균 매칭: ${stats.avgMatches.toFixed(2)}개`);
      });
      console.log();
    }

    if (result.issues.length > 0) {
      console.log("⚠️ 발견된 문제점:");
      result.issues.forEach((issue) => {
        console.log(`   - ${issue}`);
      });
      console.log();
    }

    if (result.recommendations.length > 0) {
      console.log("💡 개선 권장 사항:");
      result.recommendations.forEach((rec) => {
        console.log(`   - ${rec}`);
      });
      console.log();
    }

    console.log("=".repeat(60));
    console.log("✅ 검사 완료!");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { checkMatchingAccuracy };
