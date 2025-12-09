/**
 * 동의어 사전
 * 
 * 보조기기 관련 키워드의 동의어를 정의하여
 * 키워드 매칭의 정확도를 향상시킵니다.
 */

export interface SynonymGroup {
  primary: string; // 주요 키워드
  synonyms: string[]; // 동의어 목록
  isoCode?: string; // 관련 ISO 코드 (선택적)
}

/**
 * 보조기기 관련 동의어 그룹
 */
export const synonymGroups: SynonymGroup[] = [
  // 휠체어 관련
  {
    primary: "휠체어",
    synonyms: ["바퀴의자", "차의자", "wheelchair", "휠체", "바퀴의자", "차의자"],
    isoCode: "12 22",
  },
  {
    primary: "전동 휠체어",
    synonyms: ["전동휠체어", "전동의자", "전동차", "전동 휠체", "전동차의자", "power wheelchair", "전동 휠"],
    isoCode: "12 23",
  },
  {
    primary: "수동 휠체어",
    synonyms: ["수동휠체어", "수동의자", "수동차", "수동 휠체", "manual wheelchair"],
    isoCode: "12 22",
  },

  // 보행 보조기기
  {
    primary: "보행기",
    synonyms: ["워커", "보행보조기", "보행보조기기", "보행보조", "walker", "보행기기"],
    isoCode: "12 06",
  },
  {
    primary: "지팡이",
    synonyms: ["목발", "지팡", "cane", "crutch", "스틱"],
    isoCode: "12 06",
  },
  {
    primary: "목발",
    synonyms: ["크러치", "crutch", "지지대", "보행지지대"],
    isoCode: "12 06",
  },

  // 식사 보조기기
  {
    primary: "식기",
    synonyms: ["식사도구", "식사기구", "식사보조기", "식사보조기기", "적응형 식기", "특수 식기"],
    isoCode: "15 09",
  },
  {
    primary: "숟가락",
    synonyms: ["스푼", "적응형 숟가락", "특수 숟가락", "보조 숟가락", "spoon"],
    isoCode: "15 09",
  },
  {
    primary: "포크",
    synonyms: ["적응형 포크", "특수 포크", "보조 포크", "fork"],
    isoCode: "15 09",
  },
  {
    primary: "컵",
    synonyms: ["적응형 컵", "특수 컵", "보조 컵", "손잡이 컵", "양손 컵"],
    isoCode: "15 09",
  },

  // 경사로 및 접근성
  {
    primary: "경사로",
    synonyms: ["램프", "경사대", "경사판", "접이식 경사로", "휴대용 경사로", "ramp"],
    isoCode: "18 30",
  },
  {
    primary: "승강기",
    synonyms: ["리프트", "승강대", "수직 리프트", "계단 승강기", "elevator", "lift"],
    isoCode: "18 30",
  },
  {
    primary: "문턱",
    synonyms: ["턱", "문턱 경사로", "턱 해소", "문턱 제거"],
    isoCode: "18 30",
  },

  // 체위 변경
  {
    primary: "리프트",
    synonyms: ["체위 변경기", "기립 보조기", "전동 리프트", "체위 변경 보조기", "lift"],
    isoCode: "12 31",
  },
  {
    primary: "체위 변경",
    synonyms: ["자세 변경", "체위 보조", "자세 보조", "체위 변경 보조"],
    isoCode: "12 31",
  },

  // 청각 보조기기
  {
    primary: "보청기",
    synonyms: ["청각 보조기", "난청 보조기", "hearing aid", "청각기", "보청기기"],
    isoCode: "21 06",
  },
  {
    primary: "청각",
    synonyms: ["난청", "청력", "듣기", "hearing"],
    isoCode: "21 06",
  },

  // 시각 보조기기
  {
    primary: "확대경",
    synonyms: ["돋보기", "루페", "magnifier", "확대 기기", "확대 도구"],
    isoCode: "22 03",
  },
  {
    primary: "돋보기",
    synonyms: ["확대경", "루페", "magnifying glass", "확대 렌즈"],
    isoCode: "22 03",
  },
  {
    primary: "저시력",
    synonyms: ["시력 저하", "시각 저하", "시력 보조", "시각 보조"],
    isoCode: "22 03",
  },

  // 의사소통 보조기기
  {
    primary: "의사소통",
    synonyms: ["소통", "대화", "말하기", "communication", "AAC"],
    isoCode: "22 30",
  },
  {
    primary: "AAC",
    synonyms: ["의사소통 보조", "대화 보조", "소통 보조", "augmentative alternative communication"],
    isoCode: "22 30",
  },

  // 목욕 보조기기
  {
    primary: "욕조",
    synonyms: ["목욕", "샤워", "bath", "shower", "욕실"],
    isoCode: "15 03",
  },
  {
    primary: "샤워",
    synonyms: ["목욕", "욕조", "shower", "샤워 보조"],
    isoCode: "15 03",
  },
  {
    primary: "욕실 의자",
    synonyms: ["샤워 의자", "목욕 의자", "욕실 보조 의자", "샤워 보조 의자"],
    isoCode: "15 03",
  },

  // 착의 보조기기
  {
    primary: "착의",
    synonyms: ["옷 입기", "의복", "착의 보조", "옷 입기 보조"],
    isoCode: "15 04",
  },
  {
    primary: "의복",
    synonyms: ["옷", "착의", "착의 보조", "의류"],
    isoCode: "15 04",
  },
];

/**
 * 동의어 맵 생성 (빠른 검색용)
 */
const synonymMap = new Map<string, string>();

synonymGroups.forEach((group) => {
  // 주요 키워드 자체
  synonymMap.set(group.primary.toLowerCase(), group.primary);
  
  // 동의어들을 주요 키워드로 매핑
  group.synonyms.forEach((synonym) => {
    synonymMap.set(synonym.toLowerCase(), group.primary);
  });
});

/**
 * 키워드를 정규화 (동의어를 주요 키워드로 변환)
 */
export function normalizeKeyword(keyword: string): string {
  const normalized = keyword.toLowerCase().trim();
  return synonymMap.get(normalized) || keyword;
}

/**
 * 텍스트에서 키워드 추출 및 정규화
 */
export function extractAndNormalizeKeywords(text: string): string[] {
  const keywords: string[] = [];
  const normalizedText = text.toLowerCase();

  // 각 동의어 그룹 확인
  for (const group of synonymGroups) {
    const allTerms = [group.primary, ...group.synonyms];
    
    for (const term of allTerms) {
      if (normalizedText.includes(term.toLowerCase())) {
        keywords.push(group.primary);
        break; // 한 그룹에서 하나만 추가
      }
    }
  }

  return [...new Set(keywords)]; // 중복 제거
}

/**
 * 키워드로 ISO 코드 추론
 */
export function inferIsoFromKeyword(keyword: string): string | null {
  const normalized = normalizeKeyword(keyword);
  
  for (const group of synonymGroups) {
    if (group.primary === normalized && group.isoCode) {
      return group.isoCode;
    }
  }
  
  return null;
}

/**
 * 텍스트에서 ISO 코드 추론 (키워드 기반)
 */
export function inferIsoFromText(text: string): string[] {
  const keywords = extractAndNormalizeKeywords(text);
  const isoCodes = new Set<string>();

  for (const keyword of keywords) {
    const isoCode = inferIsoFromKeyword(keyword);
    if (isoCode) {
      isoCodes.add(isoCode);
    }
  }

  return Array.from(isoCodes);
}

