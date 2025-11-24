"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Language } from "@/lib/translations"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const SUPPORTED_LANGUAGES: Language[] = ["ko", "en", "ja"]

const resolveDefaultLanguage = (): Language => {
  const envLang = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE as Language | undefined
  if (envLang && SUPPORTED_LANGUAGES.includes(envLang)) {
    return envLang
  }
  return "ko"
}

const DEFAULT_LANGUAGE = resolveDefaultLanguage()

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    const savedLanguage = localStorage.getItem("linkable-language") as Language | null

    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      setLanguageState(savedLanguage)
      return
    }

    // Ensure default language is persisted for future visits
    localStorage.setItem("linkable-language", DEFAULT_LANGUAGE)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("linkable-language", lang)
  }

  const t = (key: string): string => {
    const { translations } = require("@/lib/translations")
    const keys = key.split(".")
    let value: any = translations[language]

    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
