import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { sendErrorAlert } from "@/lib/notion-webhook"

const supabase = getSupabaseServerClient()

/**
 * 성능 저하 자동 알림 Cron Job
 * 
 * Vercel Cron에서 매일 실행 (예: 매일 오전 9시)
 * 
 * 기능:
 * - Core Web Vitals 지표 분석
 * - API 응답 시간 분석
 * - 성능 저하 감지 시 자동 알림
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron Performance Alert] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron Performance Alert] Starting performance analysis...")

    // 최근 24시간 데이터 분석
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Core Web Vitals 분석
    const { data: webVitals, error: webVitalsError } = await supabase
      .from("performance_web_vitals")
      .select("metric_name, metric_value, metric_rating")
      .gte("created_at", twentyFourHoursAgo.toISOString())

    if (webVitalsError) {
      console.error("[Cron Performance Alert] Error fetching web vitals:", webVitalsError)
    }

    // API 성능 분석
    const { data: apiLogs, error: apiLogsError } = await supabase
      .from("api_performance_logs")
      .select("endpoint, response_time, status_code")
      .gte("created_at", twentyFourHoursAgo.toISOString())

    if (apiLogsError) {
      console.error("[Cron Performance Alert] Error fetching API logs:", apiLogsError)
    }

    const alerts: Array<{ type: string; message: string; severity: "warning" | "error" }> = []

    // Web Vitals 분석
    if (webVitals && webVitals.length > 0) {
      const metricsByType = webVitals.reduce((acc, metric) => {
        if (!acc[metric.metric_name]) {
          acc[metric.metric_name] = []
        }
        acc[metric.metric_name].push(metric)
        return acc
      }, {} as Record<string, typeof webVitals>)

      for (const [metricName, metrics] of Object.entries(metricsByType)) {
        const poorCount = metrics.filter((m) => m.metric_rating === "poor").length
        const poorPercentage = (poorCount / metrics.length) * 100
        const avgValue = metrics.reduce((sum, m) => sum + m.metric_value, 0) / metrics.length

        // poor 평가가 20% 이상이면 경고
        if (poorPercentage >= 20) {
          alerts.push({
            type: "web_vitals",
            message: `${metricName}: 평균 ${avgValue.toFixed(2)}ms, poor 평가 ${poorPercentage.toFixed(1)}% (${poorCount}/${metrics.length})`,
            severity: poorPercentage >= 50 ? "error" : "warning",
          })
        }
      }
    }

    // API 성능 분석
    if (apiLogs && apiLogs.length > 0) {
      const endpointsByPath = apiLogs.reduce((acc, log) => {
        if (!acc[log.endpoint]) {
          acc[log.endpoint] = []
        }
        acc[log.endpoint].push(log)
        return acc
      }, {} as Record<string, typeof apiLogs>)

      for (const [endpoint, logs] of Object.entries(endpointsByPath)) {
        const avgResponseTime = logs.reduce((sum, log) => sum + (log.response_time || 0), 0) / logs.length
        const errorCount = logs.filter((log) => log.status_code >= 400).length
        const errorRate = (errorCount / logs.length) * 100

        // 평균 응답 시간이 2초 이상이면 경고
        if (avgResponseTime >= 2000) {
          alerts.push({
            type: "api_performance",
            message: `${endpoint}: 평균 응답 시간 ${avgResponseTime.toFixed(0)}ms`,
            severity: avgResponseTime >= 5000 ? "error" : "warning",
          })
        }

        // 에러율이 5% 이상이면 경고
        if (errorRate >= 5) {
          alerts.push({
            type: "api_errors",
            message: `${endpoint}: 에러율 ${errorRate.toFixed(1)}% (${errorCount}/${logs.length})`,
            severity: errorRate >= 10 ? "error" : "warning",
          })
        }
      }
    }

    // 알림 발송
    if (alerts.length > 0) {
      const errorAlerts = alerts.filter((a) => a.severity === "error")
      const warningAlerts = alerts.filter((a) => a.severity === "warning")

      const alertMessage = `
성능 저하 감지 리포트 (최근 24시간)

${errorAlerts.length > 0 ? `🚨 심각한 문제 (${errorAlerts.length}개):\n${errorAlerts.map((a) => `- ${a.message}`).join("\n")}\n\n` : ""}
${warningAlerts.length > 0 ? `⚠️ 경고 (${warningAlerts.length}개):\n${warningAlerts.map((a) => `- ${a.message}`).join("\n")}` : ""}
      `.trim()

      // 외부 알림 시스템으로 전송
      await sendErrorAlert({
        level: errorAlerts.length > 0 ? "error" : "warn",
        category: "performance",
        action: "performance_degradation_detected",
        message: alertMessage,
        payload: {
          alerts,
          web_vitals_count: webVitals?.length ?? 0,
          api_logs_count: apiLogs?.length ?? 0,
        },
      })

      console.log(`[Cron Performance Alert] Sent ${alerts.length} alerts`)
    } else {
      console.log("[Cron Performance Alert] No performance issues detected")
    }

    logEvent({
      category: "system",
      action: "performance_alert_completed",
      payload: {
        alerts_count: alerts.length,
        web_vitals_count: webVitals?.length ?? 0,
        api_logs_count: apiLogs?.length ?? 0,
      },
    })

    return NextResponse.json({
      success: true,
      alerts_count: alerts.length,
      alerts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron Performance Alert] Unexpected error:", error)
    logEvent({
      category: "system",
      action: "performance_alert_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
