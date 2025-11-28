"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SideNav } from "@/components/navigation/side-nav"
import { 
  Users, 
  TrendingUp, 
  ClipboardCheck, 
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react"

interface UserStats {
  totalConsultations: number
  completedConsultations: number
  totalRecommendations: number
  clickedRecommendations: number
  totalIppaEvaluations: number
  averageEffectiveness: number
  scoreHistory: Array<{
    date: string
    effectivenessScore: number | null
    preScore: number | null
    postScore: number | null
    importance: number | null
    recommendationId: string
  }>
}

interface UserData {
  supabaseId: string
  clerkId: string
  name: string
  email: string
  role: string
  points: number
  createdAt: string
  stats: UserStats
}

export function AdminDashboardContent() {
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/users")
        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }
        const data = await response.json()
        setUsers(data.users || [])
      } catch (err) {
        console.error("[Admin] Fetch error:", err)
        setError(err instanceof Error ? err.message : "알 수 없는 오류")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const calculateScoreTrend = (scoreHistory: UserStats["scoreHistory"]) => {
    if (scoreHistory.length < 2) return null
    
    const scores = scoreHistory
      .map((h) => h.effectivenessScore)
      .filter((s): s is number => s !== null)
    
    if (scores.length < 2) return null
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length
    
    const change = secondAvg - firstAvg
    return change
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString))
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">관리자 대시보드</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">플랫폼 통계 및 사용자 관리</h1>
          <p className="text-muted-foreground mt-2 text-base">
            전체 플랫폼 통계와 사용자별 종합 데이터를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <SideNav
          currentRole="admin"
          className="border border-border/60 rounded-2xl bg-card/80 p-4 shadow-sm"
          items={[
            { label: "전체 통계", href: "/admin/dashboard", icon: <BarChart3 className="size-4" /> },
            { label: "사용자 리스트", href: "/admin/dashboard#users", icon: <Users className="size-4" /> },
            { label: "로그 모니터링", href: "/admin/dashboard#logs", icon: <ClipboardCheck className="size-4" />, badge: "Soon" },
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

          <section id="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="size-5" />
                  사용자별 종합 데이터
                </CardTitle>
                <CardDescription>
                  각 사용자의 상담, 추천, K-IPPA 평가 및 점수 변화를 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">데이터를 불러오는 중...</div>
                ) : error ? (
                  <div className="py-8 text-center text-destructive">{error}</div>
                ) : users.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">사용자 데이터가 없습니다.</div>
                ) : (
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList>
                      <TabsTrigger value="all">전체 사용자</TabsTrigger>
                      <TabsTrigger value="with-ippa">K-IPPA 평가 완료</TabsTrigger>
                      <TabsTrigger value="active">활성 사용자</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="mt-6">
                      <UserTable users={users} />
                    </TabsContent>
                    <TabsContent value="with-ippa" className="mt-6">
                      <UserTable users={users.filter((u) => u.stats.totalIppaEvaluations > 0)} />
                    </TabsContent>
                    <TabsContent value="active" className="mt-6">
                      <UserTable users={users.filter((u) => u.stats.totalConsultations > 0)} />
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}

function UserTable({ users }: { users: UserData[] }) {
  const calculateScoreTrend = (scoreHistory: UserStats["scoreHistory"]) => {
    if (scoreHistory.length < 2) return null
    
    const scores = scoreHistory
      .map((h) => h.effectivenessScore)
      .filter((s): s is number => s !== null)
    
    if (scores.length < 2) return null
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length
    
    const change = secondAvg - firstAvg
    return change
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
    }).format(new Date(dateString))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 text-sm font-semibold text-foreground">사용자</th>
            <th className="text-left p-3 text-sm font-semibold text-foreground">역할</th>
            <th className="text-center p-3 text-sm font-semibold text-foreground">상담</th>
            <th className="text-center p-3 text-sm font-semibold text-foreground">추천</th>
            <th className="text-center p-3 text-sm font-semibold text-foreground">K-IPPA</th>
            <th className="text-center p-3 text-sm font-semibold text-foreground">평균 효과성</th>
            <th className="text-center p-3 text-sm font-semibold text-foreground">점수 변화</th>
            <th className="text-center p-3 text-sm font-semibold text-foreground">포인트</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const scoreTrend = calculateScoreTrend(user.stats.scoreHistory)
            const trendIcon = scoreTrend === null ? (
              <Minus className="size-4 text-muted-foreground" />
            ) : scoreTrend > 0 ? (
              <ArrowUp className="size-4 text-emerald-600" />
            ) : scoreTrend < 0 ? (
              <ArrowDown className="size-4 text-red-600" />
            ) : (
              <Minus className="size-4 text-muted-foreground" />
            )

            return (
              <tr key={user.supabaseId} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3">
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "관리자" : user.role === "expert" ? "전문가" : "사용자"}
                  </Badge>
                </td>
                <td className="p-3 text-center text-sm">
                  <div>
                    <p className="font-medium">{user.stats.totalConsultations}</p>
                    <p className="text-xs text-muted-foreground">
                      완료: {user.stats.completedConsultations}
                    </p>
                  </div>
                </td>
                <td className="p-3 text-center text-sm">
                  <div>
                    <p className="font-medium">{user.stats.totalRecommendations}</p>
                    <p className="text-xs text-muted-foreground">
                      클릭: {user.stats.clickedRecommendations}
                    </p>
                  </div>
                </td>
                <td className="p-3 text-center text-sm">
                  <div>
                    <p className="font-medium">{user.stats.totalIppaEvaluations}</p>
                    {user.stats.totalIppaEvaluations > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {user.stats.scoreHistory.length}개 기록
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center text-sm">
                  {user.stats.averageEffectiveness > 0 ? (
                    <div>
                      <p className="font-medium">{user.stats.averageEffectiveness.toFixed(1)}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {scoreTrend !== null ? (
                    <div className="flex items-center justify-center gap-1">
                      {trendIcon}
                      <span className={`text-xs font-medium ${
                        scoreTrend > 0 ? "text-emerald-600" : scoreTrend < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}>
                        {scoreTrend > 0 ? "+" : ""}{scoreTrend.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </td>
                <td className="p-3 text-center text-sm">
                  <Badge variant="outline">{user.points}</Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

