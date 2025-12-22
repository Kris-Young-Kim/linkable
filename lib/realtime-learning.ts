/**
 * 실시간 학습 시스템
 * 
 * 사용자 피드백을 실시간으로 매칭 점수에 반영하고,
 * 클릭률이 높은 매칭 조합의 가중치를 자동으로 증가시킵니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export interface RealtimeLearningConfig {
  id: string;
  name: string;
  learning_rate: number;
  min_sample_count: number;
  click_rate_threshold: number;
  click_rate_boost_factor: number;
  purchase_rate_boost_factor: number;
  max_weight_boost: number;
  min_weight_penalty: number;
}

/**
 * 실시간 학습 통계 업데이트
 * 
 * @param icfCodes ICF 코드 배열
 * @param isoCode ISO 코드
 * @param eventType 이벤트 타입 (impression, click, purchase, feedback)
 * @param feedbackRating 피드백 점수 (feedback 이벤트인 경우)
 */
export async function updateRealtimeLearningStats(
  icfCodes: string[],
  isoCode: string,
  eventType: "impression" | "click" | "purchase" | "feedback",
  feedbackRating?: number
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    // 이벤트 로그 저장
    const icfKey = [...icfCodes].sort().join(",");
    await supabase.from("realtime_learning_events").insert({
      event_type: eventType,
      icf_codes: icfCodes,
      icf_codes_key: icfKey,
      iso_code: isoCode,
      feedback_rating: feedbackRating || null,
    });
    
    // 통계 업데이트 (PostgreSQL 함수 호출)
    const { error } = await supabase.rpc("update_realtime_learning_stats", {
      p_icf_codes: icfCodes,
      p_iso_code: isoCode,
      p_event_type: eventType,
      p_feedback_rating: feedbackRating || null,
    });
    
    if (error) {
      console.error("[Realtime Learning] Stats update error:", error);
      logEvent({
        category: "matching",
        action: "realtime_learning_update_error",
        payload: { error: error.message, icfCodes, isoCode, eventType },
        level: "error",
      });
    } else {
      logEvent({
        category: "matching",
        action: "realtime_learning_updated",
        payload: { icfCodes, isoCode, eventType },
      });
    }
  } catch (error) {
    console.error("[Realtime Learning] Update failed:", error);
    // 실패해도 메인 플로우에 영향 없음
  }
}

/**
 * 실시간 가중치 조정 계수 조회
 * 
 * @param icfCodes ICF 코드 배열
 * @param isoCode ISO 코드
 * @returns 가중치 조정 계수 (1.0 = 기본, >1.0 = 증가, <1.0 = 감소)
 */
export async function getRealtimeWeightAdjustment(
  icfCodes: string[],
  isoCode: string
): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase.rpc("get_realtime_weight_adjustment", {
      p_icf_codes: icfCodes,
      p_iso_code: isoCode,
    });
    
    if (error) {
      console.error("[Realtime Learning] Weight adjustment error:", error);
      return 1.0; // 기본값 반환
    }
    
    return Number(data) || 1.0;
  } catch (error) {
    console.error("[Realtime Learning] Weight adjustment failed:", error);
    return 1.0; // 기본값 반환
  }
}

/**
 * 활성화된 실시간 학습 설정 조회
 */
export async function getActiveRealtimeLearningConfig(): Promise<RealtimeLearningConfig | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("realtime_learning_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    
    if (error) {
      console.error("[Realtime Learning] Config load error:", error);
      return null;
    }
    
    return data as RealtimeLearningConfig | null;
  } catch (error) {
    console.error("[Realtime Learning] Config load failed:", error);
    return null;
  }
}

/**
 * 실시간 학습 통계 조회
 */
export async function getRealtimeLearningStats(
  icfCodes: string[],
  isoCode?: string
): Promise<any[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    const icfKey = [...icfCodes].sort().join(",");
    let query = supabase
      .from("realtime_learning_stats")
      .select("*")
      .eq("icf_codes_key", icfKey);
    
    if (isoCode) {
      query = query.eq("iso_code", isoCode);
    }
    
    const { data, error } = await query.order("weight_adjustment", { ascending: false });
    
    if (error) {
      console.error("[Realtime Learning] Stats query error:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("[Realtime Learning] Stats query failed:", error);
    return [];
  }
}

