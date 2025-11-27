"use client"

import Link from "next/link"
import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"

type BreadcrumbItem = {
  href?: string
  label?: string
  translationKey?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
  currentLabel?: string
}

const segmentKeyMap: Record<string, string> = {
  dashboard: "breadcrumbs.dashboard",
  consultation: "breadcrumbs.consultations",
  consultations: "breadcrumbs.consultations",
  recommendations: "breadcrumbs.recommendations",
  ipp: "breadcrumbs.ippa",
}

export function Breadcrumbs({ items, className, currentLabel }: BreadcrumbsProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const derivedItems = useMemo(() => {
    if (items?.length) return items

    const pathWithoutQuery = pathname?.split("?")[0] ?? ""
    const segments = pathWithoutQuery.split("/").filter(Boolean)

    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")
      const isLast = index === segments.length - 1
      const translationKey = segmentKeyMap[segment]
      const derivedLabel = translationKey ? t(translationKey) : segment.replace(/-/g, " ")

      return {
        href: isLast ? undefined : href,
        label: isLast && currentLabel ? currentLabel : derivedLabel,
      }
    })
  }, [items, pathname, currentLabel, t])

  const trail = [
    { label: t("breadcrumbs.home"), href: "/" },
    ...derivedItems.map((item) => ({
      ...item,
      label: item.translationKey ? t(item.translationKey) : item.label,
    })),
  ].filter((item) => item.label)

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-muted-foreground", className)}
      data-testid="breadcrumbs"
    >
      <ol className="flex flex-wrap items-center gap-1" itemScope itemType="https://schema.org/BreadcrumbList">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1
          const label = item.label ?? ""
          const href = item.href

          return (
            <li
              key={`${label}-${index}`}
              className="inline-flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {href && !isLast ? (
                <Link
                  href={href}
                  className="rounded-md px-1 py-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  itemProp="item"
                >
                  <span itemProp="name">{label}</span>
                </Link>
              ) : (
                <span
                  className={cn("px-1 py-0.5", isLast ? "text-foreground font-medium" : "text-muted-foreground")}
                  aria-current={isLast ? "page" : undefined}
                  itemProp="name"
                >
                  {label}
                </span>
              )}
              <meta itemProp="position" content={`${index + 1}`} />
              {!isLast && <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}


