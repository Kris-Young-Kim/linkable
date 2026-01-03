import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle, Home, Search } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "404 - 페이지를 찾을 수 없습니다 | LinkAble",
  description: "요청하신 페이지를 찾을 수 없습니다.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">페이지를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default" size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              홈으로 이동
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/sitemap">
              <Search className="h-4 w-4" aria-hidden="true" />
              사이트맵 보기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
