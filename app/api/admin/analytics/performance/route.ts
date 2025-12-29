import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 성능 모니터링 데이터 조회 API
 * GET: Web Vitals 및 API 성능 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "7days";
    const metricType = searchParams.get("type") || "all"; // 'web-vitals', 'api', 'all'

    // 날짜 범위 계산
    const now = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case "1day":
        startDate.setDate(now.getDate() - 1);
        break;
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
        startDate.setDate(now.getDate() - 7);
    }

    const result: any = {};

    // Web Vitals 통계
    if (metricType === "all" || metricType === "web-vitals") {
      const { data: webVitalsStats, error: webVitalsError } = await supabase
        .from("view_web_vitals_daily_stats")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false })
        .order("metric_name", { ascending: true });

      if (webVitalsError) {
        console.error("[Performance API] Web Vitals error:", webVitalsError);
      } else {
        result.webVitals = webVitalsStats || [];
      }

      // 페이지별 통계
      const { data: pageStats, error: pageError } = await supabase
        .from("view_web_vitals_by_page")
        .select("*")
        .order("page_path", { ascending: true })
        .order("metric_name", { ascending: true });

      if (pageError) {
        console.error("[Performance API] Page stats error:", pageError);
      } else {
        result.pageStats = pageStats || [];
      }
    }

    // API 성능 통계
    if (metricType === "all" || metricType === "api") {
      const { data: apiStats, error: apiError } = await supabase
        .from("view_api_performance_daily_stats")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false })
        .order("endpoint", { ascending: true });

      if (apiError) {
        console.error("[Performance API] API stats error:", apiError);
      } else {
        result.apiPerformance = apiStats || [];
      }
    }

    return NextResponse.json({
      ...result,
      dateRange,
      startDate: startDate.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Performance API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
