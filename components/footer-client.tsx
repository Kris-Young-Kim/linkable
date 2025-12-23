"use client"

import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"

export function FooterClient() {
  const { language } = useLanguage()
  return <Footer language={language} />
}

