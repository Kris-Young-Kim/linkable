import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hybridMatch } from "@/core/matching/hybrid-matcher";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 ICF-ISO-Products 매칭 정확도 검사 시작...");

    const supabase = getSupabaseServerClient();
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

    console.log(`   ✓ ${consultations?.length || 0}개 상담 발견`);

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

    console.log(`   ✓ ${recommendationsData?.length || 0}개 추천 발견`);

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

    console.log(`   ✓ ${products?.length || 0}개 활성 상품 발견`);

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
      if (!consultation.icf_codes || (Array.isArray(consultation.icf_codes) && consultation.icf_codes.length === 0)) continue;

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

            const matchedIsoCodes = matches.map((m) => m.isoCode);
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

    const result = {
      timestamp: new Date().toISOString(),
      totalConsultations: consultations?.length || 0,
      consultationsWithRecommendations: new Set(
        recommendationsData?.map((r) => r.consultation_id) || []
      ).size,
      totalRecommendations: recommendationsData?.length || 0,
      icfIsoMatching,
      isoProductMatching,
      categoryBreakdown: categoryBreakdownFormatted,
      issues,
      recommendations,
    };

    console.log("✅ 매칭 정확도 검사 완료");

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ 매칭 정확도 검사 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
