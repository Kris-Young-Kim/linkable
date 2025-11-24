export type IcfCategory = "b" | "d" | "e"

export type IcfCode = {
  code: string
  description: string
  category: IcfCategory
}

/**
 * TODO: Replace with the actual curated ICF core set from `docs/DIR.md`.
 */
export const icfCoreSet: IcfCode[] = [
  { code: "b765", description: "손 떨림", category: "b" },
  { code: "d450", description: "걷기", category: "d" },
  { code: "e120", description: "건축 환경", category: "e" },
]

