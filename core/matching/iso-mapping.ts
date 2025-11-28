import { findIcfCode } from "../assessment/icf-codes"

type IsoMappingRule = {
  icf: string[]
  iso: string
  label: string
  description: string
  baseScore: number
}

export type IsoMatch = {
  isoCode: string
  label: string
  description: string
  score: number
  matchedIcf: { code: string; description: string }[]
  reason: string
}

/**
 * ISO 9999:2022 (7th Edition) 기준 ICF → ISO 매핑 테이블
 * 
 * 참고: ISO 9999:2022 구조
 * - Class: 2자리 (예: 12, 15, 18)
 * - Subclass: 4자리 (예: 1202, 1509, 1830)
 * - Division: 6자리 (예: 120201, 150901, 183001)
 * 
 * 코드 형식: Subclass 레벨 사용 (4자리), 표시는 공백 포함 (예: "12 02")
 */
const isoMappingTable: IsoMappingRule[] = [
  // 청각 및 의사소통 보조기기
  {
    icf: ["b230", "d115"],
    iso: "21 06",
    label: "청각 보조기기(보청기)",
    description: "난청 사용자를 위한 보청기 및 증폭 기기 (ISO 2106)",
    baseScore: 0.84,
  },
  {
    icf: ["b235", "d115"],
    iso: "21 27",
    label: "평형/전정 보조기기",
    description: "어지럼 및 전정 기능 저하를 보조하는 기기 (ISO 2127)",
    baseScore: 0.72,
  },
  {
    icf: ["d360", "e125"],
    iso: "22 30",
    label: "의사소통 보조기기",
    description: "의사소통 디바이스 및 AAC 솔루션 (ISO 2230)",
    baseScore: 0.78,
  },

  // 수직 접근성 (경사로, 승강기)
  {
    icf: ["d450", "e120"],
    iso: "18 30",
    label: "수직 접근성 보조기기",
    description: "문턱이나 계단을 해소해 걷기/휠체어 이동을 돕는 경사로 및 승강기 (ISO 1830)",
    baseScore: 0.85,
  },
  {
    icf: ["e120"],
    iso: "18 30",
    label: "수직 접근성 보조기기",
    description: "건물 및 건축물의 수직 이동을 돕는 보조기기 (ISO 1830)",
    baseScore: 0.75,
  },

  // 식사/음주 보조기기
  {
    icf: ["b765", "d550"],
    iso: "15 09",
    label: "식사 및 음주 보조기기",
    description: "손 떨림을 보정해 식사를 돕는 무게조절 식기 및 적응형 식사 도구 (ISO 1509)",
    baseScore: 0.82,
  },
  {
    icf: ["d550"],
    iso: "15 09",
    label: "식사 및 음주 보조기기",
    description: "식사와 음주 활동을 돕는 보조기기 (ISO 1509)",
    baseScore: 0.70,
  },

  // 체위 변경 보조기기
  {
    icf: ["b730", "d410", "d420"],
    iso: "12 31",
    label: "체위 변경 보조기기",
    description: "서기/앉기/누우기를 돕는 전동 리프트형 체어 및 체위 변경 보조기 (ISO 1231)",
    baseScore: 0.80,
  },
  {
    icf: ["d410", "d420"],
    iso: "12 31",
    label: "체위 변경 보조기기",
    description: "앉기와 서기 동작을 돕는 보조기기 (ISO 1231)",
    baseScore: 0.72,
  },

  // 보행 보조기기
  {
    icf: ["d450"],
    iso: "12 06",
    label: "양팔 조작 보행 보조기기",
    description: "양팔로 조작하는 보행 보조기기 (지팡이, 보행기 등) (ISO 1206)",
    baseScore: 0.75,
  },
  {
    icf: ["d450", "b760"],
    iso: "12 03",
    label: "한팔 조작 보행 보조기기",
    description: "한 팔로 조작하는 보행 보조기기 (ISO 1203)",
    baseScore: 0.70,
  },
  {
    icf: ["d450", "b235"],
    iso: "12 08",
    label: "안내 지팡이 및 상징 지팡이",
    description: "시각 장애인을 위한 안내 지팡이 및 상징 지팡이 (ISO 1208)",
    baseScore: 0.65,
  },

  // 손잡이 및 지지대
  {
    icf: ["e120", "d410"],
    iso: "18 18",
    label: "지지 손잡이 및 그랩바",
    description: "욕실, 계단 등에서 균형 유지와 안전을 돕는 손잡이 및 그랩바 (ISO 1818)",
    baseScore: 0.68,
  },

  // 여가 및 레크리에이션
  {
    icf: ["d920", "e310"],
    iso: "30 03",
    label: "놀이 보조기기",
    description: "가족과 함께 사용할 수 있는 여가·인지 재활 놀이 키트 (ISO 3003)",
    baseScore: 0.60,
  },
  {
    icf: ["d920"],
    iso: "30 03",
    label: "놀이 보조기기",
    description: "여가 및 놀이 활동을 돕는 보조기기 (ISO 3003)",
    baseScore: 0.55,
  },

  // 휠체어
  {
    icf: ["d465", "d450"],
    iso: "12 23",
    label: "전동 휠체어",
    description: "전동으로 이동하는 휠체어 (ISO 1223)",
    baseScore: 0.78,
  },
  {
    icf: ["d465"],
    iso: "12 22",
    label: "수동 휠체어",
    description: "수동으로 이동하는 휠체어 (ISO 1222)",
    baseScore: 0.70,
  },

  // 가정 활동
  {
    icf: ["d640", "d650"],
    iso: "15 03",
    label: "음식 및 음료 준비 보조기기",
    description: "요리 및 음식 준비를 돕는 보조기기 (ISO 1503)",
    baseScore: 0.65,
  },
  {
    icf: ["d640"],
    iso: "15 12",
    label: "청소 보조기기",
    description: "가정 청소 활동을 돕는 보조기기 (ISO 1512)",
    baseScore: 0.60,
  },

  // 자가관리
  {
    icf: ["d510", "d520"],
    iso: "09 33",
    label: "세면, 목욕 및 샤워 보조기기",
    description: "세면, 목욕, 샤워 활동을 돕는 보조기기 (ISO 0933)",
    baseScore: 0.68,
  },
  {
    icf: ["d530"],
    iso: "09 12",
    label: "배변 보조기기",
    description: "배변 활동을 돕는 보조기기 (ISO 0912)",
    baseScore: 0.65,
  },
  {
    icf: ["d540"],
    iso: "09 18",
    label: "옷 입기 보조기기",
    description: "옷 입기 활동을 돕는 보조기기 (ISO 0918)",
    baseScore: 0.62,
  },

  // 시각 보조기기 (b2xx 확대)
  {
    icf: ["b210", "d110"],
    iso: "22 03",
    label: "시각 보조기기",
    description: "저시력 사용자를 위한 확대경, 돋보기, 시각 보조기기 (ISO 2203)",
    baseScore: 0.80,
  },
  {
    icf: ["b210", "d166"],
    iso: "22 06",
    label: "읽기 보조기기",
    description: "시각 장애인을 위한 점자 디스플레이, 스크린 리더, 음성 변환 기기 (ISO 2206)",
    baseScore: 0.78,
  },
  {
    icf: ["b215", "d110"],
    iso: "22 03",
    label: "시각 관련 보조기기",
    description: "시각 기능 보조를 위한 기기 (ISO 2203)",
    baseScore: 0.75,
  },
  {
    icf: ["e240", "b210"],
    iso: "18 06",
    label: "조명 보조기기",
    description: "시각 보조를 위한 조명 기기 (ISO 1806)",
    baseScore: 0.70,
  },

  // 의사소통 보조기기 (d3xx 확대)
  {
    icf: ["b240", "d320"],
    iso: "21 09",
    label: "음성 보조기기",
    description: "음성 생성 및 보조 기기 (ISO 2109)",
    baseScore: 0.76,
  },
  {
    icf: ["d330", "d350"],
    iso: "22 30",
    label: "대화 보조기기",
    description: "대화 및 의사소통을 돕는 보조기기 (ISO 2230)",
    baseScore: 0.74,
  },
  {
    icf: ["d335", "d345"],
    iso: "22 30",
    label: "메시지 생성 보조기기",
    description: "비공식 및 공식 메시지 생성을 돕는 보조기기 (ISO 2230)",
    baseScore: 0.72,
  },
  {
    icf: ["b167", "d310"],
    iso: "22 30",
    label: "언어 이해 보조기기",
    description: "언어 정신 기능 및 구어 메시지 이해를 돕는 보조기기 (ISO 2230)",
    baseScore: 0.70,
  },

  // 인지 보조기기 (b1xx, d1xx)
  {
    icf: ["b144", "d160"],
    iso: "04 03",
    label: "인지 훈련 보조기기",
    description: "기억 및 주의 기능 훈련을 위한 보조기기 (ISO 0403)",
    baseScore: 0.68,
  },
  {
    icf: ["b140", "d160"],
    iso: "04 03",
    label: "주의 집중 보조기기",
    description: "주의 기능 향상을 위한 보조기기 (ISO 0403)",
    baseScore: 0.65,
  },
  {
    icf: ["b160", "b164", "d175"],
    iso: "04 03",
    label: "사고 및 문제해결 보조기기",
    description: "사고 기능 및 문제해결 능력 향상을 위한 보조기기 (ISO 0403)",
    baseScore: 0.70,
  },
  {
    icf: ["b117", "d163"],
    iso: "04 03",
    label: "지적 기능 보조기기",
    description: "지적 기능 및 생각하기 능력 향상을 위한 보조기기 (ISO 0403)",
    baseScore: 0.72,
  },
  {
    icf: ["d140", "d145", "d170"],
    iso: "22 33",
    label: "학습 보조기기",
    description: "읽기, 쓰기, 계산 학습을 돕는 보조기기 (ISO 2233)",
    baseScore: 0.75,
  },
  {
    icf: ["b144", "d163"],
    iso: "22 33",
    label: "기억 보조기기",
    description: "기억 기능 보조를 위한 디지털 기기 (ISO 2233)",
    baseScore: 0.73,
  },

  // 자세 및 체위 변경 보조기기 (b7xx, d4xx 확대)
  {
    icf: ["b710", "d410"],
    iso: "06 03",
    label: "관절 이동성 보조기기",
    description: "관절 이동성 기능 향상을 위한 보조기 (ISO 0603)",
    baseScore: 0.70,
  },
  {
    icf: ["b730", "d420"],
    iso: "12 31",
    label: "근력 저하 체위 변경 보조기기",
    description: "근력 저하 시 체위 변경을 돕는 보조기기 (ISO 1231)",
    baseScore: 0.82,
  },
  {
    icf: ["d415", "b760"],
    iso: "12 31",
    label: "안정한 자세 유지 보조기기",
    description: "안정한 자세 유지를 돕는 보조기기 (ISO 1231)",
    baseScore: 0.75,
  },
  {
    icf: ["b235", "d415"],
    iso: "12 08",
    label: "균형 보조기기",
    description: "전정 기능 저하 시 균형 유지를 돕는 보조기기 (ISO 1208)",
    baseScore: 0.73,
  },
  {
    icf: ["b760", "d440"],
    iso: "24 06",
    label: "손 기능 보조기기",
    description: "수의적 운동 조절 기능 향상을 위한 손 기능 보조기기 (ISO 2406)",
    baseScore: 0.76,
  },
  {
    icf: ["b765", "d440"],
    iso: "24 06",
    label: "손 떨림 보정 보조기기",
    description: "불수의적 운동 조절 보정을 위한 보조기기 (ISO 2406)",
    baseScore: 0.78,
  },
  {
    icf: ["d430", "d435"],
    iso: "24 03",
    label: "물건 들기 및 옮기기 보조기기",
    description: "물건 들기 및 옮기기 활동을 돕는 보조기기 (ISO 2403)",
    baseScore: 0.68,
  },
  {
    icf: ["d445", "b730"],
    iso: "24 06",
    label: "근력 저하 손 기능 보조기기",
    description: "근력 저하 시 손과 팔 사용을 돕는 보조기기 (ISO 2406)",
    baseScore: 0.74,
  },

  // 환경 접근성 보조기기 (e1xx 확대)
  {
    icf: ["e110", "d450"],
    iso: "18 24",
    label: "집 구조 개선 보조기기",
    description: "집 안 구조 개선을 위한 보조기기 (ISO 1824)",
    baseScore: 0.72,
  },
  {
    icf: ["e155", "d460"],
    iso: "18 30",
    label: "건축물 접근성 보조기기",
    description: "건축물 설계 및 건물 제품을 통한 접근성 개선 (ISO 1830)",
    baseScore: 0.80,
  },
  {
    icf: ["d410", "e120"],
    iso: "18 18",
    label: "지지 손잡이 및 그랩바",
    description: "욕실, 계단 등에서 균형 유지와 안전을 돕는 손잡이 및 그랩바 (ISO 1818)",
    baseScore: 0.68,
  },
  {
    icf: ["e110", "d410"],
    iso: "18 09",
    label: "앉기 보조 가구",
    description: "집 안에서 안정적인 앉기를 돕는 가구 (ISO 1809)",
    baseScore: 0.70,
  },
  {
    icf: ["e110", "d415"],
    iso: "18 12",
    label: "안정 자세 유지 보조 침대",
    description: "안정적인 자세 유지를 돕는 침대 및 침대 장비 (ISO 1812)",
    baseScore: 0.68,
  },

  // 여가 및 레크리에이션 확대
  {
    icf: ["d910", "e140"],
    iso: "30 09",
    label: "스포츠 보조기기",
    description: "스포츠 활동을 돕는 보조기기 (ISO 3009)",
    baseScore: 0.65,
  },
  {
    icf: ["d920", "e140"],
    iso: "30 03",
    label: "레크리에이션 보조기기",
    description: "레크리에이션 활동을 돕는 보조기기 (ISO 3003)",
    baseScore: 0.60,
  },
]

const buildReason = (icfCodes: string[], label: string) => {
  const tokens = icfCodes
    .map((code) => {
      const meta = findIcfCode(code)
      return meta ? `${code}(${meta.description})` : code
    })
    .join(" + ")

  return `${tokens} 이(가) 관찰되어 ${label} 솔루션을 추천합니다.`
}

export const getIsoMatches = (icfCodes: string[]): IsoMatch[] => {
  const normalized = icfCodes
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)

  if (!normalized.length) {
    return []
  }

  return isoMappingTable
    .map((rule) => {
      const matched = rule.icf.filter((code) => normalized.includes(code))
      if (!matched.length) {
        return null
      }

      const coverage = matched.length / rule.icf.length
      const score = Number((rule.baseScore + coverage * 0.4).toFixed(3))

      const matchedMeta = matched
        .map((code) => findIcfCode(code))
        .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta))

      return {
        isoCode: rule.iso,
        label: rule.label,
        description: rule.description,
        score,
        matchedIcf: matchedMeta.map((meta) => ({ code: meta.code, description: meta.description })),
        reason: buildReason(matched, rule.label),
      }
    })
    .filter((item): item is IsoMatch => item !== null)
    .sort((a, b) => b.score - a.score)
}

