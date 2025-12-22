/**
 * 인센티브 시스템 유틸리티
 * 
 * 포인트 적립, 쿠폰 발급 및 관리를 담당합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed" | "free_shipping";
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  valid_from: string;
  valid_until: string;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  coupon?: Coupon;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

/**
 * 사용자 포인트 조회
 */
export async function getUserPoints(userId: string): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("users")
      .select("points")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error("[Incentives] Get user points error:", error);
      return 0;
    }
    
    return data?.points || 0;
  } catch (error) {
    console.error("[Incentives] Get user points failed:", error);
    return 0;
  }
}

/**
 * 포인트 적립 (트랜잭션 기록)
 */
export async function awardPoints(
  userId: string,
  points: number,
  transactionType: string,
  description?: string,
  referenceId?: string,
  referenceType?: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase.from("point_transactions").insert({
      user_id: userId,
      points,
      transaction_type: transactionType,
      description: description || null,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
    });
    
    if (error) {
      console.error("[Incentives] Award points error:", error);
      logEvent({
        category: "incentives",
        action: "points_award_error",
        payload: { error: error.message, userId, points },
        level: "error",
      });
      return false;
    }
    
    logEvent({
      category: "incentives",
      action: "points_awarded",
      payload: { userId, points, transactionType },
    });
    
    return true;
  } catch (error) {
    console.error("[Incentives] Award points failed:", error);
    return false;
  }
}

/**
 * 사용 가능한 쿠폰 목록 조회
 */
export async function getAvailableCoupons(): Promise<Coupon[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("is_active", true)
      .gte("valid_until", new Date().toISOString())
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[Incentives] Get coupons error:", error);
      return [];
    }
    
    return (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value),
      min_purchase_amount: Number(row.min_purchase_amount),
      max_discount_amount: row.max_discount_amount ? Number(row.max_discount_amount) : null,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      usage_limit: row.usage_limit,
      usage_count: row.usage_count,
      is_active: row.is_active,
    }));
  } catch (error) {
    console.error("[Incentives] Get coupons failed:", error);
    return [];
  }
}

/**
 * 사용자 쿠폰 목록 조회
 */
export async function getUserCoupons(userId: string): Promise<UserCoupon[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("user_coupons")
      .select(`
        *,
        coupon:coupons(*)
      `)
      .eq("user_id", userId)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[Incentives] Get user coupons error:", error);
      return [];
    }
    
    return (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      coupon_id: row.coupon_id,
      used_at: row.used_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      coupon: row.coupon ? {
        id: row.coupon.id,
        code: row.coupon.code,
        name: row.coupon.name,
        description: row.coupon.description,
        discount_type: row.coupon.discount_type,
        discount_value: Number(row.coupon.discount_value),
        min_purchase_amount: Number(row.coupon.min_purchase_amount),
        max_discount_amount: row.coupon.max_discount_amount ? Number(row.coupon.max_discount_amount) : null,
        valid_from: row.coupon.valid_from,
        valid_until: row.coupon.valid_until,
        usage_limit: row.coupon.usage_limit,
        usage_count: row.coupon.usage_count,
        is_active: row.coupon.is_active,
      } : undefined,
    }));
  } catch (error) {
    console.error("[Incentives] Get user coupons failed:", error);
    return [];
  }
}

/**
 * 쿠폰 발급 (포인트로 교환 또는 자동 발급)
 */
