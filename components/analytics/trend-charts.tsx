"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Clock, Calendar } from "lucide-react"

interface TrendData {
  daily: Array<{
    date: string
    recommendations: number
    ippaEvaluations: number
    consultations: number
    completedConsultations?: number
  }>
  weekly: Array<{
    week: string
    weekStart: string
    recommendations: number
    ippaEvaluations: number
    consultations: number
    completedConsultations?: number
  }>
  monthly: Array<{
    month: string
    monthStart: string
    recommendations: number
    ippaEvaluations: number
    consultations: number
    completedConsultations?: number
    newUsers?: number
  }>
  hourly: Array<{
    hour: number
    consultations: number
    recommendationClicks: number
  }>
}

interface TrendChartsProps {
  trends: TrendData
  isAdmin?: boolean
}

const chartConfig = {
  recommendations: {
    label: "추천 생성",
    color: "hsl(var(--chart-1))",
  },
  ippaEvaluations: {
    label: "K-IPPA 평가",
    color: "hsl(var(--chart-2))",
  },
  consultations: {
    label: "상담",
    color: "hsl(var(--chart-3))",
  },
  completedConsultations: {
    label: "완료된 상담",
    color: "hsl(var(--chart-4))",
  },
  recommendationClicks: {
    label: "추천 클릭",
    color: "hsl(var(--chart-5))",
  },
  newUsers: {
    label: "신규 사용자",
    color: "hsl(var(--chart-1))",
  },
}

export function TrendCharts({ trends, isAdmin = false }: TrendChartsProps) {
  // 일별 차트 데이터 포맷팅
  const dailyChartData = trends.daily.map((item) => ({
    date: new Date(item.date).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    }),
    "추천 생성": item.recommendations,
    "K-IPPA 평가": item.ippaEvaluations,
    "상담": item.consultations,
    ...(item.completedConsultations !== undefined && {
      "완료된 상담": item.completedConsultations,
    }),
  }))

  // 주별 차트 데이터 포맷팅
  const weeklyChartData = trends.weekly.map((item) => ({
    week: `Week ${item.weekStart.split("-")[1]}/${item.weekStart.split("-")[2]}`,
    "추천 생성": item.recommendations,
    "K-IPPA 평가": item.ippaEvaluations,
    "상담": item.consultations,
    ...(item.completedConsultations !== undefined && {
      "완료된 상담": item.completedConsultations,
    }),
  }))

  // 월별 차트 데이터 포맷팅
  const monthlyChartData = trends.monthly.map((item) => ({
    month: item.month,
    "추천 생성": item.recommendations,
    "K-IPPA 평가": item.ippaEvaluations,
    "상담": item.consultations,
    ...(item.completedConsultations !== undefined && {
      "완료된 상담": item.completedConsultations,
    }),
    ...(item.newUsers !== undefined && isAdmin && {
      "신규 사용자": item.newUsers,
    }),
  }))

  // 시간대별 차트 데이터 포맷팅
  const hourlyChartData = trends.hourly.map((item) => ({
    hour: `${item.hour}시`,
    "상담 시작": item.consultations,
    "추천 클릭": item.recommendationClicks,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            시간별 트렌드 분석
          </CardTitle>
          <CardDescription>
            일별, 주별, 월별 활동 패턴을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">
                <Calendar className="h-4 w-4 mr-2" />
                일별
              </TabsTrigger>
              <TabsTrigger value="weekly">
                <Calendar className="h-4 w-4 mr-2" />
                주별
              </TabsTrigger>
              <TabsTrigger value="monthly">
                <Calendar className="h-4 w-4 mr-2" />
                월별
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-6">
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="추천 생성"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="K-IPPA 평가"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="상담"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    {dailyChartData[0]?.["완료된 상담"] !== undefined && (
                      <Line
                        type="monotone"
                        dataKey="완료된 상담"
                        stroke="hsl(var(--chart-4))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="weekly" className="mt-6">
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="추천 생성" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="K-IPPA 평가" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="상담" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    {weeklyChartData[0]?.["완료된 상담"] !== undefined && (
                      <Bar dataKey="완료된 상담" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="monthly" className="mt-6">
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="추천 생성" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="K-IPPA 평가" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="상담" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    {monthlyChartData[0]?.["완료된 상담"] !== undefined && (
                      <Bar dataKey="완료된 상담" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    )}
                    {monthlyChartData[0]?.["신규 사용자"] !== undefined && isAdmin && (
                      <Bar dataKey="신규 사용자" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 시간대별 활동 패턴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            시간대별 활동 패턴
          </CardTitle>
          <CardDescription>
            하루 중 가장 활발한 시간대를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="상담 시작" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="추천 클릭" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
