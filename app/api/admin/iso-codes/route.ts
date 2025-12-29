import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import {
  getAllIsoCodesAsync,
  searchIsoCodesAsync,
  getIsoCodesByClassAsync,
} from "@/lib/iso-9999-catalog-async";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const mapReasonToStatus = (
  reason: "not_authenticated" | "insufficient_permissions" | "error"
) => {
  if (reason === "not_authenticated") return 401;
  if (reason === "insufficient_permissions") return 403;
  return 500;
};

/**
 * ISO 코드 목록 조회 API
 * ISO 9999:2022 전체 카테고리 제공
 *
 * 쿼리 파라미터:
 * - search: 검색어 (선택)
 * - class: 클래스 코드로 필터링 (선택, 예: "12", "15")
 */
export async function GET(request: NextRequest) {
  const access = await verifyAdminAccess();

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const classCode = searchParams.get("class");

  const supabase = getSupabaseServerClient();
  let isoCodes;

  // 검색어로 필터링
  if (search) {
    isoCodes = await searchIsoCodesAsync(search, supabase);
  } else if (classCode) {
    // 클래스로 필터링
    isoCodes = await getIsoCodesByClassAsync(classCode, supabase);
  } else {
    // 모든 코드 반환
    isoCodes = await getAllIsoCodesAsync(supabase);
  }

  // 응답 형식 변환
  const result = isoCodes.map((item) => ({
    iso: item.iso,
    label: item.label,
    description: item.description,
    class: item.class,
  }));

  return NextResponse.json({
    isoCodes: result,
    total: result.length,
  });
}