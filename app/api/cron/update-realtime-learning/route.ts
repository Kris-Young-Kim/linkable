/**
 * 실시간 학습 통계 일괄 업데이트 Cron Job
 * 
 * Vercel Cron에서 주기적으로 실행 (예: 매일 새벽 2시)
 * 
 * 기능:
 * - 최근 사용자 행동 데이터를 기반으로 실시간 학습 통계 업데이트
 * - ICF-ISO 조합별 가중치 조정 계수 재계산
 * - 매칭 정확도 향상을 위한 자동 학습
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

const supabase = getSupabaseServerClient();

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron Realtime Learning] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron Realtime Learning] Starting batch update of realtime learning stats...");

    const startTime = Date.now();

    // 최근 7일간의 이벤트를 기반으로 통계 업데이트
    const { data: updateResult, error: updateError } = await supabase.rpc(
      "batch_update_realtime_learning_stats",
      {
        p_days_back: 7,
        p_min_events: 5, // 최소 5개 이벤트가 있는 조합만 업데이트
      }
    );

    if (updateError) {
      console.error("[Cron Realtime Learning] Batch update error:", updateError);
      logEvent({
        category: "cron",
        action: "realtime_learning_update_error",
        payload: { error: updateError.message },
        level: "error",
      });

      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    const result = updateResult?.[0] || {
      updated_combinations: 0,
      total_events_processed: 0,
      avg_weight_adjustment: 1.0,
    };

    console.log(
      `[Cron Realtime Learning] Batch update completed:`,
      {
        updatedCombinations: result.updated_combinations,
        totalEvents: result.total_events_processed,
        avgWeightAdjustment: result.avg_weight_adjustment,
        duration: `${duration}ms`,
      }
    );

    // 로그 이벤트 기록
    logEvent({
      category: "cron",
      action: "realtime_learning_updated",
      payload: {
        updatedCombinations: result.updated_combinations,
        totalEvents: result.total_events_processed,
        avgWeightAdjustment: result.avg_weight_adjustment,
        duration,
      },
    });

    return NextResponse.json({
      success: true,
      updated_combinations: result.updated_combinations,
      total_events_processed: result.total_events_processed,
      avg_weight_adjustment: result.avg_weight_adjustment,
      duration_ms: duration,
    });
  } catch (error) {
    console.error("[Cron Realtime Learning] Unexpected error:", error);
    logEvent({
      category: "cron",
      action: "realtime_learning_unexpected_error",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
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
