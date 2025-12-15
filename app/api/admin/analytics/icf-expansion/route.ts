import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자용 ICF 코드 확장 우선순위 분석 API
 * GET /api/admin/analytics/icf-expansion
 *
 * 반환 데이터:
 * - Core Set에 없는 ICF 코드 목록
 * - 사용 빈도 및 우선순위 점수
 * - 확장 권장 코드 목록
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
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const minUsageCount = parseInt(searchParams.get("min_usage") || "1", 10);

    // 확장 우선순위 뷰에서 데이터 조회
    const { data: expansionData, error: expansionError } = await supabase
      .from("icf_code_expansion_priority")
      .select("*")
      .gte("total_usage_count", minUsageCount)
      .order("priority_score", { ascending: false })
      .limit(limit);

    if (expansionError) {
      console.error("[ICF Expansion] Query error:", expansionError);
      return NextResponse.json(
        { error: "Failed to fetch expansion data" },
        { status: 500 }
      );
    }

    // 상세 통계 조회
    const codes = (expansionData || []).map((item) => item.icf_code);
    const { data: statistics, error: statsError } = await supabase
      .from("icf_code_statistics")
      .select("*")
      .in("icf_code", codes);

    if (statsError) {
      console.error("[ICF Expansion] Statistics error:", statsError);
    }

    // 통계 데이터와 우선순위 데이터 병합
    const statsMap = new Map(
      (statistics || []).map((stat) => [stat.icf_code, stat])
    );

    const result = (expansionData || []).map((item) => {
      const stats = statsMap.get(item.icf_code);
      return {
        code: item.icf_code,
        category: item.category,
        priorityScore: Number(item.priority_score.toFixed(2)),
        totalUsageCount: item.total_usage_count,
        uniqueConsultations: item.unique_consultations,
        usageBySource: stats?.usage_by_source || {},
        associatedIsoCodes: stats?.associated_iso_codes || [],
        associatedKeywords: stats?.associated_keywords || [],
        firstSeenAt: item.first_seen_at,
        lastSeenAt: item.last_seen_at,
        // 확장 권장 여부 (우선순위 점수 기반)
        recommendedForExpansion: item.priority_score >= 10,
      };
    });

    // 요약 통계
    const summary = {
      totalMissingCodes: result.length,
      highPriorityCodes: result.filter((r) => r.priorityScore >= 20).length,
      mediumPriorityCodes: result.filter(
        (r) => r.priorityScore >= 10 && r.priorityScore < 20
      ).length,
      lowPriorityCodes: result.filter((r) => r.priorityScore < 10).length,
      recommendedForExpansion: result.filter((r) => r.recommendedForExpansion)
        .length,
    };

    return NextResponse.json({
      codes: result,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ICF Expansion] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

