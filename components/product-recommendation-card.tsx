"use client"

import { useCallback, useState, type ReactNode } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ShoppingCart, Package } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { trackEvent } from "@/lib/analytics"

type ClickSource = "primary" | "secondary"

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
    [purchaseLink, recommendationId],
  )

  const isPrimaryPending = pendingSource === "primary"
  const isSecondaryPending = pendingSource === "secondary"
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

      <CardFooter className="flex gap-3">
        <Button
          className="flex-1 min-h-[44px]"
          size="lg"
          type="button"
          onClick={() => handleClick("primary")}
          disabled={isButtonDisabled || isPrimaryPending}
          aria-disabled={isButtonDisabled}
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
        >
          <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
          {purchaseLink ? t("recommendations.buyNow") : t("recommendations.noLink")}
        </Button>
      </CardFooter>
    </Card>
  )
}
