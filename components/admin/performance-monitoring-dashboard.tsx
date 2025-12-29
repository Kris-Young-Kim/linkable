"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WebVitalsData {
  date: string;
  metric_name: string;
  total_measurements: number;
  avg_value: number;
  median_value: number;
  p95_value: number;
  good_percentage: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

interface ApiPerformanceData {
  date: string;
  endpoint: string;
  method: string;
  total_requests: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  error_rate_percentage: number;
  success_count: number;
  error_count: number;
}

interface PageStats {
  page_path: string;
  metric_name: string;
  avg_value: number;
  p95_value: number;
  good_percentage: number;
  total_measurements: number;
}

export function PerformanceMonitoringDashboard() {
  const [dateRange, setDateRange] = useState("7days");
  const [webVitals, setWebVitals] = useState<WebVitalsData[]>([]);
  const [apiPerformance, setApiPerformance] = useState<ApiPerformanceData[]>([]);
  const [pageStats, setPageStats] = useState<PageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/analytics/performance?dateRange=${dateRange}&type=all`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch performance data");
      }
      const data = await response.json();
      setWebVitals(data.webVitals || []);
      setApiPerformance(data.apiPerformance || []);
      setPageStats(data.pageStats || []);
    } catch (error) {
      console.error("[Performance Dashboard] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Web Vitals 데이터를 차트 형식으로 변환
  const webVitalsChartData = webVitals.reduce((acc: any, item) => {
    const existing = acc.find((d: any) => d.date === item.date);
    if (existing) {
      existing[item.metric_name] = item.avg_value;
    } else {
      acc.push({
        date: item.date,
        [item.metric_name]: item.avg_value,
      });
    }
    return acc;
  }, []);

  // API 성능 데이터를 차트 형식으로 변환
  const apiChartData = apiPerformance.reduce((acc: any, item) => {
    const key = `${item.endpoint} (${item.method})`;
    const existing = acc.find((d: any) => d.date === item.date);
    if (existing) {
      existing[key] = item.avg_response_time_ms;
    } else {
      acc.push({
        date: item.date,
        [key]: item.avg_response_time_ms,
      });
    }
    return acc;
  }, []);

  // 페이지별 통계 그룹화
  const pageStatsByPath = pageStats.reduce((acc: any, item) => {
    if (!acc[item.page_path]) {
      acc[item.page_path] = [];
    }
    acc[item.page_path].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>성능 모니터링</CardTitle>
          <CardDescription>로딩 중...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>성능 모니터링</CardTitle>
              <CardDescription>
                Core Web Vitals 및 API 성능 지표를 모니터링합니다.
              </CardDescription>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">최근 1일</SelectItem>
                <SelectItem value="7days">최근 7일</SelectItem>
                <SelectItem value="30days">최근 30일</SelectItem>
                <SelectItem value="90days">최근 90일</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="web-vitals" className="w-full">
            <TabsList>
              <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
              <TabsTrigger value="api">API 성능</TabsTrigger>
              <TabsTrigger value="pages">페이지별 통계</TabsTrigger>
            </TabsList>

            <TabsContent value="web-vitals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {["LCP", "FID", "CLS", "FCP", "TTFB", "INP"].map((metric) => {
                  const metricData = webVitals.filter((d) => d.metric_name === metric);
                  const latest = metricData[0];
                  if (!latest) return null;

                  return (
                    <Card key={metric}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{metric}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {latest.avg_value.toFixed(2)}
                          {metric === "CLS" ? "" : "ms"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          좋음: {latest.good_percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          측정 횟수: {latest.total_measurements}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {webVitalsChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Web Vitals 추이</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={webVitalsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="LCP" stroke="#8884d8" />
                        <Line type="monotone" dataKey="FID" stroke="#82ca9d" />
                        <Line type="monotone" dataKey="CLS" stroke="#ffc658" />
                        <Line type="monotone" dataKey="FCP" stroke="#ff7300" />
                        <Line type="monotone" dataKey="TTFB" stroke="#00ff00" />
                        <Line type="monotone" dataKey="INP" stroke="#ff00ff" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              {apiChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>API 응답 시간 추이</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={apiChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {Array.from(
                          new Set(apiPerformance.map((d) => `${d.endpoint} (${d.method})`))
                        ).map((key, index) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={`hsl(${(index * 360) / 10}, 70%, 50%)`}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>API 엔드포인트별 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(
                      new Set(apiPerformance.map((d) => `${d.endpoint} (${d.method})`))
                    ).map((endpoint) => {
                      const endpointData = apiPerformance.filter(
                        (d) => `${d.endpoint} (${d.method})` === endpoint
                      );
                      const latest = endpointData[0];
                      if (!latest) return null;

                      return (
                        <div key={endpoint} className="border rounded-lg p-4">
                          <div className="font-medium">{endpoint}</div>
                          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">평균 응답 시간</div>
                              <div className="font-semibold">
                                {latest.avg_response_time_ms.toFixed(2)}ms
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">P95 응답 시간</div>
                              <div className="font-semibold">
                                {latest.p95_response_time_ms.toFixed(2)}ms
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">에러율</div>
                              <div className="font-semibold">
                                {latest.error_rate_percentage.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pages" className="space-y-4">
              {Object.entries(pageStatsByPath).map(([path, stats]: [string, any]) => (
                <Card key={path}>
                  <CardHeader>
                    <CardTitle>{path}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.map((stat: PageStats) => (
                        <div key={stat.metric_name} className="flex items-center justify-between">
                          <div className="font-medium">{stat.metric_name}</div>
                          <div className="text-sm text-muted-foreground">
                            평균: {stat.avg_value.toFixed(2)}
                            {stat.metric_name === "CLS" ? "" : "ms"} | 좋음:{" "}
                            {stat.good_percentage.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
