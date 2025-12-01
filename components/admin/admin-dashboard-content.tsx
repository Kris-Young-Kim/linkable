"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { AdminLogMonitor } from "@/components/admin/admin-log-monitor"
import { SideNav } from "@/components/navigation/side-nav"
import { 
  Users, 
  ClipboardCheck, 
  BarChart3,
  Package,
} from "lucide-react"

export function AdminDashboardContent() {

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">관리자 대시보드</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">플랫폼 통계 및 사용자 관리</h1>
          <p className="text-muted-foreground mt-2 text-base">
            전체 플랫폼 통계를 확인할 수 있습니다.
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
            { label: "K-IPPA 통계", href: "/admin/logs", icon: <ClipboardCheck className="size-4" /> },
            { label: "상품 관리", href: "/admin/products", icon: <Package className="size-4" /> },
          ]}
        />

        <div className="space-y-8">
          <section id="overview">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">전체 플랫폼 통계</CardTitle>
                <CardDescription>모든 사용자의 활동을 종합한 통계입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsDashboard apiEndpoint="/api/admin/analytics" />
              </CardContent>
            </Card>
          </section>

          <section id="logs">
            <AdminLogMonitor />
          </section>
        </div>
      </div>
    </div>
  )
}


