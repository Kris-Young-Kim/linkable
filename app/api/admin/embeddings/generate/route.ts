/**
 * ICF-ISO 매핑 임베딩 생성 API
 *
 * 관리자 전용: 규칙 기반 매핑 데이터를 벡터 DB에 저장
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import {
  generateEmbeddingsForIcfCodes,
  generateAllEmbeddings,
} from "@/lib/embeddings/embedding-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const hasAccess = await verifyAdminAccess();
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { icfCodes, generateAll } = body;

    if (generateAll) {
      // DB에서 모든 규칙 기반 매핑의 ICF 코드 조합 추출
      const supabase = getSupabaseServerClient();
      const { data: mappings, error } = await supabase
        .from("icf_iso_mappings")
        .select("icf_codes")
        .eq("is_active", true);

      if (error) {
        console.error("[embeddings/generate] DB error:", error);
        return NextResponse.json(
          { error: "매핑 데이터 조회 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }

      if (!mappings || mappings.length === 0) {
        return NextResponse.json(
          { error: "매핑 데이터가 없습니다." },
          { status: 404 }
        );
      }

      const icfCodeSets = Array.from(
        new Set(
          mappings.map((m) => JSON.stringify((m.icf_codes as string[]).sort()))
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
