"use client"

import { Card } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function HowItWorksSection() {
  const { t } = useLanguage()

  const steps = [
    {
      number: "01",
      titleKey: "howItWorks.step1.title",
      descriptionKey: "howItWorks.step1.description",
    },
    {
      number: "02",
      titleKey: "howItWorks.step2.title",
      descriptionKey: "howItWorks.step2.description",
    },
    {
      number: "03",
      titleKey: "howItWorks.step3.title",
      descriptionKey: "howItWorks.step3.description",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-4 text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col gap-4">
              {/* Step Number */}
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block flex-1 h-0.5 bg-border" aria-hidden="true" />
                )}
              </div>

              {/* Content Card */}
              <Card className="flex-1 border-2">
                <div className="p-6 flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-foreground flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{t(step.descriptionKey)}</p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
