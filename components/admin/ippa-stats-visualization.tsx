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
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface IcfCodeStat {
  code: string;
  count: number;
  avgPreScore: number;
  avgPostScore: number;
  avgImprovement: number;
  avgEffectiveness: number;
}

interface IsoCodeStat {
  isoCode: string;
  count: number;
  avgEffectiveness: number;
  avgPreScore: number;
  avgPostScore: number;
  avgImprovement: number;
}

interface MonthlyStat {
  month: string;
  count: number;
  avgEffectiveness: number;
}

interface IppaStatsVisualizationProps {
  icfCodeStats?: IcfCodeStat[];
  isoCodeStats?: IsoCodeStat[];
  monthlyStats?: MonthlyStat[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function IppaStatsVisualization({
  icfCodeStats = [],
  isoCodeStats = [],
  monthlyStats = [],
}: IppaStatsVisualizationProps) {
  // ICF 코드별 점수 변화 데이터 준비
  const icfChartData = icfCodeStats
    .slice(0, 15) // 상위 15개
    .map((stat) => ({
      code: stat.code,
      사전: stat.avgPreScore,
      사후: stat.avgPostScore,
      개선도: stat.avgImprovement,
      효과성: stat.avgEffectiveness,
      평가수: stat.count,
    }));

  // ISO 분류별 통계 데이터 준비
  const isoChartData = isoCodeStats
    .slice(0, 10) // 상위 10개
    .map((stat) => ({
      isoCode: stat.isoCode,
      효과성: stat.avgEffectiveness,
      평가수: stat.count,
      개선도: stat.avgImprovement,
    }));

  // 월별 추이 데이터 준비
  const monthlyChartData = monthlyStats.map((stat) => ({
    month: stat.month.slice(5), // "2024-01" -> "01"
    평가수: stat.count,
    평균효과성: stat.avgEffectiveness,
  }));

  return (
    <div className="space-y-6">
      {/* 월별 평가 추이 차트 */}
      {monthlyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>월별 평가 추이</CardTitle>
            <CardDescription>최근 6개월간 평가 수 및 평균 효과성 점수</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="font-semibold">{payload[0]?.payload.month}월</div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평가 수: </span>
                                <span className="font-semibold">{payload[0]?.payload.평가수}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평균 효과성: </span>
                                <span className="font-semibold">
                                  {payload[1]?.payload.평균효과성?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="평가수"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="평가 수"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="평균효과성"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="평균 효과성"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ICF 코드별 점수 변화 차트 */}
      {icfChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ICF 코드별 점수 변화 (상위 15개)</CardTitle>
            <CardDescription>
              ICF 활동 코드별 사전/사후 점수 및 개선도 분석
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={icfChartData} layout="vertical">
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
                                <span className="text-muted-foreground">사전 점수: </span>
                                <span className="font-semibold">{data.사전.toFixed(1)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">사후 점수: </span>
                                <span className="font-semibold">{data.사후.toFixed(1)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">개선도: </span>
                                <span
                                  className={`font-semibold ${
                                    data.개선도 > 0 ? "text-green-600" : "text-gray-400"
                                  }`}
                                >
                                  {data.개선도 > 0 ? "+" : ""}
                                  {data.개선도.toFixed(1)}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평균 효과성: </span>
                                <span className="font-semibold">{data.효과성.toFixed(1)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평가 수: </span>
                                <span className="font-semibold">{data.평가수}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="사전" fill="hsl(var(--chart-3))" name="사전 점수" />
                  <Bar dataKey="사후" fill="hsl(var(--chart-1))" name="사후 점수" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ISO 분류별 통계 차트 */}
      {isoChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ISO 분류별 통계 (상위 10개)</CardTitle>
            <CardDescription>
              ISO 9999 코드별 평균 효과성 점수 및 평가 수
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={isoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="isoCode" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="font-semibold">ISO {data.isoCode}</div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평균 효과성: </span>
                                <span className="font-semibold">{data.효과성.toFixed(1)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평가 수: </span>
                                <span className="font-semibold">{data.평가수}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">개선도: </span>
                                <span
                                  className={`font-semibold ${
                                    data.개선도 > 0 ? "text-green-600" : "text-gray-400"
                                  }`}
                                >
                                  {data.개선도 > 0 ? "+" : ""}
                                  {data.개선도.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="효과성"
                    fill="hsl(var(--chart-1))"
                    name="평균 효과성"
                  >
                    {isoChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="right"
                    dataKey="평가수"
                    fill="hsl(var(--chart-2))"
                    name="평가 수"
                    opacity={0.6}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ICF 코드별 개선도 비교 */}
      {icfChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ICF 코드별 개선도 비교</CardTitle>
            <CardDescription>
              ICF 활동 코드별 평균 개선도 (사전 점수 - 사후 점수)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={icfChartData} layout="vertical">
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
                                <span className="text-muted-foreground">개선도: </span>
                                <span
                                  className={`font-semibold ${
                                    data.개선도 > 0 ? "text-green-600" : "text-gray-400"
                                  }`}
                                >
                                  {data.개선도 > 0 ? "+" : ""}
                                  {data.개선도.toFixed(1)}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">평가 수: </span>
                                <span className="font-semibold">{data.평가수}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="개선도" fill="hsl(var(--chart-1))">
                    {icfChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.개선도 > 0
                            ? "hsl(var(--chart-1))"
                            : "hsl(var(--muted))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

