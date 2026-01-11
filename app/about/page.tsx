import type { Metadata } from "next"
import { AboutContent } from "@/components/pages/about-content"
import { Organization } from "@/components/structured-data/organization"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "회사 소개 | LinkAble",
  description: "LinkAble 프로젝트의 취지와 개발 동기를 소개합니다.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function AboutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.linkable.life"
  
  return (
    <>
      <Organization
        name="LinkAble"
        url={baseUrl}
        logo={`${baseUrl}/icon.png`}
        description="ICF·ISO 표준을 기반으로 한 AI 상담과 추천, K-IPPA 검증까지 제공하는 디지털 보조공학 코디네이터."
        email={process.env.NEXT_PUBLIC_EXPERT_EMAIL || "expert@linkable.ai"}
      />
      <AboutContent />
    </>
  )
}


