import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "개인정보 처리방침 | LinkAble",
  description: "LinkAble 서비스의 개인정보 처리방침입니다.",
}

const policyParagraphs = [
  "LinkAble은 상담 이용 과정에서 최소한의 개인정보를 수집하며, 계정 관리를 위해 Clerk 인증 서비스와 연동됩니다. 회원 가입 시 수집되는 이름, 이메일, 인증 정보는 본인 확인과 세션 유지를 위해 사용되며, 사용자가 요청한 서비스 제공을 완료한 후에도 법적 의무를 이행하기 위해 필요한 기간 동안만 보관됩니다.",
  "대화 내용, ICF 분석 결과, 추천 기록과 같은 서비스 사용 데이터는 개인 식별 정보를 제거한 후 보조공학 매칭 품질 개선과 통계 분석에 활용됩니다. Gemini, Supabase 등 외부 파트너에 전송되는 데이터는 전송 중 암호화되며, 필요한 범위 내에서만 공유됩니다.",
  "모든 개인정보는 AWS 및 Supabase에 분산 저장되고, 접근 권한은 최소한으로 제한됩니다. 사용자는 언제든지 개인정보 열람·정정·삭제·처리정지 요청을 support@linkable.ai로 제출할 수 있으며, 요청 시 지체 없이 처리합니다. 정책 변경 시 이메일과 서비스 내 공지로 안내드립니다.",
]

export default function PrivacyPage() {
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
            <CardTitle className="text-3xl font-bold text-foreground">개인정보 처리방침</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              시행일: 2025년 1월 1일 · 문의: support@linkable.ai
            </p>
          </CardHeader>
          <CardContent className="text-base leading-relaxed text-foreground/90 space-y-4">
            {policyParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


