"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 로깅
    console.error("[Error Boundary] Error:", error)
    console.error("[Error Boundary] Error message:", error.message)
    console.error("[Error Boundary] Error stack:", error.stack)
    console.error("[Error Boundary] Error digest:", error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">문제가 발생했습니다</h1>
          <p className="text-muted-foreground">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-left">
              <p className="text-sm font-semibold text-destructive mb-2">개발 모드 에러 정보:</p>
              <p className="text-xs font-mono text-foreground break-words">{error.message}</p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">스택 트레이스 보기</summary>
                  <pre className="mt-2 text-xs text-foreground overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="default" size="lg" className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            다시 시도
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              홈으로 이동
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

