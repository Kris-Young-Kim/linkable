import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 매칭 성능 분석 API
 * GET: 가중치 설정별 성능 지표 조회
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
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "30days";
    const weightConfigName = searchParams.get("weightConfigName");

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

    let query = supabase
      .from("matching_performance_logs")
      .select("*")
      .gte("created_at", startDate.toISOString());

    if (weightConfigName) {
      query = query.eq("weight_config_name", weightConfigName);
    }

    const { data: logs, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[Matching Performance API] Error:", error);
      return NextResponse.json(
        { error: "Failed to load performance logs" },
        { status: 500 }
      );
    }

    // 가중치 설정별 집계
    const configStats = new Map<
      string,
      {
        configName: string;
        totalMatches: number;
        avgExecutionTime: number;
        avgTopMatchScore: number;
        avgAverageMatchScore: number;
        avgMatchCount: number;
        clickedCount: number;
        purchaseCount: number;
        avgFeedbackRating: number;
        clickThroughRate: number;
        purchaseConversionRate: number;
      }
    >();

    logs?.forEach((log) => {
      const configName = log.weight_config_name || "unknown";
      if (!configStats.has(configName)) {
        configStats.set(configName, {
          configName,
          totalMatches: 0,
          avgExecutionTime: 0,
          avgTopMatchScore: 0,
          avgAverageMatchScore: 0,
          avgMatchCount: 0,
          clickedCount: 0,
          purchaseCount: 0,
          avgFeedbackRating: 0,
          clickThroughRate: 0,
          purchaseConversionRate: 0,
        });
      }

      const stats = configStats.get(configName)!;
      stats.totalMatches += 1;
      stats.avgExecutionTime += log.execution_time_ms || 0;
      stats.avgTopMatchScore += Number(log.top_match_score || 0);
      stats.avgAverageMatchScore += Number(log.average_match_score || 0);
      stats.avgMatchCount += log.match_count || 0;
      
      if (log.recommendation_clicked) {
        stats.clickedCount += 1;
      }
      if (log.purchase_completed) {
        stats.purchaseCount += 1;
      }
      if (log.feedback_rating) {
        stats.avgFeedbackRating += log.feedback_rating;
      }
    });

    // 평균 계산
    const aggregatedStats = Array.from(configStats.values()).map((stats) => {
      const count = stats.totalMatches;
      return {
        ...stats,
        avgExecutionTime: count > 0 ? stats.avgExecutionTime / count : 0,
        avgTopMatchScore: count > 0 ? stats.avgTopMatchScore / count : 0,
        avgAverageMatchScore: count > 0 ? stats.avgAverageMatchScore / count : 0,
        avgMatchCount: count > 0 ? stats.avgMatchCount / count : 0,
        avgFeedbackRating: stats.clickedCount > 0 
          ? stats.avgFeedbackRating / stats.clickedCount 
          : 0,
        clickThroughRate: count > 0 
          ? (stats.clickedCount / count) * 100 
          : 0,
        purchaseConversionRate: stats.clickedCount > 0
          ? (stats.purchaseCount / stats.clickedCount) * 100
          : 0,
      };
    });

    // A/B 테스트 결과 조회 (뷰 사용)
    const { data: abTestResults, error: abTestError } = await supabase
      .from("view_ab_test_matching_results")
      .select("*");

    if (abTestError) {
      console.warn("[Matching Performance API] AB test results error:", abTestError);
    }

    return NextResponse.json({
      configStats: aggregatedStats,
      abTestResults: abTestResults || [],
      dateRange,
      totalLogs: logs?.length || 0,
    });
  } catch (error) {
    console.error("[Matching Performance API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

