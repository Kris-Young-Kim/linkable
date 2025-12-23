"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Target, ShoppingCart, MessageSquare, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useConversionRates } from "@/lib/api-hooks";

export function ConversionRatesDashboard() {
  const [dateRange, setDateRange] = useState("30days");
  const { data, isLoading, isError } = useConversionRates(dateRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>전환율 측정</CardTitle>
          <CardDescription>로딩 중...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{isError instanceof Error ? isError.message : "알 수 없는 오류"}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  // 상담→추천 완료율 목표 정보 (없을 경우 안전한 기본값)
  const consultationGoal =
    (data.goals as any).consultationToRecommendationView ?? {
      target: 70,
      current: 0,
      achieved: false,
      gap: 70,
    };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const getStatusColor = (achieved: boolean) => {
    return achieved ? "text-green-600" : "text-yellow-600";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>전환율 측정 대시보드</CardTitle>
              <CardDescription>
                추천 CTA 클릭률, 문의 연결율, 구매 전환율을 측정합니다.
              </CardDescription>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="90days">최근 90일</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 목표 달성 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">상담→추천 완료율</CardTitle>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(consultationGoal.achieved)}`}>
                  {formatPercentage(consultationGoal.current)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  목표: {consultationGoal.target}%
                </div>
                <Progress
                  value={(consultationGoal.current / consultationGoal.target) * 100}
                  className="mt-2"
                />
                {!consultationGoal.achieved && (
                  <div className="text-xs text-yellow-600 mt-1">
                    목표까지 {formatPercentage(consultationGoal.gap)} 부족
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">추천 CTA 클릭률</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(data.goals.recommendationClickRate.achieved)}`}>
                  {formatPercentage(data.goals.recommendationClickRate.current)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  목표: {data.goals.recommendationClickRate.target}%
                </div>
                <Progress
                  value={(data.goals.recommendationClickRate.current / data.goals.recommendationClickRate.target) * 100}
                  className="mt-2"
                />
                {!data.goals.recommendationClickRate.achieved && (
                  <div className="text-xs text-yellow-600 mt-1">
                    목표까지 {formatPercentage(data.goals.recommendationClickRate.gap)} 부족
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">문의 연결율</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(data.goals.expertInquiryRate.achieved)}`}>
                  {formatPercentage(data.goals.expertInquiryRate.current)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  목표: {data.goals.expertInquiryRate.target}%
                </div>
                <Progress
                  value={(data.goals.expertInquiryRate.current / data.goals.expertInquiryRate.target) * 100}
                  className="mt-2"
                />
                {!data.goals.expertInquiryRate.achieved && (
                  <div className="text-xs text-yellow-600 mt-1">
                    목표까지 {formatPercentage(data.goals.expertInquiryRate.gap)} 부족
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">구매 전환율</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(data.goals.purchaseConversionRate.achieved)}`}>
                  {formatPercentage(data.goals.purchaseConversionRate.current)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  목표: {data.goals.purchaseConversionRate.target}%
                </div>
                <Progress
                  value={(data.goals.purchaseConversionRate.current / data.goals.purchaseConversionRate.target) * 100}
                  className="mt-2"
                />
                {!data.goals.purchaseConversionRate.achieved && (
                  <div className="text-xs text-yellow-600 mt-1">
                    목표까지 {formatPercentage(data.goals.purchaseConversionRate.gap)} 부족
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 전환 퍼널 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">전환 퍼널</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{data.funnel.consultations}</div>
                <div className="text-xs text-muted-foreground mt-1">상담</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{data.funnel.recommendations}</div>
                <div className="text-xs text-muted-foreground mt-1">추천</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatPercentage(data.funnel.rates.consultationToRecommendation)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{data.funnel.clicks}</div>
                <div className="text-xs text-muted-foreground mt-1">클릭</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatPercentage(data.funnel.rates.recommendationToClick)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{data.funnel.expertInquiries}</div>
                <div className="text-xs text-muted-foreground mt-1">문의</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatPercentage(data.funnel.rates.clickToExpertInquiry)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{data.funnel.supportClicks}</div>
                <div className="text-xs text-muted-foreground mt-1">지원제도</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatPercentage(data.funnel.rates.clickToSupport)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{data.funnel.purchases}</div>
                <div className="text-xs text-muted-foreground mt-1">구매</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatPercentage(data.funnel.rates.clickToPurchase)}
                </div>
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              전체 전환율: {formatPercentage(data.funnel.rates.overallConversion)}
            </div>
          </div>

          {/* 일별 추이 차트 */}
          {data.dailyStats.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">일별 전환율 추이</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString("ko-KR");
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="clickRate"
                    stroke="#0F766E"
                    name="클릭률"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchaseRate"
                    stroke="#FB7185"
                    name="구매 전환율"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 구매 통계 */}
          {data.metrics.purchases.total > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">구매 통계</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">총 구매 건수</div>
                  <div className="text-2xl font-bold">{data.metrics.purchases.total}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">총 구매 금액</div>
                  <div className="text-2xl font-bold">
                    {data.metrics.purchases.totalAmount.toLocaleString()}원
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">평균 구매 금액</div>
                  <div className="text-2xl font-bold">
                    {data.metrics.purchases.averageAmount.toLocaleString()}원
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">총 수수료</div>
                  <div className="text-2xl font-bold">
                    {data.metrics.purchases.totalCommission.toLocaleString()}원
                  </div>
                </div>
              </div>
              {Object.keys(data.metrics.purchases.bySource).length > 0 && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-medium mb-2">추적 소스별 구매</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.metrics.purchases.bySource).map(([source, count]) => (
                      <Badge key={source} variant="outline">
                        {source}: {count}건
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

