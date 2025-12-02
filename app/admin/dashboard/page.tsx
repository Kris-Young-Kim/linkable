import type { Metadata } from "next"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"

// 동적 import로 관리자 대시보드 지연 로딩
const AdminDashboardContent = dynamic(
  () => import("@/components/admin/admin-dashboard-content").then((mod) => ({ default: mod.AdminDashboardContent })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),
    ssr: true,
  }
)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/admin/dashboard`

export const metadata: Metadata = {
  title: "LinkAble 관리자 대시보드",
  description: "전체 플랫폼 통계 및 사용자별 종합 데이터를 확인할 수 있는 관리자 페이지입니다.",
  alternates: { canonical: pageUrl },
}

export default async function AdminDashboardPage() {
  const accessResult = await verifyAdminAccess()
  const hasAccess = accessResult.hasAccess
  const reason = hasAccess ? null : accessResult.reason

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
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="h-12 bg-muted animate-pulse rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }>
        <AdminDashboardContent />
      </Suspense>
    </div>
  )
}

