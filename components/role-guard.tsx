"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const hasRedirected = useRef(false)

  useEffect(() => {
    // router나 pathname이 아직 초기화되지 않았으면 대기
    if (typeof window === "undefined" || !router || !pathname) {
      console.log("[RoleGuard] Waiting for router/pathname initialization")
      return
    }

    // 이미 리다이렉트했으면 다시 체크하지 않음
    if (hasRedirected.current) {
      return
    }

    async function checkRole() {
      try {
        // 로그인하지 않았거나, 온보딩 페이지나 API 경로는 체크하지 않음
        if (!isSignedIn || !userId || pathname === "/onboarding" || pathname?.startsWith("/api")) {
          console.log("[RoleGuard] Skipping role check", { isSignedIn, userId, pathname })
          setIsChecking(false)
          return
        }

        console.log("[RoleGuard] Checking role for user:", userId)
        const response = await fetch("/api/user/role")
        
        if (!response.ok) {
          console.log("[RoleGuard] Role API response not ok:", response.status)
          setIsChecking(false)
          return
        }

        const data = await response.json()
        const role = data.role

        console.log("[RoleGuard] User role:", role)

        // role이 없거나 null이면 온보딩 페이지로 리다이렉트
        if (!role || role === "null") {
          console.log("[RoleGuard] No role found, redirecting to onboarding")
          hasRedirected.current = true
          // setTimeout을 사용하여 리다이렉트를 다음 틱으로 지연
          setTimeout(() => {
            try {
              router.push("/onboarding")
            } catch (error) {
              console.error("[RoleGuard] Redirect error:", error)
              // 리다이렉트 실패 시 window.location 사용
              window.location.href = "/onboarding"
            }
          }, 0)
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

