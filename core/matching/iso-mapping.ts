type IsoMappingRule = {
  icf: string[]
  iso: string
  label: string
}

/**
 * TODO: populate with full mapping from `docs/DIR.md`.
 */
export const isoMappingTable: IsoMappingRule[] = [
  {
    icf: ["d450", "e120"],
    iso: "18 12 10",
    label: "이동식 경사로",
  },
  {
    icf: ["b765", "d550"],
    iso: "15 09 13",
    label: "무게조절 식사 도구",
  },
]

export const findIsoCodes = (icfCodes: string[]) => {
  return isoMappingTable.filter(rule => rule.icf.every(code => icfCodes.includes(code)))
}

