"use client"

import { FeaturesSection } from "@/components/features-section"
import { useLanguage } from "@/components/language-provider"

export function FeaturesSectionClient() {
  const { language } = useLanguage()
  return <FeaturesSection language={language} />
}

