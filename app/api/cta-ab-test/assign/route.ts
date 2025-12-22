import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assignCtaVariant } from "@/lib/cta-ab-testing";

/**
 * CTA 변형 할당 (클라이언트용)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const { testConfigId, userId: bodyUserId, consultationId } = body;

    if (!testConfigId) {
      return NextResponse.json(
        { error: "testConfigId is required" },
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

    const variant = await assignCtaVariant(
      testConfigId,
      supabaseUserId || bodyUserId,
      consultationId
    );

    return NextResponse.json({ variant });
  } catch (error) {
    console.error("[CTA AB Test API] Assign error:", error);
    return NextResponse.json({ variant: null });
  }
}

