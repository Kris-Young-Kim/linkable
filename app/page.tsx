import type { Metadata } from "next"

import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const ogImage = `${baseUrl}/elderly-person-happily-using-tablet-in-cozy-home-e.jpg`

export const metadata: Metadata = {
  title: "LinkAble — AI 기반 보조기기 매칭",
  description:
    "ICF · ISO 표준 기반으로 불편함을 분석하고 맞춤형 보조기기를 추천하는 디지털 보조공학 코디네이터 서비스.",
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: baseUrl,
    title: "LinkAble — AI 기반 보조기기 매칭",
    description:
      "AI 상담, ISO 매칭, K-IPPA 검증까지 한 번에 제공하는 디지털 보조공학 코디네이터 LinkAble을 만나보세요.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "LinkAble AI 코디네이터 서비스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkAble — AI 기반 보조기기 매칭",
    description:
      "AI 상담과 ISO 표준 매칭으로 맞춤형 보조기기를 추천하고 K-IPPA로 효과성을 검증하는 디지털 보조공학 코디네이터.",
    images: [ogImage],
  },
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
