/**
 * 사이트맵 데이터 공통 함수
 * 
 * XML 사이트맵, HTML 사이트맵, RSS 피드에서 공통으로 사용하는 페이지 데이터를 제공합니다.
 */

export interface SitemapPage {
  url: string
  lastModified: Date
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
  title?: string
  description?: string
}

export function getSitemapPages(): SitemapPage[] {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkable.kr"

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      title: "LinkAble — AI 기반 보조기기 매칭",
      description: "ICF · ISO 표준 기반으로 불편함을 분석하고 맞춤형 보조기기를 추천하는 디지털 보조공학 코디네이터 서비스.",
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      title: "LinkAble 소개",
      description: "16년 경력 보조공학 전문가의 노하우를 담은 AI 기반 보조기기 매칭 서비스.",
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      title: "AI 상담 - LinkAble",
      description: "링커와 대화하며 일상의 불편함을 ICF 코드로 정리하고 맞춤형 보조기기 추천을 받아보세요.",
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
      title: "이용약관 - LinkAble",
      description: "LinkAble 서비스 이용약관 및 정책.",
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
      title: "개인정보처리방침 - LinkAble",
      description: "LinkAble 개인정보처리방침 및 보호 정책.",
    },
    {
      url: `${baseUrl}/recommendations`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      title: "보조기기 추천 - LinkAble",
      description: "ICF 코드 기반 맞춤형 보조기기 추천 결과를 확인하세요.",
    },
  ]
}
