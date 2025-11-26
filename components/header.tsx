"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { NotificationsBell } from "@/components/notifications-bell"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs"

export function Header() {
  const { t } = useLanguage()
  const { isSignedIn } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary/90 transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-md"
          aria-label={t("header.homeAria")}
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

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8" role="navigation" aria-label={t("header.navAria")}>
          <Link
            href="#features"
            className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm px-2 py-1"
          >
            {t("header.features")}
          </Link>
          <Link
            href="#how-it-works"
            className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm px-2 py-1"
          >
            {t("header.howItWorks")}
          </Link>
          <Link
            href="#about"
            className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm px-2 py-1"
          >
            {t("header.about")}
          </Link>
          {isSignedIn && (
            <Link
              href="/dashboard"
              className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm px-2 py-1"
            >
              대시보드
            </Link>
          )}
        </nav>

        {/* Language Selector, Auth Actions */}
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <SignedIn>
            <NotificationsBell />
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] min-w-[44px] px-5 font-semibold text-base"
              asChild
            >
              <Link href="/chat">{t("header.continueConsultation")}</Link>
            </Button>
            <UserButton appearance={{ elements: { userButtonBox: "ml-2" } }} afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="lg"
                className="min-h-[44px] min-w-[44px] px-5 font-semibold text-base"
              >
                {t("header.signIn")}
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] min-w-[44px] px-5 font-semibold text-base shadow-sm"
              >
                {t("header.signUp")}
              </Button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>
    </header>
  )
}
