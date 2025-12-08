import dynamic from "next/dynamic"

// GlobalNav는 클라이언트 컴포넌트이므로 동적 import로 분리
const GlobalNav = dynamic(
  () => import("@/components/navigation/global-nav").then((mod) => ({ default: mod.GlobalNav })),
  {
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-between h-16">
        <div className="h-8 w-32 bg-muted/50 animate-pulse rounded" />
        <div className="h-8 w-24 bg-muted/50 animate-pulse rounded" />
      </div>
    ),
  },
)

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6">
        <GlobalNav />
      </div>
    </header>
  )
}
