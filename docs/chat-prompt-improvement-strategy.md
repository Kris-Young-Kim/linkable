# 채팅 프롬프트 전면 개선 전략

## 현재 문제점 분석

### 1. 질문 반복 문제
- 동일한 질문을 반복하는 경우가 많음
- 이미 답변한 내용을 다시 물어봄
- 평가 질문이 중복됨

### 2. 채팅 종료 의도 무시
- 사용자가 "종료", "끝", "완료" 등을 입력해도 계속 질문함
- `isChatEndingIntent` 함수가 있으나 프롬프트에 반영되지 않음

### 3. 핵심 단어 미인식
- "휠체어", "보행 어려움" 등 핵심 단어를 캐치하지 못함
- 사용자 상황을 제대로 이해하지 못함

### 4. 논리적 연결 이해 부족
- "보행이 어려워 휠체어를 탄다"는 상황을 이해하지 못함
- 인과관계를 파악하지 못함

### 5. 토큰 낭비 (수익성 문제)
- 답변이 너무 길어서 토큰만 소비됨
- 제품 추천이 제대로 안 됨
- 불필요한 설명이 많음

## 개선 전략

### Phase 1: 핵심 단어 감지 및 상황 이해 강화

**파일**: `core/assessment/prompt-engineering.ts`, `lib/utils.ts`

**구현**:
1. 핵심 단어 감지 함수 추가
   - 보조기기 관련: "휠체어", "보행기", "보청기", "화면낭독기" 등
   - 활동 관련: "걷기", "보행", "식사", "의사소통" 등
   - 상황 관련: "어려움", "불편", "필요" 등

2. 논리적 연결 추론
   - "보행 어려움" → "휠체어 사용" 자동 추론
   - "손 떨림" → "식사 보조기기" 자동 추론
   - 인과관계 기반 ICF 코드 자동 추출

**코드 예시**:
```typescript
// lib/utils.ts에 추가
export function detectKeyAssistiveProducts(message: string): string[] {
  const products: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  const productKeywords = {
    "휠체어": ["휠체어", "wheelchair", "전동휠체어", "수동휠체어"],
    "보행기": ["보행기", "워커", "walker", "보행 보조기"],
    "보청기": ["보청기", "hearing aid", "청각 보조기"],
    "화면낭독기": ["화면낭독", "screen reader", "낭독기", "tts"],
  };
  
  for (const [product, keywords] of Object.entries(productKeywords)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      products.push(product);
    }
  }
  
  return products;
}

export function inferLogicalConnections(message: string): {
  problem: string;
  solution: string;
  icfCodes: string[];
}[] {
  const connections: Array<{ problem: string; solution: string; icfCodes: string[] }> = [];
  const lowerMessage = message.toLowerCase();
  
  // 보행 어려움 → 휠체어
  if (lowerMessage.includes("보행") && (lowerMessage.includes("어려") || lowerMessage.includes("불편"))) {
    connections.push({
      problem: "보행 어려움",
      solution: "휠체어",
      icfCodes: ["d450", "d465", "d46"]
    });
  }
  
  // 손 떨림 → 식사 보조기기
  if (lowerMessage.includes("손 떨림") || lowerMessage.includes("손떨림")) {
    connections.push({
      problem: "손 떨림",
      solution: "식사 보조기기",
      icfCodes: ["b765", "d550"]
    });
  }
  
  return connections;
}
```

### Phase 2: 질문 반복 방지 시스템

**파일**: `core/assessment/prompt-engineering.ts`, `app/api/chat/route.ts`

**구현**:
1. 대화 히스토리에서 이미 물어본 질문 추출
2. 프롬프트에 "이미 물어본 질문 목록" 포함
3. 평가 진행 상황 명확히 표시

