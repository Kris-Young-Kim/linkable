"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error"
  category: string
  action: string
  message: string
  details?: Record<string, unknown>
}

export function AdminLogMonitor() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState<"all" | "info" | "warn" | "error">("all")

  useEffect(() => {
    // TODO: 실제 로그 API 엔드포인트 연결
    // 현재는 샘플 데이터 표시
    const fetchLogs = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // 실제 API 호출로 대체 필요
        // const response = await fetch("/api/admin/logs")
        // if (!response.ok) throw new Error("Failed to fetch logs")
        // const data = await response.json()
        
        // 샘플 데이터 (실제 구현 시 제거)
        const sampleLogs: LogEntry[] = [
          {
            id: "1",
            timestamp: new Date().toISOString(),
            level: "info",
            category: "system",
            action: "server_started",
            message: "서버가 정상적으로 시작되었습니다.",
          },
          {
            id: "2",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            level: "warn",
            category: "product",
            action: "link_validation_failed",
            message: "상품 링크 검증 실패",
            details: { url: "https://example.com/product" },
          },
        ]
        
        setLogs(sampleLogs)
      } catch (err) {
        console.error("[Log Monitor] Fetch error:", err)
        setError(err instanceof Error ? err.message : "알 수 없는 오류")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
    
    // 실시간 로그 업데이트 (선택사항)
    // const interval = setInterval(fetchLogs, 30000) // 30초마다 업데이트
    // return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter((log) => filterLevel === "all" || log.level === filterLevel)

  const getLevelIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return <AlertCircle className="size-4 text-destructive" />
      case "warn":
        return <AlertTriangle className="size-4 text-amber-500" />
      case "info":
        return <Info className="size-4 text-blue-500" />
      default:
        return <CheckCircle className="size-4 text-muted-foreground" />
    }
  }

  const getLevelBadge = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return <Badge variant="destructive">에러</Badge>
      case "warn":
        return <Badge variant="outline" className="border-amber-500 text-amber-700">경고</Badge>
      case "info":
        return <Badge variant="outline" className="border-blue-500 text-blue-700">정보</Badge>
      default:
        return <Badge variant="outline">알 수 없음</Badge>
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          로그를 불러오는 중...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">시스템 로그 모니터링</CardTitle>
            <CardDescription>플랫폼의 주요 이벤트와 에러 로그를 확인할 수 있습니다.</CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterLevel("all")}
              className={`px-3 py-1 rounded-md text-sm ${
                filterLevel === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterLevel("error")}
              className={`px-3 py-1 rounded-md text-sm ${
                filterLevel === "error"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              에러
            </button>
            <button
              onClick={() => setFilterLevel("warn")}
              className={`px-3 py-1 rounded-md text-sm ${
                filterLevel === "warn"
                  ? "bg-amber-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              경고
            </button>
            <button
              onClick={() => setFilterLevel("info")}
              className={`px-3 py-1 rounded-md text-sm ${
                filterLevel === "info"
                  ? "bg-blue-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              정보
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {filterLevel === "all" ? "로그가 없습니다." : `${filterLevel} 레벨의 로그가 없습니다.`}
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">{getLevelIcon(log.level)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getLevelBadge(log.level)}
                    <Badge variant="outline" className="text-xs">
                      {log.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                  {log.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        상세 정보
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

