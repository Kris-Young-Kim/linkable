/**
 * ISO 9999 카탈로그 - 데이터베이스 우선 조회 함수들
 * 
 * Full ISO 코드를 모두 사용하므로 데이터베이스에서 직접 조회합니다.
 * Static catalog는 fallback으로만 사용됩니다.
 */

import { IsoCodeInfo, getIsoCodeInfo, getIsoCodesByClass, searchIsoCodes, getAllIsoCodes } from './iso-9999-catalog'

/**
 * ISO 코드로 정보 조회 (비동기, 데이터베이스 우선)
 * 
 * @param iso ISO 코드 (예: "15 09", "12 03")
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns ISO 코드 정보 또는 undefined
 */
export async function getIsoCodeInfoAsync(
  iso: string,
  supabase?: any
): Promise<IsoCodeInfo | undefined> {
  // 데이터베이스 우선 조회
  if (supabase) {
    try {
      // ISO 코드 정규화 (공백 제거 또는 유지)
      const normalizedIso = iso.replace(/\s/g, "")
      const isoWithSpace = iso.includes(" ") ? iso : `${iso.slice(0, 2)} ${iso.slice(2)}`
      
      const { data: isoCode } = await supabase
        .from("iso_codes")
        .select("code, name, description, parent_code, level")
        .or(`code.eq.${iso},code.eq.${normalizedIso},code.eq.${isoWithSpace}`)
        .eq("is_active", true)
        .maybeSingle()

      if (isoCode) {
        // Class 추출 (코드의 앞 2자리)
        const classCode = isoCode.code.replace(/\s/g, "").slice(0, 2)
        const subclass = isoCode.code.replace(/\s/g, "")
        
        return {
          iso: isoCode.code,
          label: isoCode.name,
          description: isoCode.description || "",
          class: classCode,
          subclass: subclass,
        }
      }
    } catch (error) {
      console.error(`[getIsoCodeInfoAsync] Database lookup failed for ${iso}:`, error)
      // 데이터베이스 조회 실패 시 fallback
    }
  }

  // 데이터베이스 조회 실패하거나 supabase가 없으면 static catalog 사용 (fallback)
  return getIsoCodeInfo(iso)
}

/**
 * 클래스별 ISO 코드 목록 조회 (비동기, 데이터베이스 우선)
 * 
 * @param classCode 클래스 코드 (예: "12", "15")
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns ISO 코드 정보 배열
 */
export async function getIsoCodesByClassAsync(
  classCode: string,
  supabase?: any
): Promise<IsoCodeInfo[]> {
  // 데이터베이스 우선 조회
  if (supabase) {
    try {
      const { data: isoCodes } = await supabase
        .from("iso_codes")
        .select("code, name, description, parent_code, level")
        .like("code", `${classCode}%`)
        .eq("is_active", true)
        .order("code", { ascending: true })

      if (isoCodes && isoCodes.length > 0) {
        return isoCodes.map((isoCode: any) => {
          const normalizedCode = isoCode.code.replace(/\s/g, "")
          const classCodeFromDb = normalizedCode.slice(0, 2)
          
          return {
            iso: isoCode.code,
            label: isoCode.name,
            description: isoCode.description || "",
            class: classCodeFromDb,
            subclass: normalizedCode,
          }
        })
      }
    } catch (error) {
      console.error(`[getIsoCodesByClassAsync] Database lookup failed for class ${classCode}:`, error)
      // 데이터베이스 조회 실패 시 fallback
    }
  }

  // 데이터베이스 조회 실패하거나 supabase가 없으면 static catalog 사용 (fallback)
  return getIsoCodesByClass(classCode)
}

/**
 * 검색어로 ISO 코드 검색 (비동기, 데이터베이스 우선)
 * 
 * @param query 검색어
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns ISO 코드 정보 배열
 */
export async function searchIsoCodesAsync(
  query: string,
  supabase?: any
): Promise<IsoCodeInfo[]> {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    // 검색어가 없으면 모든 코드 반환
    return getAllIsoCodesAsync(supabase)
  }

  // 데이터베이스 우선 조회
  if (supabase) {
    try {
      const { data: isoCodes } = await supabase
        .from("iso_codes")
        .select("code, name, description, parent_code, level")
        .or(`code.ilike.%${normalizedQuery}%,name.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%`)
        .eq("is_active", true)
        .order("code", { ascending: true })

      if (isoCodes && isoCodes.length > 0) {
        return isoCodes.map((isoCode: any) => {
          const normalizedCode = isoCode.code.replace(/\s/g, "")
          const classCode = normalizedCode.slice(0, 2)
          
          return {
            iso: isoCode.code,
            label: isoCode.name,
            description: isoCode.description || "",
            class: classCode,
            subclass: normalizedCode,
          }
        })
      }
    } catch (error) {
      console.error(`[searchIsoCodesAsync] Database lookup failed for query "${query}":`, error)
      // 데이터베이스 조회 실패 시 fallback
    }
  }

  // 데이터베이스 조회 실패하거나 supabase가 없으면 static catalog 사용 (fallback)
  return searchIsoCodes(query)
}

/**
 * 모든 ISO 코드 목록 반환 (정렬됨, 비동기, 데이터베이스 우선)
 * 
 * @param supabase Supabase 클라이언트 (선택적)
 * @returns ISO 코드 정보 배열
 */
export async function getAllIsoCodesAsync(
  supabase?: any
): Promise<IsoCodeInfo[]> {
  // 데이터베이스 우선 조회
  if (supabase) {
    try {
      const { data: isoCodes } = await supabase
        .from("iso_codes")
        .select("code, name, description, parent_code, level")
        .eq("is_active", true)
        .order("code", { ascending: true })

      if (isoCodes && isoCodes.length > 0) {
        return isoCodes.map((isoCode: any) => {
          const normalizedCode = isoCode.code.replace(/\s/g, "")
          const classCode = normalizedCode.slice(0, 2)
          
          return {
            iso: isoCode.code,
            label: isoCode.name,
            description: isoCode.description || "",
            class: classCode,
            subclass: normalizedCode,
          }
        })
      }
    } catch (error) {
      console.error("[getAllIsoCodesAsync] Database lookup failed:", error)
      // 데이터베이스 조회 실패 시 fallback
    }
  }

  // 데이터베이스 조회 실패하거나 supabase가 없으면 static catalog 사용 (fallback)
  return getAllIsoCodes()
}
