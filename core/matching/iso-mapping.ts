import { findIcfCode } from "../assessment/icf-codes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type IsoMappingRule = {
  icf: string[];
  iso: string;
  label: string;
  description: string;
  baseScore: number;
};

export type IsoMatch = {
  isoCode: string;
  label: string;
  description: string;
  score: number;
  matchedIcf: { code: string; description: string }[];
  reason: string;
};

// DB 매핑 테이블 캐시
let cachedMappingTable: IsoMappingRule[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

/**
 * DB에서 ICF-ISO 매핑 테이블 조회
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns ICF-ISO 매핑 규칙 배열
 */
async function loadMappingTableFromDB(
  supabase?: ReturnType<typeof getSupabaseServerClient>
): Promise<IsoMappingRule[]> {
  // 캐시가 유효하면 반환
  if (cachedMappingTable && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedMappingTable;
  }

  const client = supabase || getSupabaseServerClient();

  try {
    const { data, error } = await client
      .from("icf_iso_mappings")
      .select("icf_codes, iso_code, label, description, base_score")
      .eq("is_active", true)
      .order("base_score", { ascending: false });

    if (error) {
      console.error("[loadMappingTableFromDB] Error:", error);
      return [];
    }

    if (data && data.length > 0) {
      cachedMappingTable = data.map((row) => ({
        icf: row.icf_codes as string[],
        iso: row.iso_code,
        label: row.label,
        description: row.description || "",
        baseScore: Number(row.base_score) || 0.7,
      }));
      cacheTimestamp = Date.now();
      return cachedMappingTable;
    }

    return [];
  } catch (error) {
    console.error("[loadMappingTableFromDB] Exception:", error);
    return [];
  }
}

/**
 * 매핑 테이블 캐시 무효화
 */
export function invalidateMappingCache(): void {
  cachedMappingTable = null;
  cacheTimestamp = 0;
}

const buildReason = (icfCodes: string[], label: string) => {
  const tokens = icfCodes
    .map((code) => {
      const meta = findIcfCode(code);
      return meta ? `${code}(${meta.description})` : code;
    })
    .join(" + ");

  return `${tokens} 이(가) 관찰되어 ${label} 솔루션을 추천합니다.`;
};

/**
 * 매핑 테이블을 사용하여 ICF 코드 매칭 수행
 * @param icfCodes ICF 코드 배열
 * @param mappingTable 매핑 테이블
 * @returns ISO 매칭 결과
 */
function getIsoMatchesFromTable(
  icfCodes: string[],
  mappingTable: IsoMappingRule[]
): IsoMatch[] {
  const normalized = icfCodes
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);

  if (!normalized.length) {
    return [];
  }

  return mappingTable
    .map((rule) => {
      const matched = rule.icf.filter((code) => normalized.includes(code));
      if (!matched.length) {
        return null;
      }

      const coverage = matched.length / rule.icf.length;
      const score = Number((rule.baseScore + coverage * 0.4).toFixed(3));

      const matchedMeta = matched
        .map((code) => findIcfCode(code))
        .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));

      return {
        isoCode: rule.iso,
        label: rule.label,
        description: rule.description,
        score,
        matchedIcf: matchedMeta.map((meta) => ({
          code: meta.code,
          description: meta.description,
        })),
        reason: buildReason(matched, rule.label),
      };
    })
    .filter((item): item is IsoMatch => item !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * ICF 코드로 ISO 매칭 (비동기, DB 매핑 사용)
 *
 * DB에서 ICF-ISO 매핑 테이블을 조회하여 매칭을 수행합니다.
 * 모든 ISO 코드는 Division 레벨(level 3, 6자리)입니다.
 *
 * @param icfCodes ICF 코드 배열
 * @param options 옵션
 * @param options.supabase Supabase 클라이언트 (선택적)
 * @returns ISO 매칭 결과 (Division 레벨)
 */
export async function getIsoMatchesAsync(
  icfCodes: string[],
  options?: {
    supabase?: ReturnType<typeof getSupabaseServerClient>;
    expandToDivisions?: boolean;
  }
): Promise<IsoMatch[]> {
  const { supabase, expandToDivisions = false } = options || {};

  const mappingTable = await loadMappingTableFromDB(supabase);

  // expandToDivisions 옵션은 현재 구현에서는 사용되지 않지만,
  // 타입 호환성을 위해 유지 (향후 Division 레벨 확장 기능 구현 시 사용)
  return getIsoMatchesFromTable(icfCodes, mappingTable);
}

/**
 * ICF 코드로 ISO 매칭 (동기 버전)
 *
 * 주의: 캐시된 매핑 테이블만 사용합니다. 캐시가 없으면 빈 배열 반환.
 * 가능하면 getIsoMatchesAsync()를 사용하세요.
 *
 * @param icfCodes ICF 코드 배열
 * @returns ISO 매칭 결과
 * @deprecated getIsoMatchesAsync() 사용 권장
 */
export const getIsoMatches = (icfCodes: string[]): IsoMatch[] => {
  if (!cachedMappingTable) {
    console.warn(
      "[getIsoMatches] 캐시된 매핑 테이블이 없습니다. getIsoMatchesAsync()를 먼저 호출하세요."
    );
    return [];
  }
  return getIsoMatchesFromTable(icfCodes, cachedMappingTable);
};
