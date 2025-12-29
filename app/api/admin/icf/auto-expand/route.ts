import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  generateExpansionCandidates,
  executeAutoExpansion,
  getActiveAutoExpandConfig,
  approveExpansionCandidate,
  rejectExpansionCandidate,
  getExpansionCandidates,
} from "@/lib/icf-auto-expansion";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ICF 코드 자동 확장 관리 API
 * 
 * @deprecated Full ICF 코드를 모두 사용하므로 Expansion 기능이 더 이상 필요하지 않습니다.
 *             이 API는 비활성화되었습니다.
 * GET: 확장 후보 조회
 * POST: 자동 확장 실행
 * PUT: 후보 승인/거부
 */

export async function GET(request: NextRequest) {
  // Full catalog 사용으로 인해 Expansion 기능 비활성화
  return NextResponse.json(
    { 
      error: "이 기능은 더 이상 사용되지 않습니다. Full ICF 코드를 모두 사용하므로 Expansion이 필요하지 않습니다.",
      deprecated: true
    },
    { status: 410 } // 410 Gone
  )

  /* 비활성화된 코드 (참고용)
  try {
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
    const status = searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | "expanded"
      | null;

    if (action === "candidates") {
      // 확장 후보 생성
      const candidates = await generateExpansionCandidates();
      return NextResponse.json({ candidates });
    } else if (action === "config") {
      // 설정 조회
      const config = await getActiveAutoExpandConfig();
      return NextResponse.json({ config });
    } else {
      // 확장 후보 목록 조회
      const candidates = await getExpansionCandidates(status || undefined);
      return NextResponse.json({ candidates });
    }
  } catch (error) {
    console.error("[ICF Auto Expand API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Full catalog 사용으로 인해 Expansion 기능 비활성화
  return NextResponse.json(
    { 
      error: "이 기능은 더 이상 사용되지 않습니다. Full ICF 코드를 모두 사용하므로 Expansion이 필요하지 않습니다.",
      deprecated: true
    },
    { status: 410 } // 410 Gone
  )

  /* 비활성화된 코드 (참고용)
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
    const { action, configId, batchSize, requireApproval } = body;

    if (action === "execute") {
      // 자동 확장 실행
      const results = await executeAutoExpansion(
        configId,
        batchSize,
        requireApproval
      );
      return NextResponse.json({ results });
    } else if (action === "generate") {
      // 확장 후보 생성 및 저장
      const candidates = await generateExpansionCandidates(configId);
      
      if (candidates.length > 0) {
        const supabase = getSupabaseServerClient();
        
        // 후보를 데이터베이스에 저장
        const { error } = await supabase
          .from("icf_auto_expand_candidates")
          .upsert(
            candidates.map((c) => ({
              icf_code: c.icf_code,
              category: c.category,
              usage_count: c.usage_count,
              unique_consultations: c.unique_consultations,
              priority_score: c.priority_score,
              last_seen_at: c.last_seen_at,
              suggested_iso_hints: c.suggested_iso_hints,
              iso_hint_confidence: c.iso_hint_confidence,
              status: "pending",
            })),
            {
              onConflict: "icf_code,status",
              ignoreDuplicates: false,
            }
          );
        
        if (error) {
          console.error("[ICF Auto Expand API] Save candidates error:", error);
          return NextResponse.json(
            { error: "Failed to save candidates" },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json({
        candidates,
        saved: candidates.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[ICF Auto Expand API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Full catalog 사용으로 인해 Expansion 기능 비활성화
  return NextResponse.json(
    { 
      error: "이 기능은 더 이상 사용되지 않습니다. Full ICF 코드를 모두 사용하므로 Expansion이 필요하지 않습니다.",
      deprecated: true
    },
    { status: 410 } // 410 Gone
  )

  /* 비활성화된 코드 (참고용)
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
    const { candidateId, action, reason } = body;

    if (!candidateId || !action) {
      return NextResponse.json(
        { error: "candidateId and action are required" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const success = await approveExpansionCandidate(candidateId, userId);
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: "Failed to approve candidate" },
          { status: 500 }
        );
      }
    } else if (action === "reject") {
      const success = await rejectExpansionCandidate(candidateId, userId, reason);
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: "Failed to reject candidate" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[ICF Auto Expand API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
