import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자용 전체 플랫폼 통계 API
 * GET /api/admin/analytics
 *
 * 반환 데이터:
 * - 전체 추천 정확도 (클릭률)
 * - 전체 K-IPPA 참여율
 * - 전체 상담 완료율
 * - 전체 평균 효과성 점수
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 관리자 권한 확인 (privateMetadata에서 role 확인)
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
    const userGroup = searchParams.get("userGroup") || "all";
    const includeDaily = searchParams.get("daily") === "true";

    console.log(
      `[Admin Analytics] Filters: dateRange=${dateRange}, userGroup=${userGroup}`
    );

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

    // View를 사용하여 플랫폼 통계 조회 (성능 최적화)
    const { data: platformStats, error: viewError } = await supabase
      .from("view_platform_stats")
      .select("*")
      .single();

    if (viewError) {
      console.error("[Admin Analytics] View fetch error:", viewError);
      // View가 없으면 기존 방식으로 폴백
      console.log("[Admin Analytics] Falling back to direct queries");

      // 전체 추천 데이터
      const { data: allRecommendations, error: recError } = await supabase
        .from("recommendations")
        .select("id, is_clicked, created_at");

      if (recError) {
        console.error(
          "[Admin Analytics] Recommendations fetch error:",
          recError
        );
      }

      const totalRecommendations = allRecommendations?.length ?? 0;
      const clickedRecommendations =
        allRecommendations?.filter((r) => r.is_clicked).length ?? 0;
      const clickThroughRate =
        totalRecommendations > 0
          ? (clickedRecommendations / totalRecommendations) * 100
          : 0;

      // 전체 K-IPPA 평가 데이터
      const { data: allIppaEvaluations, error: ippaError } = await supabase
        .from("ippa_evaluations")
        .select("id, recommendation_id, evaluated_at, effectiveness_score");

      if (ippaError) {
        console.error(
          "[Admin Analytics] IPPA evaluations fetch error:",
          ippaError
        );
      }

      const totalIppaEvaluations = allIppaEvaluations?.length ?? 0;
      
      // recommendation_id가 있고 해당 추천이 클릭된 평가만 카운트
      const { data: clickedRecIds } = await supabase
        .from("recommendations")
        .select("id")
        .eq("is_clicked", true);
      
      const clickedRecIdSet = new Set(clickedRecIds?.map(r => r.id) || []);
      const validEvaluations = allIppaEvaluations?.filter(
        e => e.recommendation_id && clickedRecIdSet.has(e.recommendation_id)
      ).length ?? 0;
      
      const ippaParticipationRate =
        clickedRecommendations > 0
          ? (validEvaluations / clickedRecommendations) * 100
          : 0;

      // 전체 상담 데이터
      const { data: allConsultations, error: consultError } = await supabase
        .from("consultations")
        .select("id, status, created_at");

      if (consultError) {
        console.error(
          "[Admin Analytics] Consultations fetch error:",
          consultError
        );
      }

      const totalConsultations = allConsultations?.length ?? 0;
      const completedConsultations =
        allConsultations?.filter((c) => c.status === "completed").length ?? 0;
      const consultationCompletionRate =
        totalConsultations > 0
          ? (completedConsultations / totalConsultations) * 100
          : 0;

      // 최근 30일 트렌드
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRecommendations =
        allRecommendations?.filter(
          (r) => new Date(r.created_at) >= thirtyDaysAgo
        ).length ?? 0;

      const recentIppaEvaluations =
        allIppaEvaluations?.filter(
          (e) => new Date(e.evaluated_at) >= thirtyDaysAgo
        ).length ?? 0;

      // 전체 평균 효과성 점수
      const effectivenessScores = (allIppaEvaluations ?? [])
        .map((e) =>
          e.effectiveness_score ? Number(e.effectiveness_score) : null
        )
        .filter((s): s is number => s !== null);
      const avgEffectivenessScore =
        effectivenessScores.length > 0
          ? effectivenessScores.reduce((sum, score) => sum + score, 0) /
            effectivenessScores.length
          : 0;

      return NextResponse.json({
        metrics: {
          recommendationAccuracy: {
            clickThroughRate: Number(clickThroughRate.toFixed(2)),
            totalRecommendations,
            clickedRecommendations,
          },
          ippaParticipation: {
            participationRate: Number(ippaParticipationRate.toFixed(2)),
            totalEvaluations: totalIppaEvaluations,
            eligibleRecommendations: clickedRecommendations,
          },
          consultationCompletion: {
            completionRate: Number(consultationCompletionRate.toFixed(2)),
            totalConsultations,
            completedConsultations,
          },
          recentActivity: {
            recommendations: recentRecommendations,
            ippaEvaluations: recentIppaEvaluations,
          },
          averageEffectiveness: Number(avgEffectivenessScore.toFixed(2)),
        },
        timestamp: new Date().toISOString(),
      });
    }

    // View에서 데이터 사용
    const stats = platformStats as {
      total_recommendations: number;
      clicked_recommendations: number;
      click_through_rate: number;
      total_ippa_evaluations: number;
      ippa_participation_rate: number;
      total_consultations: number;
      completed_consultations: number;
      consultation_completion_rate: number;
      average_effectiveness_score: number;
      recent_recommendations: number;
      recent_ippa_evaluations: number;
    };

    console.log(
      "[Admin Analytics] Using view_platform_stats for optimized query"
    );

    // 기간 필터링이 필요한 경우 프로시저 사용
    let filteredMetrics = stats;
    if (dateRange !== "30days") {
      try {
        const { data: periodStats, error: periodError } = await supabase.rpc(
          "calculate_period_stats",
          {
            p_start_date: dateStart.toISOString(),
            p_end_date: dateEnd.toISOString(),
          }
        );

        if (!periodError && periodStats && periodStats.length > 0) {
          const period = periodStats[0] as {
            total_recommendations: number;
            clicked_recommendations: number;
            click_through_rate: number;
            total_ippa_evaluations: number;
            average_effectiveness_score: number;
            total_consultations: number;
            completed_consultations: number;
          };

          filteredMetrics = {
            ...stats,
            total_recommendations: period.total_recommendations,
            clicked_recommendations: period.clicked_recommendations,
            click_through_rate: period.click_through_rate,
            total_ippa_evaluations: period.total_ippa_evaluations,
            average_effectiveness_score:
              period.average_effectiveness_score || 0,
            total_consultations: period.total_consultations,
            completed_consultations: period.completed_consultations,
            consultation_completion_rate:
              period.total_consultations > 0
                ? (period.completed_consultations /
                    period.total_consultations) *
                  100
                : 0,
          };
        }
      } catch (error) {
        console.warn(
          "[Admin Analytics] Period stats calculation failed, using view data:",
          error
        );
      }
    }

    // 일별 통계 조회 (선택적)
    let dailyStats = null;
    if (includeDaily) {
      try {
        const { data: daily, error: dailyError } = await supabase
          .from("view_daily_stats")
          .select("*")
          .order("stat_date", { ascending: false })
          .limit(30);

        if (!dailyError) {
          dailyStats = daily;
        }
      } catch (error) {
        console.warn("[Admin Analytics] Daily stats fetch failed:", error);
      }
    }

    // 시간별 트렌드 데이터 계산
    console.log("[Admin Analytics] Calculating time-based trends");
    
    // 일별 트렌드 (최근 30일)
    const dailyTrendData: Array<{
      date: string;
      recommendations: number;
      ippaEvaluations: number;
      consultations: number;
      completedConsultations: number;
    }> = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dateStr = date.toISOString().split('T')[0];
      
      // 해당 날짜의 추천 수
      const { data: dayRecs } = await supabase
        .from("recommendations")
        .select("id")
        .gte("created_at", date.toISOString())
        .lt("created_at", nextDate.toISOString());
      
      // 해당 날짜의 평가 수
      const { data: dayEvals } = await supabase
        .from("ippa_evaluations")
        .select("id")
        .gte("evaluated_at", date.toISOString())
        .lt("evaluated_at", nextDate.toISOString());
      
      // 해당 날짜의 상담 수
      const { data: dayConsults } = await supabase
        .from("consultations")
        .select("id, status")
        .gte("created_at", date.toISOString())
        .lt("created_at", nextDate.toISOString());
      
      dailyTrendData.push({
        date: dateStr,
        recommendations: dayRecs?.length ?? 0,
        ippaEvaluations: dayEvals?.length ?? 0,
        consultations: dayConsults?.length ?? 0,
        completedConsultations: dayConsults?.filter(c => c.status === "completed").length ?? 0,
      });
    }

    // 주별 트렌드 (최근 12주)
    const weeklyTrendData: Array<{
      week: string;
      weekStart: string;
      recommendations: number;
      ippaEvaluations: number;
      consultations: number;
      completedConsultations: number;
    }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekLabel = `${weekStart.toISOString().split('T')[0]} ~ ${new Date(weekEnd.getTime() - 1).toISOString().split('T')[0]}`;
      
      // 해당 주의 추천 수
      const { data: weekRecs } = await supabase
        .from("recommendations")
        .select("id")
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString());
      
      // 해당 주의 평가 수
      const { data: weekEvals } = await supabase
        .from("ippa_evaluations")
        .select("id")
        .gte("evaluated_at", weekStart.toISOString())
        .lt("evaluated_at", weekEnd.toISOString());
      
      // 해당 주의 상담 수
      const { data: weekConsults } = await supabase
        .from("consultations")
        .select("id, status")
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString());
      
      weeklyTrendData.push({
        week: weekLabel,
        weekStart: weekStart.toISOString().split('T')[0],
        recommendations: weekRecs?.length ?? 0,
        ippaEvaluations: weekEvals?.length ?? 0,
        consultations: weekConsults?.length ?? 0,
        completedConsultations: weekConsults?.filter(c => c.status === "completed").length ?? 0,
      });
    }

    // 월별 트렌드 (최근 12개월)
    const monthlyTrendData: Array<{
      month: string;
      monthStart: string;
      recommendations: number;
      ippaEvaluations: number;
      consultations: number;
      completedConsultations: number;
      newUsers: number;
    }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);
      
      const monthLabel = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      
      // 해당 월의 추천 수
      const { data: monthRecs } = await supabase
        .from("recommendations")
        .select("id")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      
      // 해당 월의 평가 수
      const { data: monthEvals } = await supabase
        .from("ippa_evaluations")
        .select("id")
        .gte("evaluated_at", monthStart.toISOString())
        .lt("evaluated_at", monthEnd.toISOString());
      
      // 해당 월의 상담 수
      const { data: monthConsults } = await supabase
        .from("consultations")
        .select("id, status")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      
      // 해당 월의 신규 사용자 수
      const { data: monthUsers } = await supabase
        .from("users")
        .select("id")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      
      monthlyTrendData.push({
        month: monthLabel,
        monthStart: monthStart.toISOString().split('T')[0],
        recommendations: monthRecs?.length ?? 0,
        ippaEvaluations: monthEvals?.length ?? 0,
        consultations: monthConsults?.length ?? 0,
        completedConsultations: monthConsults?.filter(c => c.status === "completed").length ?? 0,
        newUsers: monthUsers?.length ?? 0,
      });
    }

    // 시간대별 활동 패턴 (24시간)
    const hourlyActivityData: Array<{
      hour: number;
      consultations: number;
      recommendationClicks: number;
    }> = [];
    
    // 최근 30일 데이터로 시간대별 패턴 분석
    const thirtyDaysAgoForHourly = new Date();
    thirtyDaysAgoForHourly.setDate(thirtyDaysAgoForHourly.getDate() - 30);
    
    // 상담 시작 시간대별 집계
    const { data: consultationsForHourly } = await supabase
      .from("consultations")
      .select("created_at")
      .gte("created_at", thirtyDaysAgoForHourly.toISOString());
    
    const hourlyConsultations = new Map<number, number>();
    consultationsForHourly?.forEach(consult => {
      const hour = new Date(consult.created_at).getHours();
      hourlyConsultations.set(hour, (hourlyConsultations.get(hour) || 0) + 1);
    });
    
    // 추천 클릭 시간대별 집계 (클릭된 추천만)
    const { data: clickedRecsForHourly } = await supabase
      .from("recommendations")
      .select("clicked_at")
      .eq("is_clicked", true)
      .not("clicked_at", "is", null)
      .gte("clicked_at", thirtyDaysAgoForHourly.toISOString());
    
    const hourlyClicks = new Map<number, number>();
    clickedRecsForHourly?.forEach(rec => {
      if (rec.clicked_at) {
        const hour = new Date(rec.clicked_at).getHours();
        hourlyClicks.set(hour, (hourlyClicks.get(hour) || 0) + 1);
      }
    });
    
    // 0시부터 23시까지 데이터 생성
    for (let hour = 0; hour < 24; hour++) {
      hourlyActivityData.push({
        hour,
        consultations: hourlyConsultations.get(hour) || 0,
        recommendationClicks: hourlyClicks.get(hour) || 0,
      });
    }

    // 추가 지표 계산
    // 1. 사용자 성장률
    const { data: usersData } = await supabase
      .from("users")
      .select("created_at")
      .order("created_at", { ascending: false });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const totalUsers = usersData?.length ?? 0;
    const newUsersLast30Days =
      usersData?.filter(
        (u) => new Date(u.created_at) >= thirtyDaysAgo
      ).length ?? 0;
    const newUsersPrevious30Days =
      usersData?.filter(
        (u) =>
          new Date(u.created_at) >= sixtyDaysAgo &&
          new Date(u.created_at) < thirtyDaysAgo
      ).length ?? 0;
    const userGrowthRate =
      newUsersPrevious30Days > 0
        ? ((newUsersLast30Days - newUsersPrevious30Days) /
            newUsersPrevious30Days) *
          100
        : newUsersLast30Days > 0
        ? 100
        : 0;

    // 활성 사용자 (최근 30일 내 상담 또는 평가를 한 사용자)
    const { data: activeUsersData } = await supabase
      .from("consultations")
      .select("user_id, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const activeUserIds = new Set(
      activeUsersData?.map((c) => c.user_id) ?? []
    );
    const activeUsers = activeUserIds.size;

    // 2. 전환율 계산
    const totalConsultations = Number(filteredMetrics.total_consultations);
    const totalRecommendations = Number(
      filteredMetrics.total_recommendations
    );
    const clickedRecommendations = Number(
      filteredMetrics.clicked_recommendations
    );
    const totalEvaluations = Number(filteredMetrics.total_ippa_evaluations);

    const consultationToRecommendationRate =
      totalConsultations > 0
        ? (totalRecommendations / totalConsultations) * 100
        : 0;
    const recommendationToClickRate =
      totalRecommendations > 0
        ? (clickedRecommendations / totalRecommendations) * 100
        : 0;
    const clickToEvaluationRate =
      clickedRecommendations > 0
        ? (totalEvaluations / clickedRecommendations) * 100
        : 0;
    const overallConversionRate =
      totalConsultations > 0
        ? (totalEvaluations / totalConsultations) * 100
        : 0;

    // 3. 효과성 점수 분포
    const { data: effectivenessScoresData } = await supabase
      .from("ippa_evaluations")
      .select("effectiveness_score")
      .not("effectiveness_score", "is", null);

    const scores = (effectivenessScoresData ?? [])
      .map((e) => Number(e.effectiveness_score))
      .filter((s) => !isNaN(s))
      .sort((a, b) => a - b);

    const scoreDistribution = {
      min: scores.length > 0 ? scores[0] : 0,
      max: scores.length > 0 ? scores[scores.length - 1] : 0,
      median:
        scores.length > 0
          ? scores.length % 2 === 0
            ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
            : scores[Math.floor(scores.length / 2)]
          : 0,
      p25: scores.length > 0 ? scores[Math.floor(scores.length * 0.25)] : 0,
      p75: scores.length > 0 ? scores[Math.floor(scores.length * 0.75)] : 0,
      p90: scores.length > 0 ? scores[Math.floor(scores.length * 0.9)] : 0,
    };

    // 4. 재방문율 (최근 30일 내 2회 이상 상담한 사용자)
    const { data: repeatUsersData } = await supabase
      .from("consultations")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const userConsultationCounts = new Map<string, number>();
    repeatUsersData?.forEach((c) => {
      const count = userConsultationCounts.get(c.user_id) || 0;
      userConsultationCounts.set(c.user_id, count + 1);
    });

    const repeatUsers = Array.from(userConsultationCounts.values()).filter(
      (count) => count >= 2
    ).length;
    const retentionRate =
      activeUsers > 0 ? (repeatUsers / activeUsers) * 100 : 0;

    const response: any = {
      metrics: {
        recommendationAccuracy: {
          clickThroughRate: Number(filteredMetrics.click_through_rate),
          totalRecommendations: Number(filteredMetrics.total_recommendations),
          clickedRecommendations: Number(
            filteredMetrics.clicked_recommendations
          ),
        },
        ippaParticipation: {
          participationRate: Number(filteredMetrics.ippa_participation_rate),
          totalEvaluations: Number(filteredMetrics.total_ippa_evaluations),
          eligibleRecommendations: Number(
            filteredMetrics.clicked_recommendations
          ),
        },
        consultationCompletion: {
          completionRate: Number(filteredMetrics.consultation_completion_rate),
          totalConsultations: Number(filteredMetrics.total_consultations),
          completedConsultations: Number(
            filteredMetrics.completed_consultations
          ),
        },
        recentActivity: {
          recommendations: Number(filteredMetrics.recent_recommendations),
          ippaEvaluations: Number(filteredMetrics.recent_ippa_evaluations),
        },
        averageEffectiveness: Number(
          filteredMetrics.average_effectiveness_score
        ),
        // 추가 지표
        userGrowth: {
          totalUsers,
          newUsersLast30Days,
          userGrowthRate: Number(userGrowthRate.toFixed(2)),
          activeUsers,
          activeUserRate:
            totalUsers > 0
              ? Number(((activeUsers / totalUsers) * 100).toFixed(2))
              : 0,
        },
        conversionFunnel: {
          consultationToRecommendationRate: Number(
            consultationToRecommendationRate.toFixed(2)
          ),
          recommendationToClickRate: Number(
            recommendationToClickRate.toFixed(2)
          ),
          clickToEvaluationRate: Number(clickToEvaluationRate.toFixed(2)),
          overallConversionRate: Number(overallConversionRate.toFixed(2)),
          totalConsultations,
          totalRecommendations,
          clickedRecommendations,
          totalEvaluations,
        },
        effectivenessDistribution: {
          ...scoreDistribution,
          totalScores: scores.length,
        },
        retention: {
          repeatUsers,
          retentionRate: Number(retentionRate.toFixed(2)),
          activeUsers,
        },
      },
      timestamp: new Date().toISOString(),
    };

    if (dailyStats) {
      response.dailyStats = dailyStats;
    }

    // 트렌드 데이터 추가
    response.trends = {
      daily: dailyTrendData,
      weekly: weeklyTrendData,
      monthly: monthlyTrendData,
      hourly: hourlyActivityData,
    };

    console.log("[Admin Analytics] Trends calculated:", {
      daily: dailyTrendData.length,
      weekly: weeklyTrendData.length,
      monthly: monthlyTrendData.length,
      hourly: hourlyActivityData.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Admin Analytics] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
