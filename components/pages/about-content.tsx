"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AboutContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6 gap-2 px-0 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t("about.back")}
          </Link>
        </Button>

        <Card className="border border-primary/20 shadow-xl bg-card/95">
          <CardHeader>
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">{t("about.badge")}</p>
            <CardTitle className="text-3xl font-bold text-foreground mt-2">{t("about.title")}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">{t("about.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="text-lg leading-relaxed text-foreground/90 space-y-4">
            <p>{t("about.description")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


