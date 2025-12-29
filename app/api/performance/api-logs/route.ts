import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

/**
 * API 성능 로그 저장 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      endpoint,
      method,
      status_code,
      response_time_ms,
      request_size_bytes,
      response_size_bytes,
      user_id,
      error_message,
      timestamp,
    } = body;

    if (!endpoint || !method || status_code === undefined) {
      return NextResponse.json(
        { error: "endpoint, method, and status_code are required" },
        { status: 400 }
      );
    }

    // 사용자 ID 가져오기 (선택적)
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      if (clerkUserId) {
        const supabase = getSupabaseServerClient();
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", clerkUserId)
          .maybeSingle();
        userId = userData?.id || null;
      }
    } catch {
      // 인증 실패는 무시
    }

    const supabase = getSupabaseServerClient();

    // performance_api_logs 테이블에 저장
    const { error } = await supabase.from("performance_api_logs").insert({
      user_id: userId || user_id || null,
      endpoint,
      method,
      status_code,
      response_time_ms,
      request_size_bytes,
      response_size_bytes,
      error_message,
      created_at: timestamp || new Date().toISOString(),
    });

    if (error) {
      console.error("[API Performance API] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to save API performance log" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Performance API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
