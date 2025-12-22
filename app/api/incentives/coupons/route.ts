import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getAvailableCoupons, getUserCoupons, issueCoupon, getUserPoints } from "@/lib/incentives";

/**
 * 인센티브 쿠폰 API
 * GET: 사용 가능한 쿠폰 목록, 사용자 쿠폰 목록
 * POST: 쿠폰 발급
 */

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    
    // Supabase user ID 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "available" | "user"

    if (type === "user") {
      // 사용자 쿠폰 목록
      const userCoupons = await getUserCoupons(userData.id);
      return NextResponse.json({ coupons: userCoupons });
    } else {
      // 사용 가능한 쿠폰 목록
      const availableCoupons = await getAvailableCoupons();
      const userPoints = await getUserPoints(userData.id);
      
      return NextResponse.json({
        coupons: availableCoupons,
        userPoints,
      });
    }
  } catch (error) {
    console.error("[Coupons API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    
    // Supabase user ID 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { couponId, pointsCost } = body;

    if (!couponId) {
      return NextResponse.json(
        { error: "couponId is required" },
        { status: 400 }
      );
    }

    // 쿠폰 발급
    const result = await issueCoupon(
      userData.id,
      couponId,
      pointsCost || 0
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to issue coupon" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      userCoupon: result.userCoupon,
    });
  } catch (error) {
    console.error("[Coupons API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

