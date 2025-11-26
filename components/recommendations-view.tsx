"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

export type RecommendationProduct = {
  id: string
  name: string
  iso_code: string
  description: string
  image_url?: string | null
  purchase_link?: string | null
  category?: string | null
  price?: number | string | null
  match_reason?: string
  match_score?: number
  match_label?: string | null
  matched_icf?: Array<{ code: string; description: string }>
  recommendation_id?: string | null
}

type RecommendationsViewProps = {
  products: RecommendationProduct[]
  errorMessage?: string | null
}

export function RecommendationsView({ products, errorMessage }: RecommendationsViewProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()

  // 추천 목록 조회 이벤트 추적
  useEffect(() => {
    if (products.length > 0) {
      const consultationId = searchParams.get("consultationId")
      trackEvent("recommendations_viewed", {
        count: products.length,
        ...(consultationId && { consultation_id: consultationId }),
      })
    }
  }, [products.length, searchParams])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={t("chat.backToHome")}
            >
              <ArrowLeft className="size-6" />
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">{t("recommendations.tagline")}</p>
              <h1 className="text-2xl font-bold text-foreground">{t("recommendations.title")}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground text-balance">{t("recommendations.subtitle")}</h2>
            <p className="text-lg text-muted-foreground text-pretty">{t("recommendations.description")}</p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
              <p className="text-lg font-medium text-foreground">{t("recommendations.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground mt-2">{t("recommendations.emptyDescription")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {products.map((product) => (
                <ProductRecommendationCard
                  key={product.id}
                  productName={product.name}
                  functionalSupport={product.category ?? t("recommendations.defaultCategory")}
                  description={product.description}
                  imageUrl={product.image_url ?? undefined}
                  isoCode={product.iso_code}
                  isoLabel={product.match_label}
                  matchScore={product.match_score}
                  matchReason={product.match_reason}
                  matchedIcf={product.matched_icf}
                  price={product.price}
                  purchaseLink={product.purchase_link}
                  recommendationId={product.recommendation_id}
                />
              ))}
            </div>
          )}

          <div className="flex justify-center pt-8 gap-4 flex-wrap">
            <Button size="lg" variant="outline" className="min-h-[44px] px-8 bg-transparent" asChild>
              <Link href="/chat">{t("recommendations.backToChat")}</Link>
            </Button>
            <Button size="lg" className="min-h-[44px] px-8" asChild>
              <Link href="/dashboard">{t("recommendations.viewDashboard")}</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

