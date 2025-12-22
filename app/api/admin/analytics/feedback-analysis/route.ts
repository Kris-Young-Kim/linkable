import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 피드백 데이터 분석 API
 * GET /api/admin/analytics/feedback-analysis
 * 
 * 분석 항목:
 * - 상담 피드백 평균 점수 (consultation_feedback.accuracy_rating)
 * - K-IPPA 효과성 점수 평균 (ippa_evaluations.effectiveness_score)
 * - 클릭률 기반 매칭 품질 평가
 * - 구매 전환율 기반 매칭 품질 평가
 * - ICF 코드별 피드백 점수
 * - ISO 코드별 피드백 점수
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

    // 1. 상담 피드백 분석
    const { data: consultationFeedbacks, error: feedbackError } = await supabase
      .from("consultation_feedback")
      .select("accuracy_rating, consultation_id, created_at")
      .gte("created_at", startDate.toISOString());

    if (feedbackError) {
      console.error("[Feedback Analysis] Consultation feedback error:", feedbackError);
    }

    const totalFeedbacks = consultationFeedbacks?.length ?? 0;
    const averageFeedbackRating =
      totalFeedbacks > 0
        ? consultationFeedbacks!.reduce(
            (sum, f) => sum + (f.accuracy_rating || 0),
            0
          ) / totalFeedbacks
        : 0;

    // 피드백 점수 분포
    const feedbackDistribution = {
      1: consultationFeedbacks?.filter((f) => f.accuracy_rating === 1).length ?? 0,
      2: consultationFeedbacks?.filter((f) => f.accuracy_rating === 2).length ?? 0,
      3: consultationFeedbacks?.filter((f) => f.accuracy_rating === 3).length ?? 0,
      4: consultationFeedbacks?.filter((f) => f.accuracy_rating === 4).length ?? 0,
      5: consultationFeedbacks?.filter((f) => f.accuracy_rating === 5).length ?? 0,
    };

    // 2. K-IPPA 효과성 점수 분석
    const { data: ippaEvaluations, error: ippaError } = await supabase
      .from("ippa_evaluations")
      .select("effectiveness_score, recommendation_id, product_id, evaluated_at")
      .gte("evaluated_at", startDate.toISOString())
      .not("effectiveness_score", "is", null);

    if (ippaError) {
      console.error("[Feedback Analysis] IPPA evaluations error:", ippaError);
    }

    const totalIppaEvaluations = ippaEvaluations?.length ?? 0;
    const averageEffectivenessScore =
      totalIppaEvaluations > 0
        ? ippaEvaluations!.reduce(
            (sum, e) => sum + (Number(e.effectiveness_score) || 0),
            0
          ) / totalIppaEvaluations
        : 0;

    // 효과성 점수 분포 (구간별)
    const effectivenessDistribution = {
      negative: ippaEvaluations?.filter((e) => Number(e.effectiveness_score) < 0).length ?? 0,
      low: ippaEvaluations?.filter((e) => Number(e.effectiveness_score) >= 0 && Number(e.effectiveness_score) < 5).length ?? 0,
      medium: ippaEvaluations?.filter((e) => Number(e.effectiveness_score) >= 5 && Number(e.effectiveness_score) < 10).length ?? 0,
      high: ippaEvaluations?.filter((e) => Number(e.effectiveness_score) >= 10).length ?? 0,
    };

    // 3. 클릭률 기반 매칭 품질 평가
    const { data: recommendations, error: recError } = await supabase
      .from("recommendations")
      .select("id, is_clicked, consultation_id, product_id, created_at")
      .gte("created_at", startDate.toISOString());

    if (recError) {
      console.error("[Feedback Analysis] Recommendations error:", recError);
    }

    const totalRecommendations = recommendations?.length ?? 0;
    const clickedRecommendations =
      recommendations?.filter((r) => r.is_clicked === true).length ?? 0;
    const clickThroughRate =
      totalRecommendations > 0
        ? (clickedRecommendations / totalRecommendations) * 100
        : 0;

    // 4. 구매 전환율 기반 매칭 품질 평가
    const purchasedRecommendations =
      recommendations?.filter((r) => {
        // purchase_completed 필드가 있는 경우 확인
        return (r as any).purchase_completed === true;
      }).length ?? 0;

    // conversion_events에서도 구매 데이터 확인
    const { data: purchaseEvents, error: purchaseError } = await supabase
      .from("conversion_events")
      .select("recommendation_id, purchase_amount, created_at, purchase_date")
      .eq("event_type", "purchase_completed")
      .gte("created_at", startDate.toISOString());

    if (purchaseError) {
      console.error("[Feedback Analysis] Purchase events error:", purchaseError);
    }

    const totalPurchases = purchaseEvents?.length ?? 0;
    const purchaseConversionRate =
      clickedRecommendations > 0
        ? (totalPurchases / clickedRecommendations) * 100
        : 0;

    const totalPurchaseAmount =
      purchaseEvents?.reduce(
        (sum, e) => sum + (Number(e.purchase_amount) || 0),
        0
      ) ?? 0;

    // 5. ICF 코드별 피드백 점수 분석
    // 정규화된 구조(consultation_icf_codes) 또는 기존 구조(analysis_results.icf_codes) 사용
    let icfCodeFeedbackMap = new Map<string, { total: number; count: number; name: string; category: string }>();
    
    // 정규화된 구조 시도
    const { data: icfFeedbackData, error: icfFeedbackError } = await supabase
      .from("consultation_icf_codes")
      .select(`
        icf_code_id,
        consultation_id,
        icf_codes!icf_code_id (code, category, name),
        consultations!consultation_id (
          consultation_feedback!consultation_id (accuracy_rating)
        )
      `)
      .gte("created_at", startDate.toISOString());

    if (!icfFeedbackError && icfFeedbackData) {
      // 정규화된 구조 사용
      icfFeedbackData.forEach((item: any) => {
        const icfCode = item.icf_codes?.code;
        const consultation = item.consultations;
        const feedback = consultation?.consultation_feedback?.[0];
        
        if (icfCode && feedback?.accuracy_rating) {
          if (!icfCodeFeedbackMap.has(icfCode)) {
            icfCodeFeedbackMap.set(icfCode, {
              total: 0,
              count: 0,
              name: item.icf_codes?.name || icfCode,
              category: item.icf_codes?.category || "",
            });
          }
          const entry = icfCodeFeedbackMap.get(icfCode)!;
          entry.total += feedback.accuracy_rating;
          entry.count += 1;
        }
      });
    } else {
      // 기존 구조 사용 (analysis_results.icf_codes JSONB)
      console.warn("[Feedback Analysis] 정규화된 구조를 사용할 수 없어 기존 구조를 사용합니다.");
      const { data: analysisResults, error: analysisError } = await supabase
        .from("analysis_results")
        .select(`
          consultation_id,
          icf_codes,
          consultations!consultation_id (
            consultation_feedback!consultation_id (accuracy_rating)
          )
        `)
        .gte("created_at", startDate.toISOString())
        .not("icf_codes", "is", null);

      if (!analysisError && analysisResults) {
        analysisResults.forEach((item: any) => {
          const icfCodes = item.icf_codes as { b?: string[]; d?: string[]; e?: string[] } | null;
          const feedback = item.consultations?.consultation_feedback?.[0];
          
          if (icfCodes && feedback?.accuracy_rating) {
            const allCodes = [
              ...(icfCodes.b || []),
              ...(icfCodes.d || []),
              ...(icfCodes.e || []),
            ];
            
            allCodes.forEach((code) => {
              const category = code[0].toLowerCase();
              if (!icfCodeFeedbackMap.has(code)) {
                icfCodeFeedbackMap.set(code, {
                  total: 0,
                  count: 0,
                  name: code,
                  category,
                });
              }
              const entry = icfCodeFeedbackMap.get(code)!;
              entry.total += feedback.accuracy_rating;
              entry.count += 1;
            });
          }
        });
      }
    }

    const icfCodeFeedbackStats = Array.from(icfCodeFeedbackMap.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        category: data.category,
        averageRating: data.count > 0 ? data.total / data.count : 0,
        feedbackCount: data.count,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 20); // 상위 20개

    // 6. ISO 코드별 피드백 점수 분석
    // recommendations와 products, consultation_feedback 조인
    // 정규화된 구조(iso_codes) 또는 기존 구조(products.iso_code) 사용
    const { data: isoFeedbackData, error: isoFeedbackError } = await supabase
      .from("recommendations")
      .select(`
        product_id,
        consultation_id,
        is_clicked,
        purchase_completed,
        products!product_id (
          iso_code,
          iso_code_id,
          iso_codes!iso_code_id (code, name)
        ),
        consultations!consultation_id (
          consultation_feedback!consultation_id (accuracy_rating)
        )
      `)
      .gte("created_at", startDate.toISOString());

    if (isoFeedbackError) {
      console.error("[Feedback Analysis] ISO feedback error:", isoFeedbackError);
    }

    // ISO 코드별 통계 계산
    const isoCodeStatsMap = new Map<string, {
      totalFeedback: number;
      feedbackCount: number;
      totalClicks: number;
      totalPurchases: number;
      recommendationCount: number;
    }>();

    isoFeedbackData?.forEach((item: any) => {
      // 정규화된 구조 우선, 없으면 기존 구조 사용
      const isoCode = item.products?.iso_codes?.code || item.products?.iso_code;
      if (!isoCode) return;

      if (!isoCodeStatsMap.has(isoCode)) {
        isoCodeStatsMap.set(isoCode, {
          totalFeedback: 0,
          feedbackCount: 0,
          totalClicks: 0,
          totalPurchases: 0,
          recommendationCount: 0,
        });
      }

      const stats = isoCodeStatsMap.get(isoCode)!;
      stats.recommendationCount += 1;

      if (item.is_clicked) {
        stats.totalClicks += 1;
      }

      if (item.purchase_completed) {
        stats.totalPurchases += 1;
      }

      const consultation = item.consultations;
      const feedback = consultation?.consultation_feedback?.[0];
      if (feedback?.accuracy_rating) {
        stats.totalFeedback += feedback.accuracy_rating;
        stats.feedbackCount += 1;
      }
    });

    const isoCodeFeedbackStats = Array.from(isoCodeStatsMap.entries())
      .map(([code, stats]) => ({
        code,
        averageFeedbackRating: stats.feedbackCount > 0 ? stats.totalFeedback / stats.feedbackCount : 0,
        feedbackCount: stats.feedbackCount,
        clickRate: stats.recommendationCount > 0 ? (stats.totalClicks / stats.recommendationCount) * 100 : 0,
        purchaseRate: stats.totalClicks > 0 ? (stats.totalPurchases / stats.totalClicks) * 100 : 0,
        recommendationCount: stats.recommendationCount,
      }))
      .filter((s) => s.recommendationCount >= 3) // 최소 3개 이상 추천이 있는 ISO 코드만
      .sort((a, b) => b.averageFeedbackRating - a.averageFeedbackRating)
      .slice(0, 20); // 상위 20개

    // 7. 종합 매칭 품질 점수 계산
    // 각 지표를 0-100 점수로 정규화하여 가중 평균
    const feedbackScore = (averageFeedbackRating / 5) * 100; // 1-5점을 0-100으로 변환
    const effectivenessScore = Math.min((averageEffectivenessScore / 20) * 100, 100); // 최대 20점 기준
    const clickRateScore = Math.min(clickThroughRate * 4, 100); // 25% 클릭률 = 100점
    const purchaseRateScore = Math.min(purchaseConversionRate * 10, 100); // 10% 전환율 = 100점

    // 가중 평균 (피드백 30%, 효과성 30%, 클릭률 20%, 구매율 20%)
    const overallMatchingQuality =
      feedbackScore * 0.3 +
      effectivenessScore * 0.3 +
      clickRateScore * 0.2 +
      purchaseRateScore * 0.2;

    // 8. 일별 추이 데이터
    const dailyStats: Array<{
      date: string;
      feedbackRating: number;
      effectivenessScore: number;
      clickRate: number;
      purchaseRate: number;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayStart = date.toISOString();
      const dayEnd = nextDate.toISOString();

      // 해당 일의 피드백 평균
      const dayFeedbacks = consultationFeedbacks?.filter(
        (f) => f.created_at >= dayStart && f.created_at < dayEnd
      ) ?? [];
      const dayFeedbackRating =
        dayFeedbacks.length > 0
          ? dayFeedbacks.reduce((sum, f) => sum + (f.accuracy_rating || 0), 0) /
            dayFeedbacks.length
          : 0;

      // 해당 일의 효과성 점수 평균
      const dayIppa = ippaEvaluations?.filter(
        (e) => e.evaluated_at >= dayStart && e.evaluated_at < dayEnd
      ) ?? [];
      const dayEffectiveness =
        dayIppa.length > 0
          ? dayIppa.reduce(
              (sum, e) => sum + (Number(e.effectiveness_score) || 0),
              0
            ) / dayIppa.length
          : 0;

      // 해당 일의 클릭률
      const dayRecs = recommendations?.filter(
        (r) => r.created_at >= dayStart && r.created_at < dayEnd
      ) ?? [];
      const dayClicks = dayRecs.filter((r) => r.is_clicked === true).length;
      const dayClickRate =
        dayRecs.length > 0 ? (dayClicks / dayRecs.length) * 100 : 0;

      // 해당 일의 구매 전환율
      const dayPurchases = purchaseEvents?.filter(
        (e) => {
          const eventDate = e.purchase_date || e.created_at;
          return eventDate >= dayStart && eventDate < dayEnd;
        }
      ).length ?? 0;
      const dayPurchaseRate =
        dayClicks > 0 ? (dayPurchases / dayClicks) * 100 : 0;

      dailyStats.push({
        date: date.toISOString().split("T")[0],
        feedbackRating: Number(dayFeedbackRating.toFixed(2)),
        effectivenessScore: Number(dayEffectiveness.toFixed(2)),
        clickRate: Number(dayClickRate.toFixed(2)),
        purchaseRate: Number(dayPurchaseRate.toFixed(2)),
      });
    }

    return NextResponse.json({
      summary: {
        overallMatchingQuality: Number(overallMatchingQuality.toFixed(2)),
        averageFeedbackRating: Number(averageFeedbackRating.toFixed(2)),
        averageEffectivenessScore: Number(averageEffectivenessScore.toFixed(2)),
        clickThroughRate: Number(clickThroughRate.toFixed(2)),
        purchaseConversionRate: Number(purchaseConversionRate.toFixed(2)),
      },
      metrics: {
        consultationFeedback: {
          total: totalFeedbacks,
          average: Number(averageFeedbackRating.toFixed(2)),
          distribution: feedbackDistribution,
        },
        ippaEvaluation: {
          total: totalIppaEvaluations,
          average: Number(averageEffectivenessScore.toFixed(2)),
          distribution: effectivenessDistribution,
        },
        recommendations: {
          total: totalRecommendations,
          clicked: clickedRecommendations,
          clickRate: Number(clickThroughRate.toFixed(2)),
        },
        purchases: {
          total: totalPurchases,
          conversionRate: Number(purchaseConversionRate.toFixed(2)),
          totalAmount: Number(totalPurchaseAmount.toFixed(0)),
        },
      },
      icfCodeFeedback: icfCodeFeedbackStats,
      isoCodeFeedback: isoCodeFeedbackStats,
      dailyStats,
      dateRange,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Feedback Analysis] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

