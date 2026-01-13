"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // 이미 설치되어 있는지 확인
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true)
      return
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // 사용자가 아직 설치하지 않았다면 프롬프트 표시
      const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-seen")
      if (!hasSeenPrompt) {
        setShowPrompt(true)
      }
    }

    // appinstalled 이벤트 리스너
    const handleAppInstalled = () => {
      console.log("[PWA] 앱이 설치되었습니다")
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      localStorage.setItem("pwa-install-prompt-seen", "true")
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    )
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      // 설치 프롬프트 표시
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("[PWA] 사용자가 설치를 수락했습니다")
        setShowPrompt(false)
      } else {
        console.log("[PWA] 사용자가 설치를 거부했습니다")
      }

      setDeferredPrompt(null)
      localStorage.setItem("pwa-install-prompt-seen", "true")
    } catch (error) {
      console.error("[PWA] 설치 프롬프트 오류:", error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-prompt-seen", "true")
  }

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>홈 화면에 추가</DialogTitle>
          <DialogDescription>
            LinkAble을 홈 화면에 추가하면 앱처럼 빠르게 사용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            홈 화면에 추가
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full"
          >
            나중에
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
