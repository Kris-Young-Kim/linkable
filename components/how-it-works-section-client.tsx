"use client"

import { HowItWorksSection } from "@/components/how-it-works-section"
import { useLanguage } from "@/components/language-provider"

export function HowItWorksSectionClient() {
  const { language } = useLanguage()
  return <HowItWorksSection language={language} />
}

