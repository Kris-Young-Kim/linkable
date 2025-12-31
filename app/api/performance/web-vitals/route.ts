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
    } catch (authError) {
      // 인증 실패는 무시 (익명 사용자도 로깅 가능)
      console.log("[Web Vitals API] Auth skipped (anonymous user):", authError instanceof Error ? authError.message : "Unknown");
    }

    const supabase = getSupabaseServerClient();

    // 데이터 정제 및 검증
    const insertData: Record<string, any> = {
      user_id: userId,
      metric_name: String(metric_name).toUpperCase(), // LCP, FID, CLS 등 대문자로 변환
      metric_value: Number(metric_value),
      metric_rating: metric_rating || "good", // 기본값 설정
      page_path: page_path || "/",
      page_url: page_url || null,
      user_agent: user_agent || null,
      connection_type: connection_type || null,
      device_memory: device_memory ? Number(device_memory) : null,
      hardware_concurrency: hardware_concurrency ? Number(hardware_concurrency) : null,
    };

    // timestamp가 있으면 사용, 없으면 현재 시간
    if (timestamp) {
      insertData.created_at = timestamp;
    }

    // performance_web_vitals 테이블에 저장
    const { error, data } = await supabase
      .from("performance_web_vitals")
      .insert(insertData)
      .select();

    if (error) {
      console.error("[Web Vitals API] Insert error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData,
      });
      
      // 개발 환경에서는 상세한 에러 메시지 반환
      const errorMessage = process.env.NODE_ENV === "development"
        ? `Failed to save web vitals log: ${error.message} (Code: ${error.code})`
        : "Failed to save web vitals log";
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === "development" ? {
            code: error.code,
            message: error.message,
            hint: error.hint,
          } : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Web Vitals API] Unexpected error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = process.env.NODE_ENV === "development"
      ? `Internal server error: ${error instanceof Error ? error.message : String(error)}`
      : "Internal server error";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" && error instanceof Error
          ? { stack: error.stack }
          : undefined,
      },
      { status: 500 }
    );
  }
}
