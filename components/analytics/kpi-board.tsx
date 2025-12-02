"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MousePointerClick,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/components/language-provider";

interface KPIMetrics {
  recommendationAccuracy: {
    clickThroughRate: number;
    totalRecommendations: number;
    clickedRecommendations: number;
  };
  ippaParticipation: {
    participationRate: number;
    totalEvaluations: number;
    eligibleRecommendations: number;
  };
  consultationCompletion: {
    completionRate: number;
    totalConsultations: number;
    completedConsultations: number;
  };
  recentActivity: {
    recommendations: number;
    ippaEvaluations: number;
  };
  averageEffectiveness: number;
}

interface DailyStats {
  stat_date: string;
  recommendations_count: number;
  clicked_count: number;
}

interface KPIBoardProps {
  apiEndpoint?: string;
  showTrendChart?: boolean;
  showFilters?: boolean;
}

const chartConfig = {
  recommendations: {
    label: "추천 생성",
    color: "hsl(var(--chart-1))",
  },
  clicked: {
    label: "클릭",
    color: "hsl(var(--chart-2))",
  },
  evaluations: {
    label: "K-IPPA 평가",
    color: "hsl(var(--chart-3))",
  },
};

export function KPIBoard({
  apiEndpoint = "/api/admin/analytics",
  showTrendChart = true,
  showFilters = false,
}: KPIBoardProps) {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 메트릭 데이터 조회
        const metricsResponse = await fetch(apiEndpoint);
        if (!metricsResponse.ok) {
          throw new Error("Failed to fetch metrics");
        }
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);

        // 일별 통계 조회 (View 사용)
        try {
          const dailyResponse = await fetch(`${apiEndpoint}?daily=true`);
          if (dailyResponse.ok) {
            const dailyData = await dailyResponse.json();
            if (dailyData.dailyStats) {
              setDailyStats(dailyData.dailyStats);
            }
          }
        } catch (dailyError) {
          console.warn("[KPI Board] Daily stats not available:", dailyError);
          // 일별 통계는 선택적이므로 에러를 무시
        }
      } catch (err) {
        console.error("[KPI Board] Fetch error:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiEndpoint]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {error || "데이터를 불러올 수 없습니다"}
        </CardContent>
      </Card>
    );
  }

  // 일별 통계 차트 데이터 준비
  const chartData = dailyStats
    .slice(0, 30) // 최근 30일
    .reverse() // 오래된 순서로 정렬
    .map((stat) => ({
      date: new Date(stat.stat_date).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      }),
      recommendations: stat.recommendations_count,
      clicked: stat.clicked_count,
    }));

  return (
    <div className="space-y-6">
      {/* KPI 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 추천 정확도 (클릭률) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">추천 정확도</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.recommendationAccuracy.clickThroughRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.recommendationAccuracy.clickedRecommendations} /{" "}
              {metrics.recommendationAccuracy.totalRecommendations} 클릭
            </p>
          </CardContent>
        </Card>

        {/* K-IPPA 참여율 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">K-IPPA 참여율</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.ippaParticipation.participationRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.ippaParticipation.totalEvaluations}개 평가 완료
            </p>
          </CardContent>
        </Card>

        {/* 상담 완료율 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">상담 완료율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.consultationCompletion.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.consultationCompletion.completedConsultations} /{" "}
              {metrics.consultationCompletion.totalConsultations} 완료
            </p>
          </CardContent>
        </Card>

        {/* 평균 효과성 점수 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 효과성</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageEffectiveness}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              K-IPPA 평균 점수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 30일 활동</CardTitle>
          <CardDescription>최근 한 달간의 활동 요약</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">추천 생성</p>
              <p className="text-2xl font-bold">
                {metrics.recentActivity.recommendations}개
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">K-IPPA 평가</p>
              <p className="text-2xl font-bold">
                {metrics.recentActivity.ippaEvaluations}개
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 트렌드 차트 */}
      {showTrendChart && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 30일 추천 트렌드</CardTitle>
            <CardDescription>일별 추천 생성 및 클릭 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="recommendations"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="clicked"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* 바 차트 (대안) */}
      {showTrendChart && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 30일 활동 비교</CardTitle>
            <CardDescription>일별 추천 생성 및 클릭 수</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="recommendations"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="clicked"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