**프롬프트 개선**:
```typescript
// buildStreamingPrompt 함수 개선
function extractAskedQuestions(history: ChatHistoryItem[]): string[] {
  const questions: string[] = [];
  for (const item of history) {
    if (item.role === "assistant" && isEvaluationQuestion(item.content)) {
      questions.push(item.content);
    }
  }
  return questions;
}

// 프롬프트에 추가
const askedQuestions = extractAskedQuestions(history);
const askedQuestionsHint = askedQuestions.length > 0
  ? `\n**이미 물어본 질문 (절대 반복하지 말 것):**\n${askedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
  : "";
```

### Phase 3: 채팅 종료 의도 강제 반영

**파일**: `core/assessment/prompt-engineering.ts`, `app/api/chat/route.ts`

**구현**:
1. 채팅 종료 의도 감지 시 프롬프트에 명시
2. 종료 의도가 감지되면 추가 질문 금지
3. 즉시 추천으로 전환

**코드 예시**:
```typescript
// app/api/chat/route.ts
import { isChatEndingIntent } from "@/lib/utils";

// POST 함수 내부
const isEndingIntent = trimmedMessage ? isChatEndingIntent(trimmedMessage) : false;

const streamingPrompt = buildStreamingPrompt({
  // ... 기존 파라미터
  isEndingIntent, // 새로 추가
});

// buildStreamingPrompt 함수 수정
export const buildStreamingPrompt = ({
  // ... 기존 파라미터
  isEndingIntent = false,
}: PromptContext & { isEndingIntent?: boolean }) => {
  // ...
  
  const endingHint = isEndingIntent
    ? `\n**중요: 사용자가 채팅을 종료하고 싶어합니다. 추가 질문을 하지 말고, 지금까지의 상담 내용을 바탕으로 즉시 보조기기 추천을 제공하세요.**`
    : "";
  
  return `
    // ... 기존 프롬프트
    ${endingHint}
  `;
};
```

### Phase 4: 토큰 효율성 개선 (답변 길이 제한)

**파일**: `core/assessment/prompt-engineering.ts`

**구현**:
1. 답변 길이 제한 명시 (2-3문단, 각 2-3문장)
2. 불필요한 설명 제거 지시
3. 제품 추천 우선순위 강화

**프롬프트 개선**:
```typescript
const BASE_SYSTEM_PROMPT = `
너는 보조공학 전문가 "링커"이다.

**답변 원칙 (토큰 효율성)**
- 답변은 최대 2-3문단으로 제한 (각 문단 2-3문장)
- 불필요한 설명은 제거하고 핵심만 전달
- 제품 추천이 우선순위 (상담보다 추천이 먼저)
- 같은 내용 반복 금지

**핵심 단어 감지 및 즉시 대응**
- 사용자가 "휠체어", "보행기", "보청기" 등을 언급하면 즉시 해당 제품 추천
- "보행 어려움" → 휠체어 자동 추론
- "손 떨림" → 식사 보조기기 자동 추론
- 논리적 연결을 이해하고 적절한 ICF 코드 추출

**질문 반복 방지**
- 이미 물어본 질문은 절대 반복하지 않음
- 평가 진행 상황을 정확히 추적
- 완료된 평가는 다시 물어보지 않음

**채팅 종료 의도 존중**
- 사용자가 "종료", "끝", "완료" 등을 입력하면 즉시 종료
- 추가 질문 금지
- 지금까지의 정보로 즉시 추천 제공

// ... 나머지 프롬프트
`;
```

### Phase 5: 제품 추천 우선순위 강화

**파일**: `core/assessment/prompt-engineering.ts`

**구현**:
1. 상담보다 추천이 우선
2. 핵심 단어 감지 시 즉시 추천
3. 불필요한 추가 질문 최소화

**프롬프트 개선**:
```typescript
**제품 추천 우선순위**
1. 사용자가 보조기기를 명시적으로 언급하면 즉시 추천 (추가 질문 없음)
2. 핵심 단어(휠체어, 보행기 등)가 감지되면 즉시 추천
3. 논리적 연결(보행 어려움 → 휠체어)이 명확하면 즉시 추천
4. 정보가 충분하면 추가 질문 없이 추천
5. 정보가 부족할 때만 최소한의 질문 (1개만)

**추천 제공 시**
- 구체적인 제품명과 ISO 코드 포함
- 사용 방법 간단히 설명 (1-2문장)
- 가격대 언급 (있는 경우)
- 구매 링크 안내
```

### Phase 6: 대화 히스토리 분석 강화

**파일**: `app/api/chat/route.ts`

**구현**:
1. 대화 히스토리에서 핵심 정보 추출
2. 이미 언급된 내용 추적
3. 중복 질문 방지

**코드 예시**:
```typescript
// 대화 히스토리 분석 함수
function analyzeConversationHistory(history: ChatHistoryItem[]): {
  mentionedProducts: string[];
  mentionedProblems: string[];
  askedQuestions: string[];
  userNeeds: string;
} {
  const mentionedProducts: string[] = [];
  const mentionedProblems: string[] = [];
  const askedQuestions: string[] = [];
  let userNeeds = "";
  
  for (const item of history) {
    if (item.role === "user") {
      const products = detectKeyAssistiveProducts(item.content);
      mentionedProducts.push(...products);
      
      const connections = inferLogicalConnections(item.content);
      mentionedProblems.push(...connections.map(c => c.problem));
      
      userNeeds += item.content + " ";
    } else if (item.role === "assistant") {
      if (isEvaluationQuestion(item.content)) {
        askedQuestions.push(item.content);
      }
    }
  }
  
  return {
    mentionedProducts: [...new Set(mentionedProducts)],
    mentionedProblems: [...new Set(mentionedProblems)],
    askedQuestions,
    userNeeds: userNeeds.trim(),
  };
}

// 프롬프트에 포함
const conversationAnalysis = analyzeConversationHistory(history);
const conversationHint = `
**대화 히스토리 분석:**
- 언급된 보조기기: ${conversationAnalysis.mentionedProducts.join(", ") || "없음"}
- 언급된 문제: ${conversationAnalysis.mentionedProblems.join(", ") || "없음"}
- 이미 물어본 질문: ${conversationAnalysis.askedQuestions.length}개
- 사용자 요구사항 요약: ${conversationAnalysis.userNeeds || "없음"}

위 정보를 바탕으로 중복 질문을 하지 말고, 필요한 정보가 있으면 즉시 추천하세요.
`;
```

## 구현 우선순위

1. **Phase 1 (즉시)**: 핵심 단어 감지 및 상황 이해 강화
2. **Phase 2 (즉시)**: 질문 반복 방지 시스템
3. **Phase 3 (즉시)**: 채팅 종료 의도 강제 반영
4. **Phase 4 (즉시)**: 토큰 효율성 개선
5. **Phase 5 (단기)**: 제품 추천 우선순위 강화
6. **Phase 6 (단기)**: 대화 히스토리 분석 강화

## 예상 효과

- **토큰 사용량**: 30-50% 감소 (답변 길이 제한)
- **질문 반복**: 90% 감소 (히스토리 추적)
- **채팅 종료 의도 인식**: 100% (강제 반영)
- **핵심 단어 인식**: 80% 향상
- **제품 추천 정확도**: 40% 향상 (즉시 추천)
- **수익성**: 토큰 비용 절감으로 개선
