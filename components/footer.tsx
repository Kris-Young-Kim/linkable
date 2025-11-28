"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"

const languageOptions = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
]

export function Footer() {
  const { t, language, setLanguage } = useLanguage()

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="mb-12 rounded-lg border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-foreground">{t("footer.disclaimer.title")}</h3>
              <p className="text-sm leading-relaxed text-foreground max-w-4xl">{t("footer.disclaimer.content")}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary/90 transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-md w-fit"
            >
              <svg
                className="h-8 w-8"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.1" />
                <path
                  d="M12 11C12 9.34315 13.3431 8 15 8H17C18.6569 8 20 9.34315 20 11V13M20 21C20 22.6569 18.6569 24 17 24H15C13.3431 24 12 22.6569 12 21V19"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="16" r="2" fill="currentColor" />
              </svg>
              <span>LinkAble</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{t("footer.description")}</p>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">{t("footer.product")}</h3>
            <nav className="flex flex-col gap-3">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("header.features")}
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("header.howItWorks")}
              </Link>
              <Link
                href="#consultation"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("header.startConsultation")}
              </Link>
            </nav>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">{t("footer.company")}</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.aboutUs")}
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.privacyPolicy")}
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.termsOfService")}
              </Link>
            </nav>
          </div>

          {/* Standards */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">{t("footer.standards")}</h3>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t("footer.icfFramework")}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t("footer.isoCompliant")}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t("footer.kippaValidated")}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t("footer.wcagCompliant")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("footer.quickLinksTitle")}</p>
            <p className="text-base text-foreground/80 mt-1">{t("footer.quickLinksSubtitle")}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/chat">{t("footer.quickStartConsult")}</Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/recommendations">{t("footer.quickViewRecommendations")}</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full sm:w-auto border border-border">
              <Link href="mailto:expert@linkable.ai">{t("footer.quickContactExpert")}</Link>
            </Button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="w-full sm:w-auto">
          <p>{t("footer.copyright")}</p>
          </div>
          <div className="flex gap-6 w-full sm:w-auto justify-center sm:justify-end">
            <Link href="#" className="hover:text-foreground transition-colors" aria-label={t("footer.socialLinkedIn")}>
              {t("footer.socialLinkedIn")}
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors" aria-label={t("footer.socialTwitter")}>
              {t("footer.socialTwitter")}
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors" aria-label={t("footer.socialContact")}>
              {t("footer.socialContact")}
            </Link>
          </div>
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
        </div>
      </div>
    </footer>
  )
}
