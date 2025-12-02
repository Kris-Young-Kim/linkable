"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export type StreamStatus = "loading" | "success" | "error" | null

interface StreamLoadingToastProps {
  status: StreamStatus
  message?: string
  onDismiss?: () => void
  autoDismiss?: boolean
  autoDismissDelay?: number
}

export function StreamLoadingToast({
  status,
  message,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 3000,
}: StreamLoadingToastProps) {
  const { t } = useLanguage()
  const [isVisible, setIsVisible] = useState(status !== null)

  useEffect(() => {
    setIsVisible(status !== null)
  }, [status])

  useEffect(() => {
    if (autoDismiss && status === "success" && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoDismissDelay)
      return () => clearTimeout(timer)
    }
  }, [status, isVisible, autoDismiss, autoDismissDelay, onDismiss])

  if (!isVisible || !status) {
    return null
  }

  const getStatusConfig = () => {
    switch (status) {
      case "loading":
        return {
          icon: Loader2,
          title: t("stream.loading") || "처리 중...",
          description: message || t("stream.loadingDescription") || "응답을 생성하고 있습니다.",
          variant: "default" as const,
          className: "border-blue-200 bg-blue-50",
        }
      case "success":
        return {
          icon: CheckCircle2,
          title: t("stream.success") || "완료",
          description: message || t("stream.successDescription") || "응답이 생성되었습니다.",
          variant: "default" as const,
          className: "border-green-200 bg-green-50",
        }
      case "error":
        return {
          icon: AlertCircle,
          title: t("stream.error") || "오류 발생",
          description: message || t("stream.errorDescription") || "응답 생성 중 오류가 발생했습니다.",
          variant: "destructive" as const,
          className: "border-red-200 bg-red-50",
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  const Icon = config.icon
  const isAnimated = status === "loading"

  return (
    <Alert
      className={`fixed bottom-4 right-4 z-50 max-w-md shadow-lg ${config.className}`}
      variant={config.variant}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`h-5 w-5 mt-0.5 ${isAnimated ? "animate-spin" : ""} ${
            status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-blue-600"
          }`}
        />
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold">{config.title}</AlertTitle>
          <AlertDescription className="text-xs mt-1">{config.description}</AlertDescription>
        </div>
        {onDismiss && (
          <button
            onClick={() => {
              setIsVisible(false)
              onDismiss()
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            ×
          </button>
        )}
      </div>
    </Alert>
  )
}

