import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hybridMatch } from "@/core/matching/hybrid-matcher";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isoCode = searchParams.get("iso_code");

    if (!isoCode) {
      return NextResponse.json(
        { error: "iso_code 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 해당 ISO 코드를 가진 상품 조회
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, iso_code, description, category, manufacturer, created_at")
      .or(`iso_code.eq.${isoCode},iso_code.eq.${isoCode.replace(/\s/g, "")}`)
      .order("created_at", { ascending: false });

    if (productsError) {
      throw new Error(`상품 조회 실패: ${productsError.message}`);
    }

    // 각 상품의 매칭 근거 분석
    const productsWithReason = await Promise.all(
      (products || []).map(async (product) => {
        // 1. 상품명/설명에서 키워드 추출
        const keywords: string[] = [];
        const productText = `${product.name} ${product.description || ""} ${product.category || ""}`.toLowerCase();

        // ISO 04 03 관련 키워드 확인
        const iso0403Keywords = [
          "인지", "기억", "주의", "사고", "문제해결", "지적", "훈련", "보조",
          "cognitive", "memory", "attention", "thinking", "training"
        ];

        const foundKeywords = iso0403Keywords.filter(keyword => 
          productText.includes(keyword.toLowerCase())
        );

        // 2. ICF 코드 기반 매칭 시뮬레이션
        const possibleIcfCodes = [
          "b117", "b140", "b144", "b160", "b164", "d160", "d163", "d175"
        ];

        const matchingResults = await Promise.all(
          possibleIcfCodes.map(async (icfCode) => {
            const matches = await hybridMatch({
              icfCodes: [icfCode],
              userMessage: product.name,
            });
            return {
              icfCode,
              matches: matches.filter(m => m.iso === isoCode || m.iso === isoCode.replace(/\s/g, "")),
            };
          })
        );

        const matchedIcfCodes = matchingResults
          .filter(result => result.matches.length > 0)
          .map(result => result.icfCode);

        // 3. 매칭 근거 종합
        let reason = "";
        if (foundKeywords.length > 0) {
          reason += `키워드 기반: "${foundKeywords.join(", ")}" 키워드 발견. `;
        }
        if (matchedIcfCodes.length > 0) {
          reason += `ICF 코드 기반: ${matchedIcfCodes.join(", ")} 코드로 매칭 가능. `;
        }
        if (!reason) {
          reason = "매칭 근거를 찾을 수 없습니다. (수동 입력 또는 다른 로직으로 매칭됨)";
        }

        return {
          ...product,
          matchingReason: reason.trim(),
          foundKeywords,
          matchedIcfCodes,
        };
      })
    );

    return NextResponse.json({
      isoCode,
      totalProducts: productsWithReason.length,
      products: productsWithReason,
    });
  } catch (error) {
    console.error("❌ ISO 매핑 근거 확인 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
