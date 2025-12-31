/**
 * 벡터 DB 동적 임계값 조정 크론 작업
 * 
 * 실제 사용자 데이터를 기반으로 시맨틱 매칭 임계값을 동적으로 조정합니다.
 * 매주 화요일 새벽 5시에 실행됩니다.
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
    console.log("[Adjust Vector Thresholds] Starting threshold adjustment...");
    const supabase = getSupabaseServerClient();

    // 1. 활성화된 임계값 설정 조회
    const { data: activeConfig, error: configError } = await supabase
      .from("vector_search_threshold_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (configError) {
      console.error("[Adjust Vector Thresholds] Failed to fetch config:", configError);
      throw configError;
    }

    if (!activeConfig || !activeConfig.enable_dynamic_adjustment) {
      console.log("[Adjust Vector Thresholds] Dynamic adjustment is disabled");
      return NextResponse.json({
        success: true,
        message: "Dynamic adjustment is disabled",
        adjusted: false,
      });
    }

    // 2. 최근 30일간의 벡터 검색 결과 분석
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 실시간 학습 통계에서 벡터 검색 결과 분석
    const { data: learningStats, error: statsError } = await supabase
      .from("realtime_learning_stats")
      .select("*")
      .gte("last_seen_at", thirtyDaysAgo.toISOString())
      .order("click_rate", { ascending: false });

    if (statsError) {
      console.error("[Adjust Vector Thresholds] Failed to fetch learning stats:", statsError);
      throw statsError;
    }

    if (!learningStats || learningStats.length === 0) {
      console.log("[Adjust Vector Thresholds] No learning stats available");
      return NextResponse.json({
        success: true,
        message: "No learning data available",
        adjusted: false,
      });
    }

    // 3. 클릭률 기반 임계값 조정 계산
    // 높은 클릭률을 가진 매칭은 임계값을 낮춰서 더 많은 결과를 포함
    // 낮은 클릭률을 가진 매칭은 임계값을 높여서 품질 향상

    const highClickRateMatches = learningStats.filter(
      (stat) => stat.click_rate >= Number(activeConfig.click_rate_threshold || 0.15)
    );
    const lowClickRateMatches = learningStats.filter(
      (stat) => stat.click_rate < Number(activeConfig.click_rate_threshold || 0.15)
    );

    const avgHighClickRate =
      highClickRateMatches.length > 0
        ? highClickRateMatches.reduce((sum, stat) => sum + Number(stat.click_rate), 0) /
          highClickRateMatches.length
        : 0;

    const avgLowClickRate =
      lowClickRateMatches.length > 0
        ? lowClickRateMatches.reduce((sum, stat) => sum + Number(stat.click_rate), 0) /
          lowClickRateMatches.length
        : 0;

    // 4. 임계값 조정 계산
    // 성공률이 높으면 임계값을 약간 낮춰서 더 많은 결과 포함
    // 성공률이 낮으면 임계값을 약간 높여서 품질 향상
    const currentThreshold = Number(activeConfig.base_threshold || 0.7);
    const minThreshold = Number(activeConfig.min_threshold || 0.6);
    const maxThreshold = Number(activeConfig.max_threshold || 0.85);

    let adjustment = 0;
    if (avgHighClickRate > 0.2) {
      // 높은 클릭률이면 임계값을 낮춤 (더 많은 결과 포함)
      adjustment = -0.02;
    } else if (avgLowClickRate < 0.1 && lowClickRateMatches.length > highClickRateMatches.length) {
      // 낮은 클릭률이면 임계값을 높임 (품질 향상)
      adjustment = 0.02;
    }

    const newThreshold = Math.max(
      minThreshold,
      Math.min(maxThreshold, currentThreshold + adjustment)
    );

    // 5. 임계값이 크게 변하지 않았으면 조정하지 않음
    if (Math.abs(newThreshold - currentThreshold) < 0.01) {
      console.log("[Adjust Vector Thresholds] Threshold adjustment not needed");
      return NextResponse.json({
        success: true,
        message: "Threshold adjustment not needed",
        adjusted: false,
        currentThreshold,
        newThreshold,
      });
    }

    // 6. 새 설정 생성 (기존 설정 비활성화 후)
    const adjustedName = `adjusted_${new Date().toISOString().split("T")[0]}`;
    const { data: newConfig, error: createError } = await supabase
      .from("vector_search_threshold_configs")
      .insert({
        name: adjustedName,
        description: `동적 조정된 임계값 (이전: ${currentThreshold.toFixed(2)}, 현재: ${newThreshold.toFixed(2)})`,
        base_threshold: newThreshold,
        enable_dynamic_adjustment: true,
        min_threshold: minThreshold,
        max_threshold: maxThreshold,
        success_rate_weight: activeConfig.success_rate_weight,
        usage_count_weight: activeConfig.usage_count_weight,
        similarity_weight: activeConfig.similarity_weight,
        is_active: false, // 수동 활성화 필요
        is_default: false,
      })
      .select()
      .single();

    if (createError) {
      console.error("[Adjust Vector Thresholds] Failed to create adjusted config:", createError);
      throw createError;
    }

    // 7. 조정 결과 로깅
    logEvent({
      category: "matching",
      action: "vector_threshold_adjusted",
      payload: {
        previousThreshold: currentThreshold,
        newThreshold,
        adjustment,
        stats: {
          highClickRateMatches: highClickRateMatches.length,
          lowClickRateMatches: lowClickRateMatches.length,
          avgHighClickRate,
          avgLowClickRate,
        },
      },
    });

    console.log("[Adjust Vector Thresholds] Threshold adjustment completed:", {
      previousThreshold: currentThreshold,
      newThreshold,
      adjustment,
    });

    return NextResponse.json({
      success: true,
      message: "Vector threshold adjusted successfully",
      adjusted: true,
      adjustedConfig: newConfig,
      previousThreshold: currentThreshold,
      newThreshold,
      adjustment,
      stats: {
        highClickRateMatches: highClickRateMatches.length,
        lowClickRateMatches: lowClickRateMatches.length,
        avgHighClickRate,
        avgLowClickRate,
      },
    });
  } catch (error) {
    console.error("[Adjust Vector Thresholds] Unexpected error:", error);
    logEvent({
      category: "matching",
      action: "vector_threshold_adjustment_error",
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
