"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import type { Language } from "@/lib/translations"

const languages: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
]

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="lg" className="min-h-[44px] min-w-[44px] gap-2" aria-label={t("language.select")}>
          <Languages className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline-block">
            {languages.find((lang) => lang.code === language)?.nativeLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer ${language === lang.code ? "bg-accent" : ""}`}
          >
            <span className="font-medium">{lang.nativeLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
