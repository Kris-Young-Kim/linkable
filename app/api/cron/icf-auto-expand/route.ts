/**
 * ICF 코드 자동 확장 크론 작업
 * 
 * 자주 사용되는 ICF 코드를 자동으로 Core Set에 추가하고,
 * ISO 매핑 힌트를 자동 생성합니다.
 * 매주 수요일 새벽 3시에 실행됩니다.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";
import {
  getActiveAutoExpandConfig,
  executeAutoExpansion,
  generateExpansionCandidates,
} from "@/lib/icf-auto-expansion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[ICF Auto Expand] Starting auto expansion...");
    const supabase = getSupabaseServerClient();

    // 1. 활성화된 자동 확장 설정 조회
    const config = await getActiveAutoExpandConfig();

    if (!config) {
      console.log("[ICF Auto Expand] No active config found");
      return NextResponse.json({
        success: true,
        message: "No active auto-expansion config found",
        expanded: false,
      });
    }

    if (!config.auto_expand_enabled) {
      console.log("[ICF Auto Expand] Auto expansion is disabled");
      return NextResponse.json({
        success: true,
        message: "Auto expansion is disabled",
        expanded: false,
      });
    }

    // 2. 확장 후보 생성
    console.log("[ICF Auto Expand] Generating expansion candidates...");
    const candidates = await generateExpansionCandidates(config.id);

    if (!candidates || candidates.length === 0) {
      console.log("[ICF Auto Expand] No expansion candidates found");
      return NextResponse.json({
        success: true,
        message: "No expansion candidates found",
        expanded: false,
        candidatesCount: 0,
      });
    }

    console.log(`[ICF Auto Expand] Found ${candidates.length} candidates`);

    // 3. 자동 확장 실행
    console.log("[ICF Auto Expand] Executing auto expansion...");
    const results = await executeAutoExpansion(
      config.id,
      config.batch_size,
      config.require_admin_approval
    );

    const successCount = results.filter((r) => r.status === "SUCCESS").length;
    const pendingCount = results.filter((r) => r.status === "PENDING").length;
    const failedCount = results.filter((r) => r.status === "FAILED").length;

    // 4. 결과 로깅
    logEvent({
      category: "system",
      action: "icf_auto_expansion_cron_executed",
      payload: {
        configId: config.id,
        candidatesCount: candidates.length,
        resultsCount: results.length,
        successCount,
        pendingCount,
        failedCount,
        requireApproval: config.require_admin_approval,
      },
    });

    console.log("[ICF Auto Expand] Auto expansion completed:", {
      candidates: candidates.length,
      results: results.length,
      success: successCount,
      pending: pendingCount,
      failed: failedCount,
    });

    return NextResponse.json({
      success: true,
      message: "ICF auto expansion executed successfully",
      expanded: successCount > 0,
      candidatesCount: candidates.length,
      resultsCount: results.length,
      successCount,
      pendingCount,
      failedCount,
      results: results.slice(0, 10), // 처음 10개만 반환
    });
  } catch (error) {
    console.error("[ICF Auto Expand] Unexpected error:", error);
    logEvent({
      category: "system",
      action: "icf_auto_expansion_cron_error",
      payload: { error: error instanceof Error ? error.message : "Unknown error" },
      level: "error",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
