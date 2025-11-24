import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ShoppingCart } from "lucide-react"

interface ProductRecommendationCardProps {
  productName: string
  functionalSupport: string
  description: string
  imageUrl?: string
  isoVerified?: boolean
  priceRange?: string
}

export function ProductRecommendationCard({
  productName,
  functionalSupport,
  description,
  imageUrl,
  isoVerified = false,
  priceRange,
}: ProductRecommendationCardProps) {
  return (
    <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 mb-2">
          <CardTitle className="text-xl font-bold text-foreground">Recommended Solution</CardTitle>
          {isoVerified && (
            <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border border-primary/20">
              ISO Standard Verified
            </Badge>
          )}
        </div>
        <CardDescription className="text-base">
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <span className="inline-block size-2 rounded-full bg-accent" aria-hidden="true"></span>
            {functionalSupport}
          </span>
        </CardDescription>
      </CardHeader>

      {imageUrl && (
        <div className="px-6">
          <img src={imageUrl || "/placeholder.svg"} alt={productName} className="w-full h-48 object-cover rounded-lg" />
        </div>
      )}

      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">{productName}</h3>
        <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
        {priceRange && <p className="mt-4 text-sm font-medium text-foreground">Price Range: {priceRange}</p>}
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button className="flex-1 min-h-[44px]" size="lg">
          <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />
          View Product Details
        </Button>
        <Button variant="outline" className="flex-1 min-h-[44px] bg-transparent" size="lg">
          <ShoppingCart className="mr-2 h-5 w-5" aria-hidden="true" />
          Check Lowest Price
        </Button>
      </CardFooter>
    </Card>
  )
}
