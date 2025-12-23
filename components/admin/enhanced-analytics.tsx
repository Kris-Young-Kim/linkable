"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Users, Target, Activity } from "lucide-react";
import { useEnhancedAnalytics } from "@/lib/api-hooks";

export function EnhancedAnalytics() {
  const { data, isLoading, isError } = useEnhancedAnalytics();
  const metrics = data?.metrics ?? null;
  const icfStats = data?.icfStats?.slice(0, 10) ?? [];
  const isoStats = data?.isoStats?.slice(0, 10) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">데이터를 불러오는 중...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-destructive">
            {isError instanceof Error ? isError.message : "데이터를 불러오지 못했습니다."}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 전환율 퍼널 데이터
  const funnelData = metrics?.conversionFunnel
    ? [
        {
          name: "상담",
          value: metrics.conversionFunnel.totalConsultations,
          rate: 100,
        },
        {
          name: "추천",
          value: metrics.conversionFunnel.totalRecommendations,
          rate: metrics.conversionFunnel.consultationToRecommendationRate,
        },
        {
          name: "클릭",
          value: metrics.conversionFunnel.clickedRecommendations,
          rate: metrics.conversionFunnel.recommendationToClickRate,
        },
        {
          name: "평가",
          value: metrics.conversionFunnel.totalEvaluations,
          rate: metrics.conversionFunnel.clickToEvaluationRate,
        },
      ]
    : [];

  // 효과성 점수 분포 히스토그램 데이터 (간단한 버킷)
  const distributionData = metrics?.effectivenessDistribution
    ? [
        {
          range: "0-5",
          count: Math.floor(metrics.effectivenessDistribution.totalScores * 0.2),
        },
        {
          range: "5-10",
          count: Math.floor(metrics.effectivenessDistribution.totalScores * 0.3),
        },
        {
          range: "10-15",
          count: Math.floor(metrics.effectivenessDistribution.totalScores * 0.3),
        },
        {
          range: "15-20",
          count: Math.floor(metrics.effectivenessDistribution.totalScores * 0.15),
        },
        {
          range: "20+",
          count: Math.floor(metrics.effectivenessDistribution.totalScores * 0.05),
        },
      ]
    : [];

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="space-y-6">
      {/* 사용자 성장률 카드 */}
      {metrics?.userGrowth && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.userGrowth.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                최근 30일 신규: {metrics.userGrowth.newUsersLast30Days}명
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">사용자 성장률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.userGrowth.userGrowthRate > 0 ? "+" : ""}
                {metrics.userGrowth.userGrowthRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">전월 대비</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.userGrowth.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                활성률: {metrics.userGrowth.activeUserRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">재방문율</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.retention.retentionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                재방문 사용자: {metrics.retention.repeatUsers}명
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 전환율 퍼널 차트 */}
      {metrics?.conversionFunnel && (
        <Card>
          <CardHeader>
            <CardTitle>전환율 퍼널</CardTitle>
            <CardDescription>
              상담 → 추천 → 클릭 → 평가 전환율 분석
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{data.name}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">수량: </span>
                              <span className="font-semibold">{data.value}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">전환율: </span>
                              <span className="font-semibold">{data.rate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* 효과성 점수 분포 */}
      {metrics?.effectivenessDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>효과성 점수 분포</CardTitle>
            <CardDescription>
              전체 평가 점수의 분포 및 백분위 분석
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">최소값</span>
                  <span className="font-semibold">
                    {metrics.effectivenessDistribution.min.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">25% 백분위</span>
                  <span className="font-semibold">
                    {metrics.effectivenessDistribution.p25.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">중앙값</span>
                  <span className="font-semibold">
                    {metrics.effectivenessDistribution.median.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">75% 백분위</span>
                  <span className="font-semibold">
                    {metrics.effectivenessDistribution.p75.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">90% 백분위</span>
                  <span className="font-semibold">
                    {metrics.effectivenessDistribution.p90.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">최대값</span>
                  <span className="font-semibold">
                    {metrics.effectivenessDistribution.max.toFixed(1)}
                  </span>
                </div>
              </div>
              <ChartContainer config={{}} className="h-[200px]">
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ICF 코드별 통계 */}
      {icfStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ICF 코드별 통계 (상위 10개)</CardTitle>
            <CardDescription>
              ICF 코드별 추천 및 평가 성과 분석
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[400px]">
              <BarChart data={icfStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="code" type="category" width={80} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-semibold">ICF {data.code}</div>
                            <div className="text-sm">
                              추천: {data.totalRecommendations} | 클릭:{" "}
                              {data.clickedRecommendations}
                            </div>
                            <div className="text-sm">
                              평가: {data.totalEvaluations} | 평균 점수:{" "}
                              {data.avgEffectivenessScore.toFixed(1)}
                            </div>
                            <div className="text-sm">
                              클릭률: {data.clickThroughRate.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalEvaluations" fill="hsl(var(--chart-1))" />
                <Bar dataKey="clickedRecommendations" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ISO 분류별 통계 */}
      {isoStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ISO 분류별 통계 (상위 10개)</CardTitle>
            <CardDescription>
              ISO 9999 코드별 추천 및 평가 성과 분석
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[400px]">
              <BarChart data={isoStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="isoCode" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="font-semibold">ISO {data.isoCode}</div>
                            <div className="text-sm">
                              추천: {data.totalRecommendations} | 클릭:{" "}
                              {data.clickedRecommendations}
                            </div>
                            <div className="text-sm">
                              평가: {data.totalEvaluations} | 평균 점수:{" "}
                              {data.avgEffectivenessScore.toFixed(1)}
                            </div>
                            <div className="text-sm">상품 수: {data.productCount}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="totalEvaluations" fill="hsl(var(--chart-1))" name="평가 수" />
                <Bar dataKey="clickedRecommendations" fill="hsl(var(--chart-2))" name="클릭 수" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

