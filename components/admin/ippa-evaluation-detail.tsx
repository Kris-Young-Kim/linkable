"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { getIcfActivityByCode } from "@/core/assessment/icf-activities"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"

interface ActivityEvaluation {
  icfCode: string
  importance: number
  preDifficulty: number
  postDifficulty: number
  improvement?: number
  effectivenessScore?: number
  assistiveDevice?: string
}

interface IppaEvaluationDetailProps {
  customerName?: string
  gender?: string
  age?: number
  baselineDate?: string
  followupDate?: string
  baselineEvaluator?: string
  followupEvaluator?: string
  activities: ActivityEvaluation[]
  productName?: string
}

export function IppaEvaluationDetail({
  customerName,
  gender,
  age,
  baselineDate,
  followupDate,
  baselineEvaluator,
  followupEvaluator,
  activities,
  productName,
}: IppaEvaluationDetailProps) {
  // 각 활동의 점수 계산
  const activityScores = activities.map(activity => {
    const preScore = activity.importance * activity.preDifficulty
    const postScore = activity.importance * activity.postDifficulty
    const improvement = activity.improvement ?? (preScore - postScore)
    const effectivenessScore = activity.effectivenessScore ?? improvement
    const improvementPercentage = activity.preDifficulty > 0 
      ? ((activity.preDifficulty - activity.postDifficulty) / activity.preDifficulty) * 100 
      : 0

    return {
      ...activity,
      preScore,
      postScore,
      improvement,
      effectivenessScore,
      improvementPercentage,
      icfActivity: getIcfActivityByCode(activity.icfCode),
    }
  })

  // 총계 및 평균 계산
  const totalPreScore = activityScores.reduce((sum, a) => sum + a.preScore, 0)
  const totalPostScore = activityScores.reduce((sum, a) => sum + a.postScore, 0)
  const totalImprovement = totalPreScore - totalPostScore
  const avgPreScore = totalPreScore / activities.length
  const avgPostScore = totalPostScore / activities.length
  const avgImprovement = avgPreScore - avgPostScore

  // 차트 데이터 준비
  const chartData = activityScores.map(activity => ({
    name: activity.icfActivity?.description || activity.icfCode,
    code: activity.icfCode,
    기초선: activity.preDifficulty,
    후속: activity.postDifficulty,
    개선: activity.preDifficulty - activity.postDifficulty,
  }))

  return (
    <div className="space-y-6">
      {/* 고객 정보 */}
      {(customerName || gender || age) && (
        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {customerName && (
                <div>
                  <p className="text-sm text-muted-foreground">이름</p>
                  <p className="font-medium">{customerName}</p>
                </div>
              )}
              {gender && (
                <div>
                  <p className="text-sm text-muted-foreground">성별</p>
                  <p className="font-medium">{gender}</p>
                </div>
              )}
              {age && (
                <div>
                  <p className="text-sm text-muted-foreground">나이</p>
                  <p className="font-medium">{age}세</p>
                </div>
              )}
              {productName && (
                <div>
                  <p className="text-sm text-muted-foreground">보조기기</p>
                  <p className="font-medium">{productName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 인터뷰 정보 */}
      {(baselineDate || followupDate) && (
        <Card>
          <CardHeader>
            <CardTitle>인터뷰 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {baselineDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">기초선 인터뷰</p>
                  <p className="font-medium">날짜: {baselineDate}</p>
                  {baselineEvaluator && (
                    <p className="font-medium">평가자: {baselineEvaluator}</p>
                  )}
                </div>
              )}
              {followupDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">후속 인터뷰</p>
                  <p className="font-medium">날짜: {followupDate}</p>
                  {followupEvaluator && (
                    <p className="font-medium">평가자: {followupEvaluator}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 총계 및 평균 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">기초선 총점</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPreScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">평균: {avgPreScore.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">후속 총점</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPostScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">평균: {avgPostScore.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">총 개선 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalImprovement.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">평균 개선: {avgImprovement.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 활동별 개선도 차트 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>활동별 어려움 점수 비교</CardTitle>
            <CardDescription>기초선 vs 후속 어려움 점수</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="기초선" fill="#ef4444" />
                <Bar dataKey="후속" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 개선 점수 순위 차트 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>활동별 개선 점수</CardTitle>
            <CardDescription>중요도 × 어려움 점수 개선량</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  width={150}
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="개선" fill="#3b82f6">
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.개선 > 0 ? "#22c55e" : entry.개선 < 0 ? "#ef4444" : "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 활동별 상세 평가 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>활동별 상세 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium">No.</th>
                  <th className="text-left p-3 text-sm font-medium">세부 내용</th>
                  <th className="text-center p-3 text-sm font-medium" colSpan={3}>
                    IPPA 기초선 인터뷰
                  </th>
                  <th className="text-center p-3 text-sm font-medium">중재 보조기기</th>
                  <th className="text-center p-3 text-sm font-medium" colSpan={2}>
                    IPPA 후속 인터뷰
                  </th>
                  <th className="text-center p-3 text-sm font-medium">결과</th>
                </tr>
                <tr className="border-b bg-muted/50">
                  <th></th>
                  <th></th>
                  <th className="p-2 text-xs">중요도 (/5)</th>
                  <th className="p-2 text-xs">어려움 (/5)</th>
                  <th className="p-2 text-xs">중요도×어려움</th>
                  <th></th>
                  <th className="p-2 text-xs">어려움 (/5)</th>
                  <th className="p-2 text-xs">중요도×어려움</th>
                  <th className="p-2 text-xs">기초선-후속</th>
                </tr>
              </thead>
              <tbody>
                {activityScores.map((activity, index) => (
                  <tr key={activity.icfCode} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-center">{index + 1}</td>
                    <td className="p-3">
                      <div>
                        <Badge variant="outline" className="mr-2 font-mono text-xs">
                          {activity.icfCode}
                        </Badge>
                        <span className="font-medium">
                          {activity.icfActivity?.description || activity.icfCode}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">{activity.importance}</td>
                    <td className="p-3 text-center">{activity.preDifficulty}</td>
                    <td className="p-3 text-center font-semibold">{activity.preScore}</td>
                    <td className="p-3 text-center text-sm">
                      {activity.assistiveDevice || productName || "-"}
                    </td>
                    <td className="p-3 text-center">{activity.postDifficulty}</td>
                    <td className="p-3 text-center font-semibold">{activity.postScore}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {activity.improvement > 0 && (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        )}
                        {activity.improvement < 0 && (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        )}
                        {activity.improvement === 0 && (
                          <Minus className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`font-bold ${
                          activity.improvement > 0 ? "text-green-600" :
                          activity.improvement < 0 ? "text-red-600" :
                          "text-gray-400"
                        }`}>
                          {activity.improvement > 0 ? "+" : ""}{activity.improvement}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-semibold">
                <tr className="border-t-2">
                  <td colSpan={4} className="p-3 text-right">합계</td>
                  <td className="p-3 text-center">{totalPreScore.toFixed(1)}</td>
                  <td></td>
                  <td></td>
                  <td className="p-3 text-center">{totalPostScore.toFixed(1)}</td>
                  <td className="p-3 text-center text-primary">{totalImprovement.toFixed(1)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="p-3 text-right">평균</td>
                  <td className="p-3 text-center">{avgPreScore.toFixed(1)}</td>
                  <td></td>
                  <td></td>
                  <td className="p-3 text-center">{avgPostScore.toFixed(1)}</td>
                  <td className="p-3 text-center text-primary">{avgImprovement.toFixed(1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

