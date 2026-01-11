"use client"

import { useEffect, useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { WifiOff, Wifi, AlertCircle } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

/**
 * 오프라인 상태 감지 및 안내 컴포넌트
 * 
 * - navigator.onLine API를 사용하여 네트워크 상태 감지
 * - 오프라인 상태일 때 사용자에게 알림 표시
 * - 온라인 상태로 복구되었을 때도 알림 표시
 * - Analytics 이벤트 로깅
 */
export function OfflineDetector() {
  const { toast } = useToast()
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const previousOnlineState = useRef<boolean | null>(null)
  const hasShownOfflineToast = useRef(false)
  const hasShownOnlineToast = useRef(false)

  useEffect(() => {
    // 초기 온라인 상태 확인
    if (typeof window !== "undefined") {
      const initialOnlineState = navigator.onLine
      setIsOnline(initialOnlineState)
      previousOnlineState.current = initialOnlineState

      console.log("[OfflineDetector] 초기 네트워크 상태:", initialOnlineState ? "온라인" : "오프라인")

      // Analytics 로깅
      trackEvent("network_status_changed", {
        status: initialOnlineState ? "online" : "offline",
        timestamp: new Date().toISOString(),
      })
    }

    // 온라인 상태로 변경되었을 때
    const handleOnline = () => {
      console.log("[OfflineDetector] 네트워크 상태: 온라인으로 변경됨")
      setIsOnline(true)
      
      // 이전에 오프라인 상태였을 때만 토스트 표시
      if (previousOnlineState.current === false) {
        hasShownOnlineToast.current = true
        hasShownOfflineToast.current = false

        toast({
          title: "인터넷 연결이 복구되었습니다",
          description: "이제 정상적으로 서비스를 이용하실 수 있습니다.",
          variant: "default",
        })

        // Analytics 로깅
        trackEvent("network_status_changed", {
          status: "online",
          timestamp: new Date().toISOString(),
        })
      }

      previousOnlineState.current = true
    }

    // 오프라인 상태로 변경되었을 때
    const handleOffline = () => {
      console.log("[OfflineDetector] 네트워크 상태: 오프라인으로 변경됨")
      setIsOnline(false)
      
      // 중복 토스트 방지
      if (!hasShownOfflineToast.current) {
        hasShownOfflineToast.current = true
        hasShownOnlineToast.current = false

        toast({
          title: "인터넷 연결이 끊어졌습니다",
          description: "네트워크 연결을 확인해주세요. 일부 기능이 제한될 수 있습니다.",
          variant: "destructive",
        })

        // Analytics 로깅
        trackEvent("network_status_changed", {
          status: "offline",
          timestamp: new Date().toISOString(),
        })
      }

      previousOnlineState.current = false
    }

    // 이벤트 리스너 등록
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)

      // 정리 함수
      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [toast])

  // 이 컴포넌트는 UI를 렌더링하지 않음 (Toast만 표시)
  return null
}
