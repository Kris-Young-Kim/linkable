import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"

// 동적 import로 ChatInterface 지연 로딩 (초기 번들 크기 감소)
const ChatInterface = dynamic(() => import("@/components/chat-interface").then((mod) => ({ default: mod.ChatInterface })), {
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="h-12 w-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">채팅 인터페이스를 불러오는 중...</p>
      </div>
    </div>
  ),
  ssr: false, // 클라이언트 전용 컴포넌트
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/chat`
const ogImage = `${baseUrl}/warm-illustration-of-diverse-person-using-assistiv.jpg`

export const metadata: Metadata = {
  title: "AI 상담 - LinkAble 링커",
  description: "링커와 대화하며 일상의 불편함을 ICF 코드로 정리하고 맞춤형 보조기기 추천을 받아보세요.",
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: pageUrl,
    title: "LinkAble AI 상담",
    description:
      "ICF 표준 기반으로 불편함을 구조화하고 ISO 9999 보조기기를 추천하는 링커와 즉시 상담을 시작하세요.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "LinkAble 링커 AI 상담",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkAble AI 상담",
    description:
      "16년차 보조공학 전문가 로직을 담은 링커가 일상의 불편함을 진단하고 해결책을 찾도록 도와드립니다.",
    images: [ogImage],
  },
}

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ChatInterface />
    </div>
  )
}
