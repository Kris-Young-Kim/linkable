type LogLevel = "info" | "warn" | "error"

export type LogEvent = {
  category: "consultation" | "matching" | "validation" | "system" | "product" | "recommendation"
  action: string
  payload?: Record<string, unknown>
  level?: LogLevel
}

const logMethodMap: Record<LogLevel, (...args: unknown[]) => void> = {
  info: console.log,
  warn: console.warn,
  error: console.error,
}

export const logEvent = ({ category, action, payload, level = "info" }: LogEvent) => {
  const message = `[${category}] ${action}`
  if (payload) {
    logMethodMap[level](message, payload)
  } else {
    logMethodMap[level](message)
  }
}

