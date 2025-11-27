"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type SideNavItem = {
  label: string
  href: string
  icon?: React.ReactNode
  roles?: Array<"admin" | "expert" | "user">
  badge?: string
}

export function SideNav({
  items,
  className,
  currentRole,
}: {
  items: SideNavItem[]
  className?: string
  currentRole?: "admin" | "expert" | "user"
}) {
  const pathname = usePathname()

  const visibleItems = items.filter((item) => !item.roles || item.roles.includes(currentRole ?? "user"))

  return (
    <nav className={cn("flex flex-col gap-2", className)} aria-label="Sidebar navigation">
      {visibleItems.map((item) => {
        const [basePath] = item.href.split("#")
        const isActive = pathname.startsWith(basePath)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition",
              isActive
                ? "border-primary bg-primary/5 text-primary-foreground"
                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
            {item.badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}


