import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "회사 소개 | LinkAble",
  description: "LinkAble 프로젝트의 취지와 개발 동기를 소개합니다.",
}

const descriptionText =
  "LinkAble은 누구나 보조공학 상담에 쉽게 접근할 수 있어야 한다는 믿음에서 출발했습니다. 복잡한 ICF·ISO 기준과 단절된 복지 정보를 기술로 연결해, 사용자가 자신의 어려움을 자연어로 설명하면 전문가 수준의 분석과 맞춤형 추천을 받을 수 있도록 설계했습니다. 링커 코디네이터는 단순한 챗봇이 아니라, 생활 속 작은 불편을 기능 중심으로 재해석해 실제 변화를 만드는 동반자를 목표로 합니다."

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6 gap-2 px-0 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            홈으로 돌아가기
          </Link>
        </Button>

        <Card className="border border-primary/20 shadow-xl bg-card/95">
          <CardHeader>
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">About LinkAble</p>
            <CardTitle className="text-3xl font-bold text-foreground mt-2">회사 소개</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              ICF & ISO 표준 기반 보조공학 코디네이팅 프로젝트
            </CardDescription>
          </CardHeader>
          <CardContent className="text-lg leading-relaxed text-foreground/90 space-y-4">
            <p>{descriptionText}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


