import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자용 시스템 로그 조회 API
 * GET /api/admin/logs
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 관리자 권한 확인
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userRole = clerkUser.privateMetadata?.role as string | undefined;

    if (userRole !== "admin" && userRole !== "expert") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");

    // 현재는 실제 system_logs 테이블이 없으므로, 
    // 주요 이벤트 테이블(conversion_events)에서 최근 활동을 추출하여 로그 형식으로 변환
    const { data: events, error: eventError } = await supabase
      .from("conversion_events")
      .select(`
        id,
        event_type,
        created_at,
        source,
        user_id,
        metadata
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventError) throw eventError;

    // 이벤트를 로그 엔트리 형식으로 변환
    const logs = (events || []).map(event => ({
      id: event.id,
      timestamp: event.created_at,
      level: "info", // 활동 로그는 기본적으로 info
      category: "conversion",
      action: event.event_type,
      message: `${event.source || '시스템'}에서 ${event.event_type} 발생`,
      details: {
        userId: event.user_id,
        ...event.metadata as any
      }
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[Admin Logs API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

