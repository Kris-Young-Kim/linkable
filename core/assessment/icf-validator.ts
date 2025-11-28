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
    keywords: ["시각", "눈", "시력", "보기", "안경", "확대", "밝기", "어둡", "흐릿", "시야", "시야각"],
    require: {
      b: ["b210", "b215"],
      d: ["d110", "d166"],
      e: ["e240"],
    },
  },
  {
    id: "low_vision",
    keywords: ["저시력", "시력저하", "시력약화", "눈이", "안보", "안개", "흐림"],
    require: {
      b: ["b210"],
      d: ["d110", "d166"],
      e: ["e240", "e150"],
    },
  },
  
  // 의사소통 관련 (d3xx 확대)
  {
    id: "communication_support",
    keywords: ["말하기", "대화", "소통", "의사소통", "이해", "표현", "언어", "말", "대화하기"],
    require: {
      d: ["d310", "d320", "d330", "d350", "d360"],
      e: ["e125"],
    },
  },
  {
    id: "speech_difficulty",
    keywords: ["말이", "발음", "발성", "목소리", "음성", "말하기 어려", "소리내기"],
    require: {
      b: ["b240"],
      d: ["d320", "d330"],
      e: ["e125"],
    },
  },
  {
    id: "reading_writing",
    keywords: ["읽기", "쓰기", "독서", "글씨", "문서", "책", "신문", "문자"],
    require: {
      d: ["d140", "d145", "d166", "d170"],
      e: ["e130"],
    },
  },
  
  // 인지 관련 (b1xx, d1xx)
  {
    id: "cognition_support",
    keywords: ["기억", "인지", "생각", "집중", "주의", "판단", "결정", "문제해결", "학습"],
    require: {
      b: ["b140", "b144", "b160", "b164"],
      d: ["d160", "d163", "d175", "d177"],
      e: ["e130"],
    },
  },
  {
    id: "memory_difficulty",
    keywords: ["잊어", "기억력", "망각", "기억 안나", "기억력 저하", "치매", "인지저하"],
    require: {
      b: ["b144"],
      d: ["d160", "d163"],
      e: ["e130", "e150"],
    },
  },
  {
    id: "attention_difficulty",
    keywords: ["집중", "주의산만", "집중력", "주의력", "산만"],
    require: {
      b: ["b140"],
      d: ["d160"],
    },
  },
  
  // 자세 관련 (b7xx, d4xx 확대)
  {
    id: "posture_support",
    keywords: ["자세", "앉기", "서기", "체위", "균형", "기울어", "넘어", "떨어질"],
    require: {
      b: ["b730", "b760"],
      d: ["d410", "d415", "d420"],
      e: ["e110", "e120"],
    },
  },
  {
    id: "mobility_support",
    keywords: ["이동", "걷기", "보행", "움직임", "이동 어려", "걷기 어려", "보행 어려"],
    require: {
      b: ["b730", "b760", "b770"],
      d: ["d450", "d455", "d460"],
      e: ["e120", "e155"],
    },
  },
  {
    id: "wheelchair_support",
    keywords: ["휠체어", "수동 휠체어", "전동 휠체어", "휠체", "차석", "바퀴의자"],
    require: {
      d: ["d465", "d460"],
      e: ["e120", "e155"],
    },
  },
  {
    id: "balance_difficulty",
    keywords: ["균형", "어지러", "비틀", "흔들", "불안정", "전정"],
    require: {
      b: ["b235", "b760"],
      d: ["d415", "d450"],
      e: ["e120", "e1818"],
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


