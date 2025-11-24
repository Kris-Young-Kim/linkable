type Recommendation = {
  id: string
  clickThroughRate?: number
  priority?: number
}

export const rankRecommendations = (items: Recommendation[]) => {
  return [...items].sort((a, b) => {
    const scoreA = (a.clickThroughRate ?? 0) * 0.7 + (a.priority ?? 0) * 0.3
    const scoreB = (b.clickThroughRate ?? 0) * 0.7 + (b.priority ?? 0) * 0.3
    return scoreB - scoreA
  })
}

