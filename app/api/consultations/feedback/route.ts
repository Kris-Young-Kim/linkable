import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { logEvent } from "@/lib/logging"

/**
 * POST /api/consultations/feedback
 * 
 * 상담 종료 후 ICF 분석 정확도 피드백을 저장합니다.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { consultation_id, accuracy_rating, feedback_comment } = body

    // 입력 검증
    if (!consultation_id || !accuracy_rating) {
      return NextResponse.json(
        { error: "consultation_id and accuracy_rating are required" },
        { status: 400 }
      )
    }

    const rating = parseInt(accuracy_rating)
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "accuracy_rating must be between 1 and 5" },
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

    // 상담 소유권 확인
    const { data: consultation, error: consultError } = await supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", consultation_id)
      .eq("user_id", userRow.id)
      .maybeSingle()

    if (consultError || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found or access denied" },
        { status: 404 }
      )
    }

    // 피드백 저장 (consultation_feedback 테이블에 저장)
    // 기존 피드백이 있으면 업데이트, 없으면 생성
    const { data: existingFeedback, error: checkError } = await supabase
      .from("consultation_feedback")
      .select("id")
      .eq("consultation_id", consultation_id)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 오류이므로 무시
      console.error("[consultations/feedback] 피드백 확인 오류:", checkError)
      logEvent({
        category: "consultation",
        action: "feedback_error",
        payload: { error: checkError, consultation_id },
        level: "error",
      })
      return NextResponse.json(
        { error: "Failed to check existing feedback" },
        { status: 500 }
      )
    }

    const feedbackData = {
      consultation_id,
      user_id: userRow.id,
      accuracy_rating: rating,
      feedback_comment: feedback_comment?.trim() || null,
    }

    let saveError
    if (existingFeedback) {
      // 기존 피드백 업데이트
      const { error } = await supabase
        .from("consultation_feedback")
        .update(feedbackData)
        .eq("id", existingFeedback.id)
      saveError = error
    } else {
      // 새 피드백 생성
      const { error } = await supabase
        .from("consultation_feedback")
        .insert(feedbackData)
      saveError = error
    }

    if (saveError) {
      console.error("[consultations/feedback] 저장 오류:", saveError)
      logEvent({
        category: "consultation",
        action: "feedback_error",
        payload: { error: saveError, consultation_id },
        level: "error",
      })
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      )
    }

    // 피드백 로깅 (분석 목적)
    logEvent({
      category: "consultation",
      action: "feedback_submitted",
      payload: {
        consultation_id,
        accuracy_rating: rating,
        has_comment: !!feedback_comment,
        comment_length: feedback_comment?.length || 0,
      },
      level: "info",
    })

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
    })
  } catch (error) {
    console.error("[consultations/feedback] 오류:", error)
    logEvent({
      category: "consultation",
      action: "feedback_error",
      payload: { error: error instanceof Error ? error.message : String(error) },
      level: "error",
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

