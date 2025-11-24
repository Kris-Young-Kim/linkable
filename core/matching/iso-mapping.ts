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

const isoMappingTable: IsoMappingRule[] = [
  {
    icf: ["d450", "e120"],
    iso: "18 12 10",
    label: "모듈형 이동 경사로",
    description: "문턱이나 계단을 해소해 걷기/휠체어 이동을 돕는 경사로",
    baseScore: 0.8,
  },
  {
    icf: ["b765", "d550"],
    iso: "15 09 13",
    label: "무게조절 식사 도구",
    description: "손 떨림을 보정해 식사를 돕는 무게감 있는 식기",
    baseScore: 0.78,
  },
  {
    icf: ["b730", "d410"],
    iso: "12 18 06",
    label: "전동식 일어서기 보조",
    description: "서기/앉기를 돕는 전동 리프트형 체어 또는 보조기",
    baseScore: 0.74,
  },
  {
    icf: ["d450"],
    iso: "12 12",
    label: "보행 보조 지팡이",
    description: "균형 유지와 이동 속도 향상을 위한 지팡이/보행보조기",
    baseScore: 0.65,
  },
  {
    icf: ["d920", "e310"],
    iso: "30 99 99",
    label: "여가/인지 활동 키트",
    description: "가족과 함께 사용할 수 있는 여가·인지 재활 키트",
    baseScore: 0.55,
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

