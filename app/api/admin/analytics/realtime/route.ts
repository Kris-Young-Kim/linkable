import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자용 실시간 플랫폼 통계 API
 * GET /api/admin/analytics/realtime
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
    
    // 최근 30분 시간 계산
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    // 1. 활성 사용자수 (최근 5분간 활동 기준)
    const { count: activeUsers } = await supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", fiveMinutesAgo.toISOString());

    // 2. 최근 30분 이벤트 총합
    const { count: recentEvents } = await supabase
      .from("conversion_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyMinutesAgo.toISOString());

    // 3. 실시간 상담 세션 (진행 중)
    const { count: chatSessions } = await supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress")
      .gte("updated_at", thirtyMinutesAgo.toISOString());

    // 4. 최근 30분 클릭수
    const { count: clicks } = await supabase
      .from("conversion_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "recommendation_click")
      .gte("created_at", thirtyMinutesAgo.toISOString());

    // 5. 활동 트렌드 (최근 30분을 5분 단위로 쪼갬)
    const trend = [];
    for (let i = 25; i >= 0; i -= 5) {
      const start = new Date();
      start.setMinutes(start.getMinutes() - i - 5);
      const end = new Date();
      end.setMinutes(end.getMinutes() - i);
      
      const { count } = await supabase
        .from("conversion_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      
      trend.push({
        time: `${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`,
        count: count || 0
      });
    }

    return NextResponse.json({
      activeUsers: activeUsers || 0,
      recentEvents: recentEvents || 0,
      chatSessions: chatSessions || 0,
      clicks: clicks || 0,
      trend
    });
  } catch (error) {
    console.error("[Realtime Analytics API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

