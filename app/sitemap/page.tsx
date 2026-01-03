import type { Metadata } from "next"
import Link from "next/link"
import { getSitemapPages } from "@/lib/seo/sitemap-data"

export const metadata: Metadata = {
  title: "사이트맵 - LinkAble",
  description: "LinkAble 사이트의 모든 페이지 목록",
  robots: {
    index: true,
    follow: true,
  },
}

export default function SitemapPage() {
  const pages = getSitemapPages()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkable.kr"

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-4">
            사이트맵
          </h1>
          <p className="text-lg text-muted-foreground">
            LinkAble 사이트의 모든 공개 페이지 목록입니다.
          </p>
        </header>

        <nav className="space-y-4" aria-label="사이트맵">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">주요 페이지</h2>
            <ul className="space-y-2">
              {pages.map((page) => (
                <li key={page.url}>
                  <Link
                    href={page.url.replace(baseUrl, "") || "/"}
                    className="text-primary hover:underline text-lg"
                  >
                    {page.title || page.url}
                  </Link>
                  {page.description && (
                    <p className="text-sm text-muted-foreground mt-1 ml-4">
                      {page.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </nav>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            XML 사이트맵: <Link href="/sitemap.xml" className="text-primary hover:underline">/sitemap.xml</Link>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            RSS 피드: <Link href="/feed.xml" className="text-primary hover:underline">/feed.xml</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
