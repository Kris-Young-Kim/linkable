/**
 * Organization 구조화된 데이터 컴포넌트
 * 
 * Schema.org Organization을 JSON-LD 형식으로 제공합니다.
 * 검색 엔진이 조직 정보를 이해할 수 있도록 합니다.
 */

import Script from "next/script"

interface OrganizationProps {
  name?: string
  url?: string
  logo?: string
  description?: string
  email?: string
  telephone?: string
  address?: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  sameAs?: string[] // 소셜 미디어 링크
}

export function Organization({
  name = "LinkAble",
  url,
  logo,
  description,
  email,
  telephone,
  address,
  sameAs = [],
}: OrganizationProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.linkable.life"
  const defaultUrl = url || baseUrl
  const defaultLogo = logo || `${baseUrl}/icon.png`
  const defaultDescription =
    description ||
    "ICF·ISO 표준을 기반으로 한 AI 상담과 추천, K-IPPA 검증까지 제공하는 디지털 보조공학 코디네이터."

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: defaultUrl,
    logo: defaultLogo,
    description: defaultDescription,
    ...(email && { email }),
    ...(telephone && { telephone }),
    ...(address && {
      address: {
        "@type": "PostalAddress",
        ...(address.streetAddress && { streetAddress: address.streetAddress }),
        ...(address.addressLocality && { addressLocality: address.addressLocality }),
        ...(address.addressRegion && { addressRegion: address.addressRegion }),
        ...(address.postalCode && { postalCode: address.postalCode }),
        ...(address.addressCountry && { addressCountry: address.addressCountry }),
      },
    }),
    ...(sameAs.length > 0 && { sameAs }),
  }

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organization, null, 2),
      }}
    />
  )
}
