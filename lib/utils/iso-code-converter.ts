/**
 * ISO 코드 레벨 변환 유틸리티
 * Class/Subclass 레벨 ISO 코드를 Division 레벨로 변환
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ISO 코드 레벨 확인
 * @param isoCode ISO 코드
 * @returns 레벨 정보
 */
export function getIsoCodeLevel(isoCode: string | null | undefined): {
  level: "class" | "subclass" | "division" | "invalid" | "null";
  parts: string[];
} {
  if (!isoCode || !isoCode.trim()) {
    return { level: "null", parts: [] };
  }

  const parts = isoCode.trim().split(" ").filter(Boolean);
  const codeLength = parts.join("").length;

  if (codeLength === 2) {
    return { level: "class", parts };
  } else if (codeLength === 4) {
    return { level: "subclass", parts };
  } else if (codeLength === 6) {
    return { level: "division", parts };
  }

  return { level: "invalid", parts };
}

/**
 * Subclass ISO 코드를 Division 레벨로 변환
 * @param subclassCode Subclass 코드 (예: "15 09")
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns Division 코드 또는 null (변환 실패 시)
 */
export async function convertSubclassToDivision(
  subclassCode: string,
  supabase?: any
): Promise<string | null> {
  const client = supabase || getSupabaseServerClient();

  try {
    // Subclass 코드 정규화
    const normalizedSubclass = subclassCode.replace(/\s/g, "");
    const subclassWithSpace = subclassCode.includes(" ")
      ? subclassCode
      : `${subclassCode.slice(0, 2)} ${subclassCode.slice(2)}`;

    // parent_code가 이 Subclass인 첫 번째 Division 조회
    const { data: divisions, error } = await client
      .from("iso_codes")
      .select("code, name, level")
      .or(`parent_code.eq.${subclassCode},parent_code.eq.${normalizedSubclass},parent_code.eq.${subclassWithSpace}`)
      .eq("level", 3) // Division 레벨만
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(1);

    if (error) {
      console.error(
        `[convertSubclassToDivision] Error converting ${subclassCode}:`,
        error
      );
      return null;
    }

    if (divisions && divisions.length > 0) {
      return divisions[0].code;
    }

    // Division이 없으면 임시 Division 코드 생성 (예: "15 09" → "15 09 01")
    return `${subclassWithSpace} 01`;
  } catch (error) {
    console.error(
      `[convertSubclassToDivision] Exception converting ${subclassCode}:`,
      error
    );
    return null;
  }
}

/**
 * Class ISO 코드를 Division 레벨로 변환
 * @param classCode Class 코드 (예: "15")
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns Division 코드 또는 null (변환 실패 시)
 */
export async function convertClassToDivision(
  classCode: string,
  supabase?: any
): Promise<string | null> {
  const client = supabase || getSupabaseServerClient();

  try {
    // 해당 Class의 첫 번째 Subclass의 첫 번째 Division 찾기
    const { data: divisions, error } = await client
      .from("iso_codes")
      .select("code, level, parent_code")
      .eq("level", 3) // Division 레벨만
      .eq("is_active", true)
      .like("code", `${classCode} %`)
      .order("code", { ascending: true })
      .limit(1);

    if (error) {
      console.error(
        `[convertClassToDivision] Error converting ${classCode}:`,
        error
      );
      return null;
    }

    if (divisions && divisions.length > 0) {
      return divisions[0].code;
    }

    // Division이 없으면 임시 Division 코드 생성 (예: "15" → "15 01 01")
    return `${classCode} 01 01`;
  } catch (error) {
    console.error(
      `[convertClassToDivision] Exception converting ${classCode}:`,
      error
    );
    return null;
  }
}

/**
 * ISO 코드를 Division 레벨로 자동 변환
 * @param isoCode ISO 코드 (Class, Subclass, Division 모두 가능)
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns Division 레벨 코드 또는 원본 코드 (변환 실패 시)
 */
export async function convertToDivisionLevel(
  isoCode: string | null | undefined,
  supabase?: any
): Promise<string | null> {
  // null이거나 빈 문자열이면 그대로 반환
  if (!isoCode || !isoCode.trim()) {
    return isoCode || null;
  }

  // 특수 코드는 그대로 반환 (예: "N999999")
  if (isoCode.startsWith("N") || isoCode === "00 00") {
    return isoCode;
  }

  const { level, parts } = getIsoCodeLevel(isoCode);

  // 이미 Division 레벨이면 그대로 반환
  if (level === "division") {
    return isoCode;
  }

  // Subclass 레벨이면 Division으로 변환
  if (level === "subclass") {
    const divisionCode = await convertSubclassToDivision(isoCode, supabase);
    if (divisionCode) {
      console.log(
        `[convertToDivisionLevel] Converted ${isoCode} (Subclass) → ${divisionCode} (Division)`
      );
      return divisionCode;
    }
  }

  // Class 레벨이면 Division으로 변환
  if (level === "class") {
    const divisionCode = await convertClassToDivision(isoCode, supabase);
    if (divisionCode) {
      console.log(
        `[convertToDivisionLevel] Converted ${isoCode} (Class) → ${divisionCode} (Division)`
      );
      return divisionCode;
    }
  }

  // 변환 실패 시 원본 반환 (경고 로그)
  console.warn(
    `[convertToDivisionLevel] Failed to convert ${isoCode} (${level}), using original code`
  );
  return isoCode;
}
