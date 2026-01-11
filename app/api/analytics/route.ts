import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const supabase = getSupabaseServerClient()

/**
 * Analytics 데이터 조회 API
 * GET /api/analytics
 * 
 * 반환 데이터:
 * - 추천 정확도 (클릭률)
 * - K-IPPA 참여율
 * - 기타 메트릭
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 사용자 ID 조회
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    if (userError || !userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userIdSupabase = userRow.id

    // 1. 추천 정확도 (클릭률) 계산
    // 먼저 사용자의 상담 ID 목록 가져오기
    const { data: userConsultations } = await supabase
      .from("consultations")
      .select("id")
      .eq("user_id", userIdSupabase)

    const consultationIds = (userConsultations ?? []).map((c) => c.id)

    const { data: recommendations, error: recError } = consultationIds.length > 0
      ? await supabase
          .from("recommendations")
          .select("id, is_clicked, created_at")
          .in("consultation_id", consultationIds)
      : { data: null, error: null }

    if (recError) {
      console.error("[Analytics] Recommendations fetch error:", recError)
    }

    const totalRecommendations = recommendations?.length ?? 0
    const clickedRecommendations = recommendations?.filter((r) => r.is_clicked).length ?? 0
    const clickThroughRate = totalRecommendations > 0 
      ? (clickedRecommendations / totalRecommendations) * 100 
      : 0

    // 2. K-IPPA 참여율 계산
    const { data: ippaEvaluations, error: ippaError } = await supabase
      .from("ippa_evaluations")
      .select("id, recommendation_id, evaluated_at")
      .eq("user_id", userIdSupabase)

    if (ippaError) {
      console.error("[Analytics] IPPA evaluations fetch error:", ippaError)
    }

    const totalIppaEvaluations = ippaEvaluations?.length ?? 0
    const ippaParticipationRate = clickedRecommendations > 0
      ? (totalIppaEvaluations / clickedRecommendations) * 100
      : 0

    // 3. 상담 완료율
    const { data: consultations, error: consultError } = await supabase
      .from("consultations")
      .select("id, status, created_at")
      .eq("user_id", userIdSupabase)

    if (consultError) {
      console.error("[Analytics] Consultations fetch error:", consultError)
    }

    const totalConsultations = consultations?.length ?? 0
    const completedConsultations = consultations?.filter((c) => c.status === "completed").length ?? 0
    const consultationCompletionRate = totalConsultations > 0
      ? (completedConsultations / totalConsultations) * 100
      : 0

    // 4. 최근 30일 트렌드
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentRecommendations = recommendations?.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    ).length ?? 0

    const recentIppaEvaluations = ippaEvaluations?.filter(
      (e) => new Date(e.evaluated_at) >= thirtyDaysAgo
    ).length ?? 0

    // 5. 평균 효과성 점수
    const { data: effectivenessScores, error: effError } = await supabase
      .from("ippa_evaluations")
      .select("effectiveness_score")
      .eq("user_id", userIdSupabase)
      .not("effectiveness_score", "is", null)

    if (effError) {
      console.error("[Analytics] Effectiveness scores fetch error:", effError)
    }

    const scores = (effectivenessScores ?? []).map((e) => Number(e.effectiveness_score))
    const avgEffectivenessScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0

    // 시간별 트렌드 데이터 계산 (사용자별)
    console.log("[Analytics] Calculating user time-based trends");
    
    // 일별 트렌드 (최근 30일)
    const dailyTrendData: Array<{
      date: string;
      recommendations: number;
      ippaEvaluations: number;
      consultations: number;
    }> = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dateStr = date.toISOString().split('T')[0];
      
      // 해당 날짜의 사용자 추천 수
      const { data: dayRecs } = consultationIds.length > 0
        ? await supabase
            .from("recommendations")
            .select("id")
            .in("consultation_id", consultationIds)
            .gte("created_at", date.toISOString())
            .lt("created_at", nextDate.toISOString())
        : { data: null, error: null };
      
      // 해당 날짜의 사용자 평가 수
      const { data: dayEvals } = await supabase
        .from("ippa_evaluations")
        .select("id")
        .eq("user_id", userIdSupabase)
        .gte("evaluated_at", date.toISOString())
        .lt("evaluated_at", nextDate.toISOString());
      
      // 해당 날짜의 사용자 상담 수
      const { data: dayConsults } = await supabase
        .from("consultations")
        .select("id")
        .eq("user_id", userIdSupabase)
        .gte("created_at", date.toISOString())
        .lt("created_at", nextDate.toISOString());
      
      dailyTrendData.push({
        date: dateStr,
        recommendations: dayRecs?.length ?? 0,
        ippaEvaluations: dayEvals?.length ?? 0,
        consultations: dayConsults?.length ?? 0,
      });
    }

    // 주별 트렌드 (최근 12주)
    const weeklyTrendData: Array<{
      week: string;
      weekStart: string;
      recommendations: number;
      ippaEvaluations: number;
      consultations: number;
    }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekLabel = `${weekStart.toISOString().split('T')[0]} ~ ${new Date(weekEnd.getTime() - 1).toISOString().split('T')[0]}`;
      
      // 해당 주의 사용자 추천 수
      const { data: weekRecs } = consultationIds.length > 0
        ? await supabase
            .from("recommendations")
            .select("id")
            .in("consultation_id", consultationIds)
            .gte("created_at", weekStart.toISOString())
            .lt("created_at", weekEnd.toISOString())
        : { data: null, error: null };
      
      // 해당 주의 사용자 평가 수
      const { data: weekEvals } = await supabase
        .from("ippa_evaluations")
        .select("id")
        .eq("user_id", userIdSupabase)
        .gte("evaluated_at", weekStart.toISOString())
        .lt("evaluated_at", weekEnd.toISOString());
      
      // 해당 주의 사용자 상담 수
      const { data: weekConsults } = await supabase
        .from("consultations")
        .select("id")
        .eq("user_id", userIdSupabase)
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString());
      
      weeklyTrendData.push({
        week: weekLabel,
        weekStart: weekStart.toISOString().split('T')[0],
        recommendations: weekRecs?.length ?? 0,
        ippaEvaluations: weekEvals?.length ?? 0,
        consultations: weekConsults?.length ?? 0,
      });
    }

    // 월별 트렌드 (최근 12개월)
    const monthlyTrendData: Array<{
      month: string;
      monthStart: string;
      recommendations: number;
      ippaEvaluations: number;
      consultations: number;
    }> = [];
    
    for (let i = 11; i >= 0; i--) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);
      
      const monthLabel = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      
      // 해당 월의 사용자 추천 수
      const { data: monthRecs } = consultationIds.length > 0
        ? await supabase
            .from("recommendations")
            .select("id")
            .in("consultation_id", consultationIds)
            .gte("created_at", monthStart.toISOString())
            .lt("created_at", monthEnd.toISOString())
        : { data: null, error: null };
      
      // 해당 월의 사용자 평가 수
      const { data: monthEvals } = await supabase
        .from("ippa_evaluations")
        .select("id")
        .eq("user_id", userIdSupabase)
        .gte("evaluated_at", monthStart.toISOString())
        .lt("evaluated_at", monthEnd.toISOString());
      
      // 해당 월의 사용자 상담 수
      const { data: monthConsults } = await supabase
        .from("consultations")
        .select("id")
        .eq("user_id", userIdSupabase)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      
      monthlyTrendData.push({
        month: monthLabel,
        monthStart: monthStart.toISOString().split('T')[0],
        recommendations: monthRecs?.length ?? 0,
        ippaEvaluations: monthEvals?.length ?? 0,
        consultations: monthConsults?.length ?? 0,
      });
    }

    // 시간대별 활동 패턴 (24시간) - 최근 30일
    const hourlyActivityData: Array<{
      hour: number;
      consultations: number;
      recommendationClicks: number;
    }> = [];
    
    const thirtyDaysAgoForHourly = new Date();
    thirtyDaysAgoForHourly.setDate(thirtyDaysAgoForHourly.getDate() - 30);
    
    // 사용자 상담 시작 시간대별 집계
    const { data: consultationsForHourly } = await supabase
      .from("consultations")
      .select("created_at")
      .eq("user_id", userIdSupabase)
      .gte("created_at", thirtyDaysAgoForHourly.toISOString());
    
    const hourlyConsultations = new Map<number, number>();
    consultationsForHourly?.forEach(consult => {
      const hour = new Date(consult.created_at).getHours();
      hourlyConsultations.set(hour, (hourlyConsultations.get(hour) || 0) + 1);
    });
    
    // 사용자 추천 클릭 시간대별 집계
    const { data: clickedRecsForHourly } = consultationIds.length > 0
      ? await supabase
          .from("recommendations")
          .select("clicked_at")
          .in("consultation_id", consultationIds)
          .eq("is_clicked", true)
          .not("clicked_at", "is", null)
          .gte("clicked_at", thirtyDaysAgoForHourly.toISOString())
      : { data: null, error: null };
    
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

    return NextResponse.json({
      metrics: {
        // 추천 정확도
        recommendationAccuracy: {
          clickThroughRate: Number(clickThroughRate.toFixed(2)),
          totalRecommendations,
          clickedRecommendations,
        },
        // K-IPPA 참여율
        ippaParticipation: {
          participationRate: Number(ippaParticipationRate.toFixed(2)),
          totalEvaluations: totalIppaEvaluations,
          eligibleRecommendations: clickedRecommendations,
        },
        // 상담 완료율
        consultationCompletion: {
          completionRate: Number(consultationCompletionRate.toFixed(2)),
          totalConsultations,
          completedConsultations,
        },
        // 최근 30일 활동
        recentActivity: {
          recommendations: recentRecommendations,
          ippaEvaluations: recentIppaEvaluations,
        },
        // 평균 효과성 점수
        averageEffectiveness: Number(avgEffectivenessScore.toFixed(2)),
      },
      trends: {
        daily: dailyTrendData,
        weekly: weeklyTrendData,
        monthly: monthlyTrendData,
        hourly: hourlyActivityData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Analytics] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

