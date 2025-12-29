import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

/**
 * 상품별 통계 API
 * GET /api/admin/analytics/product-stats
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

    // View를 사용하여 상품별 통계 조회
    let query = supabase
      .from("view_product_stats")
      .select("*")
      .order("total_recommendations", { ascending: false })
      .limit(limit);

    // 날짜 필터링 (View가 날짜 필터를 지원하지 않으면 직접 조회)
    const { data: productStats, error: statsError } = await query;

    if (statsError) {
      logEvent({
        category: "analytics",
        action: "product_stats_error",
        payload: { error: statsError },
        level: "error",
      });
      return NextResponse.json(
        { error: "Failed to fetch product stats" },
        { status: 500 }
      );
    }

    // 날짜 필터링 적용 (추천 생성 날짜 기준)
    const filteredStats = productStats?.filter((stat: any) => {
      if (!stat.last_recommended_at) return false;
      const lastRecommended = new Date(stat.last_recommended_at);
      return lastRecommended >= dateStart && lastRecommended <= dateEnd;
    }) || [];

    logEvent({
      category: "analytics",
      action: "product_stats_retrieved",
      payload: { count: filteredStats.length, dateRange },
    });

    return NextResponse.json({
      stats: filteredStats,
      dateRange,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Product Stats] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
