"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Menu, Sparkles } from "lucide-react"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs"

import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { AdminLink } from "@/components/admin-link"
import { NotificationsBell } from "@/components/notifications-bell"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type NavLink = {
  label: string
  href: string
  requiresAuth?: boolean
}

export function GlobalNav() {
  const { t } = useLanguage()
  const { isSignedIn } = useAuth()

  const navLinks: NavLink[] = useMemo(
    () => [
      { label: t("header.features"), href: "#features" },
      { label: t("header.howItWorks"), href: "#how-it-works" },
      { label: t("header.about"), href: "/about" },
    ],
    [t],
  )

  const visibleLinks = navLinks.filter((link) => (link.requiresAuth ? isSignedIn : true))

  const renderNavLinks = (onNavigate?: () => void) =>
    visibleLinks.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm px-2 py-1"
        aria-current={typeof window !== "undefined" && window.location.pathname === link.href ? "page" : undefined}
      >
        {link.label}
      </Link>
    ))

  const actionButtons = (
    <>
      <LanguageSelector />
      <SignedIn>
        <div className="flex items-center gap-2">
          <AdminLink />
          <NotificationsBell />
          <Button variant="outline" size="lg" className="min-h-[44px] min-w-[44px] px-5 font-semibold text-base" asChild>
            <Link href="/dashboard">
              상담 내역
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="min-h-[44px] min-w-[44px] px-5 font-semibold text-base" asChild>
            <Link href="/chat">
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              {t("header.continueConsultation")}
            </Link>
          </Button>
          <UserButton appearance={{ elements: { userButtonBox: "ml-2" } }} afterSignOutUrl="/" />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="outline" size="lg" className="min-h-[44px] min-w-[44px] px-5 font-semibold text-base">
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
    </>
  )

  return (
    <div className="flex h-16 items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary/90 transition-colors focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-md"
        aria-label={t("header.homeAria")}
      >
        <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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

      <nav className="hidden items-center gap-6 md:flex" role="navigation" aria-label={t("header.navAria")}>
        {renderNavLinks()}
      </nav>

      <div className="hidden items-center gap-2 md:flex">{actionButtons}</div>

      {/* Mobile */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>LinkAble</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-4">
              {renderNavLinks(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())}
              <div className="border-t border-border/60 pt-4 space-y-4">
                <LanguageSelector />
                <SignedIn>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard">상담 내역</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/chat">{t("header.continueConsultation")}</Link>
                  </Button>
                  <div className="flex items-center justify-between">
                    <AdminLink />
                    <NotificationsBell />
                    <UserButton appearance={{ elements: { userButtonBox: "ml-2" } }} afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline" className="w-full">
                      {t("header.signIn")}
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">{t("header.signUp")}</Button>
                  </SignUpButton>
                </SignedOut>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}


