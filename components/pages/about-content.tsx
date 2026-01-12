import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Target, Heart, Sparkles, ShieldCheck } from "lucide-react"

import { translations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function AboutContent() {
  // SSR을 위해 translations를 직접 사용 (기본 언어: 한국어)
  const t = (key: string) => {
    const keys = key.split(".") as (keyof typeof translations.ko)[]
    let value: any = translations.ko
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) return key
    }
    return typeof value === "string" ? value : key
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/about-hero-bg.jpg"
            alt="LinkAble Future Background"
            fill
            className="object-cover opacity-60 scale-105 animate-softGlow"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <Button variant="ghost" size="sm" asChild className="mb-8 group text-primary hover:bg-primary/10 rounded-full pl-2 pr-4">
            <Link href="/">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
                <ArrowLeft className="size-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight">{t("about.back")}</span>
            </Link>
          </Button>

          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-6 animate-fadeIn">
            About LinkAble
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground mb-6 animate-fadeIn">
            Connecting <span className="text-primary italic">Potential</span><br />
            to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Possibility.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl md:text-2xl text-muted-foreground font-medium text-balance leading-tight animate-fadeIn">
            {t("about.subtitle") || "AI 기반 보조기기 매칭의 새로운 기준, 링커블이 만들어갑니다."}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="container mx-auto px-4 md:px-6 py-24 relative z-10">
        <div className="max-w-4xl mx-auto space-y-24">

          {/* Mission Description */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-black tracking-tight text-foreground">
                우리의 미션은<br />
                <span className="text-primary">단순합니다.</span>
              </h2>
              <div className="w-20 h-2 bg-primary rounded-full" />
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t("about.description") || "우리는 모든 사람이 기술을 통해 장벽 없는 삶을 누릴 수 있어야 한다고 믿습니다. LinkAble은 복잡한 보조기기 시장과 사용자를 AI 기술로 연결하여, 가장 개인화된 지원을 제공하는 플랫폼입니다."}
              </p>
            </div>
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 group">
              <Image
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"
                alt="Vision office"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
            </div>
          </div>

          {/* Value Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 tracking-tight">
            {[
              { icon: Target, title: "Precision", desc: "ICF 기반 초정밀 매칭" },
              { icon: Heart, title: "Empathy", desc: "사용자 중심의 설계" },
              { icon: Sparkles, title: "Innovation", desc: "최신 AI 기술 도입" },
              { icon: ShieldCheck, title: "Reliability", desc: "검증된 보조공학 전문성" }
            ].map((value, idx) => (
              <Card key={idx} className="border-none bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="size-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">
                    <value.icon className="size-8" />
                  </div>
                  <h3 className="text-xl font-black">{value.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{value.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 전문가 경험 강조 섹션 */}
          <div className="rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-12 md:p-16 border border-primary/20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                  전문가 경험
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                  숙련된 보조공학 전문가의<br />
                  <span className="text-primary">임상 노하우</span>
                </h2>
                <div className="w-20 h-2 bg-primary rounded-full" />
                <p className="text-lg text-muted-foreground leading-relaxed">
                  LinkAble의 AI는 단순한 알고리즘이 아닙니다. 10년 이상의 임상 경험을 가진 보조공학사/작업치료사의 실제 노하우를 바탕으로 구축되었습니다.
                </p>
                {/* 전문가 인증 정보 */}
                <div className="space-y-3 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      보조공학사
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      작업치료사
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      ICF 전문가
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      ISO 9999 인증
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * LinkAble의 AI 시스템은 보조공학사 및 작업치료사 자격을 보유한 전문가가 직접 검토 및 개선하고 있습니다.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-3xl font-black text-primary">10년 이상</p>
                    <p className="text-sm text-muted-foreground font-medium">보조공학 경력</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-primary">수천 명</p>
                    <p className="text-sm text-muted-foreground font-medium">상담 경험</p>
                  </div>
                </div>
              </div>
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white/10">
                <Image
                  src="/elderly-person-happily-using-tablet-in-cozy-home-e.jpg"
                  alt="보조공학 전문가 상담"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Founder Quote/Bottom Section */}
          <div className="rounded-[40px] bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 animate-pulse">
              <Sparkles className="size-40" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">
              "기술은 인간의 한계를 <br className="md:hidden" />결정짓는 것이 아니라,<br />
              새로운 가능성을 <br className="md:hidden" />여는 수단이어야 합니다."
            </h2>
            <div className="flex flex-col items-center">
              <div className="w-16 h-1 w-16 bg-white/30 rounded-full mb-4" />
              <p className="text-lg font-bold">LinkAble Team</p>
              <p className="text-sm opacity-70">Empowering every individual</p>
            </div>
          </div>

        </div>
      </section>

      {/* Decorative blurred backgrounds */}
      <div className="absolute top-1/4 -left-64 size-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 -right-64 size-[600px] bg-accent/5 rounded-full blur-[120px] -z-10" />
    </div>
  )
}
