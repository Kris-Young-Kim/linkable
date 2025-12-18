/**
 * ICF-ISO 매핑 임베딩 생성 API
 * 
 * 관리자 전용: 규칙 기반 매핑 데이터를 벡터 DB에 저장
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import { generateEmbeddingsForIcfCodes, generateAllEmbeddings } from "@/lib/embeddings/embedding-pipeline";
import { getIsoMatches } from "@/core/matching/iso-mapping";
import { logEvent } from "@/lib/logging";

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const hasAccess = await verifyAdminAccess();
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { icfCodes, generateAll } = body;

    if (generateAll) {
      // 모든 규칙 기반 매핑에 대한 임베딩 생성
      // iso-mapping.ts의 모든 규칙에서 ICF 코드 조합 추출
      const { isoMappingTable } = await import("@/core/matching/iso-mapping");
      const icfCodeSets = Array.from(
        new Set(
          isoMappingTable.map((rule) => JSON.stringify(rule.icf.sort()))
        )
      ).map((json) => JSON.parse(json) as string[]);

      const totalSaved = await generateAllEmbeddings(icfCodeSets);

      return NextResponse.json({
        success: true,
        message: `총 ${totalSaved}개의 임베딩이 생성되었습니다.`,
        totalSaved,
        icfCodeSetsCount: icfCodeSets.length,
      });
    } else if (icfCodes && Array.isArray(icfCodes)) {
      // 특정 ICF 코드 조합에 대한 임베딩 생성
      const savedCount = await generateEmbeddingsForIcfCodes(icfCodes);

      return NextResponse.json({
        success: true,
        message: `${savedCount}개의 임베딩이 생성되었습니다.`,
        savedCount,
        icfCodes,
      });
    } else {
      return NextResponse.json(
        { error: "icfCodes 배열 또는 generateAll 플래그가 필요합니다." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[embeddings/generate] Error:", error);
    logEvent({
      category: "matching",
      action: "embedding_generation_api_error",
      payload: { error: String(error) },
      level: "error",
    });

    return NextResponse.json(
      { error: "임베딩 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

