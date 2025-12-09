import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
// Playwright 기반 크롤러 의존성을 제거하기 위해 라우트를 비활성화합니다.
// 필요 시 별도 크롤링 워커나 배치에서 처리하고, 여기서는 501을 반환합니다.
import { syncProducts } from "@/lib/integrations/product-sync"
import type { ProductInput } from "@/lib/integrations/product-sync"

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * 크롤링 실행 API
 * 실제로 크롤링을 실행하고 결과를 반환합니다.
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Playwright 기반 크롤링 엔드포인트는 비활성화되었습니다. 다른 수집 경로를 사용하세요.",
      created: 0,
      updated: 0,
      failed: 0,
      total: 0,
    },
    { status: 501 },
  )
}

