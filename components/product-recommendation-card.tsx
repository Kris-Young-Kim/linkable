"use client"

import { useCallback, useState, type ReactNode } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ShoppingCart, Package, HelpCircle, MessageCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { trackEvent } from "@/lib/analytics"

type ClickSource = "primary" | "secondary" | "support" | "expert"

interface ProductRecommendationCardProps {
  productName: string
  functionalSupport: string
  description: string
  imageUrl?: string
  matchReason?: string
  matchScore?: number
  isoCode?: string
  isoLabel?: string | null
  matchedIcf?: Array<{ code: string; description: string }>
  price?: number | string | null
  purchaseLink?: string | null
  recommendationId?: string | null
  adminActions?: ReactNode
}

export function ProductRecommendationCard({
  productName,
  functionalSupport,
  description,
  imageUrl,
  matchReason,
  matchScore,
  isoCode,
  isoLabel,
  matchedIcf,
  price,
  purchaseLink,
  recommendationId,
  adminActions,
}: ProductRecommendationCardProps) {
  const { t } = useLanguage()
  const matchPercentage = matchScore ? `${Math.round(matchScore * 100)}%` : null
  const priceDisplay =
    price === null || price === undefined
      ? t("recommendations.noPrice")
      : typeof price === "number"
        ? new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(
            price,
          )
        : price

  const [pendingSource, setPendingSource] = useState<ClickSource | null>(null)

  const handleClick = useCallback(
    async (source: ClickSource) => {
      // 지원제도 또는 전문가 문의는 purchaseLink가 없어도 가능
      if (source === "support" || source === "expert") {
        setPendingSource(source)

        try {
          // 클릭 이벤트 로깅
          if (recommendationId) {
            await fetch(`/api/recommendations/${recommendationId}/click`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ source }),
            })
          }

          // GA4 이벤트 추적
          trackEvent("product_action_clicked", {
            product_name: productName,
            recommendation_id: recommendationId || undefined,
            source: source,
          })

          // 지원제도: 복지용구 지원제도 정보 페이지로 이동
          if (source === "support") {
            // 전환 이벤트 로깅 (API 호출)
            if (recommendationId) {
              try {
                await fetch(`/api/recommendations/${recommendationId}/action`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "support_program_click" }),
                })
              } catch (error) {
                console.error("[recommendations] support_action_track_error", error)
              }
            }

            // GA4 이벤트 추적
            trackEvent("support_program_clicked", {
              product_name: productName,
              recommendation_id: recommendationId,
            })

            // 환경 변수에서 지원제도 링크 가져오기 또는 기본 링크 사용
            const supportLink =
              process.env.NEXT_PUBLIC_SUPPORT_PROGRAM_URL ||
              "https://www.bokjiro.go.kr/ssis-tbu/TWAT52005M/twataa/wlfareInfo/moveTWAT52005M.do?wlfareInfoId=WLF00000000001"
            window.open(supportLink, "_blank", "noopener,noreferrer")
          }

          // 전문가 문의: 이메일 또는 문의 페이지로 이동
          if (source === "expert") {
            // 전환 이벤트 로깅 (API 호출)
            if (recommendationId) {
              try {
                await fetch(`/api/recommendations/${recommendationId}/action`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "expert_inquiry_click" }),
                })
              } catch (error) {
                console.error("[recommendations] expert_action_track_error", error)
              }
            }

            // GA4 이벤트 추적
            trackEvent("expert_inquiry_clicked", {
              product_name: productName,
              recommendation_id: recommendationId,
            })

            const expertEmail = process.env.NEXT_PUBLIC_EXPERT_EMAIL || "expert@linkable.ai"
            window.location.href = `mailto:${expertEmail}?subject=${encodeURIComponent(`[LinkAble 전문가 문의] ${productName} 관련 상담 요청`)}&body=${encodeURIComponent(`안녕하세요.\n\n${productName}에 대해 전문가 상담을 받고 싶습니다.\n\n추천 ID: ${recommendationId || "없음"}\nISO 코드: ${isoCode || "없음"}\n\n문의 내용:\n`)}`
          }
        } catch (error) {
          console.error("[recommendations] action_track_error", error)
        } finally {
          setPendingSource(null)
        }
        return
      }

      // 기존 구매 링크 로직
      if (!purchaseLink) {
        return
      }

      const openLink = () => {
        window.open(purchaseLink, "_blank", "noopener,noreferrer")
      }

      if (!recommendationId) {
        openLink()
        return
      }

      setPendingSource(source)

      try {
        await fetch(`/api/recommendations/${recommendationId}/click`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        })

        // GA4 이벤트 추적
        trackEvent("product_clicked", {
          product_name: productName,
          recommendation_id: recommendationId,
          source: source,
        })
      } catch (error) {
        console.error("[recommendations] click_track_error", error)
      } finally {
        setPendingSource(null)
        openLink()
      }
    },
    [purchaseLink, recommendationId, productName, isoCode],
  )

  const isPrimaryPending = pendingSource === "primary"
  const isSecondaryPending = pendingSource === "secondary"
  const isSupportPending = pendingSource === "support"
  const isExpertPending = pendingSource === "expert"
  const isButtonDisabled = !purchaseLink

  return (
    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-foreground">{productName}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {isoLabel || functionalSupport}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isoCode && (
              <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border border-primary/20">
                ISO {isoCode}
              </Badge>
            )}
            {adminActions}
          </div>
        </div>
      </CardHeader>

      {imageUrl ? (
        <div className="px-6 relative h-48 w-full">
          <Image
            src={imageUrl}
            alt={productName}
            fill
            className="object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="px-6 h-48 w-full flex items-center justify-center bg-muted rounded-lg">
          <Package className="size-12 text-muted-foreground/50" aria-hidden="true" />
        </div>
      )}

      <CardContent className="pt-6 space-y-4">
        {matchPercentage && (
          <Badge variant="outline" className="text-sm">
            {t("recommendations.matchScore")} {matchPercentage}
          </Badge>
        )}
        <p className="text-base text-muted-foreground leading-relaxed">{description}</p>

        {matchedIcf?.length ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">연관 ICF 코드</p>
            <div className="flex flex-wrap gap-2">
              {matchedIcf.map((item) => (
                <Badge key={item.code} variant="outline" className="text-xs">
                  {item.code} · {item.description}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {matchReason && <p className="text-sm text-foreground/80 leading-relaxed">{matchReason}</p>}

        <p className="text-sm font-medium text-foreground">
          {t("recommendations.priceLabel")}: {priceDisplay}
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {/* 주요 액션 버튼 (구매 관련) */}
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 min-h-[44px]"
            size="lg"
            type="button"
            onClick={() => handleClick("primary")}
            disabled={isButtonDisabled || isPrimaryPending}
            aria-disabled={isButtonDisabled}
            aria-label={
              purchaseLink
                ? `${productName} 상품 정보 보기 (외부 링크)`
                : `${productName} 상품 정보 (링크 없음)`
            }
          >
            <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />
            {purchaseLink ? t("recommendations.learnMore") : t("recommendations.noLink")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-[44px] bg-transparent"
            size="lg"
            type="button"
            onClick={() => handleClick("secondary")}
            disabled={isButtonDisabled || isSecondaryPending}
            aria-disabled={isButtonDisabled}
            aria-label={
              purchaseLink
                ? `${productName} 구매하기 (외부 링크)`
                : `${productName} 구매하기 (링크 없음)`
            }
          >
            <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
            {purchaseLink ? t("recommendations.buyNow") : t("recommendations.noLink")}
          </Button>
        </div>

        {/* 추가 액션 버튼 (지원제도/전문가 문의) */}
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            size="lg"
            type="button"
            onClick={() => handleClick("support")}
            disabled={isSupportPending}
            aria-label={`${productName} 지원제도 정보 보기`}
          >
            <HelpCircle className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("recommendations.supportProgram") || "지원제도"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            size="lg"
            type="button"
            onClick={() => handleClick("expert")}
            disabled={isExpertPending}
            aria-label={`${productName} 전문가 문의하기`}
          >
            <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("recommendations.expertInquiry") || "전문가 문의"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
