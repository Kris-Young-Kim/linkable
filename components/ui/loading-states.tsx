"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 공통 로딩 스피너 컴포넌트
 */
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} aria-hidden="true" />
      {text && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {text}
        </p>
      )}
    </div>
  )
}

/**
 * 인라인 로딩 스피너 (버튼 내부 등)
 */
interface InlineSpinnerProps {
  size?: "sm" | "md"
  className?: string
}

export function InlineSpinner({ size = "sm", className }: InlineSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
  }

  return (
    <Loader2
      className={cn("animate-spin text-current", sizeClasses[size], className)}
      aria-hidden="true"
    />
  )
}

/**
 * 카드 스켈레톤 로더
 */
interface CardSkeletonProps {
  count?: number
  className?: string
}

export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * 리스트 스켈레톤 로더
 */
interface ListSkeletonProps {
  count?: number
  className?: string
}

export function ListSkeleton({ count = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 페이지 로딩 오버레이
 */
interface PageLoadingOverlayProps {
  message?: string
  className?: string
}

export function PageLoadingOverlay({ message, className }: PageLoadingOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || "로딩 중"}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="text-sm font-medium text-foreground">{message}</p>
        )}
      </div>
    </div>
  )
}

/**
 * 버튼 로딩 상태 래퍼
 */
interface ButtonLoadingProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
}

export function ButtonLoading({ isLoading, children, loadingText }: ButtonLoadingProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className="flex items-center gap-2">
      <InlineSpinner size="sm" />
      {loadingText && <span>{loadingText}</span>}
    </div>
  )
}

