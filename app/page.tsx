import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"

// Header는 서버 컴포넌트이지만 GlobalNav를 동적 import로 분리
const Header = dynamic(() => import("@/components/header").then((mod) => ({ default: mod.Header })), {
  ssr: true,
})

// Hero 섹션은 첫 화면에 중요하지만 동적 import로 지연 로딩 (이미지 프리로딩으로 보완)
const HeroSection = dynamic(() => import("@/components/hero-section").then((mod) => ({ default: mod.HeroSection })), {
  loading: () => (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff3e0] via-[#fff8f0] to-[#eef7f4] py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <div className="h-16 bg-muted/50 animate-pulse rounded-lg" />
          <div className="h-8 bg-muted/50 animate-pulse rounded-lg max-w-2xl mx-auto" />
        </div>
      </div>
    </section>
  ),
  ssr: true,
})

// Features, HowItWorks, CTA 섹션은 스크롤 후 보이므로 동적 import
const FeaturesSection = dynamic(
  () => import("@/components/features-section").then((mod) => ({ default: mod.FeaturesSection })),
  {
    loading: () => (
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="h-12 bg-muted/50 animate-pulse rounded-lg max-w-2xl mx-auto mb-16" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    ),
  },
)

const HowItWorksSection = dynamic(
  () => import("@/components/how-it-works-section").then((mod) => ({ default: mod.HowItWorksSection })),
  {
    loading: () => (
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="h-12 bg-muted/50 animate-pulse rounded-lg max-w-2xl mx-auto mb-16" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    ),
  },
)

const CTASection = dynamic(() => import("@/components/cta-section").then((mod) => ({ default: mod.CTASection })), {
  loading: () => (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    </section>
  ),
})

// Footer는 페이지 하단이므로 동적 import
const Footer = dynamic(() => import("@/components/footer").then((mod) => ({ default: mod.Footer })), {
  loading: () => (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="h-32 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    </footer>
  ),
})

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
      <Suspense fallback={<div className="h-16 bg-muted/50 animate-pulse" />}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse" />}>
          <HeroSection />
        </Suspense>
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
