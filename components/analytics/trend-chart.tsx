"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface DailyStats {
  stat_date: string;
  recommendations_count: number;
  clicked_count: number;
  ippa_evaluations_count?: number;
}

interface TrendChartProps {
  dailyStats: DailyStats[];
}

export function TrendChart({ dailyStats }: TrendChartProps) {
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
      evaluations: stat.ippa_evaluations_count || 0,
    }));

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          시간별 트렌드 분석
        </CardTitle>
        <CardDescription>
          최근 30일간 일별 활동 추이
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor: entry.color as string,
                                }}
                              />
                              <span className="text-sm font-medium">
                                {entry.dataKey === "recommendations"
                                  ? "추천 생성"
                                  : entry.dataKey === "clicked"
                                  ? "클릭"
                                  : "K-IPPA 평가"}
                                : {entry.value}개
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="recommendations"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="추천 생성"
              />
              <Line
                type="monotone"
                dataKey="clicked"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="클릭"
              />
              <Line
                type="monotone"
                dataKey="evaluations"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="K-IPPA 평가"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
