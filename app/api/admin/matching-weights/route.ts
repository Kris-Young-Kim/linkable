import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 하이브리드 매칭 가중치 설정 관리 API
 * GET: 가중치 설정 목록 조회
 * POST: 새 가중치 설정 생성
 * PUT: 가중치 설정 업데이트
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
    const includeInactive = searchParams.get("includeInactive") === "true";
    const abTestName = searchParams.get("abTestName");

    let query = supabase.from("matching_weight_configs").select("*");

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (abTestName) {
      query = query.eq("ab_test_name", abTestName);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("[Matching Weights API] Error:", error);
      return NextResponse.json(
        { error: "Failed to load weight configs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ configs: data || [] });
  } catch (error) {
    console.error("[Matching Weights API] Unexpected error:", error);
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

    // 관리자 권한 확인
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userRole = clerkUser.privateMetadata?.role as string | undefined;

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      weight_rule_based,
      weight_semantic,
      weight_knowledge_graph,
      weight_keyword,
      min_score,
      top_k,
      similarity_threshold,
      is_active,
      is_default,
      is_ab_test_variant,
      ab_test_name,
      ab_test_traffic_percentage,
    } = body;

    // 가중치 합계 검증
    const weightSum =
      (weight_rule_based || 0) +
      (weight_semantic || 0) +
      (weight_knowledge_graph || 0) +
      (weight_keyword || 0);

    if (Math.abs(weightSum - 1.0) > 0.01) {
      return NextResponse.json(
        { error: "가중치 합계가 1.0이 되어야 합니다" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 기본 설정이면 기존 기본 설정 해제
    if (is_default) {
      await supabase
        .from("matching_weight_configs")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    // 활성화 설정이면 기존 활성화 설정 해제 (선택적)
    if (is_active) {
      const { searchParams } = new URL(request.url);
      if (searchParams.get("deactivateOthers") === "true") {
        await supabase
          .from("matching_weight_configs")
          .update({ is_active: false })
          .eq("is_active", true);
      }
    }

    const { data, error } = await supabase
      .from("matching_weight_configs")
      .insert({
        name,
        description,
        weight_rule_based,
        weight_semantic,
        weight_knowledge_graph,
        weight_keyword,
        min_score: min_score || 0.5,
        top_k: top_k || 10,
        similarity_threshold: similarity_threshold || 0.7,
        is_active: is_active || false,
        is_default: is_default || false,
        is_ab_test_variant: is_ab_test_variant || false,
        ab_test_name,
        ab_test_traffic_percentage: ab_test_traffic_percentage || 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[Matching Weights API] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create weight config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (error) {
    console.error("[Matching Weights API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 관리자 권한 확인
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userRole = clerkUser.privateMetadata?.role as string | undefined;

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // 가중치 합계 검증
    if (
      updates.weight_rule_based !== undefined ||
      updates.weight_semantic !== undefined ||
      updates.weight_knowledge_graph !== undefined ||
      updates.weight_keyword !== undefined
    ) {
      const supabase = getSupabaseServerClient();
      const { data: current } = await supabase
        .from("matching_weight_configs")
        .select(
          "weight_rule_based, weight_semantic, weight_knowledge_graph, weight_keyword"
        )
        .eq("id", id)
        .single();

      if (current) {
        const weightSum =
          (updates.weight_rule_based ?? current.weight_rule_based) +
          (updates.weight_semantic ?? current.weight_semantic) +
          (updates.weight_knowledge_graph ?? current.weight_knowledge_graph) +
          (updates.weight_keyword ?? current.weight_keyword);

        if (Math.abs(weightSum - 1.0) > 0.01) {
          return NextResponse.json(
            { error: "가중치 합계가 1.0이 되어야 합니다" },
            { status: 400 }
          );
        }
      }
    }

    // 기본 설정이면 기존 기본 설정 해제
    if (updates.is_default) {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("matching_weight_configs")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", id);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("matching_weight_configs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Matching Weights API] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update weight config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error("[Matching Weights API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
