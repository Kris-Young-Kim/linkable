"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Puzzle, HandHeart, Smile } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function FeaturesSection() {
  const { t } = useLanguage()

  const features = [
    {
      icon: Puzzle,
      titleKey: "features.aiAnalysis.title",
      descriptionKey: "features.aiAnalysis.description",
      color: "text-primary",
    },
    {
      icon: HandHeart,
      titleKey: "features.personalSupport.title",
      descriptionKey: "features.personalSupport.description",
      color: "text-accent",
    },
    {
      icon: Smile,
      titleKey: "features.provenResults.title",
      descriptionKey: "features.provenResults.description",
      color: "text-primary",
    },
  ]

  return (
    <section id="features" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-4 text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance">
            {t("features.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="flex flex-col gap-6 p-8">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
                    <Icon className={`h-8 w-8 ${feature.color}`} aria-hidden="true" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl font-bold text-foreground">{t(feature.titleKey)}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{t(feature.descriptionKey)}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
