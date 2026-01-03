import { MetadataRoute } from "next";

/**
 * robots.txt 생성
 * 
 * 검색 엔진 크롤러에게 사이트 크롤링 규칙을 제공합니다.
 */

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkable.kr";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // 인증이 필요한 페이지
          "/dashboard/",
          "/admin/",
          "/consultation/",
          // API 엔드포인트
          "/api/",
          // 내부 시스템 파일
          "/_next/",
          "/onboarding/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
