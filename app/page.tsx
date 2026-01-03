import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { ImagePreloader } from "@/components/image-preloader"
import { ImageObject } from "@/components/structured-data/image-object"

// Header는 서버 컴포넌트이지만 GlobalNav를 동적 import로 분리
const Header = dynamic(() => import("@/components/header").then((mod) => ({ default: mod.Header })), {
  ssr: true,
})

// Hero 섹션은 첫 화면에 중요하지만 동적 import로 지연 로딩 (이미지 프리로딩으로 보완)
// 서버 컴포넌트로 전환되었지만 언어 처리를 위해 클라이언트 래퍼 사용
const HeroSection = dynamic(() => import("@/components/hero-section-client").then((mod) => ({ default: mod.HeroSectionClient })), {
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

// Features, HowItWorks 섹션은 서버 컴포넌트로 전환되었지만 언어 처리를 위해 클라이언트 래퍼 사용
const FeaturesSection = dynamic(
  () => import("@/components/features-section-client").then((mod) => ({ default: mod.FeaturesSectionClient })),
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
  () => import("@/components/how-it-works-section-client").then((mod) => ({ default: mod.HowItWorksSectionClient })),
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

const TestimonialsSection = dynamic(
  () => import("@/components/testimonials-section").then((mod) => ({ default: mod.TestimonialsSection })),
  {
    loading: () => (
      <section className="py-20 md:py-32 bg-muted/30">
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
  }
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

// Footer는 서버 컴포넌트로 전환되었지만 언어 처리를 위해 클라이언트 래퍼 사용
const Footer = dynamic(() => import("@/components/footer-client").then((mod) => ({ default: mod.FooterClient })), {
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const ogImage = `${baseUrl}/elderly-person-happily-using-tablet-in-cozy-home-e.jpg`

  return (
    <div className="flex min-h-screen flex-col">
      {/* 메인 페이지에서만 이미지 프리로드 */}
      <ImagePreloader />
      {/* Open Graph 이미지 구조화된 데이터 */}
      <ImageObject
        imageUrl={ogImage}
        alt="LinkAble AI 코디네이터 서비스"
        width={1200}
        height={630}
        caption="AI 기반 보조기기 매칭 서비스 LinkAble"
      />
      <Suspense fallback={<div className="h-16 bg-muted/50 animate-pulse" />}>
        <Header />
      </Suspense>
      <main id="main-content" role="main" className="flex-1">
        <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse" />}>
          <HeroSection />
        </Suspense>
        <FeaturesSection />
        <HowItWorksSection />
        <Suspense fallback={<div className="h-96 bg-muted/30 animate-pulse" />}>
          <TestimonialsSection />
        </Suspense>
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
