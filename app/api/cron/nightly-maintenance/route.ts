/**
 * 야간 유지보수 작업 통합 Cron Job
 * 
 * Vercel Cron에서 매일 실행 (예: 매일 새벽 2시)
 * 
 * 기능:
 * 1. 데이터베이스 백업 검증
 * 2. 실시간 학습 통계 일괄 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

const supabase = getSupabaseServerClient();

export async function GET(request: NextRequest) {
  const overallStartTime = Date.now();
  const results = {
    backup: { success: false, error: null as string | null, duration: 0 },
    realtimeLearning: { success: false, error: null as string | null, duration: 0 },
  };

  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron Nightly Maintenance] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron Nightly Maintenance] Starting nightly maintenance tasks...");

    // ============================================
    // 작업 1: 데이터베이스 백업 검증
    // ============================================
    try {
      const backupStartTime = Date.now();
      console.log("[Cron Nightly Maintenance] Starting backup verification...");

      const tablesToCheck = [
        "users",
        "consultations",
        "products",
        "recommendations",
        "ippa_evaluations",
      ];

      const verificationResults = [];
      let totalRows = 0;

      for (const tableName of tablesToCheck) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select("*", { count: "exact", head: true });

          if (error) {
            verificationResults.push({
              table: tableName,
              status: "error",
              error: error.message,
            });
          } else {
            verificationResults.push({
              table: tableName,
              status: "ok",
              rowCount: count ?? 0,
            });
            totalRows += count ?? 0;
          }
        } catch (error) {
          verificationResults.push({
            table: tableName,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const backupStatus = {
        timestamp: new Date().toISOString(),
        verification: verificationResults,
        totalRows,
        status: verificationResults.every((r) => r.status === "ok") ? "success" : "warning",
      };

      console.log("[Cron Nightly Maintenance] Backup verification completed:", backupStatus);

      logEvent({
        category: "system",
        action: "backup_verification_completed",
        payload: backupStatus,
      });

      // 백업 테이블에 기록 (백업 이력 관리)
      const { error: backupLogError } = await supabase
        .from("backup_logs")
        .insert({
          backup_type: "daily",
          status: backupStatus.status,
          verification_results: backupStatus.verification,
          total_rows: totalRows,
          created_at: new Date().toISOString(),
        });

      if (backupLogError) {
        console.error("[Cron Nightly Maintenance] Failed to log backup:", backupLogError);
      }

      results.backup.success = true;
      results.backup.duration = Date.now() - backupStartTime;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Cron Nightly Maintenance] Backup verification error:", error);
      logEvent({
        category: "system",
        action: "backup_error",
        payload: { error: errorMessage },
        level: "error",
      });
      results.backup.error = errorMessage;
      results.backup.duration = 0;
    }

    // ============================================
    // 작업 2: 실시간 학습 통계 일괄 업데이트
    // ============================================
    try {
      const learningStartTime = Date.now();
      console.log("[Cron Nightly Maintenance] Starting realtime learning stats update...");

      // 최근 7일간의 이벤트를 기반으로 통계 업데이트
      const { data: updateResult, error: updateError } = await supabase.rpc(
        "batch_update_realtime_learning_stats",
        {
          p_days_back: 7,
          p_min_events: 5, // 최소 5개 이벤트가 있는 조합만 업데이트
        }
      );

      if (updateError) {
        throw updateError;
      }

      const duration = Date.now() - learningStartTime;
      const result = updateResult?.[0] || {
        updated_combinations: 0,
        total_events_processed: 0,
        avg_weight_adjustment: 1.0,
      };

      console.log(
        `[Cron Nightly Maintenance] Realtime learning update completed:`,
        {
          updatedCombinations: result.updated_combinations,
          totalEvents: result.total_events_processed,
          avgWeightAdjustment: result.avg_weight_adjustment,
          duration: `${duration}ms`,
        }
      );

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

      results.realtimeLearning.success = true;
      results.realtimeLearning.duration = duration;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Cron Nightly Maintenance] Realtime learning update error:", error);
      logEvent({
        category: "cron",
        action: "realtime_learning_update_error",
        payload: { error: errorMessage },
        level: "error",
      });
      results.realtimeLearning.error = errorMessage;
      results.realtimeLearning.duration = 0;
    }

    // 전체 작업 완료 로깅
    const overallDuration = Date.now() - overallStartTime;
    const allSuccess = results.backup.success && results.realtimeLearning.success;

    logEvent({
      category: "cron",
      action: "nightly_maintenance_completed",
      payload: {
        results,
        overallDuration,
        allSuccess,
      },
      level: allSuccess ? "info" : "warn",
    });

    return NextResponse.json({
      success: allSuccess,
      results,
      overallDuration,
    });
  } catch (error) {
    console.error("[Cron Nightly Maintenance] Unexpected error:", error);
    logEvent({
      category: "cron",
      action: "nightly_maintenance_unexpected_error",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
      level: "error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    );
  }
}
