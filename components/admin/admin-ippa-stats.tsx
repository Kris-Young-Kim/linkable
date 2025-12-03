"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClipboardCheck, TrendingUp, Users, BarChart3, Eye, X } from "lucide-react"
import { IppaEvaluationDetail } from "./ippa-evaluation-detail"

interface IppaStats {
  totalEvaluations: number
  totalUsers: number
  averageEffectiveness: number
  averagePreScore: number
  averagePostScore: number
  scoreImprovement: number
  evaluationsByMonth: Array<{
    month: string
    count: number
    avgEffectiveness: number
  }>
  topCategories: Array<{
    category: string
    count: number
    avgEffectiveness: number
  }>
  evaluationsWithActivities?: number
  activityStats?: Array<{
    icfCode: string
    count: number
    avgImprovement: number
  }>
}

interface Evaluation {
  id: string
  productId: string
  effectivenessScore: number | null
  activityScores: any
  evaluatedAt: string
}

export function AdminIppaStats() {
  const [stats, setStats] = useState<IppaStats | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/ippa-stats")
        if (!response.ok) {
          throw new Error("Failed to fetch K-IPPA statistics")
        }
        const data = await response.json()
        setStats(data.stats)
        setEvaluations(data.evaluations || [])
      } catch (err) {
        console.error("[Admin Ippa Stats] Fetch error:", err)
        setError(err instanceof Error ? err.message : "알 수 없는 오류")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error || "데이터를 불러올 수 없습니다"}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 주요 지표 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 평가 수</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground mt-1">전체 K-IPPA 평가</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평가 참여 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">고유 사용자 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 효과성</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageEffectiveness.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">평균 효과성 점수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점수 개선</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scoreImprovement.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              사전 {stats.averagePreScore.toFixed(1)} → 사후 {stats.averagePostScore.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 평가 추이 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 평가 추이</CardTitle>
          <CardDescription>최근 6개월간의 K-IPPA 평가 통계</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.evaluationsByMonth.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">데이터가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {stats.evaluationsByMonth.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{item.month}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.count}개 평가
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.avgEffectiveness.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">평균 효과성</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 통계</CardTitle>
          <CardDescription>ISO 코드별 K-IPPA 평가 통계</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topCategories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">데이터가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {stats.topCategories.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Badge variant="secondary" className="mb-1">ISO {item.category}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {item.count}개 평가
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.avgEffectiveness.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">평균 효과성</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 활동별 통계 */}
      {stats.activityStats && stats.activityStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>활동별 통계</CardTitle>
            <CardDescription>ICF 활동별 개선도 통계 (상위 {stats.activityStats.length}개)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.activityStats.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Badge variant="outline" className="mb-1 font-mono text-xs">{item.icfCode}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {item.count}회 평가
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      item.avgImprovement > 0 ? "text-green-600" :
                      item.avgImprovement < 0 ? "text-red-600" :
                      "text-gray-400"
                    }`}>
                      {item.avgImprovement > 0 ? "+" : ""}{item.avgImprovement.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">평균 개선도</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 개별 평가 목록 */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>개별 평가 목록</CardTitle>
            <CardDescription>활동별 점수가 있는 평가 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {evaluations
                .filter(e => e.activityScores && typeof e.activityScores === 'object' && 'activities' in e.activityScores)
                .map((evaluation) => {
                  const activityScores = (evaluation.activityScores as any)?.activities
                  const hasActivities = Array.isArray(activityScores) && activityScores.length > 0
                  
                  if (!hasActivities) return null

                  return (
                    <div
                      key={evaluation.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedEvaluation(evaluation)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activityScores.length}개 활동
                          </Badge>
                          {evaluation.effectivenessScore !== null && (
                            <Badge variant="secondary">
                              효과성: {evaluation.effectivenessScore.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(evaluation.evaluatedAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 평가 상세 모달 */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-background z-10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>평가 상세</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvaluation(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedEvaluation.activityScores && 
               typeof selectedEvaluation.activityScores === 'object' && 
               'activities' in selectedEvaluation.activityScores ? (
                <IppaEvaluationDetail
                  activities={(selectedEvaluation.activityScores as any).activities}
                  followupDate={new Date(selectedEvaluation.evaluatedAt).toLocaleDateString('ko-KR')}
                />
              ) : (
                <p className="text-muted-foreground">활동별 점수 데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

