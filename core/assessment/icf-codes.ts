export type IcfCategory = "b" | "d" | "e"

export type IcfCode = {
  code: string
  description: string
  category: IcfCategory
  isoHints?: string[]
}

/**
 * 최소 MVP를 위한 ICF 핵심 코드 셋.
 * 실제 운영 시 `docs/DIR.md`의 활동 분석 표를 기반으로 확장하세요.
 */
export const icfCoreSet: IcfCode[] = [
  { code: "b730", description: "근력 저하", category: "b", isoHints: ["12 18 06"] },
  { code: "b765", description: "수의적 운동 조절(손 떨림)", category: "b", isoHints: ["15 09 13"] },
  { code: "b810", description: "피부 보호 기능", category: "b" },
  { code: "d230", description: "일상 생활 준비", category: "d" },
  { code: "d410", description: "서기/앉기/무릎꿇기", category: "d", isoHints: ["18 30 06"] },
  { code: "d450", description: "걷기", category: "d", isoHints: ["12 12", "18 12 10"] },
  { code: "d550", description: "먹기", category: "d", isoHints: ["15 09 13"] },
  { code: "d920", description: "여가 및 취미", category: "d" },
  { code: "e110", description: "집 안 구조(바닥, 문턱)", category: "e" },
  { code: "e120", description: "건축 환경(계단, 경사로)", category: "e", isoHints: ["18 12 10"] },
  { code: "e150", description: "디자인/제품", category: "e" },
  { code: "e310", description: "가족 구성원의 지원", category: "e" },
]

export const findIcfCode = (code: string) => icfCoreSet.find((item) => item.code === code)

