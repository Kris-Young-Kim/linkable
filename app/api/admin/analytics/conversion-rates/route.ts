import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 전환율 측정 API
 * GET /api/admin/analytics/conversion-rates
 * 
 * 측정 항목:
 * - 추천 CTA 클릭률 (목표: 25%)
 * - 문의 연결율 (목표: 10%)
 * - 구매 전환율
 * - 전환 퍼널 분석
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 관리자 권한 확인
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userRole = clerkUser.privateMetadata?.role as string | undefined;

    if (userRole !== "admin" && userRole !== "expert") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 필터 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "30days";

    // 날짜 범위 계산
    const now = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 1. 추천 CTA 클릭률 측정
    const { data: recommendations, error: recError } = await supabase
      .from("recommendations")
      .select("id, is_clicked, created_at")
      .gte("created_at", startDate.toISOString());

    if (recError) {
      console.error("[Conversion Rates] Recommendations fetch error:", recError);
    }

    const totalRecommendations = recommendations?.length ?? 0;
    const clickedRecommendations =
      recommendations?.filter((r) => r.is_clicked).length ?? 0;
    const recommendationClickRate =
      totalRecommendations > 0
        ? (clickedRecommendations / totalRecommendations) * 100
        : 0;

    // 2. 문의 연결율 측정 (전문가 문의 클릭)
    const { data: expertInquiries, error: inquiryError } = await supabase
      .from("conversion_events")
      .select("id, recommendation_id, created_at")
      .eq("event_type", "expert_inquiry_click")
      .gte("created_at", startDate.toISOString());

    if (inquiryError) {
      console.error("[Conversion Rates] Expert inquiries fetch error:", inquiryError);
    }

    const totalExpertInquiries = expertInquiries?.length ?? 0;
    const expertInquiryRate =
      clickedRecommendations > 0
        ? (totalExpertInquiries / clickedRecommendations) * 100
        : 0;

    // 3. 지원제도 클릭률
    const { data: supportProgramClicks, error: supportError } = await supabase
      .from("conversion_events")
      .select("id, recommendation_id, created_at")
      .eq("event_type", "support_program_click")
      .gte("created_at", startDate.toISOString());

    if (supportError) {
      console.error("[Conversion Rates] Support program clicks fetch error:", supportError);
    }

    const totalSupportClicks = supportProgramClicks?.length ?? 0;
    const supportProgramClickRate =
      clickedRecommendations > 0
        ? (totalSupportClicks / clickedRecommendations) * 100
        : 0;

    // 4. 구매 전환율 측정
    const { data: purchases, error: purchaseError } = await supabase
      .from("conversion_events")
      .select(
        "id, recommendation_id, purchase_amount, commission_amount, purchase_date, tracking_source, created_at"
      )
      .eq("event_type", "purchase_completed")
      .gte("created_at", startDate.toISOString());

    if (purchaseError) {
      console.error("[Conversion Rates] Purchases fetch error:", purchaseError);
    }

    const totalPurchases = purchases?.length ?? 0;
    const purchaseConversionRate =
      clickedRecommendations > 0 ? (totalPurchases / clickedRecommendations) * 100 : 0;

    // 구매 금액 통계
    const purchaseAmounts = (purchases ?? [])
      .map((p) => Number(p.purchase_amount || 0))
      .filter((a) => !isNaN(a) && a > 0);
    const totalPurchaseAmount = purchaseAmounts.reduce((sum, a) => sum + a, 0);
    const averagePurchaseAmount =
      purchaseAmounts.length > 0 ? totalPurchaseAmount / purchaseAmounts.length : 0;

    // 수수료 통계
    const commissionAmounts = (purchases ?? [])
      .map((p) => Number(p.commission_amount || 0))
      .filter((a) => !isNaN(a) && a > 0);
    const totalCommissionAmount = commissionAmounts.reduce((sum, a) => sum + a, 0);
    const averageCommissionAmount =
      commissionAmounts.length > 0 ? totalCommissionAmount / commissionAmounts.length : 0;

    // 추적 소스별 구매 통계
    const purchasesBySource: Record<string, number> = {};
    (purchases ?? []).forEach((p) => {
      const source = p.tracking_source || "unknown";
      purchasesBySource[source] = (purchasesBySource[source] || 0) + 1;
    });

    // 5. 전환 퍼널 분석
    const { data: consultations, error: consultationError } = await supabase
      .from("consultations")
      .select("id, created_at")
      .gte("created_at", startDate.toISOString());

    if (consultationError) {
      console.error("[Conversion Rates] Consultations fetch error:", consultationError);
    }

    const totalConsultations = consultations?.length ?? 0;

    // 퍼널 단계별 전환율
    const funnel = {
      consultations: totalConsultations,
      recommendations: totalRecommendations,
      clicks: clickedRecommendations,
      expertInquiries: totalExpertInquiries,
      supportClicks: totalSupportClicks,
      purchases: totalPurchases,
      rates: {
        consultationToRecommendation:
          totalConsultations > 0
            ? (totalRecommendations / totalConsultations) * 100
            : 0,
        recommendationToClick: recommendationClickRate,
        clickToExpertInquiry: expertInquiryRate,
        clickToSupport: supportProgramClickRate,
        clickToPurchase: purchaseConversionRate,
        overallConversion:
          totalConsultations > 0 ? (totalPurchases / totalConsultations) * 100 : 0,
      },
    };

    // 6. 목표 달성 여부
    const goals = {
      recommendationClickRate: {
        target: 25,
        current: Number(recommendationClickRate.toFixed(2)),
        achieved: recommendationClickRate >= 25,
        gap: Math.max(0, 25 - recommendationClickRate),
      },
      expertInquiryRate: {
        target: 10,
        current: Number(expertInquiryRate.toFixed(2)),
        achieved: expertInquiryRate >= 10,
        gap: Math.max(0, 10 - expertInquiryRate),
      },
      purchaseConversionRate: {
        target: 5, // 구매 전환율 목표 (임시)
        current: Number(purchaseConversionRate.toFixed(2)),
        achieved: purchaseConversionRate >= 5,
        gap: Math.max(0, 5 - purchaseConversionRate),
      },
    };

    // 7. 일별 추이 (최근 30일)
    const dailyStats: Array<{
      date: string;
      recommendations: number;
      clicks: number;
      expertInquiries: number;
      purchases: number;
      clickRate: number;
      purchaseRate: number;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRecommendations =
        recommendations?.filter(
          (r) =>
            new Date(r.created_at) >= date && new Date(r.created_at) < nextDate
        ).length ?? 0;
      const dayClicks =
        recommendations?.filter(
          (r) =>
            r.is_clicked &&
            new Date(r.created_at) >= date &&
            new Date(r.created_at) < nextDate
        ).length ?? 0;
      const dayInquiries =
        expertInquiries?.filter(
          (e) =>
            new Date(e.created_at) >= date && new Date(e.created_at) < nextDate
        ).length ?? 0;
      const dayPurchases =
        purchases?.filter(
          (p) =>
            new Date(p.created_at) >= date && new Date(p.created_at) < nextDate
        ).length ?? 0;

      dailyStats.push({
        date: date.toISOString().split("T")[0],
        recommendations: dayRecommendations,
        clicks: dayClicks,
        expertInquiries: dayInquiries,
        purchases: dayPurchases,
        clickRate: dayRecommendations > 0 ? (dayClicks / dayRecommendations) * 100 : 0,
        purchaseRate: dayClicks > 0 ? (dayPurchases / dayClicks) * 100 : 0,
      });
    }

    return NextResponse.json({
      summary: {
        recommendationClickRate: Number(recommendationClickRate.toFixed(2)),
        expertInquiryRate: Number(expertInquiryRate.toFixed(2)),
        supportProgramClickRate: Number(supportProgramClickRate.toFixed(2)),
        purchaseConversionRate: Number(purchaseConversionRate.toFixed(2)),
      },
      metrics: {
        recommendations: {
          total: totalRecommendations,
          clicked: clickedRecommendations,
          clickRate: Number(recommendationClickRate.toFixed(2)),
        },
        expertInquiries: {
          total: totalExpertInquiries,
          inquiryRate: Number(expertInquiryRate.toFixed(2)),
        },
        supportProgram: {
          total: totalSupportClicks,
          clickRate: Number(supportProgramClickRate.toFixed(2)),
        },
        purchases: {
          total: totalPurchases,
          conversionRate: Number(purchaseConversionRate.toFixed(2)),
          totalAmount: totalPurchaseAmount,
          averageAmount: Number(averagePurchaseAmount.toFixed(0)),
          totalCommission: totalCommissionAmount,
          averageCommission: Number(averageCommissionAmount.toFixed(0)),
          bySource: purchasesBySource,
        },
      },
      funnel,
      goals,
      dailyStats,
      dateRange,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Conversion Rates] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

