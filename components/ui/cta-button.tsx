"use client"

import { forwardRef, type ReactNode } from "react"
import Link from "next/link"
import { Button, type ButtonProps } from "@/components/ui/button"
import { ArrowRight, ShoppingBag, MessageSquare, LayoutDashboard, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export type CTAVariant = "chat" | "recommendations" | "dashboard" | "custom"

interface CTAButtonProps extends Omit<ButtonProps, "asChild" | "children"> {
  variant?: CTAVariant
  href: string
  children?: ReactNode
  icon?: ReactNode
  showArrow?: boolean
  loading?: boolean
  disabled?: boolean
}

const variantConfig: Record<
  CTAVariant,
  {
    icon: ReactNode
    defaultText: string
    defaultClassName?: string
  }
> = {
  chat: {
    icon: <MessageSquare className="mr-2 h-5 w-5" aria-hidden="true" />,
    defaultText: "상담 시작",
    defaultClassName: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
  },
  recommendations: {
    icon: <ShoppingBag className="mr-2 h-5 w-5" aria-hidden="true" />,
    defaultText: "추천 보기",
    defaultClassName: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
  },
  dashboard: {
    icon: <LayoutDashboard className="mr-2 h-5 w-5" aria-hidden="true" />,
    defaultText: "대시보드",
    defaultClassName: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
  },
  custom: {
    icon: <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />,
    defaultText: "시작하기",
    defaultClassName: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
  },
}

/**
 * 통일된 CTA 버튼 컴포넌트
 * 
 * 채팅, 추천, 대시보드 등 주요 액션에 일관된 스타일과 접근성을 제공합니다.
 * 
 * @example
 * ```tsx
 * <CTAButton variant="chat" href="/chat" size="lg">
 *   상담 시작하기
 * </CTAButton>
 * ```
 */
export const CTAButton = forwardRef<HTMLButtonElement, CTAButtonProps>(
  (
    {
      variant = "custom",
      href,
      children,
      icon,
      showArrow = true,
      loading = false,
      disabled = false,
      className,
      size = "lg",
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant]
    const displayIcon = icon ?? config.icon
    const displayText = children ?? config.defaultText

    return (
      <Button
        ref={ref}
        size={size}
        className={cn(
          "min-h-[44px] px-8 text-base font-semibold transition-all",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          config.defaultClassName,
          loading && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        asChild
        {...props}
      >
        <Link href={href} aria-disabled={disabled || loading}>
          {loading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              처리 중...
            </>
          ) : (
            <>
              {displayIcon}
              {displayText}
              {showArrow && <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />}
            </>
          )}
        </Link>
      </Button>
    )
  }
)

CTAButton.displayName = "CTAButton"

/**
 * 보조 CTA 버튼 (outline 스타일)
 */
export const CTAButtonSecondary = forwardRef<HTMLButtonElement, CTAButtonProps>(
  (
    {
      variant = "custom",
      href,
      children,
      icon,
      showArrow = false,
      loading = false,
      disabled = false,
      className,
      size = "lg",
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant]
    const displayIcon = icon ?? config.icon
    const displayText = children ?? config.defaultText

    return (
      <Button
        ref={ref}
        variant="outline"
        size={size}
        className={cn(
          "min-h-[44px] px-8 text-base font-semibold border-2 bg-transparent",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          loading && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        asChild
        {...props}
      >
        <Link href={href} aria-disabled={disabled || loading}>
          {loading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              처리 중...
            </>
          ) : (
            <>
              {displayIcon}
              {displayText}
              {showArrow && <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />}
            </>
          )}
        </Link>
      </Button>
    )
  }
)

CTAButtonSecondary.displayName = "CTAButtonSecondary"

