import { MetadataRoute } from "next";
import { getSitemapPages } from "@/lib/seo/sitemap-data";

/**
 * XML 사이트맵 생성
 * 
 * Next.js App Router의 sitemap.ts 파일을 사용하여 자동으로 XML 사이트맵을 생성합니다.
 * 공개 페이지만 포함하며, 인증이 필요한 페이지는 제외합니다.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = getSitemapPages();

  // MetadataRoute.Sitemap 형식으로 변환
  return pages.map((page) => ({
    url: page.url,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
