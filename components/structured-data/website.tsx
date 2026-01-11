/**
 * WebSite 구조화된 데이터 컴포넌트
 * 
 * Schema.org WebSite를 JSON-LD 형식으로 제공합니다.
 * 검색 엔진이 사이트 정보와 검색 기능을 이해할 수 있도록 합니다.
 */

import Script from "next/script"

interface WebSiteProps {
  name?: string
  url?: string
  description?: string
  potentialAction?: {
    "@type": "SearchAction"
    target: {
      "@type": "EntryPoint"
      urlTemplate: string
    }
    "query-input": string
  }
}

export function WebSite({
  name = "LinkAble",
  url,
  description,
  potentialAction,
}: WebSiteProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.linkable.life"
  const defaultUrl = url || baseUrl
  const defaultDescription =
    description ||
    "ICF·ISO 표준을 기반으로 한 AI 상담과 추천, K-IPPA 검증까지 제공하는 디지털 보조공학 코디네이터."

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: defaultUrl,
    description: defaultDescription,
    ...(potentialAction && { potentialAction }),
  }

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(website, null, 2),
      }}
    />
  )
}
