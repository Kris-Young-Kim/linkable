/**
 * CTA A/B 테스트 시스템
 * 
 * CTA 버튼의 위치, 텍스트, 색상, 크기를 A/B 테스트하여
 * 클릭률을 최적화합니다.
 * 
 * 주의: 이 파일은 서버 사이드 전용입니다.
 * 클라이언트 컴포넌트에서 사용하려면 API route를 통해 호출하세요.
 */

import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export interface CtaVariant {
  id: string;
  test_config_id: string;
  name: string;
  position: "top" | "middle" | "bottom" | "sticky";
  primary_button_text: string;
  secondary_button_text: string;
  tertiary_button_text?: string;
  primary_button_variant: string;
  secondary_button_variant: string;
  primary_button_size: "sm" | "md" | "lg" | "xl";
  secondary_button_size: "sm" | "md" | "lg" | "xl";
  primary_button_color?: string;
  secondary_button_color?: string;
  primary_button_icon?: string;
  secondary_button_icon?: string;
  show_price_highlight: boolean;
  show_urgency_text: boolean;
  urgency_text?: string;
}

export interface CtaAbTestConfig {
  id: string;
  name: string;
  is_active: boolean;
  traffic_percentage: number;
  start_date?: string;
  end_date?: string;
}

/**
 * 활성화된 CTA A/B 테스트 설정 조회
 */
export async function getActiveCtaAbTestConfig(): Promise<CtaAbTestConfig | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("cta_ab_test_configs")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    
    if (error) {
      console.error("[CTA AB Test] Config load error:", error);
      return null;
    }
    
    return data as CtaAbTestConfig | null;
  } catch (error) {
    console.error("[CTA AB Test] Config load failed:", error);
    return null;
  }
}

/**
 * CTA 변형 할당 (사용자별 일관성 유지)
 */
export async function assignCtaVariant(
  testConfigId: string,
  userId?: string,
  consultationId?: string
): Promise<CtaVariant | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    // 변형 할당 (PostgreSQL 함수 호출)
    const { data: variantId, error: assignError } = await supabase.rpc(
      "assign_cta_variant",
      {
        p_test_config_id: testConfigId,
        p_user_id: userId || null,
        p_consultation_id: consultationId || null,
      }
    );
    
    if (assignError || !variantId) {
      console.error("[CTA AB Test] Variant assignment error:", assignError);
      return null;
    }
    
    // 변형 정보 조회
    const { data: variant, error: variantError } = await supabase
      .from("cta_variants")
      .select("*")
      .eq("id", variantId)
      .single();
    
    if (variantError || !variant) {
      console.error("[CTA AB Test] Variant load error:", variantError);
      return null;
    }
    
    return variant as CtaVariant;
  } catch (error) {
    console.error("[CTA AB Test] Variant assignment failed:", error);
    return null;
  }
}

/**
 * CTA 성능 로그 기록
 */
export async function logCtaPerformance(
  variantId: string,
  eventType: "impression" | "primary_click" | "secondary_click" | "tertiary_click" | "purchase",
  options?: {
    userId?: string;
    consultationId?: string;
    recommendationId?: string;
    timeToClickMs?: number;
    scrollPosition?: number;
    viewportPosition?: "top" | "middle" | "bottom";
    userAgent?: string;
    screenSize?: "mobile" | "tablet" | "desktop";
  }
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    
    // 변형의 테스트 설정 ID 조회
    const { data: variant } = await supabase
      .from("cta_variants")
      .select("test_config_id")
      .eq("id", variantId)
      .single();
    
    await supabase.from("cta_performance_logs").insert({
      test_config_id: variant?.test_config_id || null,
      variant_id: variantId,
      user_id: options?.userId || null,
      consultation_id: options?.consultationId || null,
      recommendation_id: options?.recommendationId || null,
      event_type: eventType,
      time_to_click_ms: options?.timeToClickMs || null,
      scroll_position: options?.scrollPosition || null,
      viewport_position: options?.viewportPosition || null,
      user_agent: options?.userAgent || null,
      screen_size: options?.screenSize || null,
    });
    
    logEvent({
      category: "cta_ab_test",
      action: eventType,
      payload: {
        variantId,
        ...options,
      },
    });
  } catch (error) {
    console.error("[CTA AB Test] Performance logging failed:", error);
    // 실패해도 메인 플로우에 영향 없음
  }
}

/**
 * CTA A/B 테스트 성능 조회
 */
export async function getCtaAbTestPerformance(
  testConfigId?: string
): Promise<any[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    let query = supabase.from("view_cta_ab_test_performance").select("*");
    
    if (testConfigId) {
      query = query.eq("test_config_id", testConfigId);
    }
    
    const { data, error } = await query.order("click_through_rate", {
      ascending: false,
    });
    
    if (error) {
      console.error("[CTA AB Test] Performance query error:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("[CTA AB Test] Performance query failed:", error);
    return [];
  }
}

