/**
 * K-IPPA (Korean International Prosthetics and Orthotics Association) 효과성 계산
 * 
 * 효과성 점수 = (사용 전 난이도 - 사용 후 난이도) × 중요도
 * 
 * 점수 범위:
 * - importance: 1-5 (1=낮음, 5=매우 높음)
 * - preDifficulty: 1-5 (1=쉬움, 5=매우 어려움)
 * - postDifficulty: 1-5 (1=쉬움, 5=매우 어려움)
 * 
 * 결과 해석:
 * - 양수: 개선됨 (값이 클수록 더 큰 개선)
 * - 0: 변화 없음
 * - 음수: 악화됨 (드물지만 가능)
 */

export type IppaInput = {
  importance: number // 1-5
  preDifficulty: number // 1-5
  postDifficulty: number // 1-5
}

export type IppaResult = {
  effectivenessScore: number
  improvement: number // preDifficulty - postDifficulty
  improvementPercentage: number // (improvement / preDifficulty) * 100
  interpretation: "excellent" | "good" | "moderate" | "minimal" | "none" | "worse"
}

/**
 * K-IPPA 효과성 점수 계산
 */
export const calculateEffectiveness = ({ importance, preDifficulty, postDifficulty }: IppaInput): IppaResult => {
  // 입력 검증
  if (importance < 1 || importance > 5 || preDifficulty < 1 || preDifficulty > 5 || postDifficulty < 1 || postDifficulty > 5) {
    throw new Error("All scores must be between 1 and 5")
  }

  const improvement = preDifficulty - postDifficulty
  const effectivenessScore = improvement * importance
  const improvementPercentage = preDifficulty > 0 ? (improvement / preDifficulty) * 100 : 0

  // 해석 결정
  let interpretation: IppaResult["interpretation"]
  if (effectivenessScore >= 12) {
    interpretation = "excellent" // 매우 큰 개선
  } else if (effectivenessScore >= 8) {
    interpretation = "good" // 좋은 개선
  } else if (effectivenessScore >= 4) {
    interpretation = "moderate" // 중간 정도 개선
  } else if (effectivenessScore > 0) {
    interpretation = "minimal" // 최소한의 개선
  } else if (effectivenessScore === 0) {
    interpretation = "none" // 변화 없음
  } else {
    interpretation = "worse" // 악화
  }

  return {
    effectivenessScore: Number(effectivenessScore.toFixed(2)),
    improvement,
    improvementPercentage: Number(improvementPercentage.toFixed(1)),
    interpretation,
  }
}

/**
 * 포인트 적립 계산 (효과성 점수 기반)
 * 
 * @param effectivenessScore 효과성 점수
 * @returns 적립 포인트
 */
export const calculatePoints = (effectivenessScore: number): number => {
  if (effectivenessScore <= 0) {
    return 0
  }
  // 효과성 점수에 비례하여 포인트 적립 (최대 100점)
  return Math.min(Math.round(effectivenessScore * 5), 100)
}

