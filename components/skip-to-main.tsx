"use client"

import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

/**
 * Skip to main content 링크
 * 
 * 키보드 사용자가 반복되는 네비게이션을 건너뛰고 메인 콘텐츠로 바로 이동할 수 있도록 합니다.
 * WCAG 2.1 Level A 요구사항을 충족합니다.
 */
export function SkipToMain() {
  const { t } = useLanguage()

  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={t("accessibility.skipToMain") || "메인 콘텐츠로 건너뛰기"}
    >
      {t("accessibility.skipToMain") || "메인 콘텐츠로 건너뛰기"}
    </Link>
  )
}

