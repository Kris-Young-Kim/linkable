import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { checkAffiliateLinkStatus, checkAffiliateLinksStatus } from "@/lib/integrations/link-validator"

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * 단일 제휴 링크 상태 체크
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  try {
    const body = await request.json()
    const { url } = body as { url?: string }

    if (!url) {
      return NextResponse.json(
        { error: "URL이 필요합니다." },
        { status: 400 },
      )
    }

    console.log("[Admin Products] Checking affiliate link status:", url)
    const status = await checkAffiliateLinkStatus(url)

    return NextResponse.json({ status })
  } catch (error) {
    console.error("[Admin Products] Link check error:", error)
    return NextResponse.json(
      { error: "링크 상태 체크 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}

/**
 * 여러 제휴 링크 상태 일괄 체크
 */
export async function PUT(request: Request) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  try {
    const body = await request.json()
    const { urls } = body as {
      urls?: Array<{ id: string; url: string | null | undefined }>
    }

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "URL 배열이 필요합니다." },
        { status: 400 },
      )
    }

    console.log(`[Admin Products] Checking ${urls.length} affiliate links`)
    const results = await checkAffiliateLinksStatus(urls)

    // Map을 객체로 변환
    const statusMap: Record<string, any> = {}
    results.forEach((status, id) => {
      statusMap[id] = status
    })

    return NextResponse.json({ statuses: statusMap })
  } catch (error) {
    console.error("[Admin Products] Batch link check error:", error)
    return NextResponse.json(
      { error: "링크 상태 체크 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}
