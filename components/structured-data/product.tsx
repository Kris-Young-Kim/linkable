/**
 * Product 구조화된 데이터 컴포넌트
 * 
 * Schema.org Product를 JSON-LD 형식으로 제공합니다.
 * 상품 페이지에서 사용하여 검색 엔진이 상품 정보를 이해할 수 있도록 합니다.
 */

import Script from "next/script"

interface ProductProps {
  name: string
  description?: string
  image?: string | string[]
  brand?: string
  category?: string
  price?: number
  priceCurrency?: string
  availability?: "InStock" | "OutOfStock" | "PreOrder" | "InStoreOnly"
  url?: string
  sku?: string
  mpn?: string // 제조사 부품 번호
  aggregateRating?: {
    ratingValue: number
    reviewCount: number
  }
}

export function Product({
  name,
  description,
  image,
  brand = "LinkAble",
  category,
  price,
  priceCurrency = "KRW",
  availability = "InStock",
  url,
  sku,
  mpn,
  aggregateRating,
}: ProductProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.linkable.life"

  // 이미지 URL을 절대 URL로 변환
  const normalizeImage = (img: string | string[] | undefined): string | string[] | undefined => {
    if (!img) return undefined
    if (Array.isArray(img)) {
      return img.map((i) => (i.startsWith("http") ? i : `${baseUrl}${i.startsWith("/") ? "" : "/"}${i}`))
    }
    return img.startsWith("http") ? img : `${baseUrl}${img.startsWith("/") ? "" : "/"}${img}`
  }

  const normalizedImage = normalizeImage(image)

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(description && { description }),
    ...(normalizedImage && { image: normalizedImage }),
    brand: {
      "@type": "Brand",
      name: brand,
    },
    ...(category && { category }),
    ...(price !== undefined && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency,
        availability: `https://schema.org/${availability}`,
        ...(url && { url }),
      },
    }),
    ...(sku && { sku }),
    ...(mpn && { mpn }),
    ...(aggregateRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: aggregateRating.ratingValue,
        reviewCount: aggregateRating.reviewCount,
      },
    }),
  }

  return (
    <Script
      id={`product-schema-${name.replace(/[^a-zA-Z0-9]/g, "-")}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(product, null, 2),
      }}
    />
  )
}
