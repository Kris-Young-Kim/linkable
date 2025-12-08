import type { Metadata } from "next"
import dynamic from "next/dynamic"

// 정적 페이지 컴포넌트를 동적 import로 분리
const AboutContent = dynamic(
  () => import("@/components/pages/about-content").then((mod) => ({ default: mod.AboutContent })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-12">
        <div className="h-12 bg-muted/50 animate-pulse rounded-lg mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    ),
  },
)

export const metadata: Metadata = {
  title: "회사 소개 | LinkAble",
  description: "LinkAble 프로젝트의 취지와 개발 동기를 소개합니다.",
}

export default function AboutPage() {
  return <AboutContent />
}


