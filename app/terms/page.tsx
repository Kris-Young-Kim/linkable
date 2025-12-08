import type { Metadata } from "next"
import dynamic from "next/dynamic"

// 정적 페이지 컴포넌트를 동적 import로 분리
const TermsContent = dynamic(
  () => import("@/components/pages/terms-content").then((mod) => ({ default: mod.TermsContent })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-12">
        <div className="h-12 bg-muted/50 animate-pulse rounded-lg mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    ),
  },
)

export const metadata: Metadata = {
  title: "이용약관 | LinkAble",
  description: "LinkAble 서비스 이용약관 안내",
}

export default function TermsPage() {
  return <TermsContent />
}


