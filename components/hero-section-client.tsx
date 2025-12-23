"use client"

import { HeroSection } from "@/components/hero-section"
import { useLanguage } from "@/components/language-provider"

export function HeroSectionClient() {
  const { language } = useLanguage()
  return <HeroSection language={language} />
}

