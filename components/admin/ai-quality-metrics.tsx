"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";

interface IcfExtractionResult {
  timestamp: string;
  overallAccuracy: {
    precision: number;
    recall: number;
    f1: number;
  };
  categoryBreakdown: Record<string, {
    count: number;
    accuracy: { precision: number; recall: number; f1: number };
  }>;
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

interface IsoMatchingResult {
  timestamp: string;
  overallAccuracy: {
    precision: number;
    recall: number;
    f1: number;
    top1Accuracy: number;
    top3Accuracy: number;
    top5Accuracy: number;
  };
  categoryBreakdown: Record<string, {
    count: number;
    accuracy: {
      precision: number;
      recall: number;
      f1: number;
      top1Accuracy: number;
      top3Accuracy: number;
      top5Accuracy: number;
    };
  }>;
  matchingMethodComparison: {
    ruleBased: { precision: number; recall: number; f1: number };
    keywordBased: { precision: number; recall: number; f1: number };
    graphBased: { precision: number; recall: number; f1: number };
    hybrid: { precision: number; recall: number; f1: number };
  };
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

interface AiQualityData {
  icfExtraction: IcfExtractionResult | null;
  isoMatching: IsoMatchingResult | null;
}

export function AiQualityMetrics() {
  const [data, setData] = useState<AiQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/admin/analytics/ai-quality");
        if (!response.ok) {
          throw new Error("데이터를 불러올 수 없습니다");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 매칭 품질 측정</CardTitle>
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

  if (!data || (!data.icfExtraction && !data.isoMatching)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 매칭 품질 측정</CardTitle>
          <CardDescription>측정 결과가 없습니다. 측정 스크립트를 실행해주세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const getStatusColor = (value: number, threshold: number = 0.7) => {
    if (value >= threshold) return "text-green-600";
    if (value >= threshold * 0.8) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI 매칭 품질 측정 결과</CardTitle>
          <CardDescription>
            ICF 코드 추출 및 ISO 매칭 시스템의 정확도를 측정한 결과입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ICF 추출 정확도 */}
          {data.icfExtraction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">ICF 코드 추출 정확도</h3>
                <Badge variant="outline">
                  {new Date(data.icfExtraction.timestamp).toLocaleString("ko-KR")}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Precision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.icfExtraction.overallAccuracy.precision)}`}>
                      {formatPercentage(data.icfExtraction.overallAccuracy.precision)}
                    </div>
                    <Progress
                      value={data.icfExtraction.overallAccuracy.precision * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recall</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.icfExtraction.overallAccuracy.recall)}`}>
                      {formatPercentage(data.icfExtraction.overallAccuracy.recall)}
                    </div>
                    <Progress
                      value={data.icfExtraction.overallAccuracy.recall * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">F1 Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.icfExtraction.overallAccuracy.f1)}`}>
                      {formatPercentage(data.icfExtraction.overallAccuracy.f1)}
                    </div>
                    <Progress
                      value={data.icfExtraction.overallAccuracy.f1 * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    통과: {data.icfExtraction.passedTests} / {data.icfExtraction.totalTests}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">
                    실패: {data.icfExtraction.failedTests} / {data.icfExtraction.totalTests}
                  </span>
                </div>
              </div>

              {/* 카테고리별 통계 */}
              {Object.keys(data.icfExtraction.categoryBreakdown).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">카테고리별 정확도</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(data.icfExtraction.categoryBreakdown).map(([category, stats]) => (
                      <div key={category} className="p-2 border rounded">
                        <div className="text-xs font-medium">{category}</div>
                        <div className="text-xs text-muted-foreground">
                          F1: {formatPercentage(stats.accuracy.f1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({stats.count}개 테스트)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ISO 매칭 정확도 */}
          {data.isoMatching && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">ISO 매칭 정확도</h3>
                <Badge variant="outline">
                  {new Date(data.isoMatching.timestamp).toLocaleString("ko-KR")}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Precision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.isoMatching.overallAccuracy.precision)}`}>
                      {formatPercentage(data.isoMatching.overallAccuracy.precision)}
                    </div>
                    <Progress
                      value={data.isoMatching.overallAccuracy.precision * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recall</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.isoMatching.overallAccuracy.recall)}`}>
                      {formatPercentage(data.isoMatching.overallAccuracy.recall)}
                    </div>
                    <Progress
                      value={data.isoMatching.overallAccuracy.recall * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">F1 Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.isoMatching.overallAccuracy.f1)}`}>
                      {formatPercentage(data.isoMatching.overallAccuracy.f1)}
                    </div>
                    <Progress
                      value={data.isoMatching.overallAccuracy.f1 * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top-1 정확도</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.isoMatching.overallAccuracy.top1Accuracy)}`}>
                      {formatPercentage(data.isoMatching.overallAccuracy.top1Accuracy)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top-3 정확도</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.isoMatching.overallAccuracy.top3Accuracy)}`}>
                      {formatPercentage(data.isoMatching.overallAccuracy.top3Accuracy)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top-5 정확도</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(data.isoMatching.overallAccuracy.top5Accuracy)}`}>
                      {formatPercentage(data.isoMatching.overallAccuracy.top5Accuracy)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    통과: {data.isoMatching.passedTests} / {data.isoMatching.totalTests}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">
                    실패: {data.isoMatching.failedTests} / {data.isoMatching.totalTests}
                  </span>
                </div>
              </div>

              {/* 매칭 방법별 비교 */}
              {data.isoMatching.matchingMethodComparison && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">매칭 방법별 비교</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(data.isoMatching.matchingMethodComparison).map(([method, accuracy]) => (
                      <div key={method} className="p-2 border rounded">
                        <div className="text-xs font-medium">{method}</div>
                        <div className="text-xs text-muted-foreground">
                          F1: {formatPercentage(accuracy.f1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P: {formatPercentage(accuracy.precision)} / R: {formatPercentage(accuracy.recall)}
                        </div>
                      </div>
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

