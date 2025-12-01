import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { AdminUsersList } from "@/components/admin/admin-users-list"
import { SideNav } from "@/components/navigation/side-nav"
import { BarChart3, Users, Package, ClipboardCheck } from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/admin/usersstat`

export const metadata: Metadata = {
  title: "사용자 통계 — LinkAble 관리자",
  description: "사용자별 종합 데이터를 확인할 수 있는 관리자 페이지입니다.",
  alternates: { canonical: pageUrl },
}

export default async function AdminUsersStatPage() {
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
          <div className="max-w-xl w-full rounded-xl border bg-card p-6">
            <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
            <p className="text-muted-foreground">
              이 페이지는 관리자 또는 전문가 권한이 필요합니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-10">
      <div className="container mx-auto px-4 md:px-6 space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">사용자 통계</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">사용자별 종합 데이터</h1>
            <p className="text-muted-foreground mt-2 text-base">
              각 사용자의 상담, 추천, K-IPPA 평가 및 점수 변화를 확인할 수 있습니다.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <SideNav
            currentRole="admin"
            className="border border-border/60 rounded-2xl bg-card/80 p-4 shadow-sm"
            items={[
              { label: "전체 통계", href: "/admin/dashboard", icon: <BarChart3 className="size-4" /> },
              { label: "사용자 리스트", href: "/admin/usersstat", icon: <Users className="size-4" /> },
              { label: "로그 모니터링", href: "/admin/dashboard#logs", icon: <ClipboardCheck className="size-4" />, badge: "Soon" },
              { label: "상품 관리", href: "/admin/products", icon: <Package className="size-4" /> },
            ]}
          />

          <div className="space-y-8">
            <AdminUsersList />
          </div>
        </div>
      </div>
    </div>
  )
}

