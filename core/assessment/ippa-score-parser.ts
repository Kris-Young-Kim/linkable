/**
 * K-IPPA 평가 점수 파서
 * 
 * 사용자가 채팅으로 입력한 답변을 1-5점 점수로 변환합니다.
 */

/**
 * 자연어 답변을 중요도 점수(1-5)로 변환
 */
export function parseImportanceScore(text: string): number | null {
  if (!text) return null;

  const normalized = text.toLowerCase().trim();

  // 숫자 직접 입력 (1-5)
  const numberMatch = normalized.match(/([1-5])/);
  if (numberMatch) {
    const score = parseInt(numberMatch[1], 10);
    if (score >= 1 && score <= 5) {
      return score;
    }
  }

  // 매우 중요, 매우 높음
  if (
    normalized.includes("매우 중요") ||
    normalized.includes("매우높") ||
    normalized.includes("5점") ||
    normalized.includes("5 점") ||
    normalized.includes("다섯") ||
    normalized.includes("최고") ||
    normalized.includes("최대") ||
    normalized.includes("필수") ||
    normalized.includes("꼭")
  ) {
    return 5;
  }

  // 중요, 높음
  if (
    normalized.includes("중요") ||
    normalized.includes("높") ||
    normalized.includes("4점") ||
    normalized.includes("4 점") ||
    normalized.includes("네") ||
    normalized.includes("필요") ||
    normalized.includes("필요해")
  ) {
    return 4;
  }

  // 보통
  if (
    normalized.includes("보통") ||
    normalized.includes("3점") ||
    normalized.includes("3 점") ||
    normalized.includes("세") ||
    normalized.includes("적당") ||
    normalized.includes("그저그래") ||
    normalized.includes("그저 그래")
  ) {
    return 3;
  }

  // 별로 안 중요, 낮음
  if (
    normalized.includes("별로") ||
    normalized.includes("안 중요") ||
    normalized.includes("낮") ||
    normalized.includes("2점") ||
    normalized.includes("2 점") ||
    normalized.includes("두") ||
    normalized.includes("덜") ||
    normalized.includes("그다지")
  ) {
    return 2;
  }

  // 전혀 안 중요, 매우 낮음
  if (
    normalized.includes("전혀") ||
    normalized.includes("1점") ||
    normalized.includes("1 점") ||
    normalized.includes("하나") ||
    normalized.includes("일") ||
    normalized.includes("없") ||
    normalized.includes("안해") ||
    normalized.includes("안 해")
  ) {
    return 1;
  }

  return null;
}

/**
 * 자연어 답변을 어려움 점수(1-5)로 변환
 * 1 = 쉬워요, 5 = 거의 못 해요
 */
export function parseDifficultyScore(text: string): number | null {
  if (!text) return null;

  const normalized = text.toLowerCase().trim();

  // 숫자 직접 입력 (1-5)
  const numberMatch = normalized.match(/([1-5])/);
  if (numberMatch) {
    const score = parseInt(numberMatch[1], 10);
    if (score >= 1 && score <= 5) {
      return score;
    }
  }

  // 매우 어려움, 거의 못 함 (5점)
  if (
    normalized.includes("거의 못") ||
    normalized.includes("거의못") ||
    normalized.includes("전혀 못") ||
    normalized.includes("전혀못") ||
    normalized.includes("5점") ||
    normalized.includes("5 점") ||
    normalized.includes("다섯") ||
    normalized.includes("불가능") ||
    normalized.includes("불가") ||
    normalized.includes("못해") ||
    normalized.includes("못 해") ||
    normalized.includes("안돼") ||
    normalized.includes("안 돼")
  ) {
    return 5;
  }

  // 어려움 (4점)
  if (
    normalized.includes("어려워") ||
    normalized.includes("어렵") ||
    normalized.includes("4점") ||
    normalized.includes("4 점") ||
    normalized.includes("네") ||
    normalized.includes("힘들") ||
    normalized.includes("곤란") ||
    normalized.includes("막혀")
  ) {
    return 4;
  }

  // 보통 (3점)
  if (
    normalized.includes("보통") ||
    normalized.includes("3점") ||
    normalized.includes("3 점") ||
    normalized.includes("세") ||
    normalized.includes("적당") ||
    normalized.includes("그저그래") ||
    normalized.includes("그저 그래") ||
    normalized.includes("괜찮")
  ) {
    return 3;
  }

  // 쉬움 (2점)
  if (
    normalized.includes("쉬워") ||
    normalized.includes("쉽") ||
    normalized.includes("2점") ||
    normalized.includes("2 점") ||
    normalized.includes("두") ||
    normalized.includes("덜") ||
    normalized.includes("괜찮아") ||
    normalized.includes("무난")
  ) {
    return 2;
  }

  // 매우 쉬움 (1점)
  if (
    normalized.includes("매우 쉬") ||
    normalized.includes("매우쉬") ||
    normalized.includes("전혀 어렵지") ||
    normalized.includes("1점") ||
    normalized.includes("1 점") ||
    normalized.includes("하나") ||
    normalized.includes("일") ||
    normalized.includes("문제없") ||
    normalized.includes("문제 없") ||
    normalized.includes("완전 쉬")
  ) {
    return 1;
  }

  return null;
}

/**
 * 사용자 답변에서 평가 점수를 추출
 * 
 * @param text 사용자 답변 텍스트
 * @param questionType "importance" 또는 "difficulty"
 * @returns 추출된 점수 (1-5) 또는 null
 */
export function extractScoreFromAnswer(
  text: string,
  questionType: "importance" | "difficulty"
): number | null {
  if (questionType === "importance") {
    return parseImportanceScore(text);
  } else {
    return parseDifficultyScore(text);
  }
}

/**
 * 평가 질문이 포함되어 있는지 확인
 */
export function isEvaluationQuestion(text: string): boolean {
  if (!text) return false;

  const normalized = text.toLowerCase().trim();

  return (
    normalized.includes("중요") ||
    normalized.includes("중요도") ||
    normalized.includes("어려움") ||
    normalized.includes("어려운 정도") ||
    normalized.includes("어려운지") ||
    normalized.includes("어려운가요") ||
    normalized.includes("점수") ||
    normalized.includes("1점") ||
    normalized.includes("5점") ||
    normalized.includes("얼마나") ||
    normalized.includes("답변해주시면") ||
    normalized.includes("답변해주세요") ||
    normalized.includes("선택해주시면") ||
    normalized.includes("선택해주세요")
  );
}

/**
 * 사용자 답변이 평가 답변인지 확인
 */
export function isEvaluationAnswer(text: string): boolean {
  if (!text) return false;

  // 점수 파싱 시도
  const importanceScore = parseImportanceScore(text);
  const difficultyScore = parseDifficultyScore(text);

  return importanceScore !== null || difficultyScore !== null;
}

