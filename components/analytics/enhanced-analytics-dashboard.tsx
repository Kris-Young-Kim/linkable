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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MousePointerClick,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  Package,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { KPIBoard } from "./kpi-board";
import { ConversionFunnelChart } from "./conversion-funnel-chart";
import { TrendChart } from "./trend-chart";
import { ProductStatsTable } from "./product-stats-table";
import { IcfStatsTable } from "./icf-stats-table";
import { IsoStatsTable } from "./iso-stats-table";

interface EnhancedAnalyticsData {
  metrics: {
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
    userGrowth?: {
      totalUsers: number;
      newUsersLast30Days: number;
      userGrowthRate: number;
      activeUsers: number;
      activeUserRate: number;
    };
    conversionFunnel?: {
      consultationToRecommendationRate: number;
      recommendationToClickRate: number;
      clickToEvaluationRate: number;
      overallConversionRate: number;
      totalConsultations: number;
      totalRecommendations: number;
      clickedRecommendations: number;
      totalEvaluations: number;
    };
    retention?: {
      repeatUsers: number;
      retentionRate: number;
      activeUsers: number;
    };
  };
  dailyStats?: Array<{
    stat_date: string;
    recommendations_count: number;
    clicked_count: number;
    ippa_evaluations_count?: number;
  }>;
  timestamp?: string;
}

interface EnhancedAnalyticsDashboardProps {
  apiEndpoint?: string;
  showFilters?: boolean;
}

export function EnhancedAnalyticsDashboard({
  apiEndpoint = "/api/admin/analytics",
  showFilters = true,
}: EnhancedAnalyticsDashboardProps) {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState("30days");
  const [userGroup, setUserGroup] = useState("all");
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "icf" | "iso"
  >("overview");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dateRange,
          userGroup,
          daily: "true",
        });
        const response = await fetch(`${apiEndpoint}?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("[Enhanced Analytics] Fetch error:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiEndpoint, dateRange, userGroup]);

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

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {error || "데이터를 불러올 수 없습니다"}
        </CardContent>
      </Card>
    );
  }

  const metrics = data.metrics;

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Analytics & Metrics</h2>
          <p className="text-muted-foreground mt-1">
            플랫폼 성과 지표 및 상세 분석
          </p>
        </div>
        {showFilters && (
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="7days">최근 7일</SelectItem>
                <SelectItem value="30days">최근 30일</SelectItem>
                <SelectItem value="90days">최근 90일</SelectItem>
                <SelectItem value="1year">최근 1년</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userGroup} onValueChange={setUserGroup}>
              <SelectTrigger className="w-[140px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 사용자</SelectItem>
                <SelectItem value="active">활성 사용자</SelectItem>
                <SelectItem value="ippa_completed">평가 완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "overview"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          개요
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "products"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          상품별 통계
        </button>
        <button
          onClick={() => setActiveTab("icf")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "icf"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ICF 코드별
        </button>
        <button
          onClick={() => setActiveTab("iso")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "iso"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ISO 코드별
        </button>
      </div>

      {/* 개요 탭 */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI 카드 */}
          <KPIBoard apiEndpoint={apiEndpoint} showTrendChart={true} />

          {/* 추가 메트릭 카드 */}
          {metrics.userGrowth && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.userGrowth.totalUsers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    최근 30일 신규: {metrics.userGrowth.newUsersLast30Days}명
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.userGrowth.activeUsers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    활성률: {metrics.userGrowth.activeUserRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">사용자 증가율</CardTitle>
                  {metrics.userGrowth.userGrowthRate >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.userGrowth.userGrowthRate >= 0 ? "+" : ""}
                    {metrics.userGrowth.userGrowthRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    전월 대비
                  </p>
                </CardContent>
              </Card>

              {metrics.retention && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">재방문율</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.retention.retentionRate}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      재방문 사용자: {metrics.retention.repeatUsers}명
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 전환율 퍼널 차트 */}
          {metrics.conversionFunnel && (
            <ConversionFunnelChart data={metrics.conversionFunnel} />
          )}

          {/* 시간별 트렌드 차트 */}
          {data.dailyStats && data.dailyStats.length > 0 && (
            <TrendChart dailyStats={data.dailyStats} />
          )}
        </div>
      )}

      {/* 상품별 통계 탭 */}
      {activeTab === "products" && (
        <ProductStatsTable dateRange={dateRange} />
      )}

      {/* ICF 코드별 통계 탭 */}
      {activeTab === "icf" && (
        <IcfStatsTable dateRange={dateRange} />
      )}

      {/* ISO 코드별 통계 탭 */}
      {activeTab === "iso" && (
        <IsoStatsTable dateRange={dateRange} />
      )}
    </div>
  );
}
