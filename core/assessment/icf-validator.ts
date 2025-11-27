import type { ParsedAnalysis } from "./parser"

type KeywordRule = {
  id: string
  keywords: string[]
  require?: Partial<Record<"b" | "d" | "e", string[]>>
  forbid?: string[]
}

const keywordRules: KeywordRule[] = [
  {
    id: "hearing_support",
    keywords: ["청각", "보청", "난청", "귀", "듣", "청력", "소리", "통화"],
    require: {
      b: ["b230"],
      d: ["d115", "d310", "d360"],
      e: ["e125"],
    },
    forbid: ["b765", "d550"],
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
    }
  }

  if (mutated) {
    draft.normalizedCodes = rebuildNormalized(draft)
    return { analysis: draft, updated: true, appliedRules }
  }

  return { analysis: draft, updated: false, appliedRules }
}


