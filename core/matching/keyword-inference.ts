import { findIcfCode } from "@/core/assessment/icf-codes"
import type { IsoMatch } from "@/core/matching/iso-mapping"

type ProductKeywordRule = {
  isoCode: string
  label: string
  description?: string
  keywords: string[]
  icfTriggers?: string[]
  reason?: string
}

const keywordRules: ProductKeywordRule[] = [
  {
    isoCode: "12 22",
    label: "수동 휠체어",
    description: "수동으로 이동하는 휠체어 (ISO 1222)",
    keywords: ["수동 휠체어", "휠체어", "수동 wheel"],
    icfTriggers: ["d465"],
    reason: "사용자가 수동 휠체어를 직접 요청했습니다.",
  },
  {
    isoCode: "12 23",
    label: "전동 휠체어",
    description: "전동으로 이동하는 휠체어 (ISO 1223)",
    keywords: ["전동 휠체어", "전동 휠 체어", "전동의자"],
    reason: "사용자가 전동 휠체어를 직접 요청했습니다.",
  },
  {
    isoCode: "18 30",
    label: "경사로",
    description: "수직 접근성 보조기기 (경사로, 승강기)",
    keywords: ["경사로", "문턱 경사로", "램프", "접이식 경사로"],
    reason: "사용자가 경사로나 문턱 해소 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "12 06",
    label: "보행 보조기 (지팡이/보행기)",
    description: "양팔 조작 보행 보조기기 (지팡이, 보행기 등)",
    keywords: ["지팡이", "보행기", "워커"],
    reason: "사용자가 보행 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "09 33",
    label: "욕실 의자",
    description: "세면, 목욕 및 샤워 보조기기",
    keywords: ["욕실 의자", "샤워 의자", "목욕 의자"],
    reason: "사용자가 욕실/샤워 의자를 직접 요청했습니다.",
  },
  {
    isoCode: "18 18",
    label: "안전 손잡이",
    description: "지지 손잡이 및 그랩바",
    keywords: ["안전 손잡이", "욕실 손잡이", "지지대", "안전바"],
    reason: "사용자가 안전 손잡이나 그랩바를 직접 요청했습니다.",
  },
  {
    isoCode: "12 31",
    label: "체위 변경 보조기기",
    description: "기립 리프트 및 체위 변경 보조기기",
    keywords: ["리프트 체어", "기립 보조", "전동 체어", "체위 변경"],
    reason: "사용자가 체위 변경 보조기기를 직접 요청했습니다.",
  },
]

type AppendKeywordIsoMatchesParams = {
  text?: string | null
  icfCodes: string[]
  matches: IsoMatch[]
}

const normalize = (value?: string | null) => value?.toLowerCase() ?? ""

const buildMatchedIcf = (codes: string[] = []) => {
  return codes
    .map((code) => {
      const meta = findIcfCode(code)
      if (meta) {
        return { code: meta.code, description: meta.description }
      }
      return { code, description: code.toUpperCase() }
    })
    .filter(Boolean)
}

export const appendKeywordIsoMatches = ({
  text,
  icfCodes,
  matches,
}: AppendKeywordIsoMatchesParams): IsoMatch[] => {
  const normalizedText = normalize(text)
  const icfSet = new Set(icfCodes.map((code) => code.toLowerCase()))
  const isoSet = new Set(matches.map((match) => match.isoCode))
  const additions: IsoMatch[] = []

  for (const rule of keywordRules) {
    const textTriggered =
      normalizedText.length > 0 &&
      rule.keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()))
    const icfTriggered = rule.icfTriggers?.some((code) => icfSet.has(code.toLowerCase()))

    if (!textTriggered && !icfTriggered) {
      continue
    }

    if (isoSet.has(rule.isoCode)) {
      continue
    }

    additions.push({
      isoCode: rule.isoCode,
      label: rule.label,
      description: rule.description ?? "",
      score: 1.15,
      matchedIcf: buildMatchedIcf(rule.icfTriggers),
      reason: rule.reason ?? `사용자가 ${rule.label}을(를) 직접 언급했습니다.`,
    })

    isoSet.add(rule.isoCode)
  }

  if (!additions.length) {
    return matches
  }

  return [...additions, ...matches]
}