export async function issueCoupon(
  userId: string,
  couponId: string,
  pointsCost?: number
): Promise<{ success: boolean; message?: string; userCoupon?: UserCoupon }> {
  try {
    const supabase = getSupabaseServerClient();
    
    // 쿠폰 정보 조회
    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", couponId)
      .eq("is_active", true)
      .single();
    
    if (couponError || !coupon) {
      return {
        success: false,
        message: "쿠폰을 찾을 수 없습니다.",
      };
    }
    
    // 유효성 검사
    const now = new Date();
    if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
      return {
        success: false,
        message: "유효하지 않은 쿠폰입니다.",
      };
    }
    
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return {
        success: false,
        message: "쿠폰 발급 한도가 초과되었습니다.",
      };
    }
    
    // 포인트 차감 (있는 경우)
    if (pointsCost && pointsCost > 0) {
      const userPoints = await getUserPoints(userId);
      if (userPoints < pointsCost) {
        return {
          success: false,
          message: `포인트가 부족합니다. (보유: ${userPoints}포인트, 필요: ${pointsCost}포인트)`,
        };
      }
      
      // 포인트 차감
      const { error: redeemError } = await supabase.from("point_transactions").insert({
        user_id: userId,
        points: -pointsCost,
        transaction_type: "redeemed_coupon",
        description: `쿠폰 교환: ${coupon.name}`,
        reference_id: couponId,
        reference_type: "coupon",
      });
      
      if (redeemError) {
        console.error("[Incentives] Points redeem error:", redeemError);
        return {
          success: false,
          message: "포인트 차감에 실패했습니다.",
        };
      }
    }
    
    // 쿠폰 발급
    const expiresAt = new Date(coupon.valid_until);
    
    const { data: userCoupon, error: issueError } = await supabase
      .from("user_coupons")
      .insert({
        user_id: userId,
        coupon_id: couponId,
        expires_at: expiresAt.toISOString(),
      })
      .select(`
        *,
        coupon:coupons(*)
      `)
      .single();
    
    if (issueError) {
      // 중복 발급 시도인 경우
      if (issueError.code === "23505") {
        return {
          success: false,
          message: "이미 발급받은 쿠폰입니다.",
        };
      }
      
      console.error("[Incentives] Issue coupon error:", issueError);
      return {
        success: false,
        message: "쿠폰 발급에 실패했습니다.",
      };
    }
    
    // 쿠폰 사용 횟수 증가
    await supabase
      .from("coupons")
      .update({ usage_count: coupon.usage_count + 1 })
      .eq("id", couponId);
    
    logEvent({
      category: "incentives",
      action: "coupon_issued",
      payload: { userId, couponId, pointsCost },
    });
    
    return {
      success: true,
      message: "쿠폰이 발급되었습니다.",
      userCoupon: userCoupon ? {
        id: userCoupon.id,
        user_id: userCoupon.user_id,
        coupon_id: userCoupon.coupon_id,
        used_at: userCoupon.used_at,
        expires_at: userCoupon.expires_at,
        created_at: userCoupon.created_at,
        coupon: userCoupon.coupon ? {
          id: userCoupon.coupon.id,
          code: userCoupon.coupon.code,
          name: userCoupon.coupon.name,
          description: userCoupon.coupon.description,
          discount_type: userCoupon.coupon.discount_type,
          discount_value: Number(userCoupon.coupon.discount_value),
          min_purchase_amount: Number(userCoupon.coupon.min_purchase_amount),
          max_discount_amount: userCoupon.coupon.max_discount_amount ? Number(userCoupon.coupon.max_discount_amount) : null,
          valid_from: userCoupon.coupon.valid_from,
          valid_until: userCoupon.coupon.valid_until,
          usage_limit: userCoupon.coupon.usage_limit,
          usage_count: userCoupon.coupon.usage_count,
          is_active: userCoupon.coupon.is_active,
        } : undefined,
      } : undefined,
    };
  } catch (error) {
    console.error("[Incentives] Issue coupon failed:", error);
    return {
      success: false,
      message: "쿠폰 발급 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 포인트 적립 안내 메시지 생성
 */
export function getPointsEarnedMessage(
  points: number,
  action: "click" | "ippa" | "feedback" | "complete"
): string {
  const actionMessages: Record<string, string> = {
    click: "추천 클릭",
    ippa: "K-IPPA 평가",
    feedback: "피드백 제출",
    complete: "상담 완료",
  };
  
  return `${actionMessages[action]}으로 ${points}포인트가 적립되었습니다!`;
}

/**
 * 포인트로 교환 가능한 쿠폰 목록 조회
 */
export async function getRedeemableCoupons(userPoints: number): Promise<Coupon[]> {
  // 포인트로 교환 가능한 쿠폰은 별도 테이블이나 설정이 필요할 수 있음
  // 현재는 모든 활성 쿠폰 반환
  return await getAvailableCoupons();
}

