type ProductRankingInput<TProduct, TExtra extends object = Record<string, never>> = {
  product: TProduct
  matchScore: number
  clickThroughRate?: number
  availabilityScore?: number
  freshnessScore?: number
} & TExtra

type RankedProduct<TProduct, TExtra extends object> = ProductRankingInput<TProduct, TExtra> & {
  finalScore: number
}

export const rankProducts = <TProduct, TExtra extends object = Record<string, never>>(
  items: ProductRankingInput<TProduct, TExtra>[],
): RankedProduct<TProduct, TExtra>[] => {
  return items
    .map((item) => {
      const ctr = item.clickThroughRate ?? 0
      const availability = item.availabilityScore ?? 0.5
      const freshness = item.freshnessScore ?? 0.5
      const matchScore = item.matchScore

      const finalScore = Number((matchScore * 0.6 + ctr * 0.15 + availability * 0.15 + freshness * 0.1).toFixed(3))

      return {
        ...item,
        finalScore,
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
}

