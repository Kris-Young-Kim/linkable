/**
 * KPI 트렌드 분석 API
 * 
 * 실시간 KPI 모니터링 및 트렌드 분석을 제공합니다.
 * GET /api/admin/analytics/trends
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    const period = searchParams.get("period") || "30days"; // 7days, 30days, 90days, 1year
    const metric = searchParams.get("metric") || "all"; // all, clickRate, participationRate, effectiveness

    // 날짜 범위 계산
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7days":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "1year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // 일별 통계 조회
    const { data: dailyStats, error: dailyError } = await supabase
      .from("view_daily_stats")
      .select("*")
      .gte("stat_date", startDate.toISOString().split("T")[0])
      .order("stat_date", { ascending: true });

    if (dailyError) {
      console.error("[Trends API] Daily stats error:", dailyError);
      return NextResponse.json(
        { error: "Failed to fetch daily stats" },
        { status: 500 }
      );
    }

    // 주별 통계 계산 (7일 단위)
    const weeklyStats = new Map<string, {
      week: string;
      recommendations: number;
      clicked: number;
      evaluations: number;
      clickRate: number;
      participationRate: number;
    }>();

    dailyStats?.forEach((stat) => {
      const date = new Date(stat.stat_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // 주의 시작일 (일요일)
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyStats.has(weekKey)) {
        weeklyStats.set(weekKey, {
          week: weekKey,
          recommendations: 0,
          clicked: 0,
          evaluations: 0,
          clickRate: 0,
          participationRate: 0,
        });
      }

      const week = weeklyStats.get(weekKey)!;
      week.recommendations += stat.recommendations_count || 0;
      week.clicked += stat.clicked_count || 0;
    });

    // K-IPPA 평가 일별 통계
    const { data: evaluationStats, error: evalError } = await supabase
      .from("ippa_evaluations")
      .select("evaluated_at, recommendation_id")
      .gte("evaluated_at", startDate.toISOString());

    if (!evalError && evaluationStats) {
      const evalByDate = new Map<string, number>();
      evaluationStats.forEach((evaluation) => {
        const date = new Date(evaluation.evaluated_at).toISOString().split("T")[0];
        evalByDate.set(date, (evalByDate.get(date) || 0) + 1);
      });

      dailyStats?.forEach((stat) => {
        const date = stat.stat_date;
        const evalCount = evalByDate.get(date) || 0;
        const weekStart = new Date(date);
        weekStart.setDate(new Date(date).getDate() - new Date(date).getDay());
        const weekKey = weekStart.toISOString().split("T")[0];

        if (weeklyStats.has(weekKey)) {
          const week = weeklyStats.get(weekKey)!;
          week.evaluations += evalCount;
        }
      });
    }

    // 주별 통계에서 클릭률 및 참여율 계산
    Array.from(weeklyStats.values()).forEach((week) => {
      week.clickRate = week.recommendations > 0
        ? (week.clicked / week.recommendations) * 100
        : 0;
      week.participationRate = week.clicked > 0
        ? (week.evaluations / week.clicked) * 100
        : 0;
    });

    // 트렌드 분석 (증가/감소 추세)
    const dailyTrends = dailyStats?.map((stat, index) => {
      const prevStat = index > 0 ? dailyStats[index - 1] : null;
      const clickRate = (stat.recommendations_count || 0) > 0
        ? ((stat.clicked_count || 0) / stat.recommendations_count) * 100
        : 0;
      const prevClickRate = prevStat && (prevStat.recommendations_count || 0) > 0
        ? ((prevStat.clicked_count || 0) / prevStat.recommendations_count) * 100
        : 0;

      return {
        date: stat.stat_date,
        recommendations: stat.recommendations_count || 0,
        clicked: stat.clicked_count || 0,
        clickRate,
        clickRateChange: prevClickRate > 0 ? clickRate - prevClickRate : 0,
        trend: prevClickRate > 0
          ? (clickRate > prevClickRate ? "up" : clickRate < prevClickRate ? "down" : "stable")
          : "stable",
      };
    }) || [];

    // 전체 기간 평균 및 최근 7일 평균 비교
    const allClickRates = dailyTrends
      .map((t) => t.clickRate)
      .filter((r) => r > 0);
    const avgClickRate = allClickRates.length > 0
      ? allClickRates.reduce((sum, r) => sum + r, 0) / allClickRates.length
      : 0;

    const recent7Days = dailyTrends.slice(-7);
    const recentAvgClickRate = recent7Days.length > 0
      ? recent7Days.reduce((sum, t) => sum + t.clickRate, 0) / recent7Days.length
      : 0;

    const clickRateTrend = recentAvgClickRate > avgClickRate
      ? "improving"
      : recentAvgClickRate < avgClickRate
      ? "declining"
      : "stable";

    // 효과성 점수 트렌드
    const { data: effectivenessData, error: effError } = await supabase
      .from("ippa_evaluations")
      .select("evaluated_at, effectiveness_score")
      .gte("evaluated_at", startDate.toISOString())
      .not("effectiveness_score", "is", null)
      .order("evaluated_at", { ascending: true });

    const effectivenessTrends = effError ? [] : (effectivenessData || []).map((evaluation) => ({
      date: new Date(evaluation.evaluated_at).toISOString().split("T")[0],
      score: Number(evaluation.effectiveness_score),
    }));

    // 효과성 점수 일별 평균 계산
    const effectivenessByDate = new Map<string, number[]>();
    effectivenessTrends.forEach((trend) => {
      const scores = effectivenessByDate.get(trend.date) || [];
      scores.push(trend.score);
      effectivenessByDate.set(trend.date, scores);
    });

    const effectivenessDaily = Array.from(effectivenessByDate.entries()).map(([date, scores]) => ({
      date,
      avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      count: scores.length,
    }));

    return NextResponse.json({
      period,
      metric,
      trends: {
        clickRate: {
          daily: dailyTrends.map((t) => ({
            date: t.date,
            value: t.clickRate,
            change: t.clickRateChange,
            trend: t.trend,
          })),
          weekly: Array.from(weeklyStats.values()).map((w) => ({
            week: w.week,
            value: w.clickRate,
          })),
          average: avgClickRate,
          recentAverage: recentAvgClickRate,
          trend: clickRateTrend,
          change: recentAvgClickRate - avgClickRate,
        },
        participationRate: {
          weekly: Array.from(weeklyStats.values()).map((w) => ({
            week: w.week,
            value: w.participationRate,
          })),
        },
        effectiveness: {
          daily: effectivenessDaily,
          average: effectivenessDaily.length > 0
            ? effectivenessDaily.reduce((sum, d) => sum + d.avgScore, 0) / effectivenessDaily.length
            : 0,
        },
        activity: {
          daily: dailyTrends.map((t) => ({
            date: t.date,
            recommendations: t.recommendations,
            clicked: t.clicked,
          })),
          weekly: Array.from(weeklyStats.values()).map((w) => ({
            week: w.week,
            recommendations: w.recommendations,
            clicked: w.clicked,
            evaluations: w.evaluations,
          })),
        },
      },
      summary: {
        totalDays: dailyTrends.length,
        avgClickRate,
        recentAvgClickRate,
        clickRateTrend,
        totalRecommendations: dailyTrends.reduce((sum, t) => sum + t.recommendations, 0),
        totalClicked: dailyTrends.reduce((sum, t) => sum + t.clicked, 0),
        avgEffectiveness: effectivenessDaily.length > 0
          ? effectivenessDaily.reduce((sum, d) => sum + d.avgScore, 0) / effectivenessDaily.length
          : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Trends API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
