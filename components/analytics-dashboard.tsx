"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MousePointerClick, ClipboardCheck, BarChart3 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface AnalyticsMetrics {
  recommendationAccuracy: {
    clickThroughRate: number
    totalRecommendations: number
    clickedRecommendations: number
  }
  ippaParticipation: {
    participationRate: number
    totalEvaluations: number
    eligibleRecommendations: number
  }
  consultationCompletion: {
    completionRate: number
    totalConsultations: number
    completedConsultations: number
  }
  recentActivity: {
    recommendations: number
    ippaEvaluations: number
  }
  averageEffectiveness: number
}

export function AnalyticsDashboard() {
  const { t } = useLanguage()
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/analytics")
        if (!response.ok) {
          throw new Error("Failed to fetch analytics")
        }
        const data = await response.json()
        setMetrics(data.metrics)
      } catch (err) {
        console.error("[Analytics] Fetch error:", err)
        setError(err instanceof Error ? err.message : "알 수 없는 오류")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
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
    )
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {error || "데이터를 불러올 수 없습니다"}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Analytics & Metrics</h2>
        <p className="text-muted-foreground">
          추천 정확도, K-IPPA 참여율 등 주요 지표를 확인하세요
        </p>
      </div>

      {/* 메트릭 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 추천 정확도 (클릭률) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">추천 정확도</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recommendationAccuracy.clickThroughRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.recommendationAccuracy.clickedRecommendations} / {metrics.recommendationAccuracy.totalRecommendations} 클릭
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
            <div className="text-2xl font-bold">{metrics.ippaParticipation.participationRate}%</div>
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
            <div className="text-2xl font-bold">{metrics.consultationCompletion.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.consultationCompletion.completedConsultations} / {metrics.consultationCompletion.totalConsultations} 완료
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
            <div className="text-2xl font-bold">{metrics.averageEffectiveness}</div>
            <p className="text-xs text-muted-foreground mt-1">
              K-IPPA 평균 점수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 30일 활동</CardTitle>
          <CardDescription>최근 한 달간의 활동 요약</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">추천 생성</p>
              <p className="text-2xl font-bold">{metrics.recentActivity.recommendations}개</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">K-IPPA 평가</p>
              <p className="text-2xl font-bold">{metrics.recentActivity.ippaEvaluations}개</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

