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
    // parseInt는 유효하지 않은 입력에 대해 NaN을 반환하므로, 이를 명시적으로 검증해야 함
    const limitParam = searchParams.get("limit");
    let limit: number;
    if (limitParam !== null && limitParam.trim() !== "") {
      const parsedLimit = parseInt(limitParam.trim(), 10);
      // parseInt가 NaN을 반환하거나 유효하지 않은 값인 경우 검증
      // Number.isFinite()는 NaN, Infinity, -Infinity를 모두 false로 반환
      // Number.isNaN()을 명시적으로 사용하여 NaN을 체크
      if (
        Number.isNaN(parsedLimit) ||
        !Number.isFinite(parsedLimit) ||
        parsedLimit <= 0
      ) {
        console.warn(
          `[Testimonials] Invalid limit parameter: "${limitParam}", using default: 6`
        );
        limit = 6;
      } else {
        // 최대 100개로 제한 + 정수 보장
        limit = Math.floor(Math.min(parsedLimit, 100));
      }
    } else {
      limit = 6;
    }

    // minScore 파라미터 검증 및 기본값 설정
    // parseFloat는 유효하지 않은 입력에 대해 NaN을 반환하므로, 이를 명시적으로 검증해야 함
    // 호환성: minEffectivenessScore도 지원
    const minScoreRaw = searchParams.get("minScore");
    const minEffectivenessScoreRaw = searchParams.get("minEffectivenessScore");
    const minScoreParam = minScoreRaw ?? minEffectivenessScoreRaw;
    const minScoreKey =
      minScoreRaw !== null
        ? "minScore"
        : minEffectivenessScoreRaw !== null
          ? "minEffectivenessScore"
          : "minScore";
    let minEffectivenessScore: number;
    if (minScoreParam !== null && minScoreParam.trim() !== "") {
      const parsedMinScore = parseFloat(minScoreParam.trim());
      // parseFloat가 NaN을 반환하거나 유효하지 않은 값인 경우 검증
      // Number.isFinite()는 NaN, Infinity, -Infinity를 모두 false로 반환
      // Number.isNaN()을 명시적으로 사용하여 NaN을 체크
      if (
        Number.isNaN(parsedMinScore) ||
        !Number.isFinite(parsedMinScore) ||
        parsedMinScore < 0
      ) {
        console.warn(
          `[Testimonials] Invalid ${minScoreKey} parameter: "${minScoreParam}", using default: 5`
        );
        minEffectivenessScore = 5;
      } else {
        minEffectivenessScore = parsedMinScore;
      }
    } else {
      minEffectivenessScore = 5;
    }

    // 최종 안전 검사: NaN이나 Infinity가 절대 데이터베이스 쿼리에 전달되지 않도록 보장
    // 이 검사는 이중 안전장치로, 위의 검증 로직이 실패하는 경우를 대비
    // Number.isNaN()과 Number.isFinite()를 모두 사용하여 더욱 엄격하게 검증
    if (
      Number.isNaN(limit) ||
      !Number.isFinite(limit) ||
      limit <= 0 ||
      limit > 100 ||
      !Number.isInteger(limit)
    ) {
      console.error(
        `[Testimonials] Critical: Invalid limit value after validation: ${limit}, forcing default: 6`
      );
      limit = 6;
    }
    if (
      Number.isNaN(minEffectivenessScore) ||
      !Number.isFinite(minEffectivenessScore) ||
      minEffectivenessScore < 0
    ) {
      console.error(
        `[Testimonials] Critical: Invalid minEffectivenessScore value after validation: ${minEffectivenessScore}, forcing default: 5`
      );
      minEffectivenessScore = 5;
    }

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
