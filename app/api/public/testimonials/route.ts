/**
 * 공개용 사용자 후기 API
 *
 * K-IPPA 평가 데이터를 활용하여 공개 가능한 사용자 후기를 제공합니다.
 * 개인정보 보호를 위해 사용자 정보는 익명화됩니다.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // limit 파라미터 검증 및 기본값 설정
    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 6;
    const limit =
      isNaN(parsedLimit) || parsedLimit <= 0 ? 6 : Math.min(parsedLimit, 100); // 최대 100개로 제한

    // minScore 파라미터 검증 및 기본값 설정
    const minScoreParam = searchParams.get("minScore");
    const parsedMinScore = minScoreParam ? parseFloat(minScoreParam) : 5;
    const minEffectivenessScore =
      isNaN(parsedMinScore) || parsedMinScore < 0 ? 5 : parsedMinScore;

    const supabase = getSupabaseServerClient();

    // K-IPPA 평가 데이터 조회 (후기가 있고, 효과성 점수가 높은 것만)
    const { data: evaluations, error } = await supabase
      .from("ippa_evaluations")
      .select(
        `
        id,
        problem_description,
        effectiveness_score,
        feedback_comment,
        evaluated_at,
        products:product_id (
          id,
          name,
          image_url
        )
      `
      )
      .not("feedback_comment", "is", null)
      .gte("effectiveness_score", minEffectivenessScore)
      .order("effectiveness_score", { ascending: false })
      .order("evaluated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Testimonials] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch testimonials" },
        { status: 500 }
      );
    }

    // 개인정보 보호를 위해 익명화 처리
    const testimonials = (evaluations || []).map((eval) => ({
      id: eval.id,
      problem: eval.problem_description || "일상생활 활동 개선",
      comment: eval.feedback_comment,
      effectivenessScore: Number(eval.effectiveness_score) || 0,
      productName: eval.products?.name || "보조기기",
      productImage: eval.products?.image_url || null,
      evaluatedAt: eval.evaluated_at,
      // 개인정보 익명화: 사용자 이름은 "LinkAble 사용자"로 통일
      author: "LinkAble 사용자",
    }));

    return NextResponse.json({
      testimonials,
      count: testimonials.length,
    });
  } catch (error) {
    console.error("[Testimonials] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
