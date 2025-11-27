import { GlobalNav } from "@/components/navigation/global-nav"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6">
        <GlobalNav />
      </div>
    </header>
  )
}
