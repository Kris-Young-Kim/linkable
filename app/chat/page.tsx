import type { Metadata } from "next"

import { ChatInterface } from "@/components/chat-interface"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/chat`
const ogImage = `${baseUrl}/warm-illustration-of-diverse-person-using-assistiv.jpg`

export const metadata: Metadata = {
  title: "AI 상담 - LinkAble Able Cordi",
  description: "Able Cordi와 대화하며 일상의 불편함을 ICF 코드로 정리하고 맞춤형 보조기기 추천을 받아보세요.",
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: pageUrl,
    title: "LinkAble AI 상담",
    description:
      "ICF 표준 기반으로 불편함을 구조화하고 ISO 9999 보조기기를 추천하는 Able Cordi와 즉시 상담을 시작하세요.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "LinkAble Able Cordi AI 상담",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkAble AI 상담",
    description:
      "16년차 보조공학 전문가 로직을 담은 Able Cordi가 일상의 불편함을 진단하고 해결책을 찾도록 도와드립니다.",
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
