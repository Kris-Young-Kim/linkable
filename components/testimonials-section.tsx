"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Star, Quote, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/language-provider"

interface Testimonial {
  id: string
  problem: string
  comment: string
  effectivenessScore: number
  productName: string
  productImage: string | null
  evaluatedAt: string
  author: string
}

interface TestimonialsResponse {
  testimonials: Testimonial[]
  count: number
}

export function TestimonialsSection() {
  const { t } = useLanguage()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const response = await fetch("/api/public/testimonials?limit=6&minScore=5")
        if (!response.ok) {
          console.error("[Testimonials] Failed to fetch:", response.statusText)
          return
        }

        const data: TestimonialsResponse = await response.json()
        setTestimonials(data.testimonials || [])
      } catch (error) {
        console.error("[Testimonials] Fetch error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  if (loading) {
    return (
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="h-12 bg-muted/50 animate-pulse rounded-lg max-w-2xl mx-auto mb-16" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) {
    return null // 데이터가 없으면 섹션을 표시하지 않음
  }

  return (
    <section className="py-20 md:py-32 bg-background" id="testimonials">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            실제 사용자 경험
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            K-IPPA 평가를 통해 검증된 실제 사용자들의 경험을 확인해보세요
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="border-none bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <CardContent className="p-6 space-y-4">
                {/* 인용 부호 아이콘 */}
                <div className="flex items-start justify-between">
                  <Quote className="size-8 text-primary/20" />
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="size-4 fill-current" />
                    <span className="text-sm font-bold">
                      {testimonial.effectivenessScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* 문제 설명 */}
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">
                    {testimonial.problem}
                  </p>
                </div>

                {/* 후기 내용 */}
                <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                  {testimonial.comment}
                </p>

                {/* 제품 정보 */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  {testimonial.productImage ? (
                    <div className="relative size-12 rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={testimonial.productImage}
                        alt={testimonial.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="size-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {testimonial.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.author}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 통계 정보 */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            {testimonials.length}개의 검증된 사용자 경험이 공유되었습니다
          </p>
        </div>
      </div>
    </section>
  )
}
