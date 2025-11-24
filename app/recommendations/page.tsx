import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-foreground">Your Recommendations</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground text-balance">Solutions Matched to Your Needs</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Based on your lifestyle analysis, here are personalized assistive technology recommendations
            </p>
          </div>

          <div className="space-y-6">
            <ProductRecommendationCard
              productName="SmartStep Walking Cane with LED Lighting"
              functionalSupport="Supports Walking & Balance"
              description="Lightweight adjustable cane with built-in LED lighting for safe navigation in low-light conditions. Features ergonomic grip and shock-absorbing tip for comfortable daily use."
              imageUrl="/modern-walking-cane-with-led-light.jpg"
              isoVerified={true}
              priceRange="$45 - $65"
            />

            <ProductRecommendationCard
              productName="ComfortGrip Jar Opener Set"
              functionalSupport="Supports Hand Strength & Grip"
              description="Multi-size jar opener set designed for reduced hand strength. Non-slip rubber grips make opening containers effortless and safe for daily kitchen activities."
              imageUrl="/ergonomic-jar-opener-with-rubber-grip.jpg"
              isoVerified={true}
              priceRange="$15 - $25"
            />

            <ProductRecommendationCard
              productName="EasyReach Grabber Tool"
              functionalSupport="Supports Reaching & Bending"
              description="Extended reach tool with rotating grip head for picking up items without bending or stretching. Lightweight aluminum construction with rubberized jaw for secure grip."
              imageUrl="/reaching-grabber-tool-ergonomic.jpg"
              isoVerified={false}
              priceRange="$20 - $35"
            />
          </div>

          <div className="flex justify-center pt-8">
            <Button size="lg" variant="outline" className="min-h-[44px] px-8 bg-transparent" asChild>
              <Link href="/chat">Return to Coordinator Chat</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
