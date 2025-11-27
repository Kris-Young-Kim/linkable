"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PrivacyContent() {
  const { t } = useLanguage()

  const paragraphs = [t("privacy.paragraph1"), t("privacy.paragraph2"), t("privacy.paragraph3")]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6 gap-2 px-0 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t("privacy.back")}
          </Link>
        </Button>

        <Card className="border border-primary/20 shadow-xl bg-card/95">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground">{t("privacy.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">{t("privacy.effective")}</p>
          </CardHeader>
          <CardContent className="text-base leading-relaxed text-foreground/90 space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


