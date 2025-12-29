"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface ConversionFunnelData {
  consultationToRecommendationRate: number;
  recommendationToClickRate: number;
  clickToEvaluationRate: number;
  overallConversionRate: number;
  totalConsultations: number;
  totalRecommendations: number;
  clickedRecommendations: number;
  totalEvaluations: number;
}

interface ConversionFunnelChartProps {
  data: ConversionFunnelData;
}

export function ConversionFunnelChart({
  data,
}: ConversionFunnelChartProps) {
  const steps = [
    {
      label: "상담 시작",
      value: data.totalConsultations,
      rate: 100,
      color: "bg-blue-500",
    },
    {
      label: "상담 완료 → 추천 생성",
      value: data.totalRecommendations,
      rate: data.consultationToRecommendationRate,
      color: "bg-green-500",
    },
    {
      label: "추천 생성 → 클릭",
      value: data.clickedRecommendations,
      rate: data.recommendationToClickRate,
      color: "bg-yellow-500",
    },
    {
      label: "클릭 → K-IPPA 평가",
      value: data.totalEvaluations,
      rate: data.clickToEvaluationRate,
      color: "bg-purple-500",
    },
  ];

  const maxValue = Math.max(...steps.map((s) => s.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          전환율 분석 (퍼널)
        </CardTitle>
        <CardDescription>
          사용자 여정 단계별 전환율 및 이탈 지점 분석
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const widthPercent = (step.value / maxValue) * 100;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({step.value}개)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isLast && (
                      <span className="text-xs text-muted-foreground">
                        ↓ {step.rate.toFixed(1)}%
                      </span>
                    )}
                    {isLast && (
                      <span className="text-xs font-semibold text-primary">
                        전체 전환율: {data.overallConversionRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative w-full h-12 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`${step.color} h-full transition-all duration-500 flex items-center justify-end pr-4`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    {widthPercent > 15 && (
                      <span className="text-xs font-semibold text-white">
                        {step.value}
                      </span>
                    )}
                  </div>
                  {widthPercent <= 15 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold">
                      {step.value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 전환율 요약 */}
        <div className="mt-6 grid gap-4 md:grid-cols-4 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.consultationToRecommendationRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              상담 → 추천
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {data.recommendationToClickRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              추천 → 클릭
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {data.clickToEvaluationRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              클릭 → 평가
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {data.overallConversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              전체 전환율
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
