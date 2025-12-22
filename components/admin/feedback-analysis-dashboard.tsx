"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, TrendingDown, Star, Target, BarChart3 } from "lucide-react";

interface FeedbackAnalysisData {
  summary: {
    overallMatchingQuality: number;
    averageFeedbackRating: number;
    averageEffectivenessScore: number;
    clickThroughRate: number;
    purchaseConversionRate: number;
  };
  metrics: {
    consultationFeedback: {
      total: number;
      average: number;
      distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
      };
    };
    ippaEvaluation: {
      total: number;
      average: number;
      distribution: {
        negative: number;
        low: number;
        medium: number;
        high: number;
      };
    };
    recommendations: {
      total: number;
      clicked: number;
      clickRate: number;
    };
    purchases: {
      total: number;
      conversionRate: number;
      totalAmount: number;
    };
  };
  icfCodeFeedback: Array<{
    code: string;
    name: string;
    category: string;
    averageRating: number;
    feedbackCount: number;
  }>;
  isoCodeFeedback: Array<{
    code: string;
    averageFeedbackRating: number;
    feedbackCount: number;
    clickRate: number;
    purchaseRate: number;
    recommendationCount: number;
  }>;
  dailyStats: Array<{
    date: string;
    feedbackRating: number;
    effectivenessScore: number;
    clickRate: number;
    purchaseRate: number;
  }>;
  dateRange: string;
  timestamp: string;
}

export function FeedbackAnalysisDashboard() {
  const [data, setData] = useState<FeedbackAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30days");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/analytics/feedback-analysis?dateRange=${dateRange}`
        );
        if (!response.ok) {
          throw new Error("데이터를 불러올 수 없습니다");
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>피드백 데이터 분석</CardTitle>
          <CardDescription>로딩 중...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatScore = (value: number) => value.toFixed(2);
  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return "우수";
    if (score >= 60) return "양호";
    if (score >= 40) return "보통";
    return "개선 필요";
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-2xl">피드백 데이터 분석</CardTitle>
          <CardDescription>
            사용자 피드백, 클릭률, 구매 전환율을 기반으로 한 매칭 품질 평가
          </CardDescription>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">최근 7일</SelectItem>
            <SelectItem value="30days">최근 30일</SelectItem>
            <SelectItem value="90days">최근 90일</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 종합 매칭 품질 점수 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            종합 매칭 품질 점수
          </CardTitle>
          <CardDescription>
            피드백, 효과성, 클릭률, 구매율을 종합한 매칭 품질 평가
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold" style={{ color: getQualityColor(data.summary.overallMatchingQuality) }}>
              {formatScore(data.summary.overallMatchingQuality)}
            </div>
            <div>
              <Badge variant={data.summary.overallMatchingQuality >= 60 ? "default" : "destructive"}>
                {getQualityBadge(data.summary.overallMatchingQuality)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                가중 평균: 피드백 30%, 효과성 30%, 클릭률 20%, 구매율 20%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 주요 지표 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 피드백 점수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div className="text-2xl font-bold">{formatScore(data.summary.averageFeedbackRating)}</div>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.metrics.consultationFeedback.total}개 피드백
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 효과성 점수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">{formatScore(data.summary.averageEffectivenessScore)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.metrics.ippaEvaluation.total}개 평가
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>클릭률</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div className="text-2xl font-bold">{formatPercentage(data.summary.clickThroughRate)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.metrics.recommendations.clicked} / {data.metrics.recommendations.total} 추천
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>구매 전환율</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div className="text-2xl font-bold">{formatPercentage(data.summary.purchaseConversionRate)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.metrics.purchases.total}건 구매
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 분석 */}
      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">피드백 분포</TabsTrigger>
          <TabsTrigger value="icf">ICF 코드별</TabsTrigger>
          <TabsTrigger value="iso">ISO 코드별</TabsTrigger>
          <TabsTrigger value="daily">일별 추이</TabsTrigger>
        </TabsList>

        {/* 피드백 분포 */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상담 피드백 분포</CardTitle>
              <CardDescription>ICF 분석 정확도 평가 점수 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = data.metrics.consultationFeedback.distribution[rating as keyof typeof data.metrics.consultationFeedback.distribution];
                  const total = data.metrics.consultationFeedback.total;
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium">{rating}점</div>
                      <div className="flex-1">
                        <div className="h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-sm text-muted-foreground text-right">
                        {count}개 ({formatPercentage(percentage)})
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>효과성 점수 분포</CardTitle>
              <CardDescription>K-IPPA 효과성 점수 구간별 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "높음 (≥10점)", value: data.metrics.ippaEvaluation.distribution.high, color: "bg-green-500" },
                  { label: "중간 (5-10점)", value: data.metrics.ippaEvaluation.distribution.medium, color: "bg-yellow-500" },
                  { label: "낮음 (0-5점)", value: data.metrics.ippaEvaluation.distribution.low, color: "bg-orange-500" },
                  { label: "음수 (<0점)", value: data.metrics.ippaEvaluation.distribution.negative, color: "bg-red-500" },
                ].map((item) => {
                  const total = data.metrics.ippaEvaluation.total;
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-2xl font-bold">{item.value}개</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercentage(percentage)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ICF 코드별 피드백 */}
        <TabsContent value="icf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ICF 코드별 평균 피드백 점수</CardTitle>
              <CardDescription>상위 20개 ICF 코드의 평균 피드백 점수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.icfCodeFeedback.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.code}</Badge>
                        <span className="font-medium">{item.name || item.code}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.feedbackCount}개 피드백
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatScore(item.averageRating)}</div>
                      <div className="text-xs text-muted-foreground">/ 5.0</div>
                    </div>
                  </div>
                ))}
                {data.icfCodeFeedback.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    데이터가 없습니다.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ISO 코드별 피드백 */}
        <TabsContent value="iso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ISO 코드별 매칭 품질</CardTitle>
              <CardDescription>ISO 코드별 피드백 점수, 클릭률, 구매 전환율</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.isoCodeFeedback.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">ISO {item.code}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.recommendationCount}개 추천
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>피드백: {formatScore(item.averageFeedbackRating)}</span>
                        <span>클릭률: {formatPercentage(item.clickRate)}</span>
                        <span>구매율: {formatPercentage(item.purchaseRate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {data.isoCodeFeedback.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    데이터가 없습니다.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 일별 추이 */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>일별 추이</CardTitle>
              <CardDescription>최근 30일간의 피드백 및 전환율 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.dailyStats.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <div className="w-24 text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">피드백</div>
                        <div className="font-medium">{formatScore(day.feedbackRating)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">효과성</div>
                        <div className="font-medium">{formatScore(day.effectivenessScore)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">클릭률</div>
                        <div className="font-medium">{formatPercentage(day.clickRate)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">구매율</div>
                        <div className="font-medium">{formatPercentage(day.purchaseRate)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

