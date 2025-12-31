/**
 * 하이브리드 매칭 시스템 가중치 최적화 크론 작업
 * 
 * 실제 사용자 데이터를 기반으로 매칭 가중치를 자동으로 최적화합니다.
 * 매주 월요일 새벽 4시에 실행됩니다.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Optimize Matching Weights] Starting optimization...");
    const supabase = getSupabaseServerClient();

    // 1. 최근 30일간의 매칭 성능 로그 분석
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: performanceLogs, error: logsError } = await supabase
      .from("matching_performance_logs")
      .select("*")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (logsError) {
      console.error("[Optimize Matching Weights] Failed to fetch performance logs:", logsError);
      throw logsError;
    }

    if (!performanceLogs || performanceLogs.length === 0) {
      console.log("[Optimize Matching Weights] No performance logs found, skipping optimization");
      return NextResponse.json({
        success: true,
        message: "No performance data available for optimization",
        optimized: false,
      });
    }

    // 2. 가중치 설정별 성능 분석
    const configStats = new Map<
      string,
      {
        configName: string;
        totalMatches: number;
        avgTopMatchScore: number;
        clickedCount: number;
        purchaseCount: number;
        avgFeedbackRating: number;
        clickThroughRate: number;
        purchaseConversionRate: number;
        avgExecutionTime: number;
      }
    >();

    performanceLogs.forEach((log) => {
      const configName = log.weight_config_name || "default";
      if (!configStats.has(configName)) {
        configStats.set(configName, {
          configName,
          totalMatches: 0,
          avgTopMatchScore: 0,
          clickedCount: 0,
          purchaseCount: 0,
          avgFeedbackRating: 0,
          clickThroughRate: 0,
          purchaseConversionRate: 0,
          avgExecutionTime: 0,
        });
      }

      const stats = configStats.get(configName)!;
      stats.totalMatches += 1;
      stats.avgTopMatchScore += Number(log.top_match_score || 0);
      stats.avgExecutionTime += log.execution_time_ms || 0;

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
        avgTopMatchScore: count > 0 ? stats.avgTopMatchScore / count : 0,
        avgExecutionTime: count > 0 ? stats.avgExecutionTime / count : 0,
        avgFeedbackRating:
          stats.clickedCount > 0 ? stats.avgFeedbackRating / stats.clickedCount : 0,
        clickThroughRate: count > 0 ? (stats.clickedCount / count) * 100 : 0,
        purchaseConversionRate:
          stats.clickedCount > 0 ? (stats.purchaseCount / stats.clickedCount) * 100 : 0,
      };
    });

    // 3. 최고 성능 설정 찾기 (클릭률 + 구매 전환율 + 피드백 점수 종합)
    const bestConfig = aggregatedStats.reduce((best, current) => {
      const bestScore =
        best.clickThroughRate * 0.4 +
        best.purchaseConversionRate * 0.4 +
        best.avgFeedbackRating * 20; // 5점 만점을 100점으로 변환
      const currentScore =
        current.clickThroughRate * 0.4 +
        current.purchaseConversionRate * 0.4 +
        current.avgFeedbackRating * 20;

      return currentScore > bestScore ? current : best;
    }, aggregatedStats[0]);

    if (!bestConfig || bestConfig.totalMatches < 10) {
      console.log("[Optimize Matching Weights] Insufficient data for optimization");
      return NextResponse.json({
        success: true,
        message: "Insufficient data for optimization",
        optimized: false,
      });
    }

    // 4. 현재 활성화된 설정 조회
    const { data: activeConfig, error: activeConfigError } = await supabase
      .from("matching_weight_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (activeConfigError) {
      console.error("[Optimize Matching Weights] Failed to fetch active config:", activeConfigError);
      throw activeConfigError;
    }

    // 5. 최고 성능 설정이 현재 활성 설정과 다르면 새 설정 생성
    if (
      activeConfig &&
      activeConfig.name === bestConfig.configName &&
      bestConfig.clickThroughRate <= (activeConfig as any).click_through_rate * 1.05
    ) {
      console.log("[Optimize Matching Weights] Current config is already optimal");
      return NextResponse.json({
        success: true,
        message: "Current configuration is already optimal",
        optimized: false,
        currentConfig: activeConfig.name,
        performance: {
          clickThroughRate: bestConfig.clickThroughRate,
          purchaseConversionRate: bestConfig.purchaseConversionRate,
          avgFeedbackRating: bestConfig.avgFeedbackRating,
        },
      });
    }

    // 6. 최고 성능 설정의 가중치 조회
    const { data: bestConfigData, error: bestConfigError } = await supabase
      .from("matching_weight_configs")
      .select("*")
      .eq("name", bestConfig.configName)
      .maybeSingle();

    if (bestConfigError || !bestConfigData) {
      console.error("[Optimize Matching Weights] Failed to fetch best config:", bestConfigError);
      return NextResponse.json({
        success: true,
        message: "Best config not found in database",
        optimized: false,
      });
    }

    // 7. 최적화된 새 설정 생성 (기존 설정 기반으로 미세 조정)
    const optimizedName = `optimized_${new Date().toISOString().split("T")[0]}`;
    const { data: newConfig, error: createError } = await supabase
      .from("matching_weight_configs")
      .insert({
        name: optimizedName,
        description: `자동 최적화된 설정 (기준: ${bestConfig.configName})`,
        weight_rule_based: bestConfigData.weight_rule_based,
        weight_semantic: bestConfigData.weight_semantic,
        weight_knowledge_graph: bestConfigData.weight_knowledge_graph,
        weight_keyword: bestConfigData.weight_keyword,
        min_score: bestConfigData.min_score,
        top_k: bestConfigData.top_k,
        similarity_threshold: bestConfigData.similarity_threshold,
        is_active: false, // 수동 활성화 필요
        is_default: false,
        is_ab_test_variant: false,
      })
      .select()
      .single();

    if (createError) {
      console.error("[Optimize Matching Weights] Failed to create optimized config:", createError);
      throw createError;
    }

    // 8. 최적화 결과 로깅
    logEvent({
      category: "matching",
      action: "weights_optimized",
      payload: {
        previousConfig: activeConfig?.name || "none",
        optimizedConfig: optimizedName,
        performance: {
          clickThroughRate: bestConfig.clickThroughRate,
          purchaseConversionRate: bestConfig.purchaseConversionRate,
          avgFeedbackRating: bestConfig.avgFeedbackRating,
        },
      },
    });

    console.log("[Optimize Matching Weights] Optimization completed:", {
      optimizedConfig: optimizedName,
      performance: bestConfig,
    });

    return NextResponse.json({
      success: true,
      message: "Matching weights optimized successfully",
      optimized: true,
      optimizedConfig: newConfig,
      previousConfig: activeConfig?.name || null,
      performance: {
        clickThroughRate: bestConfig.clickThroughRate,
        purchaseConversionRate: bestConfig.purchaseConversionRate,
        avgFeedbackRating: bestConfig.avgFeedbackRating,
        avgTopMatchScore: bestConfig.avgTopMatchScore,
      },
    });
  } catch (error) {
    console.error("[Optimize Matching Weights] Unexpected error:", error);
    logEvent({
      category: "matching",
      action: "weights_optimization_error",
      payload: { error: error instanceof Error ? error.message : "Unknown error" },
      level: "error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
