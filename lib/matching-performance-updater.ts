/**
 * 매칭 성능 로그 업데이트 유틸리티
 * 
 * 사용자 행동(클릭, 구매, 피드백)을 매칭 성능 로그에 반영합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 추천 클릭 시 매칭 성능 로그 업데이트
 */
export async function updateMatchingPerformanceOnClick(
  recommendationId: string
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    // recommendation_id로 consultation_id 조회
    const { data: recommendation } = await supabase
      .from("recommendations")
      .select("consultation_id")
      .eq("id", recommendationId)
      .maybeSingle();

    if (!recommendation?.consultation_id) {
      return;
    }

    // 해당 상담의 최근 매칭 성능 로그 업데이트
    await supabase
      .from("matching_performance_logs")
      .update({
        recommendation_clicked: true,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", recommendation.consultation_id)
      .is("recommendation_clicked", false)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch (error) {
    console.error("[Matching Performance Updater] Click update failed:", error);
  }
}

/**
 * 구매 완료 시 매칭 성능 로그 업데이트
 */
export async function updateMatchingPerformanceOnPurchase(
  recommendationId: string
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    // recommendation_id로 consultation_id 조회
    const { data: recommendation } = await supabase
      .from("recommendations")
      .select("consultation_id")
      .eq("id", recommendationId)
      .maybeSingle();

    if (!recommendation?.consultation_id) {
      return;
    }

    // 해당 상담의 최근 매칭 성능 로그 업데이트
    await supabase
      .from("matching_performance_logs")
      .update({
        purchase_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", recommendation.consultation_id)
      .is("purchase_completed", false)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch (error) {
    console.error("[Matching Performance Updater] Purchase update failed:", error);
  }
}

/**
 * 피드백 제출 시 매칭 성능 로그 업데이트
 */
export async function updateMatchingPerformanceOnFeedback(
  consultationId: string,
  feedbackRating: number
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    // 해당 상담의 최근 매칭 성능 로그 업데이트
    await supabase
      .from("matching_performance_logs")
      .update({
        feedback_rating: feedbackRating,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", consultationId)
      .is("feedback_rating", null)
      .order("created_at", { ascending: false })
      .limit(1);
  } catch (error) {
    console.error("[Matching Performance Updater] Feedback update failed:", error);
  }
}

