"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { KPIBoard } from "@/components/analytics/kpi-board"
import { KPIFilters, type DateRange, type UserGroup } from "@/components/admin/kpi-filters"
import { AdminLogMonitor } from "@/components/admin/admin-log-monitor"
import { SideNav } from "@/components/navigation/side-nav"
import { 
  Users, 
  ClipboardCheck, 
  BarChart3,
  Package,
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

export function AdminDashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // URL 쿼리 파라미터에서 필터 상태 읽기
  const [dateRange, setDateRange] = useState<DateRange>(
    (searchParams.get("dateRange") as DateRange) || "30days"
  )
  const [userGroup, setUserGroup] = useState<UserGroup>(
    (searchParams.get("userGroup") as UserGroup) || "all"
  )

  // URL 쿼리 파라미터 업데이트
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("dateRange", dateRange)
    params.set("userGroup", userGroup)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [dateRange, userGroup, router, searchParams])

  // API 엔드포인트에 필터 파라미터 추가
  const apiEndpoint = `/api/admin/analytics?dateRange=${dateRange}&userGroup=${userGroup}`

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
  }

  const handleUserGroupChange = (group: UserGroup) => {
    setUserGroup(group)
  }

  const handleReset = () => {
    setDateRange("30days")
    setUserGroup("all")
  }

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
          {/* 필터 바 */}
          <KPIFilters
            dateRange={dateRange}
            userGroup={userGroup}
            onDateRangeChange={handleDateRangeChange}
            onUserGroupChange={handleUserGroupChange}
            onReset={handleReset}
          />

          {/* KPI 보드 */}
          <section id="kpi-board">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">KPI 대시보드</CardTitle>
                <CardDescription>주요 성과 지표 및 트렌드 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <KPIBoard 
                  apiEndpoint={apiEndpoint}
                  showTrendChart={true}
                  showFilters={false}
                />
              </CardContent>
            </Card>
          </section>

          {/* 기존 Analytics 대시보드 */}
          <section id="overview">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">전체 플랫폼 통계</CardTitle>
                <CardDescription>모든 사용자의 활동을 종합한 통계입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsDashboard apiEndpoint={apiEndpoint} />
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


