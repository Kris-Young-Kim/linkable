import { sendErrorAlert } from "./notion-webhook"

type LogLevel = "info" | "warn" | "error"

export type LogEvent = {
  category: "consultation" | "matching" | "validation" | "system" | "product" | "recommendation" | "cta_ab_test" | "incentives"
  action: string
  payload?: Record<string, unknown>
  level?: LogLevel
  userId?: string
}

const logMethodMap: Record<LogLevel, (...args: unknown[]) => void> = {
  info: console.log,
  warn: console.warn,
  error: console.error,
}

export const logEvent = ({ category, action, payload, level = "info", userId }: LogEvent) => {
  const message = `[${category}] ${action}`
  
  // 기본 콘솔 로깅
  if (payload) {
    logMethodMap[level](message, payload)
  } else {
    logMethodMap[level](message)
  }

  // 에러 발생 시 외부 알림 시스템 연동 (Notion/n8n)
  if (level === "error") {
    sendErrorAlert({
      level: "error",
      category,
      action,
      message: payload?.error instanceof Error ? payload.error.message : (payload?.message as string || action),
      userId,
      payload: payload,
      stack: payload?.error instanceof Error ? payload.error.stack : undefined
    });
    
    // 핵심 기능 로그 남기기
    console.log(`[Critical] 에러 알림 자동 발송됨: ${action}`);
  }
}

