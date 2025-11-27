import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "이용약관 | LinkAble",
  description: "LinkAble 서비스 이용약관 안내",
}

const sections = [
  {
    title: "제1조 (목적)",
    content:
      "본 약관은 LinkAble(이하 “회사”)이 제공하는 AI 보조공학 코디네이팅 서비스의 이용 조건과 절차, 회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.",
  },
  {
    title: "제2조 (정의)",
    content:
      "① “서비스”란 AI 상담, ICF/ISO 분석, 보조기기 추천, K-IPPA 평가 등 회사가 제공하는 모든 온라인 기능을 의미합니다. ② “이용자”란 본 약관에 동의하고 서비스를 이용하는 회원 또는 비회원을 말합니다.",
  },
  {
    title: "제3조 (약관의 효력 및 변경)",
    content:
      "1) 회사는 본 약관을 서비스 초기 화면에 게시하며, 필요 시 관련 법령을 준수하여 변경할 수 있습니다. 2) 약관 변경 시 최소 7일 전에 공지하고, 중요 변경 사항은 30일 전 고지합니다. 3) 변경 이후에도 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 봅니다.",
  },
  {
    title: "제4조 (회원 가입 및 계정 관리)",
    content:
      "Clerk 인증을 통해 본인 확인 후 가입할 수 있으며, 회원 정보는 정확하게 유지해야 합니다. 부정 사용, 타인 명의 도용, 법령 위반 시 회사는 계정 사용을 제한하거나 해지할 수 있습니다.",
  },
  {
    title: "제5조 (서비스 이용 및 제한)",
    content:
      "링커 AI의 분석 및 추천은 참고용 정보이며 의료행위를 대체하지 않습니다. 이용자는 허위 정보 입력, 지적재산권 침해, 서비스 운영 방해 행위를 해서는 안 되며, 회사는 시스템 유지보수 또는 불가항력에 따라 서비스 제공을 중단할 수 있습니다.",
  },
  {
    title: "제6조 (요금 및 결제)",
    content:
      "현재 서비스는 무료로 제공되나, 유료 기능 도입 시 별도의 정책과 결제 조건을 사전 고지합니다. 유료 서비스 이용 시 환불, 청약철회 기준은 전자상거래법 등 관계법령을 따릅니다.",
  },
  {
    title: "제7조 (개인정보 보호)",
    content:
      "이용자의 개인정보 처리에 관한 사항은 별도의 개인정보 처리방침에 따르며, 회사는 서비스 제공 및 품질 개선 목적 범위 내에서만 데이터를 수집·이용합니다. 이용자는 언제든지 열람·정정·삭제를 요청할 수 있습니다.",
  },
  {
    title: "제8조 (콘텐츠 및 지식재산권)",
    content:
      "서비스에서 제공되는 모든 콘텐츠와 알고리즘은 회사 또는 정당한 권리자의 소유입니다. 이용자는 회사의 서면 동의 없이 이를 복사, 배포, 2차 활용할 수 없습니다.",
  },
  {
    title: "제9조 (면책 및 책임 제한)",
    content:
      "AI 분석 결과, 제3자 보조기기 정보, 외부 API 장애 등으로 발생하는 손해에 대해 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다. 이용자의 위법 행위로 발생한 손해는 이용자 본인이 부담합니다.",
  },
  {
    title: "제10조 (준거법 및 분쟁 해결)",
    content:
      "본 약관은 대한민국 법률을 준거법으로 하며, 서비스 이용과 관련해 분쟁이 발생할 경우 회사 소재지를 관할하는 법원을 제1심 관할 법원으로 합니다.",
  },
]

export default function TermsPage() {
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
            <CardTitle className="text-3xl font-bold text-foreground">LinkAble 이용약관</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              시행일: 2025년 1월 1일 · 문의: legal@linkable.ai
            </p>
          </CardHeader>
          <CardContent className="text-base leading-relaxed text-foreground/90 space-y-6">
            {sections.map((section) => (
              <section key={section.title} aria-labelledby={section.title}>
                <h2 className="text-xl font-semibold text-primary mb-2">{section.title}</h2>
                <p>{section.content}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


