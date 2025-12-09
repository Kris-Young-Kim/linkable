import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자용 ICF 코드별 통계 API
 * GET /api/admin/analytics/icf-stats
 *
 * 반환 데이터:
 * - ICF 코드별 추천 수
 * - ICF 코드별 클릭률
 * - ICF 코드별 평균 효과성 점수
 * - ICF 코드별 평가 수
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

    // ICF 코드별 통계 계산
    const { data: analysisResults, error: analysisError } = await supabase
      .from("analysis_results")
      .select("consultation_id, icf_codes");

    if (analysisError) {
      console.error("[ICF Stats] Analysis fetch error:", analysisError);
      return NextResponse.json(
        { error: "Failed to fetch ICF data" },
        { status: 500 }
      );
    }

    // ICF 코드별 집계
    const icfStats: Record<
      string,
      {
        code: string;
        category: "b" | "d" | "e";
        totalRecommendations: number;
        clickedRecommendations: number;
        totalEvaluations: number;
        totalEffectivenessScore: number;
        avgEffectivenessScore: number;
        clickThroughRate: number;
      }
    > = {};

    // 각 분석 결과의 ICF 코드 추출
    for (const analysis of analysisResults ?? []) {
      const icfCodes = analysis.icf_codes as {
        b?: string[];
        d?: string[];
        e?: string[];
      };

      // b 코드 처리
      if (icfCodes.b) {
        for (const code of icfCodes.b) {
          if (!icfStats[code]) {
            icfStats[code] = {
              code,
              category: "b",
              totalRecommendations: 0,
              clickedRecommendations: 0,
              totalEvaluations: 0,
              totalEffectivenessScore: 0,
              avgEffectivenessScore: 0,
              clickThroughRate: 0,
            };
          }
        }
      }

      // d 코드 처리
      if (icfCodes.d) {
        for (const code of icfCodes.d) {
          if (!icfStats[code]) {
            icfStats[code] = {
              code,
              category: "d",
              totalRecommendations: 0,
              clickedRecommendations: 0,
              totalEvaluations: 0,
              totalEffectivenessScore: 0,
              avgEffectivenessScore: 0,
              clickThroughRate: 0,
            };
          }
        }
      }

      // e 코드 처리
      if (icfCodes.e) {
        for (const code of icfCodes.e) {
          if (!icfStats[code]) {
            icfStats[code] = {
              code,
              category: "e",
              totalRecommendations: 0,
              clickedRecommendations: 0,
              totalEvaluations: 0,
              totalEffectivenessScore: 0,
              avgEffectivenessScore: 0,
              clickThroughRate: 0,
            };
          }
        }
      }
    }

    // 각 ICF 코드에 대한 추천 및 평가 통계 계산
    for (const [code, stats] of Object.entries(icfStats)) {
      // 해당 ICF 코드를 포함하는 상담 찾기
      const consultationsWithCode = (analysisResults ?? []).filter(
        (analysis) => {
          const icfCodes = analysis.icf_codes as {
            b?: string[];
            d?: string[];
            e?: string[];
          };
          return (
            icfCodes.b?.includes(code) ||
            icfCodes.d?.includes(code) ||
            icfCodes.e?.includes(code)
          );
        }
      );

      const consultationIds = consultationsWithCode.map((a) => a.consultation_id);

      if (consultationIds.length > 0) {
        // 추천 통계
        const { data: recommendations } = await supabase
          .from("recommendations")
          .select("id, is_clicked")
          .in("consultation_id", consultationIds);

        stats.totalRecommendations = recommendations?.length ?? 0;
        stats.clickedRecommendations =
          recommendations?.filter((r) => r.is_clicked).length ?? 0;
        stats.clickThroughRate =
          stats.totalRecommendations > 0
            ? (stats.clickedRecommendations / stats.totalRecommendations) * 100
            : 0;

        // 평가 통계
        const { data: evaluations } = await supabase
          .from("ippa_evaluations")
          .select("effectiveness_score")
          .in(
            "recommendation_id",
            recommendations?.map((r) => r.id) ?? []
          )
          .not("effectiveness_score", "is", null);

        stats.totalEvaluations = evaluations?.length ?? 0;
        const totalScore = (evaluations ?? []).reduce(
          (sum, e) => sum + Number(e.effectiveness_score || 0),
          0
        );
        stats.totalEffectivenessScore = totalScore;
        stats.avgEffectivenessScore =
          stats.totalEvaluations > 0
            ? totalScore / stats.totalEvaluations
            : 0;
      }
    }

    // 결과 정렬 (평가 수 기준)
    const sortedStats = Object.values(icfStats)
      .map((stat) => ({
        ...stat,
        clickThroughRate: Number(stat.clickThroughRate.toFixed(2)),
        avgEffectivenessScore: Number(stat.avgEffectivenessScore.toFixed(2)),
      }))
      .sort((a, b) => b.totalEvaluations - a.totalEvaluations);

    return NextResponse.json({
      stats: sortedStats,
      summary: {
        totalIcfCodes: sortedStats.length,
        totalWithRecommendations: sortedStats.filter(
          (s) => s.totalRecommendations > 0
        ).length,
        totalWithEvaluations: sortedStats.filter(
          (s) => s.totalEvaluations > 0
        ).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ICF Stats] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

