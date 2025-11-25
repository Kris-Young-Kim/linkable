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

