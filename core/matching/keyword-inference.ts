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

  // 시각 보조기기 (b2xx 확대)
  {
    isoCode: "22 03",
    label: "시각 보조기기",
    description: "저시력 사용자를 위한 확대경, 돋보기, 시각 보조기기 (ISO 2203)",
    keywords: ["시각 보조", "확대경", "돋보기", "저시력", "시력 보조", "눈 보조", "시각 기기", "시력 기기", "확대 기기"],
    icfTriggers: ["b210", "b215", "d110"],
    reason: "사용자가 시각 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "22 06",
    label: "읽기 보조기기",
    description: "시각 장애인을 위한 점자 디스플레이, 스크린 리더, 음성 변환 기기 (ISO 2206)",
    keywords: ["읽기 보조", "점자", "스크린 리더", "음성 변환", "시각 장애", "읽기 기기", "독서 보조", "텍스트 읽기"],
    icfTriggers: ["b210", "d166", "d170"],
    reason: "사용자가 읽기 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "18 06",
    label: "조명 보조기기",
    description: "시각 보조를 위한 조명 기기 (ISO 1806)",
    keywords: ["조명", "밝은 조명", "시각 조명", "독서 조명", "작업 조명", "밝기 보조"],
    icfTriggers: ["b210", "e240"],
    reason: "사용자가 시각 보조 조명을 직접 요청했습니다.",
  },

  // 의사소통 보조기기 (d3xx 확대)
  {
    isoCode: "22 30",
    label: "의사소통 보조기기",
    description: "의사소통 디바이스 및 AAC 솔루션 (ISO 2230)",
    keywords: ["의사소통 보조", "AAC", "대화 보조", "소통 보조", "말하기 보조", "의사소통 기기", "대화 기기", "소통 기기"],
    icfTriggers: ["d310", "d320", "d330", "d350", "d360"],
    reason: "사용자가 의사소통 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "21 09",
    label: "음성 보조기기",
    description: "음성 생성 및 보조 기기 (ISO 2109)",
    keywords: ["음성 보조", "목소리 보조", "발성 보조", "음성 기기", "목소리 기기", "발성 기기"],
    icfTriggers: ["b240", "d320", "d330"],
    reason: "사용자가 음성 보조기기를 직접 요청했습니다.",
  },

  // 인지 보조기기 (b1xx, d1xx)
  {
    isoCode: "04 03",
    label: "인지 훈련 보조기기",
    description: "기억, 주의, 사고 기능 훈련을 위한 보조기기 (ISO 0403)",
    keywords: ["인지 훈련", "기억 훈련", "주의 훈련", "사고 훈련", "인지 보조", "기억 보조", "주의 보조", "사고 보조", "인지 기기", "기억 기기"],
    icfTriggers: ["b140", "b144", "b160", "b164", "d160", "d163", "d175"],
    reason: "사용자가 인지 훈련 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "22 33",
    label: "학습 및 기억 보조기기",
    description: "읽기, 쓰기, 계산 학습 및 기억 보조를 위한 디지털 기기 (ISO 2233)",
    keywords: ["학습 보조", "기억 보조", "학습 기기", "기억 기기", "학습 도구", "기억 도구", "학습 보조기", "기억 보조기"],
    icfTriggers: ["b144", "d140", "d145", "d163", "d170"],
    reason: "사용자가 학습 및 기억 보조기기를 직접 요청했습니다.",
  },

  // 자세 및 체위 보조기기 (b7xx, d4xx 확대)
  {
    isoCode: "12 08",
    label: "균형 보조기기",
    description: "전정 기능 저하 시 균형 유지를 돕는 보조기기 (ISO 1208)",
    keywords: ["균형 보조", "균형 기기", "균형 도구", "균형 유지", "안정 보조"],
    icfTriggers: ["b235", "b760", "d415"],
    reason: "사용자가 균형 보조기기를 직접 요청했습니다.",
  },
  {
    isoCode: "24 06",
    label: "손 기능 보조기기",
    description: "수의적 운동 조절 기능 향상을 위한 손 기능 보조기기 (ISO 2406)",
    keywords: ["손 기능 보조", "손 보조", "손 떨림 보정", "손 떨림 보조", "손 기능 기기", "손 보조 기기"],
    icfTriggers: ["b760", "b765", "d440"],
    reason: "사용자가 손 기능 보조기기를 직접 요청했습니다.",
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


