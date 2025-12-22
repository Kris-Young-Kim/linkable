import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logCtaPerformance } from "@/lib/cta-ab-testing";

/**
 * CTA 성능 로그 기록 (클라이언트용)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const {
      variantId,
      eventType,
      userId: bodyUserId,
      consultationId,
      recommendationId,
      timeToClickMs,
      scrollPosition,
      viewportPosition,
      userAgent,
      screenSize,
    } = body;

    if (!variantId || !eventType) {
      return NextResponse.json(
        { error: "variantId and eventType are required" },
        { status: 400 }
      );
    }

    // Clerk userId를 Supabase userId로 변환
    let supabaseUserId: string | undefined;
    if (userId) {
      const supabase = getSupabaseServerClient();
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();
      supabaseUserId = userData?.id;
    }

    await logCtaPerformance(variantId, eventType, {
      userId: supabaseUserId || bodyUserId,
      consultationId,
      recommendationId,
      timeToClickMs,
      scrollPosition,
      viewportPosition,
      userAgent,
      screenSize,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CTA AB Test API] Log error:", error);
    // 실패해도 메인 플로우에 영향 없음
    return NextResponse.json({ success: false });
  }
}

