"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export function AdminLink() {
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch("/api/user/role")
        if (!response.ok) {
          setHasAdminAccess(false)
          return
        }

        const data = await response.json()
        const role = data.role

        // admin 또는 expert 역할만 접근 가능
        if (role === "admin" || role === "expert") {
          setHasAdminAccess(true)
        }
      } catch (error) {
        console.error("[AdminLink] Error checking role:", error)
        setHasAdminAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()
  }, [])

  if (isLoading || !hasAdminAccess) {
    return null
  }

  return (
    <Button variant="ghost" size="sm" asChild className="gap-2">
      <Link href="/admin/dashboard">
        <Shield className="size-4" />
        관리자
      </Link>
    </Button>
  )
}

