"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface PreviousEvaluation {
  id: string
  score_importance: number
  score_difficulty_pre: number
  score_difficulty_post: number
  effectiveness_score: number | null
  feedback_comment: string | null
  evaluated_at: string
}

interface IppaHistoryComparisonProps {
  currentRecommendationId: string
  previousEvaluations: PreviousEvaluation[]
}

export function IppaHistoryComparison({
  currentRecommendationId,
  previousEvaluations,
}: IppaHistoryComparisonProps) {
  const { t } = useLanguage()

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString))
  }

  const getEffectivenessLabel = (score: number | null) => {
    if (score === null) return "-"
    if (score >= 12) return "우수"
    if (score >= 8) return "양호"
    if (score >= 4) return "보통"
    if (score > 0) return "미미"
    if (score === 0) return "없음"
    return "악화"
  }

  const getEffectivenessColor = (score: number | null) => {
    if (score === null) return "bg-muted"
    if (score >= 12) return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
    if (score >= 8) return "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
    if (score >= 4) return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
    if (score > 0) return "bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100"
    if (score === 0) return "bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-100"
    return "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100"
  }

  // 점수 변화 계산 (가장 최근 평가와 비교)
  const calculateTrend = () => {
    if (previousEvaluations.length < 2) return null

    const latest = previousEvaluations[0]
    const previous = previousEvaluations[1]

    const latestScore = latest.effectiveness_score ?? 0
    const previousScore = previous.effectiveness_score ?? 0
    const change = latestScore - previousScore

    return {
      change,
      percentage: previousScore > 0 ? (change / previousScore) * 100 : 0,
      latestScore,
      previousScore,
    }
  }

  const trend = calculateTrend()

  return (
    <div className="space-y-4">
      {/* 트렌드 요약 */}
      {trend && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">최근 변화</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {trend.change > 0 ? "+" : ""}
                  {trend.change.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  이전: {trend.previousScore.toFixed(1)} → 현재: {trend.latestScore.toFixed(1)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {trend.change > 0 ? (
                  <TrendingUp className="size-8 text-emerald-600" />
                ) : trend.change < 0 ? (
                  <TrendingDown className="size-8 text-red-600" />
                ) : (
                  <Minus className="size-8 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 평가 목록 */}
      <div className="space-y-3">
        {previousEvaluations.map((evaluation, index) => {
          const effectivenessScore = evaluation.effectiveness_score ?? 0
          const improvement = evaluation.score_difficulty_pre - evaluation.score_difficulty_post

          return (
            <Card key={evaluation.id} className={index === 0 ? "border-2 border-primary" : ""}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* 날짜 및 순서 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(evaluation.evaluated_at)}
                      </span>
                    </div>
                    {index === 0 && (
                      <Badge variant="default" className="text-xs">
                        최신
                      </Badge>
                    )}
                  </div>

                  {/* 점수 요약 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">중요도</p>
                      <p className="text-lg font-semibold text-foreground">
                        {evaluation.score_importance}/5
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">개선</p>
                      <p className="text-lg font-semibold text-foreground">
                        {improvement > 0 ? "+" : ""}
                        {improvement}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">효과성</p>
                      <Badge className={getEffectivenessColor(effectivenessScore)}>
                        {effectivenessScore.toFixed(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* 상세 점수 */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">사용 전 난이도</span>
                      <span className="font-medium text-foreground">
                        {evaluation.score_difficulty_pre}/5
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">사용 후 난이도</span>
                      <span className="font-medium text-foreground">
                        {evaluation.score_difficulty_post}/5
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">효과성 등급</span>
                      <Badge variant="outline" className="text-xs">
                        {getEffectivenessLabel(effectivenessScore)}
                      </Badge>
                    </div>
                  </div>

                  {/* 피드백 코멘트 */}
                  {evaluation.feedback_comment && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">피드백</p>
                      <p className="text-sm text-foreground">{evaluation.feedback_comment}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

