/**
 * 피드백 감성 분석 모듈
 * 
 * 사용자 피드백 텍스트를 분석하여 감성을 파악하고 요약을 생성합니다.
 * MVP에서는 키워드 기반 분석을 사용하며, 향후 Gemini API를 활용한 고도화 가능.
 */

export type Sentiment = "positive" | "neutral" | "negative"

export type FeedbackAnalysis = {
  sentiment: Sentiment
  confidence: number // 0-1
  summary: string
  keywords: string[]
}

const positiveKeywords = [
  "좋",
  "편해",
  "만족",
  "도움",
  "개선",
  "쉬워",
  "유용",
  "추천",
  "감사",
  "훌륭",
  "완벽",
  "최고",
]

const negativeKeywords = [
  "불편",
  "어려",
  "힘들",
  "문제",
  "실망",
  "별로",
  "안좋",
  "부족",
  "불만",
  "어려움",
  "불만족",
]

/**
 * 키워드 기반 감성 분석
 */
export const analyseFeedback = (text: string): FeedbackAnalysis => {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: "neutral",
      confidence: 0,
      summary: "피드백이 제공되지 않았습니다.",
      keywords: [],
    }
  }

  const lower = text.toLowerCase()
  const foundPositive = positiveKeywords.filter((keyword) => lower.includes(keyword))
  const foundNegative = negativeKeywords.filter((keyword) => lower.includes(keyword))

  const positiveScore = foundPositive.length
  const negativeScore = foundNegative.length
  const totalScore = positiveScore + negativeScore

  let sentiment: Sentiment
  let confidence: number

  if (positiveScore > negativeScore) {
    sentiment = "positive"
    confidence = totalScore > 0 ? positiveScore / totalScore : 0.5
  } else if (negativeScore > positiveScore) {
    sentiment = "negative"
    confidence = totalScore > 0 ? negativeScore / totalScore : 0.5
  } else {
    sentiment = "neutral"
    confidence = 0.5
  }

  // 요약 생성 (간단한 버전)
  const summary = generateSummary(text, sentiment, foundPositive, foundNegative)

  return {
    sentiment,
    confidence: Number(confidence.toFixed(2)),
    summary,
    keywords: [...foundPositive, ...foundNegative],
  }
}

/**
 * 피드백 요약 생성
 */
const generateSummary = (
  text: string,
  sentiment: Sentiment,
  positiveKeywords: string[],
  negativeKeywords: string[],
): string => {
  if (text.length <= 50) {
    return text
  }

  // 간단한 요약: 첫 50자 + 감성 표시
  const prefix = text.slice(0, 50).trim()
  const sentimentLabel = sentiment === "positive" ? "긍정적" : sentiment === "negative" ? "부정적" : "중립적"

  return `${prefix}... (${sentimentLabel} 피드백)`
}

/**
 * Gemini API를 활용한 고급 감성 분석 (향후 구현)
 * 
 * @param text 분석할 텍스트
 * @param apiKey Gemini API 키
 * @returns 감성 분석 결과
 */
export const analyseFeedbackWithGemini = async (text: string, apiKey?: string): Promise<FeedbackAnalysis> => {
  // TODO: Gemini API 연동 후 구현
  // 현재는 키워드 기반 분석 사용
  return analyseFeedback(text)
}

