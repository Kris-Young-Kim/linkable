"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SECTION_KEYS = Array.from({ length: 10 }, (_, index) => index + 1)

export function TermsContent() {
  const { t } = useLanguage()

  const sections = SECTION_KEYS.map((num) => ({
    title: t(`terms.section${num}.title`),
    content: t(`terms.section${num}.content`),
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6 gap-2 px-0 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t("terms.back")}
          </Link>
        </Button>

        <Card className="border border-primary/20 shadow-xl bg-card/95">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground">{t("terms.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">{t("terms.effective")}</p>
          </CardHeader>
          <CardContent className="text-base leading-relaxed text-foreground/90 space-y-6">
            {sections.map((section) => (
              <section key={section.title} aria-labelledby={section.title}>
                <h2 className="text-xl font-semibold text-primary mb-2">{section.title}</h2>
                <p>{section.content}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


