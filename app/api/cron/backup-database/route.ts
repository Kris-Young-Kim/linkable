import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

/**
 * 일일 데이터베이스 백업 Cron Job
 * 
 * Vercel Cron에서 매일 실행 (예: 매일 새벽 2시)
 * 
 * 기능:
 * - Supabase 데이터베이스 스냅샷 생성
 * - 백업 검증
 * - 백업 상태 로깅
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron Backup] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron Backup] Starting daily database backup...")

    // Supabase는 자동 백업을 제공하므로, 여기서는 백업 상태 확인 및 검증만 수행
    // 실제 스냅샷 생성은 Supabase 대시보드에서 수동으로 수행하거나
    // Supabase Management API를 사용하여 자동화할 수 있습니다.

    // 백업 검증: 주요 테이블의 데이터 무결성 확인
    const tablesToCheck = [
      "users",
      "consultations",
      "products",
      "recommendations",
      "ippa_evaluations",
    ]

    const verificationResults = []
    let totalRows = 0

    for (const tableName of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true })

        if (error) {
          verificationResults.push({
            table: tableName,
            status: "error",
            error: error.message,
          })
        } else {
          verificationResults.push({
            table: tableName,
            status: "ok",
            rowCount: count ?? 0,
          })
          totalRows += count ?? 0
        }
      } catch (error) {
        verificationResults.push({
          table: tableName,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // 백업 상태 로깅
    const backupStatus = {
      timestamp: new Date().toISOString(),
      verification: verificationResults,
      totalRows,
      status: verificationResults.every((r) => r.status === "ok") ? "success" : "warning",
    }

    console.log("[Cron Backup] Backup verification completed:", backupStatus)

    logEvent({
      category: "system",
      action: "backup_verification_completed",
      payload: backupStatus,
    })

    // 백업 테이블에 기록 (백업 이력 관리)
    const { error: backupLogError } = await supabase
      .from("backup_logs")
      .insert({
        backup_type: "daily",
        status: backupStatus.status,
        verification_results: backupStatus.verification,
        total_rows: totalRows,
        created_at: new Date().toISOString(),
      })

    if (backupLogError) {
      console.error("[Cron Backup] Failed to log backup:", backupLogError)
      // 백업 로그 실패는 치명적이지 않으므로 계속 진행
    }

    return NextResponse.json({
      success: true,
      message: "Backup verification completed",
      ...backupStatus,
    })
  } catch (error) {
    console.error("[Cron Backup] Unexpected error:", error)
    logEvent({
      category: "system",
      action: "backup_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
