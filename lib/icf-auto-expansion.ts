/**
 * ICF 코드 자동 확장 시스템
 * 
 * 자주 사용되는 ICF 코드를 자동으로 Core Set에 추가하고,
 * ISO 매핑 힌트를 자동 생성합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

// logEvent import 확인
if (typeof logEvent === "undefined") {
  const { logEvent: logEventImport } = require("@/lib/logging");
  // @ts-ignore
  global.logEvent = logEventImport;
}

export interface IcfAutoExpandConfig {
  id: string;
  name: string;
  min_usage_count: number;
  min_unique_consultations: number;
  min_priority_score: number;
  min_recent_usage_days: number;
  auto_expand_enabled: boolean;
  require_admin_approval: boolean;
  batch_size: number;
  auto_generate_iso_hints: boolean;
  iso_hint_confidence_threshold: number;
}

export interface IcfExpansionCandidate {
  icf_code: string;
  category: string;
  usage_count: number;
  unique_consultations: number;
  priority_score: number;
  last_seen_at: string;
  suggested_iso_hints: string[];
  iso_hint_confidence: number;
}

export interface IcfExpansionResult {
  icf_code: string;
  status: string;
  message: string;
}

/**
 * ICF 코드 확장 후보 생성
 */
export async function generateExpansionCandidates(
  configId?: string
): Promise<IcfExpansionCandidate[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase.rpc("generate_icf_expansion_candidates", {
      p_config_id: configId || null,
    });
    
    if (error) {
      console.error("[ICF Auto Expansion] Generate candidates error:", error);
      logEvent({
        category: "system",
        action: "icf_expansion_candidates_error",
        payload: { error: error.message },
        level: "error",
      });
      return [];
    }
    
    return (data || []).map((row: any) => ({
      icf_code: row.icf_code,
      category: row.category,
      usage_count: row.usage_count,
      unique_consultations: row.unique_consultations,
      priority_score: Number(row.priority_score),
      last_seen_at: row.last_seen_at,
      suggested_iso_hints: row.suggested_iso_hints || [],
      iso_hint_confidence: Number(row.iso_hint_confidence),
    }));
  } catch (error) {
    console.error("[ICF Auto Expansion] Generate candidates failed:", error);
    return [];
  }
}

/**
 * 자동 확장 실행
 */
export async function executeAutoExpansion(
  configId?: string,
  batchSize?: number,
  requireApproval?: boolean
): Promise<IcfExpansionResult[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase.rpc("execute_icf_auto_expansion", {
      p_config_id: configId || null,
      p_batch_size: batchSize || 10,
      p_require_approval: requireApproval !== undefined ? requireApproval : true,
    });
    
    if (error) {
      console.error("[ICF Auto Expansion] Execute expansion error:", error);
      logEvent({
        category: "system",
        action: "icf_auto_expansion_error",
        payload: { error: error.message },
        level: "error",
      });
      return [];
    }
    
    const results: IcfExpansionResult[] = (data || []).map((row: any) => ({
      icf_code: row.icf_code,
      status: row.status,
      message: row.message,
    }));
    
    if (results.length > 0) {
      logEvent({
        category: "system",
        action: "icf_auto_expansion_executed",
        payload: {
          expanded_count: results.filter((r) => r.status === "SUCCESS").length,
          total_candidates: results.length,
        },
      });
    }
    
    return results;
  } catch (error) {
    console.error("[ICF Auto Expansion] Execute expansion failed:", error);
    return [];
  }
}

/**
 * 활성화된 자동 확장 설정 조회
 */
export async function getActiveAutoExpandConfig(): Promise<IcfAutoExpandConfig | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("icf_auto_expand_config")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    
    if (error) {
      console.error("[ICF Auto Expansion] Config load error:", error);
      return null;
    }
    
    return data as IcfAutoExpandConfig | null;
  } catch (error) {
    console.error("[ICF Auto Expansion] Config load failed:", error);
    return null;
  }
}

/**
 * 확장 후보 승인
 */
export async function approveExpansionCandidate(
  candidateId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase
      .from("icf_auto_expand_candidates")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId)
      .eq("status", "pending");
    
    if (error) {
      console.error("[ICF Auto Expansion] Approve candidate error:", error);
      return false;
    }
    
    logEvent({
      category: "system",
      action: "icf_expansion_candidate_approved",
      payload: { candidateId, userId },
    });
    
    return true;
  } catch (error) {
    console.error("[ICF Auto Expansion] Approve candidate failed:", error);
    return false;
  }
}

/**
 * 확장 후보 거부
 */
export async function rejectExpansionCandidate(
  candidateId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase
      .from("icf_auto_expand_candidates")
      .update({
        status: "rejected",
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId)
      .eq("status", "pending");
    
    if (error) {
      console.error("[ICF Auto Expansion] Reject candidate error:", error);
      return false;
    }
    
    logEvent({
      category: "system",
      action: "icf_expansion_candidate_rejected",
      payload: { candidateId, userId, reason },
    });
    
    return true;
  } catch (error) {
    console.error("[ICF Auto Expansion] Reject candidate failed:", error);
    return false;
  }
}

/**
 * 확장 후보 목록 조회
 */
export async function getExpansionCandidates(
  status?: "pending" | "approved" | "rejected" | "expanded"
): Promise<any[]> {
  try {
    const supabase = getSupabaseServerClient();
    
    let query = supabase
      .from("icf_auto_expand_candidates")
      .select("*")
      .order("priority_score", { ascending: false });
    
    if (status) {
      query = query.eq("status", status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("[ICF Auto Expansion] Get candidates error:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("[ICF Auto Expansion] Get candidates failed:", error);
    return [];
  }
}

