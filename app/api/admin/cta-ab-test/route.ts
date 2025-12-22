import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCtaAbTestPerformance,
  getActiveCtaAbTestConfig,
} from "@/lib/cta-ab-testing";

/**
 * CTA A/B 테스트 관리 API
 * GET: 테스트 설정 및 성능 조회
 * POST: 테스트 설정 생성
 * PUT: 테스트 설정 업데이트
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const testConfigId = searchParams.get("testConfigId");

    const supabase = getSupabaseServerClient();

    if (action === "performance") {
      // 성능 조회
      const performance = await getCtaAbTestPerformance(testConfigId || undefined);
      return NextResponse.json({ performance });
    } else if (action === "active") {
      // 활성화된 설정 조회
      const config = await getActiveCtaAbTestConfig();
      if (!config) {
        return NextResponse.json({ config: null });
      }

      // 변형 목록 조회
      const { data: variants, error: variantsError } = await supabase
        .from("cta_variants")
        .select("*")
        .eq("test_config_id", config.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (variantsError) {
        console.error("[CTA AB Test API] Variants error:", variantsError);
      }

      return NextResponse.json({
        config,
        variants: variants || [],
      });
    } else {
      // 테스트 설정 목록 조회
      const { data: configs, error: configsError } = await supabase
        .from("cta_ab_test_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (configsError) {
        console.error("[CTA AB Test API] Configs error:", configsError);
        return NextResponse.json(
          { error: "Failed to load test configs" },
          { status: 500 }
        );
      }

      return NextResponse.json({ configs: configs || [] });
    }
  } catch (error) {
    console.error("[CTA AB Test API] Error:", error);
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
    const { action, testConfig, variants } = body;

    const supabase = getSupabaseServerClient();

    if (action === "create") {
      // 테스트 설정 생성
      const { data: config, error: configError } = await supabase
        .from("cta_ab_test_configs")
        .insert({
          name: testConfig.name,
          description: testConfig.description,
          is_active: testConfig.is_active || false,
          is_default: testConfig.is_default || false,
          traffic_percentage: testConfig.traffic_percentage || 100,
          start_date: testConfig.start_date || null,
          end_date: testConfig.end_date || null,
          created_by: userId,
        })
        .select()
        .single();

      if (configError) {
        console.error("[CTA AB Test API] Config create error:", configError);
        return NextResponse.json(
          { error: "Failed to create test config" },
          { status: 500 }
        );
      }

      // 변형 생성
      if (variants && Array.isArray(variants) && variants.length > 0) {
        const variantInserts = variants.map((v: any) => ({
          test_config_id: config.id,
          name: v.name,
          description: v.description,
          position: v.position || "bottom",
          primary_button_text: v.primary_button_text || "더 알아보기",
          secondary_button_text: v.secondary_button_text || "구매하기",
          tertiary_button_text: v.tertiary_button_text || null,
          primary_button_variant: v.primary_button_variant || "default",
          secondary_button_variant: v.secondary_button_variant || "outline",
          primary_button_size: v.primary_button_size || "lg",
          secondary_button_size: v.secondary_button_size || "lg",
          primary_button_color: v.primary_button_color || null,
          secondary_button_color: v.secondary_button_color || null,
          primary_button_icon: v.primary_button_icon || null,
          secondary_button_icon: v.secondary_button_icon || null,
          show_price_highlight: v.show_price_highlight !== undefined ? v.show_price_highlight : true,
          show_urgency_text: v.show_urgency_text || false,
          urgency_text: v.urgency_text || null,
          traffic_percentage: v.traffic_percentage || 50,
          display_order: v.display_order || 0,
          is_active: v.is_active !== undefined ? v.is_active : true,
        }));

        const { error: variantsError } = await supabase
          .from("cta_variants")
          .insert(variantInserts);

        if (variantsError) {
          console.error("[CTA AB Test API] Variants create error:", variantsError);
          // 설정은 생성되었으므로 계속 진행
        }
      }

      return NextResponse.json({ config }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[CTA AB Test API] Error:", error);
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
        .from("cta_ab_test_configs")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", id);
    }

    // 활성화 설정이면 기존 활성화 설정 해제
    if (updates.is_active) {
      await supabase
        .from("cta_ab_test_configs")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("cta_ab_test_configs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[CTA AB Test API] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update test config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error("[CTA AB Test API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

