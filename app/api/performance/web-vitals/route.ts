import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Web Vitals 성능 로그 저장 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      metric_name,
      metric_value,
      metric_rating,
      page_path,
      page_url,
      user_agent,
      connection_type,
      device_memory,
      hardware_concurrency,
      timestamp,
    } = body;

    if (!metric_name || metric_value === undefined) {
      return NextResponse.json(
        { error: "metric_name and metric_value are required" },
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
      // 인증 실패는 무시 (익명 사용자도 로깅 가능)
    }

    const supabase = getSupabaseServerClient();

    // performance_web_vitals 테이블에 저장
    const { error } = await supabase.from("performance_web_vitals").insert({
      user_id: userId,
      metric_name,
      metric_value,
      metric_rating,
      page_path,
      page_url,
      user_agent,
      connection_type,
      device_memory,
      hardware_concurrency,
      created_at: timestamp || new Date().toISOString(),
    });

    if (error) {
      console.error("[Web Vitals API] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to save web vitals log" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Web Vitals API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
