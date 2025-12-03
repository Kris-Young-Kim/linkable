import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { isoMappingTable } from "@/core/matching/iso-mapping"

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * ISO 코드 목록 조회 API
 * 드롭다운 및 검색에 사용
 */
export async function GET() {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  // isoMappingTable에서 고유한 ISO 코드 추출
  const isoCodeMap = new Map<string, { label: string; description: string }>()

  for (const rule of isoMappingTable) {
    if (!isoCodeMap.has(rule.iso)) {
      isoCodeMap.set(rule.iso, {
        label: rule.label,
        description: rule.description,
      })
    }
  }

  // ISO 코드로 정렬
  const isoCodes = Array.from(isoCodeMap.entries())
    .map(([iso, info]) => ({
      iso,
      label: info.label,
      description: info.description,
    }))
    .sort((a, b) => a.iso.localeCompare(b.iso))

  return NextResponse.json({ isoCodes })
}

