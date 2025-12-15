import type { Metadata } from "next"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { Loader2 } from "lucide-react"

const IcfExpansionManager = dynamic(
  () => import("@/components/admin/icf-expansion-manager").then((mod) => ({ default: mod.IcfExpansionManager })),
  {
    loading: () => (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    ),
    ssr: true,
  }
)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const pageUrl = `${baseUrl}/admin/icf-expansion`

export const metadata: Metadata = {
  title: "ICF 코드 확장 관리 | LinkAble 관리자",
  description: "Core Set에 없는 ICF 코드의 사용 통계를 확인하고 확장할 수 있는 관리자 페이지입니다.",
  alternates: { canonical: pageUrl },
}

export default async function IcfExpansionPage() {
  const accessResult = await verifyAdminAccess()
  const hasAccess = accessResult.hasAccess
  const reason = hasAccess ? null : accessResult.reason

  if (!hasAccess) {
    if (reason === "not_authenticated") {
      redirect(`/sign-in?redirect_url=${encodeURIComponent(pageUrl)}`)
    }
    redirect("/admin/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Suspense
          fallback={
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">로딩 중...</span>
                </div>
              </CardContent>
            </Card>
          }
        >
          <IcfExpansionManager />
        </Suspense>
      </div>
    </div>
  )
}

