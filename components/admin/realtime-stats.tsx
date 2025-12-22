"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, MousePointer2, MessageSquare } from "lucide-react"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"

interface RealtimeData {
  activeUsers: number
  recentEvents: number
  chatSessions: number
  clicks: number
  trend: { time: string; count: number }[]
}

export function RealtimeStats() {
  const [data, setData] = useState<RealtimeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchRealtimeData = async () => {
    try {
      // 실제로는 GA4 Realtime API 또는 DB의 최근 30분 데이터를 가져옴
      const response = await fetch("/api/admin/analytics/realtime")
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("[RealtimeStats] Fetch error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRealtimeData()
    const interval = setInterval(fetchRealtimeData, 30000) // 30초마다 갱신
    return () => clearInterval(interval)
  }, [])

  if (isLoading || !data) {
    return <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">실시간 데이터 로드 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">현재 활성 사용자</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">최근 5분 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최근 30분 이벤트</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.recentEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">플랫폼 전체 활동</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">실시간 상담</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.chatSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">진행 중인 세션</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">실시간 클릭</CardTitle>
            <MousePointer2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.clicks}</div>
            <p className="text-xs text-muted-foreground mt-1">추천 상품 클릭수</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="text-base font-semibold">실시간 활동 트렌드 (최근 30분)</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-sm text-xs">
                        <span className="font-bold">{payload[0].value}건의 활동</span>
                        <span className="text-muted-foreground ml-2">{payload[0].payload.time}</span>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

