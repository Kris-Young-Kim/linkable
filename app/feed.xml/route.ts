/**
 * RSS 피드 생성
 * 
 * RSS 2.0 형식의 XML 피드를 생성합니다.
 * 공개 페이지를 RSS 아이템으로 변환하여 제공합니다.
 */

import { NextResponse } from "next/server"
import { getSitemapPages } from "@/lib/seo/sitemap-data"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkable.kr"
  const pages = getSitemapPages()

  // RSS 2.0 형식의 XML 생성
  const rssItems = pages
    .map((page) => {
      const pubDate = page.lastModified.toUTCString()
      const link = page.url
      const title = page.title || link
      const description = page.description || title

      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
    </item>`
    })
    .join("\n")

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LinkAble — AI 기반 보조기기 매칭</title>
    <link>${baseUrl}</link>
    <description>ICF · ISO 표준 기반으로 불편함을 분석하고 맞춤형 보조기기를 추천하는 디지털 보조공학 코디네이터 서비스.</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <generator>Next.js</generator>
${rssItems}
  </channel>
</rss>`

  return new NextResponse(rssXml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
