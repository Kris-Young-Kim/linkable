"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Gift, Sparkles, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface IncentiveNotificationProps {
  type: "points_earned" | "coupon_issued" | "points_balance"
  points?: number
  message?: string
  couponName?: string
  onDismiss?: () => void
  autoDismiss?: boolean
  autoDismissDelay?: number
}

/**
 * 인센티브 알림 컴포넌트
 * 포인트 적립, 쿠폰 발급 등의 알림을 표시합니다.
 */
export function IncentiveNotification({
  type,
  points,
  message,
  couponName,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 5000,
}: IncentiveNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoDismissDelay)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, isVisible, autoDismissDelay, onDismiss])

  if (!isVisible) {
    return null
  }

  const getConfig = () => {
    switch (type) {
      case "points_earned":
        return {
          icon: Sparkles,
          title: "포인트 적립 완료!",
          description: message || `${points}포인트가 적립되었습니다.`,
          className: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        }
      case "coupon_issued":
        return {
          icon: Gift,
          title: "쿠폰 발급 완료!",
          description: message || `${couponName || "쿠폰"}이 발급되었습니다.`,
          className: "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
          iconColor: "text-blue-600 dark:text-blue-400",
        }
      case "points_balance":
        return {
          icon: CheckCircle2,
          title: "포인트 잔액",
          description: message || `현재 보유 포인트: ${points}포인트`,
          className: "border-primary/20 bg-primary/5",
          iconColor: "text-primary",
        }
      default:
        return null
    }
  }

  const config = getConfig()
  if (!config) return null

  const Icon = config.icon

  return (
    <Alert className={cn("relative pr-10", config.className)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.iconColor)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-1">
          <AlertTitle className="text-sm font-semibold">{config.title}</AlertTitle>
          <AlertDescription className="text-sm">{config.description}</AlertDescription>
          {points !== undefined && type === "points_earned" && (
            <Badge variant="secondary" className="mt-2">
              +{points} 포인트
            </Badge>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={() => {
              setIsVisible(false)
              onDismiss()
            }}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  )
}

/**
 * Toast로 인센티브 알림 표시
 */
export function showIncentiveToast(
  toast: ReturnType<typeof useToast>["toast"],
  type: "points_earned" | "coupon_issued",
  points?: number,
  message?: string,
  couponName?: string
) {
  const config =
    type === "points_earned"
      ? {
          title: "포인트 적립 완료!",
          description: message || `${points}포인트가 적립되었습니다.`,
        }
      : {
          title: "쿠폰 발급 완료!",
          description: message || `${couponName || "쿠폰"}이 발급되었습니다.`,
        }

  toast({
    title: config.title,
    description: config.description,
    duration: 5000,
  })
}

