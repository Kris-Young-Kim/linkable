import { NextRequest, NextResponse } from "next/server";
import { getActiveCtaAbTestConfig } from "@/lib/cta-ab-testing";

/**
 * 활성화된 CTA A/B 테스트 설정 조회 (클라이언트용)
 */
export async function GET(request: NextRequest) {
  try {
    const config = await getActiveCtaAbTestConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[CTA AB Test API] Config error:", error);
    return NextResponse.json({ config: null });
  }
}

