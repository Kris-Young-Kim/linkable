import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import { inferIsoCodeFromProduct } from "@/core/matching/ai-iso-inference";
import { inferIsoFromText } from "@/core/matching/synonym-dictionary";

/**
 * 관리자용 ISO 코드 추론 API
 * POST /api/admin/products/infer-iso
 * 
 * 상품명과 설명을 기반으로 ISO 코드를 추론합니다.
 */
export async function POST(request: NextRequest) {
  const access = await verifyAdminAccess();

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: access.reason === "not_authenticated" ? 401 : 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "상품명이 필요합니다." },
        { status: 400 }
      );
    }

    // 1단계: 동의어 사전 기반 빠른 추론
    const keywordIsoCodes = inferIsoFromText(`${name} ${description || ""}`);
    if (keywordIsoCodes.length > 0) {
      return NextResponse.json({
        isoCode: keywordIsoCodes[0],
        method: "keyword",
        confidence: 0.8,
        alternatives: keywordIsoCodes.slice(1),
      });
    }

    // 2단계: AI 기반 추론
    const aiResult = await inferIsoCodeFromProduct({
      name,
      description,
    });

    if (aiResult && aiResult.confidence >= 0.5) {
      return NextResponse.json({
        isoCode: aiResult.isoCode,
        method: "ai",
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        alternatives: aiResult.alternativeCodes?.map((alt) => alt.isoCode) || [],
      });
    }

    // 추론 실패 (ISO 9999 표준에 없는 비표준 코드 대신 N999999 사용)
    return NextResponse.json({
      isoCode: "N999999",
      method: "none",
      confidence: 0,
      message: "ISO 코드를 추론할 수 없습니다.",
    });
  } catch (error) {
    console.error("[Admin Products Infer ISO] Error:", error);
    return NextResponse.json(
      { error: "ISO 코드 추론 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

