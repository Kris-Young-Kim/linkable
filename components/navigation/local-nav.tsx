"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export type LocalNavItem = {
  label: string
  href: string
  badge?: string
  isExternal?: boolean
}

const tabVariants = cva(
  "rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground shadow-sm",
        false: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
)

type LocalNavProps = VariantProps<typeof tabVariants> & {
  items: LocalNavItem[]
  className?: string
  label?: string
}

export function LocalNav({ items, className, label = "Local navigation" }: LocalNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`

  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-3", className)}>
      {items.map((item) => {
        const isActive = current.startsWith(item.href)
        if (item.isExternal) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={tabVariants({ active: isActive })}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-2 rounded-full bg-primary/20 px-2 text-xs font-semibold text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </a>
          )
        }

        return (
          <Link key={item.href} href={item.href} className={tabVariants({ active: isActive })} aria-current={isActive ? "page" : undefined}>
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-2 rounded-full bg-primary/20 px-2 text-xs font-semibold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}


