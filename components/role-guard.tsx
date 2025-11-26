"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkRole() {
      // 로그인하지 않았거나, 온보딩 페이지나 API 경로는 체크하지 않음
      if (!isSignedIn || !userId || pathname === "/onboarding" || pathname.startsWith("/api")) {
        setIsChecking(false)
        return
      }

      try {
        const response = await fetch("/api/user/role")
        if (!response.ok) {
          setIsChecking(false)
          return
        }

        const data = await response.json()
        const role = data.role

        // role이 없거나 null이면 온보딩 페이지로 리다이렉트
        if (!role || role === "null") {
          console.log("[RoleGuard] No role found, redirecting to onboarding")
          router.push("/onboarding")
          return
        }

        setIsChecking(false)
      } catch (error) {
        console.error("[RoleGuard] Error checking role:", error)
        setIsChecking(false)
      }
    }

    checkRole()
  }, [isSignedIn, userId, pathname, router])

  // 체크 중이면 로딩 표시 (선택사항)
  if (isChecking) {
    return null // 또는 로딩 스피너
  }

  return <>{children}</>
}

