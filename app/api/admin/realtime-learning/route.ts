import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 실시간 학습 시스템 관리 API
 * GET: 학습 설정 및 통계 조회
 * POST: 학습 설정 생성
 * PUT: 학습 설정 업데이트
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
    const includeStats = searchParams.get("includeStats") === "true";
    const icfCodes = searchParams.get("icfCodes");
    const isoCode = searchParams.get("isoCode");

    // 학습 설정 조회
    const { data: configs, error: configError } = await supabase
      .from("realtime_learning_configs")
      .select("*")
      .order("created_at", { ascending: false });

    if (configError) {
      console.error("[Realtime Learning API] Config error:", configError);
      return NextResponse.json(
        { error: "Failed to load learning configs" },
        { status: 500 }
      );
    }

    let stats = null;
    if (includeStats) {
      // 통계 조회
      let statsQuery = supabase
        .from("realtime_learning_stats")
        .select("*")
        .order("weight_adjustment", { ascending: false })
        .limit(100);

      if (icfCodes) {
        const icfKey = icfCodes.split(",").sort().join(",");
        statsQuery = statsQuery.eq("icf_codes_key", icfKey);
      }

      if (isoCode) {
        statsQuery = statsQuery.eq("iso_code", isoCode);
      }

      const { data: statsData, error: statsError } = await statsQuery;

      if (statsError) {
        console.warn("[Realtime Learning API] Stats error:", statsError);
      } else {
        stats = statsData;
      }
    }

    return NextResponse.json({
      configs: configs || [],
      stats: stats || [],
    });
  } catch (error) {
    console.error("[Realtime Learning API] Unexpected error:", error);
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
      learning_rate,
      min_sample_count,
      decay_factor,
      max_weight_boost,
      min_weight_penalty,
      click_rate_threshold,
      click_rate_boost_factor,
      purchase_rate_boost_factor,
      is_active,
      is_default,
    } = body;

    const supabase = getSupabaseServerClient();

    // 기본 설정이면 기존 기본 설정 해제
    if (is_default) {
      await supabase
        .from("realtime_learning_configs")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    // 활성화 설정이면 기존 활성화 설정 해제
    if (is_active) {
      await supabase
        .from("realtime_learning_configs")
        .update({ is_active: false })
        .eq("is_active", true);
    }

    const { data, error } = await supabase
      .from("realtime_learning_configs")
      .insert({
        name,
        description,
        learning_rate: learning_rate || 0.1,
        min_sample_count: min_sample_count || 5,
        decay_factor: decay_factor || 0.95,
        max_weight_boost: max_weight_boost || 1.5,
        min_weight_penalty: min_weight_penalty || 0.7,
        click_rate_threshold: click_rate_threshold || 0.15,
        click_rate_boost_factor: click_rate_boost_factor || 0.05,
        purchase_rate_boost_factor: purchase_rate_boost_factor || 0.10,
        is_active: is_active || false,
        is_default: is_default || false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[Realtime Learning API] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create learning config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (error) {
    console.error("[Realtime Learning API] Unexpected error:", error);
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

    const supabase = getSupabaseServerClient();

    // 기본 설정이면 기존 기본 설정 해제
    if (updates.is_default) {
      await supabase
        .from("realtime_learning_configs")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", id);
    }

    // 활성화 설정이면 기존 활성화 설정 해제
    if (updates.is_active) {
      await supabase
        .from("realtime_learning_configs")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("realtime_learning_configs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Realtime Learning API] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update learning config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error("[Realtime Learning API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

