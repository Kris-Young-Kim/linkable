# 하이브리드 매칭 시스템 사용 가이드

## 📖 개요

하이브리드 매칭 시스템은 **규칙 기반**, **시맨틱 임베딩**, **지식 그래프**를 결합하여 ICF-ISO 매칭의 정확도를 크게 향상시킵니다.

## 🚀 빠른 시작

### 기본 사용법

```typescript
import { fastMatch, accurateMatch } from "@/core/matching/hybrid-matcher";

// 빠른 매칭 (규칙 + 키워드, <10ms)
const quickMatches = fastMatch(
  ["b765", "d550"], // ICF 코드
  "손 떨림으로 식사가 어려워요" // 사용자 메시지
);

// 정확한 매칭 (하이브리드, <200ms)
const accurateMatches = await accurateMatch({
  icfCodes: ["b765", "d550"],
  userMessage: "손 떨림으로 식사가 어려워요",
  analysisSummary: "불수의적 운동 조절 기능 저하로 인한 식사 어려움",
  userProfile: {
    ageGroup: "elderly",
    disabilityType: "tremor",
  },
});
```

## 📊 매칭 전략 비교

| 전략              | 속도   | 정확도 | 사용 시점                   |
| ----------------- | ------ | ------ | --------------------------- |
| **fastMatch**     | <10ms  | 60-70% | 실시간 채팅, 빠른 응답 필요 |
| **accurateMatch** | <200ms | 85-90% | 추천 생성, 정확도 중요      |

## 🔧 설정

### 환경 변수

```bash
# .env.local
ENABLE_HYBRID_MATCHING=true  # 하이브리드 매칭 활성화
```

### 커스텀 설정

```typescript
import { hybridMatch } from "@/core/matching/hybrid-matcher";

const matches = await hybridMatch(
  {
    icfCodes: ["b765", "d550"],
    userMessage: "손 떨림으로 식사가 어려워요",
  },
  {
    useSemantic: true, // 시맨틱 매칭 사용
    useKnowledgeGraph: true, // 지식 그래프 사용
    weights: {
      ruleBased: 0.3, // 규칙 기반 가중치
      semantic: 0.4, // 시맨틱 가중치
      knowledgeGraph: 0.2, // 지식 그래프 가중치
      keyword: 0.1, // 키워드 가중치
    },
    minScore: 0.5, // 최소 점수
    topK: 10, // 상위 K개 반환
  }
);
```

## 📈 성능 모니터링

### 로그 확인

하이브리드 매칭은 자동으로 로그를 기록합니다:

```typescript
// logEvent를 통해 다음 정보가 기록됩니다:
{
  category: 'matching',
  action: 'hybrid_match_completed',
  payload: {
    duration: 150,              // 실행 시간 (ms)
    inputIcfCount: 2,           // 입력 ICF 코드 수
    outputMatchCount: 5,        // 출력 매칭 수
    config: { /* 설정 */ }
  }
}
```

### 성능 최적화 팁

1. **캐싱 활용**: 동일한 ICF 코드 조합은 캐시에서 조회
2. **점진적 로딩**: fastMatch로 먼저 응답, 이후 accurateMatch로 보강
3. **비동기 처리**: 시맨틱 매칭은 백그라운드에서 처리

## 🎯 실제 사용 예시

### 예시 1: 채팅 중 빠른 매칭

```typescript
// components/chat-interface.tsx
import { fastMatch } from "@/core/matching/hybrid-matcher";

// 사용자 메시지 입력 시 즉시 매칭
const handleUserMessage = async (message: string, icfCodes: string[]) => {
  // 빠른 매칭으로 즉시 응답
  const quickMatches = fastMatch(icfCodes, message);

  // UI에 표시
  setIsoMatches(quickMatches);

  // 백그라운드에서 정확한 매칭 수행
  const accurateMatches = await accurateMatch({
    icfCodes,
    userMessage: message,
  });

  // 정확한 매칭으로 업데이트
  setIsoMatches(accurateMatches);
};
```

### 예시 2: 추천 페이지에서 정확한 매칭

```typescript
// app/api/products/route.ts
import { accurateMatch } from "@/core/matching/hybrid-matcher";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const consultationId = searchParams.get("consultationId");
  const icfCodes = searchParams.get("icf")?.split(",") || [];

  // 상담 데이터 조회
  const consultation = await getConsultation(consultationId);

  // 정확한 매칭 수행
  const isoMatches = await accurateMatch({
    icfCodes,
    userMessage: consultation?.user_message,
    analysisSummary: consultation?.analysis_summary,
    userProfile: {
      ageGroup: consultation?.user_age_group,
      disabilityType: consultation?.disability_type,
    },
  });

  // ISO 코드로 제품 조회
  const products = await getProductsByIsoCodes(
    isoMatches.map((m) => m.isoCode)
  );

  return NextResponse.json({ products, isoMatches });
}
```

## 🔍 문제 해결

### 시맨틱 매칭이 실패하는 경우

```typescript
// 자동으로 규칙 기반으로 폴백됩니다
try {
  const matches = await accurateMatch({ icfCodes });
} catch (error) {
  // 에러 로그 확인
  console.error(
    "[matching] Semantic matching failed, using rule-based fallback"
  );
}
```

### 성능이 느린 경우

1. **캐싱 활성화**: 동일한 ICF 조합은 캐시 사용
2. **fastMatch 사용**: 정확도보다 속도가 중요한 경우
3. **비동기 처리**: 백그라운드에서 정확한 매칭 수행

## 📚 추가 자료

- [ICF-ISO 매칭 개선 방안](./icf-iso-matching-improvement-plan.md)
- [시맨틱 매칭 구현](./core/matching/semantic-matcher.ts)
- [지식 그래프 구현](./core/matching/knowledge-graph.ts)
