export type Sentiment = "positive" | "neutral" | "negative"

const positiveKeywords = ["좋", "편해", "만족"]
const negativeKeywords = ["불편", "어려", "힘들"]

export const analyseFeedback = (text: string): Sentiment => {
  const lower = text.toLowerCase()
  if (positiveKeywords.some(keyword => lower.includes(keyword))) return "positive"
  if (negativeKeywords.some(keyword => lower.includes(keyword))) return "negative"
  return "neutral"
}

