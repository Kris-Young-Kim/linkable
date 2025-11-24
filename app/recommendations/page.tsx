import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { Button } from "@/components/ui/button"

type SearchParams = {
  icf?: string
  consultationId?: string
  limit?: string
}

type ProductResponse = {
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

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

const fetchRecommendations = async (params: SearchParams) => {
  const search = new URLSearchParams()
  if (params.icf) search.set("icf", params.icf)
  if (params.consultationId) search.set("consultationId", params.consultationId)
  if (params.limit) search.set("limit", params.limit)

  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/api/products?${search.toString()}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return (await response.json()) as { products: ProductResponse[] }
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = await searchParams
  const normalizedParams: SearchParams = {
    icf: typeof resolvedParams.icf === "string" ? resolvedParams.icf : undefined,
    consultationId:
      typeof resolvedParams.consultationId === "string" ? resolvedParams.consultationId : undefined,
    limit: typeof resolvedParams.limit === "string" ? resolvedParams.limit : undefined,
  }

  let products: ProductResponse[] = []
  let errorMessage: string | null = null

  try {
    const data = await fetchRecommendations(normalizedParams)
    products = data.products
  } catch (error) {
    console.error("[recommendations] fetch_error", error)
    errorMessage = "추천 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Go back to chat"
            >
              <ArrowLeft className="size-6" />
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">LinkAble • Personalized Recommendations</p>
              <h1 className="text-2xl font-bold text-foreground">Your Recommendations</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground text-balance">Solutions Matched to Your Needs</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Recent assessments and ICF insights power the following assistive technology suggestions.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
              <p className="text-lg font-medium text-foreground">아직 추천 데이터가 없습니다.</p>
              <p className="text-sm text-muted-foreground mt-2">
                상담을 완료하면 맞춤형 보조기기 추천이 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {products.map((product) => (
                <ProductRecommendationCard
                  key={product.id}
                  productName={product.name}
                  functionalSupport={product.category ?? "Assistive Solution"}
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
              <Link href="/chat">Return to Coordinator Chat</Link>
            </Button>
            <Button size="lg" className="min-h-[44px] px-8" asChild>
              <Link href="/dashboard">View Effectiveness Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
