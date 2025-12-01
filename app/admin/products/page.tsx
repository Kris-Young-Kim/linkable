import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminProductManager } from "@/components/admin/admin-product-manager"
import { SideNav } from "@/components/navigation/side-nav"
import { BarChart3, Users, Package, ClipboardCheck } from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/admin/products`

export const metadata: Metadata = {
  title: "상품 관리 — LinkAble 관리자",
  description: "ISO 코드별 보조기기 상품을 등록하고 관리할 수 있는 관리자 페이지입니다.",
  alternates: { canonical: pageUrl },
}

const supabase = getSupabaseServerClient()

export default async function AdminProductsPage() {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    if (access.reason === "not_authenticated") {
      redirect(`/sign-in?redirect_url=${encodeURIComponent(pageUrl)}`)
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center gap-4">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">접근 권한이 없습니다</CardTitle>
              <CardDescription>이 페이지는 관리자 또는 전문가 권한이 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard">사용자 대시보드로 이동</Link>
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

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      iso_code,
      description,
      price,
      purchase_link,
      image_url,
      manufacturer,
      category,
      is_active,
      updated_at
    `,
    )
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error("상품 정보를 불러오지 못했습니다.")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-10">
      <div className="container mx-auto px-4 md:px-6 space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">상품 관리</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2">쿠팡/유통업체 상품 등록</h1>
            <p className="text-muted-foreground mt-2 text-base">
              ISO 9999 코드에 해당하는 보조기기 상품을 등록하고 관리할 수 있습니다.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <SideNav
            currentRole="admin"
            className="border border-border/60 rounded-2xl bg-card/80 p-4 shadow-sm"
            items={[
              { label: "전체 통계", href: "/admin/dashboard", icon: <BarChart3 className="size-4" /> },
              { label: "사용자 리스트", href: "/admin/dashboard#users", icon: <Users className="size-4" /> },
              { label: "K-IPPA 통계", href: "/admin/logs", icon: <ClipboardCheck className="size-4" /> },
              { label: "상품 관리", href: "/admin/products", icon: <Package className="size-4" /> },
            ]}
          />

          <div className="space-y-8">
            <AdminProductManager initialProducts={data ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}


