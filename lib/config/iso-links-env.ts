/**
 * .env 파일 기반 ISO 코드별 링크 관리 (대안 방식)
 * 
 * 참고: 프로덕션에서는 데이터베이스 방식을 권장합니다.
 * 이 파일은 빠른 프로토타입이나 소수의 ISO 코드만 관리할 때 사용하세요.
 */

/**
 * .env 파일에서 ISO 코드별 링크를 조회
 * 
 * .env 파일 형식:
 * ISO_15_09_LINKS=https://coupang.link/1,https://naver.link/1,https://11st.link/1
 * ISO_18_30_LINKS=https://coupang.link/2,https://naver.link/2
 * 
 * @param isoCode ISO 9999 코드 (예: "15 09", "18 30")
 * @returns 링크 배열 (없으면 빈 배열)
 */
export function getIsoCodeLinksFromEnv(isoCode: string): string[] {
  // ISO 코드를 환경 변수 키로 변환 (공백을 언더스코어로)
  const envKey = `ISO_${isoCode.replace(/\s/g, "_")}_LINKS`
  const links = process.env[envKey]

  // 디버깅: 환경 변수 읽기 시도
  if (process.env.NODE_ENV === "development") {
    console.log(`[iso-links-env] 조회 시도: ${envKey}`, {
      exists: !!links,
      valueLength: links?.length ?? 0,
    })
  }

  if (!links) {
    return []
  }

  // 쉼표로 구분된 링크를 배열로 변환
  const linkArray = links
    .split(",")
    .map((link) => link.trim())
    .filter((link) => link.length > 0)

  if (process.env.NODE_ENV === "development" && linkArray.length > 0) {
    console.log(`[iso-links-env] ${envKey}에서 ${linkArray.length}개 링크 발견`)
  }

  return linkArray
}

/**
 * 여러 ISO 코드에 대한 링크를 일괄 조회
 * 
 * @param isoCodes ISO 코드 배열
 * @returns ISO 코드별 링크 맵
 */
export function getMultipleIsoCodeLinksFromEnv(
  isoCodes: string[],
): Map<string, string[]> {
  const result = new Map<string, string[]>()

  for (const isoCode of isoCodes) {
    const links = getIsoCodeLinksFromEnv(isoCode)
    if (links.length > 0) {
      result.set(isoCode, links)
    }
  }

  return result
}

/**
 * .env 파일에 정의된 모든 ISO 코드 목록 조회
 * 
 * @returns ISO 코드 배열
 */
export function getAllIsoCodesFromEnv(): string[] {
  const isoCodes: string[] = []

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("ISO_") && key.endsWith("_LINKS") && value) {
      // ISO_15_09_LINKS -> "15 09"
      const isoCode = key
        .replace("ISO_", "")
        .replace("_LINKS", "")
        .replace(/_/g, " ")
      isoCodes.push(isoCode)
    }
  }

  return isoCodes
}

/**
 * .env 파일 방식 사용 여부 확인
 * 
 * @returns .env 파일에 ISO 링크가 정의되어 있으면 true
 */
export function isEnvBasedIsoLinksEnabled(): boolean {
  return getAllIsoCodesFromEnv().length > 0
}

