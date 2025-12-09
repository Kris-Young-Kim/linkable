import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
// Playwright 의존성을 제거하기 위해 크롤링 기능을 비활성화합니다.
// 필요 시 향후 Puppeteer 등 다른 솔루션으로 교체하세요.

const mapReasonToStatus = (
  reason: "not_authenticated" | "insufficient_permissions" | "error"
) => {
  if (reason === "not_authenticated") return 401;
  if (reason === "insufficient_permissions") return 403;
  return 500;
};

/**
 * Playwright 크롤링 API (비활성화)
 * 빌드 환경에서 Playwright 모듈 미존재로 인한 오류를 방지하기 위해
 * 501 응답을 즉시 반환합니다.
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess();

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Playwright 기반 크롤링은 비활성화되었습니다. 다른 크롤링 경로를 사용하세요.",
      products: [],
    },
    { status: 501 }
  );
}
