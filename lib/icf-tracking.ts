/**
 * ICF 코드 사용 추적 유틸리티
 * Core Set에 없는 코드의 사용 빈도와 컨텍스트를 수집하여 확장 전략 수립에 활용
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isInCoreSet, getMissingCodes, type IcfCategory } from "@/core/assessment/icf-codes";
import { logEvent } from "./logging";

export type IcfUsageSource = 
  | "chat_analysis" 
  | "keyword_inference" 
  | "semantic_match" 
  | "manual_input";

export type IcfUsageContext = {
  consultationId?: string;
  keywords?: string[];
  isoCodes?: string[];
  matchedProducts?: string[];
  [key: string]: unknown;
};

/**
 * ICF 코드 사용 로그 기록
 * 
 * @param codes ICF 코드 배열
 * @param source 사용 출처
 * @param context 추가 컨텍스트 정보
 */
export async function logIcfCodeUsage(
  codes: string[],
  source: IcfUsageSource,
  context?: IcfUsageContext
): Promise<void> {
  if (!codes || codes.length === 0) {
    return;
  }

  const supabase = getSupabaseServerClient();
  const logs = [];

  for (const code of codes) {
    if (!code || typeof code !== "string") {
      continue;
    }

    // 카테고리 추론
    const category = inferCategory(code);
    if (!category) {
      continue;
    }

    // Full catalog 사용으로 인해 모든 코드는 동등하게 처리됨
    // is_in_core_set은 하위 호환성을 위해 false로 설정
    logs.push({
      icf_code: code.toUpperCase(),
      category,
      is_in_core_set: false, // Full catalog 사용으로 의미 없음
      consultation_id: context?.consultationId || null,
      source,
      context: context ? {
        keywords: context.keywords || [],
        isoCodes: context.isoCodes || [],
        matchedProducts: context.matchedProducts || [],
        ...Object.fromEntries(
          Object.entries(context).filter(([key]) => 
            !["consultationId", "keywords", "isoCodes", "matchedProducts"].includes(key)
          )
        ),
      } : null,
    });
  }

  if (logs.length === 0) {
    return;
  }

  try {
    const { error } = await supabase
      .from("icf_code_usage_logs")
      .insert(logs);

    if (error) {
      logEvent({
        category: "system",
        action: "icf_code_usage_log_error",
        payload: { error, codes, source },
        level: "error",
      });
    }
  } catch (error) {
    logEvent({
      category: "system",
      action: "icf_code_usage_log_exception",
      payload: { error, codes, source },
      level: "error",
    });
  }
}

/**
 * ICF 코드 카테고리 추론
 */
function inferCategory(code: string): IcfCategory | null {
  const firstChar = code[0]?.toLowerCase();
  if (firstChar === "b" || firstChar === "d" || firstChar === "e") {
    return firstChar as IcfCategory;
  }
  return null;
}

/**
 * 배치로 ICF 코드 사용 로그 기록 (성능 최적화)
 */
export async function logIcfCodeUsageBatch(
  codes: string[],
  source: IcfUsageSource,
  context?: IcfUsageContext
): Promise<void> {
  // 중복 제거
  const uniqueCodes = Array.from(new Set(codes));
  await logIcfCodeUsage(uniqueCodes, source, context);
}

/**
 * Core Set에 없는 코드만 필터링하여 로그 기록
 */
export async function logMissingIcfCodes(
  codes: string[],
  source: IcfUsageSource,
  context?: IcfUsageContext
): Promise<void> {
  const missingCodes = getMissingCodes(codes);
  if (missingCodes.length > 0) {
    await logIcfCodeUsage(missingCodes, source, context);
  }
}

