"use client"

import { useEffect } from "react"

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Service Worker 등록
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "[PWA] Service Worker 등록 성공:",
            registration.scope
          )

          // 업데이트 확인
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] 새 버전이 사용 가능합니다")
                  // 필요시 사용자에게 업데이트 알림 표시
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[PWA] Service Worker 등록 실패:", error)
        })

      // Service Worker 업데이트 확인 (페이지 로드 시)
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SKIP_WAITING",
        })
      }
    }
  }, [])

  return null
}
