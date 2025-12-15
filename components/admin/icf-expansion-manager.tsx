"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  Sparkles,
  TrendingUp,
  Zap
} from "lucide-react"
import { toast } from "sonner"

interface IcfExpansionCode {
  code: string
  category: "b" | "d" | "e"
  priorityScore: number
  totalUsageCount: number
  uniqueConsultations: number
  usageBySource: Record<string, number>
  associatedIsoCodes: string[]
  associatedKeywords: string[]
  firstSeenAt: string
  lastSeenAt: string
  recommendedForExpansion: boolean
}

interface IcfExpansionResponse {
  codes: IcfExpansionCode[]
  summary: {
    totalMissingCodes: number
    highPriorityCodes: number
    mediumPriorityCodes: number
    lowPriorityCodes: number
    recommendedForExpansion: number
  }
  timestamp: string
}

export function IcfExpansionManager() {
  const [data, setData] = useState<IcfExpansionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [isExpanding, setIsExpanding] = useState(false)
  const [minUsage, setMinUsage] = useState(1)
  const [autoExpandEnabled, setAutoExpandEnabled] = useState(false)
  const [autoExpandThreshold, setAutoExpandThreshold] = useState(20)
  const [isGeneratingIsoHints, setIsGeneratingIsoHints] = useState(false)

  // 데이터 로드
  useEffect(() => {
    loadData()
    loadAutoExpandConfig()
  }, [minUsage])

  // 자동 확장 설정 로드
  const loadAutoExpandConfig = async () => {
    try {
      const response = await fetch("/api/admin/icf/auto-expand-config")
      if (response.ok) {
        const config = await response.json()
        setAutoExpandEnabled(config.enabled || false)
        setAutoExpandThreshold(config.threshold || 20)
      }
    } catch (error) {
      console.error("[ICF Expansion] Config load error:", error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/analytics/icf-expansion?limit=100&min_usage=${minUsage}`
      )
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다")
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("[ICF Expansion] Load error:", error)
      toast.error("데이터를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  // 코드 선택 토글
  const toggleCodeSelection = (code: string) => {
    const newSelected = new Set(selectedCodes)
    if (newSelected.has(code)) {
      newSelected.delete(code)
    } else {
      newSelected.add(code)
    }
    setSelectedCodes(newSelected)
  }

  // 전체 선택/해제
  const toggleAllSelection = (codes: IcfExpansionCode[]) => {
    if (selectedCodes.size === codes.length) {
      setSelectedCodes(new Set())
    } else {
      setSelectedCodes(new Set(codes.map((c) => c.code)))
    }
  }

  // 우선순위 높은 코드만 선택
  const selectHighPriority = (codes: IcfExpansionCode[]) => {
    const highPriority = codes
      .filter((c) => c.priorityScore >= 20)
      .map((c) => c.code)
    setSelectedCodes(new Set(highPriority))
  }

  // Core Set에 일괄 추가
  const handleBatchExpand = async () => {
    if (selectedCodes.size === 0) {
      toast.error("추가할 코드를 선택해주세요")
      return
    }

    try {
      setIsExpanding(true)
      const response = await fetch("/api/admin/icf/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codes: Array.from(selectedCodes),
          generateIsoHints: true, // AI 기반 ISO 힌트 자동 생성
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "확장에 실패했습니다")
      }

      const result = await response.json()
      toast.success(`${result.addedCount}개 코드가 Core Set에 추가되었습니다`)
      setSelectedCodes(new Set())
      await loadData()
    } catch (error) {
      console.error("[ICF Expansion] Expand error:", error)
      toast.error(
        error instanceof Error ? error.message : "확장에 실패했습니다"
      )
    } finally {
      setIsExpanding(false)
    }
  }

  // AI 기반 ISO 힌트 생성
  const handleGenerateIsoHints = async (code: string) => {
    try {
      setIsGeneratingIsoHints(true)
      const response = await fetch("/api/admin/icf/generate-iso-hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error("ISO 힌트 생성에 실패했습니다")
      }

      const result = await response.json()
      toast.success(`ISO 힌트가 생성되었습니다: ${result.isoCodes.join(", ")}`)
      await loadData()
    } catch (error) {
      console.error("[ICF Expansion] Generate ISO hints error:", error)
      toast.error("ISO 힌트 생성에 실패했습니다")
    } finally {
      setIsGeneratingIsoHints(false)
    }
  }

  // 자동 확장 설정 저장
  const handleSaveAutoExpand = async () => {
    try {
      const response = await fetch("/api/admin/icf/auto-expand-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoExpandEnabled,
          threshold: autoExpandThreshold,
        }),
      })

      if (!response.ok) {
        throw new Error("설정 저장에 실패했습니다")
      }

      toast.success("자동 확장 설정이 저장되었습니다")
    } catch (error) {
      console.error("[ICF Expansion] Save config error:", error)
      toast.error("설정 저장에 실패했습니다")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">데이터를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>데이터를 불러올 수 없습니다</AlertTitle>
            <AlertDescription>
              데이터를 불러오는 중 오류가 발생했습니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const codes = data.codes

  return (
    <div className="space-y-6">
      {/* 헤더 및 요약 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                ICF 코드 확장 관리
              </CardTitle>
              <CardDescription>
                Core Set에 없는 ICF 코드의 사용 통계를 확인하고 확장할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">전체 누락 코드</p>
              <p className="text-2xl font-bold">{data.summary.totalMissingCodes}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">고우선순위</p>
              <p className="text-2xl font-bold text-red-600">
                {data.summary.highPriorityCodes}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">중우선순위</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.summary.mediumPriorityCodes}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">확장 권장</p>
              <p className="text-2xl font-bold text-green-600">
                {data.summary.recommendedForExpansion}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 자동 확장 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            자동 확장 설정
          </CardTitle>
          <CardDescription>
            우선순위 점수가 임계값을 넘으면 자동으로 Core Set에 추가됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-expand"
              checked={autoExpandEnabled}
              onCheckedChange={(checked) => setAutoExpandEnabled(checked === true)}
            />
            <Label htmlFor="auto-expand" className="cursor-pointer">
              자동 확장 활성화
            </Label>
          </div>
          {autoExpandEnabled && (
            <div className="space-y-2">
              <Label htmlFor="threshold">우선순위 임계값</Label>
              <Input
                id="threshold"
                type="number"
                value={autoExpandThreshold}
                onChange={(e) => setAutoExpandThreshold(Number(e.target.value))}
                min={0}
                max={100}
              />
              <p className="text-sm text-muted-foreground">
                우선순위 점수가 {autoExpandThreshold} 이상인 코드가 자동으로 추가됩니다.
              </p>
            </div>
          )}
          <Button onClick={handleSaveAutoExpand} size="sm">
            설정 저장
          </Button>
        </CardContent>
      </Card>

      {/* 필터 및 액션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>확장 우선순위 목록</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="최소 사용 횟수"
                value={minUsage}
                onChange={(e) => setMinUsage(Number(e.target.value) || 1)}
                className="w-32"
                min={1}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAllSelection(codes)}
              >
                {selectedCodes.size === codes.length ? "전체 해제" : "전체 선택"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectHighPriority(codes)}
              >
                고우선순위 선택
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedCodes.size}개 선택됨
              </span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button disabled={selectedCodes.size === 0 || isExpanding}>
                  {isExpanding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      선택한 코드 추가 ({selectedCodes.size})
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Core Set에 코드 추가</DialogTitle>
                  <DialogDescription>
                    선택한 {selectedCodes.size}개의 ICF 코드를 Core Set에 추가하시겠습니까?
                    AI 기반 ISO 매핑 힌트도 자동으로 생성됩니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedCodes(new Set())}>
                    취소
                  </Button>
                  <Button onClick={handleBatchExpand} disabled={isExpanding}>
                    {isExpanding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      "추가"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCodes.size === codes.length && codes.length > 0}
                      onCheckedChange={() => toggleAllSelection(codes)}
                    />
                  </TableHead>
                  <TableHead>ICF 코드</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead>사용 횟수</TableHead>
                  <TableHead>고유 상담</TableHead>
                  <TableHead>출처</TableHead>
                  <TableHead>연관 ISO</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      확장할 코드가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => (
                    <TableRow key={code.code}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCodes.has(code.code)}
                          onCheckedChange={() => toggleCodeSelection(code.code)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{code.code}</Badge>
                          <Badge
                            variant={
                              code.category === "b"
                                ? "default"
                                : code.category === "d"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {code.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {code.priorityScore.toFixed(1)}
                          </span>
                          {code.recommendedForExpansion && (
                            <Badge variant="default" className="text-xs">
                              권장
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{code.totalUsageCount}</TableCell>
                      <TableCell>{code.uniqueConsultations}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {Object.entries(code.usageBySource).map(([source, count]) => (
                            <Badge key={source} variant="outline" className="text-xs">
                              {source}: {count}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {code.associatedIsoCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {code.associatedIsoCodes.slice(0, 3).map((iso) => (
                              <Badge key={iso} variant="secondary" className="text-xs">
                                {iso}
                              </Badge>
                            ))}
                            {code.associatedIsoCodes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{code.associatedIsoCodes.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">없음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateIsoHints(code.code)}
                          disabled={isGeneratingIsoHints}
                        >
                          {isGeneratingIsoHints ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "ISO 힌트 생성"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

