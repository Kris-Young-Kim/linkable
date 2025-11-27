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
  // 신체 기능 (Body Functions)
  { code: "b230", description: "청각 기능", category: "b", isoHints: ["21 06"] },
  { code: "b235", description: "전정 기능", category: "b", isoHints: ["21 27"] },
  { code: "b240", description: "기관지 및 목소리 기능", category: "b", isoHints: ["21 09"] },
  { code: "b730", description: "근력 저하", category: "b", isoHints: ["12 18 06"] },
  { code: "b765", description: "수의적 운동 조절(손 떨림)", category: "b", isoHints: ["15 09 13"] },
  { code: "b810", description: "피부 보호 기능", category: "b" },

  // 활동·참여 (d)
  { code: "d110", description: "시청", category: "d" },
  { code: "d115", description: "청취(듣기)", category: "d", isoHints: ["21 06", "22 30"] },
  { code: "d230", description: "일상 생활 준비", category: "d" },
  { code: "d310", description: "구어 메시지 이해", category: "d", isoHints: ["22 30"] },
  { code: "d350", description: "대화", category: "d", isoHints: ["22 30"] },
  { code: "d360", description: "의사소통 기기 사용", category: "d", isoHints: ["22 33"] },
  { code: "d410", description: "서기/앉기/무릎꿇기", category: "d", isoHints: ["18 30 06"] },
  { code: "d450", description: "걷기", category: "d", isoHints: ["12 12", "18 12 10"] },
  { code: "d550", description: "먹기", category: "d", isoHints: ["15 09 13"] },
  { code: "d920", description: "여가 및 취미", category: "d" },

  // 환경 요소 (e)
  { code: "e110", description: "집 안 구조(바닥, 문턱)", category: "e" },
  { code: "e120", description: "건축 환경(계단, 경사로)", category: "e", isoHints: ["18 12 10"] },
  { code: "e125", description: "의사소통용 제품 및 기술", category: "e", isoHints: ["22 30"] },
  { code: "e150", description: "디자인/제품", category: "e" },
  { code: "e310", description: "가족 구성원의 지원", category: "e" },
]

export const findIcfCode = (code: string) => icfCoreSet.find((item) => item.code === code)

