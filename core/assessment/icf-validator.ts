import type { ParsedAnalysis } from "./parser"

type KeywordRule = {
  id: string
  keywords: string[]
  require?: Partial<Record<"b" | "d" | "e", string[]>>
  forbid?: string[]
}

const keywordRules: KeywordRule[] = [
  // 청각 관련
  {
    id: "hearing_support",
    keywords: ["청각", "보청", "난청", "귀", "듣", "청력", "소리", "통화", "전화", "알림"],
    require: {
      b: ["b230"],
      d: ["d115", "d310", "d360"],
      e: ["e125"],
    },
    forbid: ["b765", "d550"],
  },
  
  // 시각 관련 (b2xx 확대)
  {
    id: "vision_support",
    keywords: ["시각", "눈", "시력", "보기", "안경", "확대", "밝기", "어둡", "흐릿", "시야", "시야각", "시야장애", "시각장애", "눈이 나빠", "눈이 안좋", "시력이 나빠", "시력이 안좋"],
    require: {
      b: ["b210", "b215"],
      d: ["d110", "d166"],
      e: ["e240"],
    },
  },
  {
    id: "low_vision",
    keywords: ["저시력", "시력저하", "시력약화", "눈이", "안보", "안개", "흐림", "시력이 떨어", "시력이 약해", "시력이 감소", "시력이 나빠져", "시력이 안좋아"],
    require: {
      b: ["b210"],
      d: ["d110", "d166"],
      e: ["e240", "e150"],
    },
  },
  {
    id: "reading_vision",
    keywords: ["책 읽기 어려", "글씨가 안보", "문서가 안보", "신문 읽기 어려", "작은 글씨", "읽기 어려", "독서 어려", "텍스트가 안보"],
    require: {
      b: ["b210", "b215"],
      d: ["d110", "d166", "d170"],
      e: ["e240", "e130"],
    },
  },
  {
    id: "color_vision",
    keywords: ["색맹", "색상 구분", "색깔 구분", "색상 인식", "색깔 인식", "색상이 안보", "색깔이 안보"],
    require: {
      b: ["b210"],
      d: ["d110"],
      e: ["e240"],
    },
  },
  {
    id: "night_vision",
    keywords: ["야간 시력", "밤에 안보", "어둠에서 안보", "밤에 보기 어려", "어두운 곳", "야간 시야"],
    require: {
      b: ["b210"],
      d: ["d110"],
      e: ["e240"],
    },
  },
  
  // 의사소통 관련 (d3xx 확대)
  {
    id: "communication_support",
    keywords: ["말하기", "대화", "소통", "의사소통", "이해", "표현", "언어", "말", "대화하기", "대화 어려", "소통 어려", "의사소통 어려", "대화가 어려", "소통이 어려"],
    require: {
      d: ["d310", "d320", "d330", "d350", "d360"],
      e: ["e125"],
    },
  },
  {
    id: "speech_difficulty",
    keywords: ["말이", "발음", "발성", "목소리", "음성", "말하기 어려", "소리내기", "말하기 힘들", "말이 안나", "말이 안나오", "발음이 안되", "발음이 어려", "목소리가", "음성이 약해", "말이 불명확", "말이 어눌"],
    require: {
      b: ["b240"],
      d: ["d320", "d330"],
      e: ["e125"],
    },
  },
  {
    id: "language_comprehension",
    keywords: ["이해 어려", "말 못알아", "말 못알아들", "이해 못", "이해가 안", "말이 안들려", "말이 안들리", "언어 이해", "대화 이해", "말 이해"],
    require: {
      b: ["b167"],
      d: ["d310", "d350"],
      e: ["e125"],
    },
  },
  {
    id: "language_expression",
    keywords: ["표현 어려", "말 표현", "의사 표현", "말로 표현", "표현 못", "표현이 안", "말로 전달", "전달 어려"],
    require: {
      b: ["b167"],
      d: ["d330", "d335", "d345"],
      e: ["e125"],
    },
  },
  {
    id: "reading_writing",
    keywords: ["읽기", "쓰기", "독서", "글씨", "문서", "책", "신문", "문자", "읽기 어려", "쓰기 어려", "독서 어려", "글씨 쓰기", "문서 읽기", "책 읽기", "신문 읽기", "문자 읽기", "읽기가 어려", "쓰기가 어려"],
    require: {
      d: ["d140", "d145", "d166", "d170"],
      e: ["e130"],
    },
  },
  {
    id: "nonverbal_communication",
    keywords: ["몸짓", "손짓", "제스처", "표정", "비언어", "비언어적", "몸으로 표현", "손으로 표현"],
    require: {
      d: ["d335", "d345"],
      e: ["e125"],
    },
  },
  
  // 인지 관련 (b1xx, d1xx)
  {
    id: "cognition_support",
    keywords: ["기억", "인지", "생각", "집중", "주의", "판단", "결정", "문제해결", "학습", "인지 기능", "인지 능력", "사고", "사고력", "인지력"],
    require: {
      b: ["b140", "b144", "b160", "b164"],
      d: ["d160", "d163", "d175", "d177"],
      e: ["e130"],
    },
  },
  {
    id: "memory_difficulty",
    keywords: ["잊어", "기억력", "망각", "기억 안나", "기억력 저하", "치매", "인지저하", "기억이 안나", "기억 못", "기억력이 나빠", "기억력이 떨어", "기억력이 약해", "기억력 감소", "망각증", "건망증", "기억 장애", "기억 문제"],
    require: {
      b: ["b144"],
      d: ["d160", "d163"],
      e: ["e130", "e150"],
    },
  },
  {
    id: "attention_difficulty",
    keywords: ["집중", "주의산만", "집중력", "주의력", "산만", "집중 어려", "집중 못", "집중력 저하", "집중력이 떨어", "주의 산만", "주의력 저하", "주의력이 떨어", "산만해", "집중이 안"],
    require: {
      b: ["b140"],
      d: ["d160"],
    },
  },
  {
    id: "thinking_difficulty",
    keywords: ["생각 어려", "사고 어려", "판단 어려", "결정 어려", "문제해결 어려", "사고력 저하", "사고력이 떨어", "판단력 저하", "판단력이 떨어", "결정력 저하", "결정력이 떨어", "문제해결 어려", "문제해결 못"],
    require: {
      b: ["b160", "b164"],
      d: ["d175", "d177"],
      e: ["e130"],
    },
  },
  {
    id: "learning_difficulty",
    keywords: ["학습 어려", "배우기 어려", "학습 능력", "학습 저하", "학습이 어려", "배우기가 어려", "새로운 것 배우기", "학습 장애"],
    require: {
      b: ["b117", "b144", "b160"],
      d: ["d163", "d170", "d177"],
      e: ["e130"],
    },
  },
  {
    id: "orientation_difficulty",
    keywords: ["지남력", "방향감각", "시간 감각", "장소 감각", "지남력 저하", "방향감각이 없", "시간 감각이 없", "장소 감각이 없", "길을 못찾", "시간을 못알아", "장소를 못알아"],
    require: {
      b: ["b114"],
      d: ["d160"],
      e: ["e130"],
    },
  },
  
  // 자세 관련 (b7xx, d4xx 확대)
  {
    id: "posture_support",
    keywords: ["자세", "앉기", "서기", "체위", "균형", "기울어", "넘어", "떨어질", "자세가 나빠", "자세가 안좋", "앉기 어려", "서기 어려", "체위 변경", "자세 유지", "자세가 불안정", "자세가 기울어"],
    require: {
      b: ["b730", "b760"],
      d: ["d410", "d415", "d420"],
      e: ["e110", "e120"],
    },
  },
  {
    id: "sitting_difficulty",
    keywords: ["앉기 어려", "앉아있기 어려", "앉은 자세", "앉은 자세 유지", "앉으면 아파", "앉으면 불편", "앉기 힘들"],
    require: {
      b: ["b730"],
      d: ["d410", "d415"],
      e: ["e110", "e120"],
    },
  },
  {
    id: "standing_difficulty",
    keywords: ["서기 어려", "서있기 어려", "선 자세", "선 자세 유지", "서면 아파", "서면 불편", "서기 힘들", "기립 어려"],
    require: {
      b: ["b730", "b760"],
      d: ["d415", "d420"],
      e: ["e110", "e120"],
    },
  },
  {
    id: "mobility_support",
    keywords: ["이동", "걷기", "보행", "움직임", "이동 어려", "걷기 어려", "보행 어려", "이동이 어려", "걷기가 어려", "보행이 어려", "움직이기 어려", "이동 불편", "걷기 불편", "보행 불편"],
    require: {
      b: ["b730", "b760", "b770"],
      d: ["d450", "d455", "d460"],
      e: ["e120", "e155"],
    },
  },
  {
    id: "wheelchair_support",
    keywords: ["휠체어", "수동 휠체어", "전동 휠체어", "휠체", "차석", "바퀴의자", "휠체어 사용", "휠체어 필요", "휠체어 타야"],
    require: {
      d: ["d465", "d460"],
      e: ["e120", "e155"],
    },
  },
  {
    id: "balance_difficulty",
    keywords: ["균형", "어지러", "비틀", "흔들", "불안정", "전정", "균형 잡기", "균형 유지", "균형이 안", "어지러워", "어지러움", "비틀거려", "흔들려", "불안정해", "전정 기능"],
    require: {
      b: ["b235", "b760"],
      d: ["d415", "d450"],
      e: ["e120", "e1818"],
    },
  },
  {
    id: "posture_pain",
    keywords: ["자세로 인한 통증", "앉으면 아파", "서면 아파", "자세 때문에 아파", "자세 불편", "체위 변경 통증"],
    require: {
      b: ["b730", "b280"],
      d: ["d410", "d415", "d420"],
      e: ["e110", "e120"],
    },
  },
  
  // 손 기능 관련
  {
    id: "hand_function",
    keywords: ["손", "손가락", "잡기", "쥐기", "세밀한", "정밀", "손기능"],
    require: {
      b: ["b760", "b765"],
      d: ["d440", "d445"],
      e: ["e150"],
    },
  },
  {
    id: "tremor",
    keywords: ["떨림", "진전", "손떨림", "떨려", "흔들려"],
    require: {
      b: ["b765"],
      d: ["d440", "d550"],
      e: ["e150"],
    },
  },
  
  // 식사 관련
  {
    id: "eating_support",
    keywords: ["식사", "먹기", "음식", "숟가락", "젓가락", "식기", "식사 어려"],
    require: {
      b: ["b730", "b765"],
      d: ["d550"],
      e: ["e150"],
    },
  },
  
  // 자가관리 관련
  {
    id: "self_care",
    keywords: ["씻기", "목욕", "세면", "배변", "옷입기", "자기관리", "자가관리"],
    require: {
      d: ["d510", "d520", "d530", "d540"],
      e: ["e110", "e150"],
    },
  },
  
  // 가정 활동 관련
  {
    id: "domestic_activities",
    keywords: ["요리", "청소", "가사", "집안일", "가정활동"],
    require: {
      d: ["d630", "d640", "d650"],
      e: ["e110", "e150"],
    },
  },
  
  // 환경 접근성 관련 (e1xx 확대)
  {
    id: "environmental_accessibility",
    keywords: ["문턱", "계단", "경사로", "승강기", "접근", "출입", "이동경로"],
    require: {
      d: ["d450", "d460"],
      e: ["e110", "e120", "e155"],
    },
  },
  {
    id: "home_modification",
    keywords: ["집 구조", "집 수정", "집 개조", "환경 개선", "집안 구조"],
    require: {
      e: ["e110", "e120", "e155"],
    },
  },
]

const includesKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword))

const addCodes = (bucket: string[], codes: string[] = []) => {
  let mutated = false
  for (const code of codes) {
    if (!bucket.includes(code)) {
      bucket.push(code)
      mutated = true
    }
  }
  return mutated
}

const removeCodes = (bucket: string[], codes: string[] = []) => {
  const next = bucket.filter((code) => !codes.includes(code))
  const mutated = next.length !== bucket.length
  return { mutated, next }
}

const rebuildNormalized = (analysis: ParsedAnalysis) => [
  ...analysis.icf_analysis.b,
  ...analysis.icf_analysis.d,
  ...analysis.icf_analysis.e,
]

export type IcfValidationResult = {
  analysis: ParsedAnalysis | null
  updated: boolean
  appliedRules: string[]
}

export const enforceIcfConsistency = (
  message: string,
  analysis: ParsedAnalysis | null,
): IcfValidationResult => {
  if (!analysis) {
    return { analysis, updated: false, appliedRules: [] }
  }

  const normalizedMessage = message.toLowerCase()
  const draft: ParsedAnalysis = {
    ...analysis,
    icf_analysis: {
      b: [...analysis.icf_analysis.b],
      d: [...analysis.icf_analysis.d],
      e: [...analysis.icf_analysis.e],
    },
    normalizedCodes: [...analysis.normalizedCodes],
  }

  const appliedRules: string[] = []
  let mutated = false

  for (const rule of keywordRules) {
    if (!includesKeyword(normalizedMessage, rule.keywords)) {
      continue
    }

    let ruleMutated = false

    if (rule.require?.b) {
      ruleMutated = addCodes(draft.icf_analysis.b, rule.require.b) || ruleMutated
    }
    if (rule.require?.d) {
      ruleMutated = addCodes(draft.icf_analysis.d, rule.require.d) || ruleMutated
    }
    if (rule.require?.e) {
      ruleMutated = addCodes(draft.icf_analysis.e, rule.require.e) || ruleMutated
    }

    if (rule.forbid?.length) {
      const { mutated: removed, next } = removeCodes(draft.normalizedCodes, rule.forbid)
      if (removed) {
        draft.normalizedCodes = next
        draft.icf_analysis.b = draft.icf_analysis.b.filter((code) => !rule.forbid?.includes(code))
        draft.icf_analysis.d = draft.icf_analysis.d.filter((code) => !rule.forbid?.includes(code))
        draft.icf_analysis.e = draft.icf_analysis.e.filter((code) => !rule.forbid?.includes(code))
        ruleMutated = true
      }
    }

    if (ruleMutated) {
      appliedRules.push(rule.id)
      mutated = true
      // 휠체어 관련 규칙 적용 시 로그
      if (rule.id === "wheelchair_support") {
        console.log("[ICF Validator] 휠체어 관련 ICF 코드 추가됨:", {
          ruleId: rule.id,
          addedCodes: {
            d: rule.require?.d || [],
            e: rule.require?.e || [],
          },
        })
      }
    }
  }

  if (mutated) {
    draft.normalizedCodes = rebuildNormalized(draft)
    return { analysis: draft, updated: true, appliedRules }
  }

  return { analysis: draft, updated: false, appliedRules }
}


