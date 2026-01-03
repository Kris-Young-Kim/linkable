/**
 * ImageObject 구조화된 데이터 컴포넌트
 * 
 * Schema.org ImageObject를 JSON-LD 형식으로 제공합니다.
 * 이미지 검색 최적화를 위해 사용됩니다.
 */

import Script from "next/script"

interface ImageObjectProps {
  imageUrl: string
  alt: string
  width?: number
  height?: number
  caption?: string
  contentUrl?: string
  thumbnailUrl?: string
}

export function ImageObject({
  imageUrl,
  alt,
  width,
  height,
  caption,
  contentUrl,
  thumbnailUrl,
}: ImageObjectProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  
  // 절대 URL로 변환
  const absoluteImageUrl = imageUrl.startsWith("http") 
    ? imageUrl 
    : `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`

  const imageObject = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: contentUrl || absoluteImageUrl,
    url: absoluteImageUrl,
    ...(thumbnailUrl && { thumbnailUrl }),
    ...(width && { width }),
    ...(height && { height }),
    ...(caption && { caption }),
    alternateName: alt,
    description: caption || alt,
  }

  return (
    <Script
      id={`image-object-${imageUrl.replace(/[^a-zA-Z0-9]/g, "-")}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(imageObject),
      }}
    />
  )
}
