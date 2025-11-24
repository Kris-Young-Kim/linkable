import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ShoppingCart } from "lucide-react"

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
}: ProductRecommendationCardProps) {
  const matchPercentage = matchScore ? `${Math.round(matchScore * 100)}%` : null
  const priceDisplay =
    price === null || price === undefined
      ? "—"
      : typeof price === "number"
        ? new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(
            price,
          )
        : price

  return (
    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 mb-2">
          <CardTitle className="text-xl font-bold text-foreground">{productName}</CardTitle>
          {isoCode && (
            <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border border-primary/20">
              ISO {isoCode}
            </Badge>
          )}
        </div>
        <CardDescription className="text-base text-muted-foreground">
          {isoLabel || functionalSupport}
        </CardDescription>
      </CardHeader>

      {imageUrl && (
        <div className="px-6">
          <img src={imageUrl || "/placeholder.svg"} alt={productName} className="w-full h-48 object-cover rounded-lg" />
        </div>
      )}

      <CardContent className="pt-6 space-y-4">
        {matchPercentage && (
          <Badge variant="outline" className="text-sm">
            Match Score {matchPercentage}
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

        <p className="text-sm font-medium text-foreground">예상 가격: {priceDisplay}</p>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button className="flex-1 min-h-[44px]" size="lg" asChild>
          <a href={purchaseLink || "#"} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />
            자세히 보기
          </a>
        </Button>
        <Button variant="outline" className="flex-1 min-h-[44px] bg-transparent" size="lg" asChild>
          <a href={purchaseLink || "#"} target="_blank" rel="noopener noreferrer">
            <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
            구매하러 가기
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
