import { z } from "zod"
import type { IcfCode } from "./icf-codes"

const icfSchema = z.object({
  b: z.array(z.string()).default([]),
  d: z.array(z.string()).default([]),
  e: z.array(z.string()).default([]),
})

const analysisSchema = z.object({
  icf_analysis: icfSchema,
  needs: z.string().min(1).optional(),
  questions: z.array(z.string()).optional(),
})

export type ParsedAnalysis = z.infer<typeof analysisSchema> & {
  normalizedCodes: IcfCode["code"][]
}

export const parseAnalysis = (raw: unknown): ParsedAnalysis => {
  const parsed = analysisSchema.parse(raw)
  const normalizedCodes = [
    ...parsed.icf_analysis.b,
    ...parsed.icf_analysis.d,
    ...parsed.icf_analysis.e,
  ]

  return {
    ...parsed,
    normalizedCodes,
  }
}

