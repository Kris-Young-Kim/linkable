import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { Suspense } from "react"
import dynamic from "next/dynamic"

import type { ConsultationRow } from "@/components/dashboard-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 동적 import로 무거운 컴포넌트 지연 로딩
const DashboardContent = dynamic(
  () => import("@/components/dashboard-content").then((mod) => ({ default: mod.DashboardContent })),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),
    ssr: true,
  }
)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/dashboard`
const ogImage = `${baseUrl}/ergonomic-jar-opener-with-rubber-grip.jpg`

export const metadata: Metadata = {
  title: "LinkAble 대시보드 — K-IPPA 효과성 리포트",
  description:
    "AI 상담 결과와 보조기기 추천, K-IPPA 효과성 데이터를 한눈에 확인하고 다음 액션을 진행하세요.",
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: pageUrl,
    title: "LinkAble 대시보드",
    description: "상담 히스토리, 추천 클릭 현황, K-IPPA 개선도를 실시간으로 추적하세요.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "LinkAble K-IPPA 대시보드 미리보기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkAble 대시보드",
    description: "AI 추천과 K-IPPA 효과성 데이터를 한곳에서 확인하는 LinkAble 인사이트 센터.",
    images: [ogImage],
  },
}

const fetchDashboardData = async (clerkUserId: string) => {
  const supabase = getSupabaseServerClient()
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle()

  if (userError || !userRow?.id) {
    return { consultations: [] as ConsultationRow[] }
  }

  // is_favorite 컬럼이 없을 수 있으므로 먼저 시도하고, 실패하면 해당 필드 없이 재시도
  let query = supabase
    .from("consultations")
    .select(
      `
        id,
        title,
        status,
        created_at,
        updated_at,
        is_favorite,
        recommendations:recommendations(
          id,
          product_id,
          match_reason,
          is_clicked,
          created_at,
          rank,
          product:product_id(id, name, image_url, purchase_link, price, iso_code, description)
        )
      `,
    )
    .eq("user_id", userRow.id)
    .order("updated_at", { ascending: false })
    .limit(10)

  let { data, error } = await query

  // is_favorite 컬럼이 없는 경우 (마이그레이션 미적용) 재시도
  if (error && (error.code === "42703" || error.message?.includes("is_favorite"))) {
    console.warn(
      "[dashboard] is_favorite column not found. Please run migration: supabase/migrations/20250123000000_add_favorite_to_consultations.sql",
    )
    // is_favorite 없이 재시도
    const retryQuery = supabase
      .from("consultations")
      .select(
        `
          id,
          title,
          status,
          created_at,
          updated_at,
          recommendations:recommendations(
            id,
            product_id,
            match_reason,
            is_clicked,
            created_at,
            rank,
            product:product_id(id, name, image_url, purchase_link, price, iso_code, description)
          )
        `,
      )
      .eq("user_id", userRow.id)
      .order("updated_at", { ascending: false })
      .limit(10)

    const retryResult = await retryQuery
    data = retryResult.data
    error = retryResult.error
  }

  if (error) {
    console.error("[dashboard] consultations_fetch_error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return { consultations: [] as ConsultationRow[] }
  }

  const normalized =
    data?.map((consultation) => ({
      ...consultation,
      is_favorite: consultation.is_favorite ?? false, // 기본값 설정
      recommendations: consultation.recommendations?.map((rec) => ({
        ...rec,
        product: Array.isArray(rec.product) ? rec.product[0] ?? null : rec.product ?? null,
      })),
    })) ?? []

  return { consultations: normalized as ConsultationRow[] }
}

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">로그인이 필요합니다</CardTitle>
              <CardDescription>대시보드 정보를 확인하려면 로그인 후 다시 시도해 주세요.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/sign-in">로그인 바로가기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">홈으로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { consultations } = await fetchDashboardData(userId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }
      >
        <DashboardContent consultations={consultations} />
      </Suspense>
    </div>
  )
}

