import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/admin/dashboard`

export const metadata: Metadata = {
  title: "LinkAble 관리자 대시보드",
  description: "전체 플랫폼 통계 및 사용자별 종합 데이터를 확인할 수 있는 관리자 페이지입니다.",
  alternates: { canonical: pageUrl },
}

async function checkAdminAccess() {
  const { userId } = await auth()
  if (!userId) {
    return { hasAccess: false, reason: "not_authenticated" as const }
  }

  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const userRole = clerkUser.publicMetadata?.role as string | undefined
    
    if (userRole !== "admin" && userRole !== "expert") {
      return { hasAccess: false, reason: "insufficient_permissions" as const }
    }

    return { hasAccess: true, reason: null }
  } catch (error) {
    console.error("[Admin] Error checking access:", error)
    return { hasAccess: false, reason: "error" as const }
  }
}

export default async function AdminDashboardPage() {
  const { hasAccess, reason } = await checkAdminAccess()

  if (!hasAccess) {
    if (reason === "not_authenticated") {
      redirect(`/sign-in?redirect_url=${encodeURIComponent(pageUrl)}`)
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">접근 권한이 없습니다</CardTitle>
              <CardDescription>
                이 페이지는 관리자 또는 전문가 권한이 필요합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard">사용자 대시보드로 이동</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">홈으로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <AdminDashboardContent />
    </div>
  )
}

