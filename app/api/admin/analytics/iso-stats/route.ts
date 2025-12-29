import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자용 ISO 분류별 통계 API
 * GET /api/admin/analytics/iso-stats
 *
 * 반환 데이터:
 * - ISO 코드별 추천 수
 * - ISO 코드별 클릭률
 * - ISO 코드별 평균 효과성 점수
 * - ISO 코드별 평가 수
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
    const limit = Number(searchParams.get("limit")) || 50;

    // 날짜 범위 계산
    const getDateRange = (range: string) => {
      const now = new Date();
      const start = new Date();

      switch (range) {
        case "today":
          start.setHours(0, 0, 0, 0);
          break;
        case "7days":
          start.setDate(start.getDate() - 7);
          break;
        case "30days":
          start.setDate(start.getDate() - 30);
          break;
        case "90days":
          start.setDate(start.getDate() - 90);
          break;
        case "1year":
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }

      return { start, end: now };
    };

    const { start: dateStart, end: dateEnd } = getDateRange(dateRange);

    // View를 사용하여 ISO 코드별 통계 조회
    const { data: isoStats, error: viewError } = await supabase
      .from("view_iso_code_stats")
      .select("*")
      .order("total_ippa_evaluations", { ascending: false })
      .limit(limit);

    if (viewError) {
      console.error("[ISO Stats] View fetch error:", viewError);
      // View가 없으면 직접 계산
      const { data: products } = await supabase
        .from("products")
        .select("id, iso_code")
        .eq("is_active", true);

      const isoCodeMap = new Map<string, string[]>();
      products?.forEach((p) => {
        if (p.iso_code) {
          const codes = isoCodeMap.get(p.iso_code) || [];
          codes.push(p.id);
          isoCodeMap.set(p.iso_code, codes);
        }
      });

      const stats = [];
      for (const [isoCode, productIds] of isoCodeMap.entries()) {
        const { data: recommendations } = await supabase
          .from("recommendations")
          .select("id, is_clicked")
          .in("product_id", productIds);

        const { data: evaluations } = await supabase
          .from("ippa_evaluations")
          .select("effectiveness_score")
          .in(
            "product_id",
            productIds
          )
          .not("effectiveness_score", "is", null);

        const totalRecommendations = recommendations?.length ?? 0;
        const clickedRecommendations =
          recommendations?.filter((r) => r.is_clicked).length ?? 0;
        const totalEvaluations = evaluations?.length ?? 0;
        const avgEffectiveness =
          evaluations && evaluations.length > 0
            ? evaluations.reduce(
                (sum, e) => sum + Number(e.effectiveness_score || 0),
                0
              ) / evaluations.length
            : 0;

        stats.push({
          isoCode,
          totalRecommendations,
          clickedRecommendations,
          clickThroughRate:
            totalRecommendations > 0
              ? (clickedRecommendations / totalRecommendations) * 100
              : 0,
          totalEvaluations,
          avgEffectivenessScore: avgEffectiveness,
          productCount: productIds.length,
        });
      }

      return NextResponse.json({
        stats: stats.map((s) => ({
          ...s,
          clickThroughRate: Number(s.clickThroughRate.toFixed(2)),
          avgEffectivenessScore: Number(s.avgEffectivenessScore.toFixed(2)),
        })),
        summary: {
          totalIsoCodes: stats.length,
          totalWithRecommendations: stats.filter(
            (s) => s.totalRecommendations > 0
          ).length,
          totalWithEvaluations: stats.filter((s) => s.totalEvaluations > 0)
            .length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // View에서 데이터 사용
    const formattedStats = (isoStats ?? []).map((stat: any) => ({
      isoCode: stat.iso_code,
      totalRecommendations: Number(stat.total_recommendations),
      clickedRecommendations: Number(stat.clicked_recommendations),
      clickThroughRate: Number(stat.click_through_rate),
      totalEvaluations: Number(stat.total_ippa_evaluations),
      avgEffectivenessScore: Number(stat.average_effectiveness_score || 0),
      productCount: Number(stat.product_count),
    }));

    return NextResponse.json({
      stats: formattedStats,
      dateRange,
      summary: {
        totalIsoCodes: formattedStats.length,
        totalWithRecommendations: formattedStats.filter(
          (s) => s.totalRecommendations > 0
        ).length,
        totalWithEvaluations: formattedStats.filter(
          (s) => s.totalEvaluations > 0
        ).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ISO Stats] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

