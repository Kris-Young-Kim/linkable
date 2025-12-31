import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

/**
 * POST /api/recommendations/feedback
 * 
 * 추천 상품에 대한 사용자 피드백을 저장합니다.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recommendation_id, rating, comment } = body

    // 입력 검증
    if (!recommendation_id || !rating) {
      return NextResponse.json(
        { error: "recommendation_id and rating are required" },
        { status: 400 }
      )
    }

    const ratingNum = parseInt(rating)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    // 사용자 ID 조회
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle()

    if (userError || !userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 추천 소유권 확인
    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .select("id, consultation_id, consultations!inner(user_id)")
      .eq("id", recommendation_id)
      .maybeSingle()

    if (recError || !recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      )
    }

    const consultation = Array.isArray(recommendation.consultations)
      ? recommendation.consultations[0]
      : recommendation.consultations

    if (consultation?.user_id !== userRow.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // 피드백 저장 (recommendation_feedback 테이블이 있다고 가정)
    // 없으면 recommendations 테이블에 feedback_rating 컬럼 추가 필요
    const { data: existingFeedback, error: checkError } = await supabase
      .from("recommendation_feedback")
      .select("id")
      .eq("recommendation_id", recommendation_id)
      .maybeSingle()

    const feedbackData = {
      recommendation_id,
      user_id: userRow.id,
      rating: ratingNum,
      comment: comment?.trim() || null,
    }

    let saveError
    if (existingFeedback) {
      // 기존 피드백 업데이트
      const { error } = await supabase
        .from("recommendation_feedback")
        .update(feedbackData)
        .eq("id", existingFeedback.id)
      saveError = error
    } else {
      // 새 피드백 생성
      const { error } = await supabase
        .from("recommendation_feedback")
        .insert(feedbackData)
      saveError = error
    }

    if (saveError) {
      console.error("[recommendations/feedback] 피드백 저장 오류:", saveError)
      logEvent({
        category: "recommendation",
        action: "feedback_error",
        payload: {
          error: saveError,
          recommendation_id,
        },
        level: "error",
      })
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      )
    }

    logEvent({
      category: "recommendation",
      action: "feedback_submitted",
      payload: {
        recommendation_id,
        rating: ratingNum,
        has_comment: !!comment,
      },
    })

    return NextResponse.json({
      success: true,
      message: "피드백이 저장되었습니다.",
    })
  } catch (error) {
    console.error("[recommendations/feedback] Unexpected error:", error)
    logEvent({
      category: "recommendation",
      action: "feedback_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
