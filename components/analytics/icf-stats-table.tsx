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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Loader2 } from "lucide-react";

interface IcfStats {
  code: string;
  category: "b" | "d" | "e";
  totalRecommendations: number;
  clickedRecommendations: number;
  totalEvaluations: number;
  avgEffectivenessScore: number;
  clickThroughRate: number;
}

interface IcfStatsTableProps {
  dateRange?: string;
}

export function IcfStatsTable({ dateRange = "30days" }: IcfStatsTableProps) {
  const [stats, setStats] = useState<IcfStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/analytics/icf-stats?dateRange=${dateRange}&limit=50`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch ICF stats");
        }
        const data = await response.json();
        setStats(data.stats || []);
      } catch (err) {
        console.error("[ICF Stats] Fetch error:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [dateRange]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "b":
        return "신체기능";
      case "d":
        return "활동";
      case "e":
        return "환경";
      default:
        return category;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          ICF 코드별 통계
        </CardTitle>
        <CardDescription>
          ICF 코드별 추천, 클릭, 평가 통계 (상위 50개)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ICF 코드</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-right">추천 수</TableHead>
                <TableHead className="text-right">클릭 수</TableHead>
                <TableHead className="text-right">클릭률</TableHead>
                <TableHead className="text-right">평가 수</TableHead>
                <TableHead className="text-right">평균 효과성</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    데이터가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat) => (
                  <TableRow key={stat.code}>
                    <TableCell className="font-medium">{stat.code}</TableCell>
                    <TableCell>{getCategoryLabel(stat.category)}</TableCell>
                    <TableCell className="text-right">
                      {stat.totalRecommendations}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.clickedRecommendations}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.clickThroughRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.totalEvaluations}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.avgEffectivenessScore.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
