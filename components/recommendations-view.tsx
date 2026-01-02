"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { CTAButton, CTAButtonSecondary } from "@/components/ui/cta-button"
import { trackEvent } from "@/lib/analytics"
import { PartnershipNotice } from "@/components/recommendations/partnership-notice"

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
  consultation_id?: string | null
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
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="group inline-flex size-11 items-center justify-center rounded-xl bg-background border border-border shadow-sm transition-all hover:bg-muted hover:scale-105 active:scale-95"
              aria-label={t("chat.backToHome")}
            >
              <ArrowLeft className="size-6 transition-transform group-hover:-translate-x-1" />
            </Link>
            <div className="flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{t("recommendations.tagline")}</p>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{t("recommendations.title")}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-fadeIn">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold mb-2">
              AI-Powered Analysis Finished
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground text-balance">
              {t("recommendations.subtitle")}
            </h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              {t("recommendations.description")}
            </p>
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
            <>
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
                    consultationId={product.consultation_id}
                  />
                ))}
              </div>

              {/* 제휴 마케팅 안내 */}
              <PartnershipNotice />
            </>
          )}

          <div className="flex justify-center pt-8 gap-4 flex-wrap">
            <CTAButtonSecondary variant="chat" href="/chat" size="lg">
              {t("recommendations.backToChat")}
            </CTAButtonSecondary>
            <CTAButton variant="dashboard" href="/dashboard" size="lg">
              {t("recommendations.viewDashboard")}
            </CTAButton>
          </div>
        </div>
      </main>
    </div>
  )
}

