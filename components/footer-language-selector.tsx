"use client"

import { useLanguage } from "@/components/language-provider"
import type { Language } from "@/lib/translations"

const languageOptions = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
]

export function FooterLanguageSelector() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="w-full sm:hidden">
      <label htmlFor="footer-language" className="text-xs font-semibold text-muted-foreground">
        {t("footer.languageLabel")}
      </label>
      <div className="mt-1">
        <select
          id="footer-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as typeof language)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={t("footer.languageLabel")}
        >
          {languageOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

