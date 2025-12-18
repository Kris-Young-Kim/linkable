# ICF-ISO 매칭 로직 개선 방안

## 📊 현재 문제점 분석

### 1. **단순 규칙 기반 매칭의 한계**

- **현재 상태**: 하드코딩된 `isoMappingTable` (약 50개 규칙)
- **문제점**:
  - ICF 코드 조합의 의미론적 관계를 고려하지 않음
  - 새로운 ICF 코드 조합에 대한 대응 불가
  - 컨텍스트 정보 부족 (사용자 상황, 환경, 선호도 등)
  - 점수 계산이 단순함: `baseScore + coverage * 0.4`

### 2. **정확도 문제**

- **현재 점수 계산**:
  ```typescript
  const coverage = matched.length / rule.icf.length;
  const score = baseScore + coverage * 0.4;
  ```
- **문제점**:
  - ICF 코드 간 상관관계 미반영
  - 사용자 메시지의 의미론적 맥락 무시
  - 전문가 지식 기반 가중치 부재

### 3. **확장성 부족**

- 정적 매핑 테이블로 인한 유지보수 어려움
- 새로운 ISO 9999:2022 업데이트 반영 지연
- 실시간 학습/개선 불가능

---

## 🚀 개선 방안: 다층 매칭 전략 (Hybrid Matching System)

### **전략 1: 시맨틱 임베딩 기반 매칭**

#### 1.1 벡터 데이터베이스 구축

```typescript
// core/matching/semantic-matching.ts
import { embed } from "@ai-sdk/google"; // 또는 OpenAI embeddings

interface IcfIsoEmbedding {
  icfCodes: string[];
  isoCode: string;
  embedding: number[];
  metadata: {
    label: string;
    description: string;
    baseScore: number;
    usageCount: number;
    successRate: number;
  };
}

// ICF 코드 조합을 의미론적으로 임베딩
async function createIcfIsoEmbedding(
  icfCodes: string[],
  isoCode: string,
  context: string
): Promise<IcfIsoEmbedding> {
  // ICF 코드 설명 + ISO 설명 + 컨텍스트를 결합
  const text = [
    ...icfCodes.map((code) => getIcfDescription(code)),
    getIsoDescription(isoCode),
    context,
  ].join(" ");

  const embedding = await embed(text);

  return {
    icfCodes,
    isoCode,
    embedding,
    metadata: {
      /* ... */
    },
  };
}
```

#### 1.2 유사도 기반 매칭

```typescript
// 사용자 입력을 임베딩하고 가장 유사한 ISO 코드 찾기
async function findSemanticMatches(
  userIcfCodes: string[],
  userContext: string
): Promise<IsoMatch[]> {
  // 1. 사용자 ICF 코드 + 컨텍스트를 임베딩
  const queryEmbedding = await embed(
    userIcfCodes.map((c) => getIcfDescription(c)).join(" ") + userContext
  );

  // 2. 벡터 DB에서 코사인 유사도 검색
  const matches = await vectorDB.query({
    vector: queryEmbedding,
    topK: 10,
    filter: {
      /* ISO 코드 필터 */
    },
  });

  // 3. 유사도 점수를 정규화하여 반환
  return matches.map((match) => ({
    isoCode: match.isoCode,
    score: match.similarity * 0.8 + match.metadata.baseScore * 0.2,
    // ...
  }));
}
```

**장점**:

- 의미론적 유사도 기반 정확한 매칭
- 새로운 ICF 조합에도 자동 대응
- 컨텍스트 정보 활용 가능

**구현 도구**:

- **Supabase Vector**: PostgreSQL pgvector 확장 활용
- **Pinecone**: 전용 벡터 DB (유료)
- **Qdrant**: 오픈소스 벡터 DB

---

### **전략 2: 전문가 지식 그래프 구축**

#### 2.1 ICF-ISO 관계 그래프

```typescript
// core/matching/knowledge-graph.ts
interface IcfIsoRelationship {
  icfCode: string;
  isoCode: string;
  relationshipType: "direct" | "indirect" | "contextual";
  strength: number; // 0-1
  evidence: {
    source: "expert" | "literature" | "usage" | "feedback";
    confidence: number;
  };
}

// 예: b765(불수의적 운동) + d550(식사) → 15 09(식사 보조기기)
// 관계 강도: 0.95 (직접적)
// 증거: 전문가 지식 + 사용자 피드백
```

#### 2.2 그래프 기반 추론

```typescript
function inferIsoFromIcfGraph(
  icfCodes: string[],
  graph: IcfIsoRelationship[]
): IsoMatch[] {
  // 1. 직접 연결 찾기
  const directMatches = findDirectRelations(icfCodes, graph);

  // 2. 간접 연결 추론 (2-hop, 3-hop)
  const indirectMatches = inferIndirectRelations(icfCodes, graph);

  // 3. 컨텍스트 기반 보정
  const contextualMatches = applyContextualRules(icfCodes, graph);

  // 4. 점수 통합
  return combineMatches(directMatches, indirectMatches, contextualMatches);
}
```

**장점**:

- 전문가 지식의 체계적 활용
- 복잡한 ICF 조합에 대한 추론 가능
- 설명 가능한 매칭 (왜 이 ISO 코드인지)

---

### **전략 3: 실시간 웹 크롤링으로 최신 정보 수집**

#### 3.1 Playwright 기반 크롤링

```typescript
// scripts/crawlers/icf-iso-research.ts
import { chromium } from "playwright";

interface ResearchSource {
  url: string;
  type: "academic" | "standard" | "product" | "expert";
  selector: string;
}

const sources: ResearchSource[] = [
  {
    url: "https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health",
    type: "standard",
    selector: ".icf-mapping-table",
  },
  {
    url: "https://www.iso.org/obp/ui/#iso:std:iso:9999:ed-7:v1:en",
    type: "standard",
    selector: ".iso-classification",
  },
  // 학술 논문, 제품 카탈로그 등
];

async function crawlIcfIsoMappings(): Promise<IcfIsoMapping[]> {
  const browser = await chromium.launch();
  const mappings: IcfIsoMapping[] = [];

  for (const source of sources) {
    const page = await browser.newPage();
    await page.goto(source.url);

    // ICF-ISO 매핑 정보 추출
    const data = await page.evaluate((selector) => {
      // 매핑 테이블 파싱
      return parseMappingTable(selector);
    }, source.selector);

    mappings.push(...data);
  }

  await browser.close();
  return mappings;
}
```

#### 3.2 Tavily로 최신 연구 동향 파악

```typescript
// scripts/research/icf-iso-trends.ts
import { tavilySearch } from "@/lib/tavily";

async function researchLatestIcfIsoTrends(): Promise<ResearchInsight[]> {
  const queries = [
    "ICF ISO 9999 mapping assistive technology 2024",
    "ICF code to ISO assistive product matching algorithm",
    "semantic similarity ICF ISO assistive technology",
  ];

  const insights: ResearchInsight[] = [];

  for (const query of queries) {
    const results = await tavilySearch({
      query,
      maxResults: 10,
      searchDepth: "advanced",
    });

    // 논문, 가이드라인, 베스트 프랙티스 추출
    insights.push(...extractInsights(results));
  }

  return insights;
}
```

**장점**:

- 최신 표준 업데이트 자동 반영
- 학술 연구 동향 파악
- 제품 카탈로그에서 실제 사용 사례 수집

---

### **전략 4: 하이브리드 매칭 시스템**

#### 4.1 다층 매칭 파이프라인

```typescript
// core/matching/hybrid-matcher.ts
export async function hybridMatch(
  icfCodes: string[],
  userContext: string,
  consultationHistory: string[]
): Promise<IsoMatch[]> {
  // 1단계: 규칙 기반 매칭 (빠른 필터링)
  const ruleMatches = getIsoMatches(icfCodes);

  // 2단계: 키워드 기반 보강
  const keywordMatches = appendKeywordIsoMatches({
    text: userContext,
    icfCodes,
    matches: ruleMatches,
  });

  // 3단계: 시맨틱 매칭 (정확도 향상)
  const semanticMatches = await findSemanticMatches(icfCodes, userContext);

  // 4단계: 지식 그래프 추론 (복잡한 케이스)
  const graphMatches = inferIsoFromIcfGraph(icfCodes, knowledgeGraph);

  // 5단계: 결과 통합 및 재랭킹
  const combined = combineMatches([
    { matches: keywordMatches, weight: 0.3 },
    { matches: semanticMatches, weight: 0.4 },
    { matches: graphMatches, weight: 0.3 },
  ]);

  // 6단계: 피드백 기반 보정
  const adjusted = applyFeedbackCorrection(combined, consultationHistory);

  return adjusted;
}
```

#### 4.2 점수 통합 알고리즘

```typescript
function combineMatches(
  matchLayers: Array<{ matches: IsoMatch[]; weight: number }>
): IsoMatch[] {
  const scoreMap = new Map<string, number>();
  const matchMap = new Map<string, IsoMatch>();

  for (const layer of matchLayers) {
    for (const match of layer.matches) {
      const existing = scoreMap.get(match.isoCode) || 0;
      const weighted = match.score * layer.weight;
      scoreMap.set(match.isoCode, existing + weighted);

      // 가장 높은 점수의 매치 정보 저장
      if (
        !matchMap.has(match.isoCode) ||
        match.score > matchMap.get(match.isoCode)!.score
      ) {
        matchMap.set(match.isoCode, match);
      }
    }
  }

  return Array.from(matchMap.values())
    .map((match) => ({
      ...match,
      score: scoreMap.get(match.isoCode)!,
    }))
    .sort((a, b) => b.score - a.score);
}
```

---

## 📋 구현 로드맵

### **Phase 1: 기반 구축 (2-3주)**

1. ✅ 벡터 DB 설정 (Supabase pgvector)
2. ✅ ICF-ISO 임베딩 생성 스크립트
3. ✅ 기본 시맨틱 매칭 구현

### **Phase 2: 지식 그래프 (2-3주)**

1. ✅ 전문가 지식 데이터 구조화
2. ✅ 그래프 기반 추론 엔진
3. ✅ 관계 강도 학습 메커니즘

### **Phase 3: 실시간 수집 (1-2주)**

1. ✅ Playwright 크롤러 구축
2. ✅ Tavily 연구 동향 모니터링
3. ✅ 자동 업데이트 파이프라인

### **Phase 4: 통합 및 최적화 (2주)**

1. ✅ 하이브리드 매칭 시스템 통합
2. ✅ A/B 테스트 프레임워크
3. ✅ 성능 모니터링 및 최적화

---

## 🎯 예상 효과

### **정확도 향상**

- 현재: ~60-70% 정확도 (추정)
- 목표: **85-90% 정확도**

### **커버리지 확대**

- 현재: 50개 규칙 → 약 200개 ICF 조합 커버
- 목표: **전체 ICF 코드 조합의 95% 이상 커버**

### **응답 속도**

- 규칙 기반: <10ms
- 하이브리드: <200ms (캐싱 활용 시 <50ms)

---

## 💡 추가 개선 아이디어

### 1. **사용자 피드백 학습**

```typescript
// 사용자가 추천을 클릭/구매하면 해당 매칭의 신뢰도 증가
async function learnFromFeedback(
  consultationId: string,
  clickedIsoCode: string,
  purchased: boolean
) {
  // 매칭 성공률 업데이트
  await updateMatchConfidence(consultationId, clickedIsoCode, purchased);

  // 지식 그래프 관계 강도 조정
  await adjustGraphRelations(consultationId, clickedIsoCode);
}
```

### 2. **컨텍스트 인식 매칭**

- 사용자 연령, 장애 유형, 생활 환경 등 고려
- 예: 노인 사용자 → 안전성 우선 매칭
- 예: 실내 환경 → 이동성 보조기기 우선

### 3. **설명 가능한 AI**

- 매칭 이유를 사용자에게 명확히 설명
- "b765(손 떨림) + d550(식사) 조합으로 15 09(식사 보조기기)를 추천합니다"

---

## 📚 참고 자료

- [WHO ICF 공식 문서](https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health)
- [WHO full category](https://apps.who.int/classifications/icfbrowser/Default.aspx)
- [ISO 9999:2022 표준](https://www.iso.org/obp/ui/#iso:std:iso:9999:ed-7:v1:en)
- [Vector Embeddings 가이드](https://www.pinecone.io/learn/vector-embeddings/)
- [Semantic Similarity Matching](https://arxiv.org/html/2404.03122v1)

---

## 🔄 ICF 코드 확장 전략 (2025-02-11 추가)

### 문제점

현재 `icfCoreSet`에는 약 160개의 ICF 코드만 포함되어 있으나, 실제 사용 중에는 Core Set에 없는 코드가 자주 등장합니다. 이러한 코드들은 기본 설명만 제공되며, ISO 매핑 힌트가 없어 매칭 정확도가 떨어집니다.

### 해결 방안: 점진적 확장 시스템

#### 1. 동적 ICF 코드 처리 (방안 2 적용)

**구현 완료** (`core/assessment/icf-codes.ts`):

- `findIcfCode` 함수가 Core Set에 없는 코드도 동적으로 처리
- 카테고리(b/d/e) 기반 기본 설명 자동 생성
- Core Set에 있는 코드는 상세 정보 반환, 없는 코드는 기본 정보 반환

```typescript
// Core Set에 없는 코드도 처리 가능
const code = findIcfCode("d710"); // Core Set에 없어도 기본 정보 반환
// { code: "D710", description: "활동 및 참여 - 대인관계 상호작용 (d710)", category: "d" }
```

#### 2. ICF 코드 사용 통계 수집 시스템

**데이터베이스 스키마** (`supabase/migrations/20250211000000_add_icf_code_usage_tracking.sql`):

- `icf_code_usage_logs`: 모든 ICF 코드 사용 이벤트 기록
- `icf_code_statistics`: 코드별 집계 통계 (자동 업데이트)
- `icf_code_expansion_priority`: 확장 우선순위 분석 뷰

**로깅 시스템** (`lib/icf-tracking.ts`):

- 주요 사용 지점에 자동 로깅:
  - `chat_analysis`: 채팅 분석에서 추출된 ICF 코드
  - `semantic_match`: 제품 매칭 시 사용된 ICF 코드
  - `keyword_inference`: 키워드 기반 추론에서 사용된 코드
  - `manual_input`: 수동 입력된 코드

**로깅 지점**:

- ✅ `app/api/chat/route.ts`: `upsertAnalysis` 함수
- ✅ `app/api/products/route.ts`: 제품 매칭 API
- ⚠️ `core/matching/keyword-inference.ts`: 클라이언트 사이드에서 호출 시 로깅 필요
- ⚠️ `core/matching/semantic-matcher.ts`: 서버 사이드에서만 로깅 가능

#### 3. 확장 우선순위 분석 API

**엔드포인트**: `GET /api/admin/analytics/icf-expansion`

**기능**:

- Core Set에 없는 코드 목록 조회
- 사용 빈도 및 우선순위 점수 계산
- 확장 권장 코드 자동 추천

**우선순위 점수 계산**:

```sql
priority_score =
  total_usage_count * 1.0 +
  unique_consultations * 2.0 +
  최근성 보너스 (7일 이내: +5.0, 30일 이내: +2.0)
```

#### 4. 점진적 확장 프로세스

**단계별 확장 전략**:

1. **데이터 수집 (현재 단계)**

   - 모든 ICF 코드 사용 이벤트 자동 로깅
   - 통계 집계 및 우선순위 분석

2. **우선순위 기반 확장 (1-2주 후)**

   - 우선순위 점수 20 이상 코드부터 Core Set에 추가
   - ISO 매핑 힌트 수동/자동 추가
   - 전문가 검토 후 승인

3. **전체 확장 (1-2개월 후)**
   - 누적 통계 기반으로 전체 확장 계획 수립
   - 배치 작업으로 대량 코드 추가
   - 자동화된 ISO 매핑 힌트 생성 (AI 기반)

**확장 시 고려사항**:

- **점진적 확장**: 우선순위가 높은 코드부터 단계적으로 추가
- **전체 확장**: 모든 누적 데이터를 기반으로 한 번에 확장
- **무리 없는 처리**: 두 방식 모두 지원하도록 설계

#### 5. 데이터 수집 및 분석

**수집 데이터**:

- ICF 코드 사용 빈도
- 사용 출처 (chat_analysis, semantic_match 등)
- 함께 사용된 ISO 코드
- 함께 사용된 키워드
- 첫 사용일 및 최근 사용일

**분석 지표**:

- 총 사용 횟수
- 고유 상담 수
- 출처별 사용 분포
- 연관 ISO 코드 및 키워드

#### 6. 확장 자동화 (향후 계획)

**AI 기반 ISO 매핑 힌트 생성**:

```typescript
// 향후 구현 예정
async function generateIsoHintsForIcfCode(icfCode: string): Promise<string[]> {
  // 1. 사용 통계에서 연관 ISO 코드 추출
  const associatedIsoCodes = await getAssociatedIsoCodes(icfCode);

  // 2. AI를 활용한 의미론적 매핑
  const semanticMatches = await findSemanticIsoMatches(icfCode);

  // 3. 전문가 지식 그래프 기반 추론
  const graphMatches = inferIsoFromGraph(icfCode);

  // 4. 결과 통합 및 우선순위 정렬
  return combineAndRank(associatedIsoCodes, semanticMatches, graphMatches);
}
```

### 구현 상태

- ✅ 동적 ICF 코드 처리 (방안 2)
- ✅ 데이터베이스 스키마 및 통계 수집 시스템
- ✅ 로깅 시스템 (`lib/icf-tracking.ts`)
- ✅ 주요 사용 지점 로깅 추가
- ✅ 확장 우선순위 분석 API
- ✅ 관리자 대시보드 UI (`/admin/icf-expansion`)
- ✅ AI 기반 ISO 매핑 힌트 자동 생성 (`lib/icf-iso-generator.ts`)
- ✅ 자동 확장 워크플로우 (`POST /api/admin/icf/auto-expand`)
- ⏳ 스케줄러/크론 작업 설정 (향후 구현)

### 사용 방법

**관리자가 확장 우선순위 확인**:

```bash
GET /api/admin/analytics/icf-expansion?limit=50&min_usage=5
```

**응답 예시**:

```json
{
  "codes": [
    {
      "code": "d710",
      "category": "d",
      "priorityScore": 25.5,
      "totalUsageCount": 15,
      "uniqueConsultations": 8,
      "usageBySource": {
        "chat_analysis": 10,
        "semantic_match": 5
      },
      "recommendedForExpansion": true
    }
  ],
  "summary": {
    "totalMissingCodes": 45,
    "highPriorityCodes": 12,
    "mediumPriorityCodes": 18,
    "lowPriorityCodes": 15,
    "recommendedForExpansion": 12
  }
}
```

### 다음 단계

1. **관리자 대시보드 UI 구현**: 확장 우선순위 시각화 및 일괄 추가 기능
2. **자동 확장 워크플로우**: 우선순위 기반 자동 Core Set 업데이트
3. **AI 기반 ISO 매핑**: 누적 데이터를 활용한 자동 ISO 힌트 생성

---

## 🎯 매칭 정확도 개선 전략 (2025-02-17 추가)

### 현재 상태 분석

#### ✅ 이미 구현된 기능

- 하이브리드 매칭 시스템 (규칙 + 시맨틱 + 지식 그래프)
- 피드백 수집 시스템 (클릭, 구매, K-IPPA 평가)
- ICF 코드 사용 통계 수집
- 키워드 기반 보강 매칭

#### ⚠️ 주요 문제점

1. **점수 계산이 단순함**: `baseScore + coverage * 0.4`
2. **피드백 데이터 미활용**: 클릭/구매/효과성 점수 데이터를 점수 계산에 반영하지 않음
3. **ICF 코드 간 상관관계 미반영**: 코드 간 의미론적 관계 고려 부족
4. **사용자 컨텍스트 활용 부족**: 연령, 환경, 장애 유형 등 고려 안 함

### 우선순위별 개선 전략

#### 🔥 즉시 효과 (1-2주) - 최우선

##### 1. 피드백 기반 점수 보정 강화

**목표**: 실제 사용자 행동 데이터를 점수 계산에 반영

**구현 내용**:

- `core/matching/feedback-scorer.ts` 생성
- 클릭률, 구매 전환율, K-IPPA 효과성 점수를 점수에 반영
- ICF 코드 조합별 통계 수집 및 활용

**점수 계산 공식**:

```typescript
finalScore =
  baseScore +
  clickRate * 0.3 + // 클릭률 보너스 (최대 0.3)
  purchaseRate * 0.4 + // 구매 전환 보너스 (최대 0.4)
  (effectivenessScore / 100) * 0.3 * confidence; // 효과성 보너스
```

**예상 효과**: +5-10% 정확도 향상

**데이터 소스**:

- `conversion_events`: 클릭 및 구매 이벤트
- `recommendations`: 추천별 클릭 통계
- `ippa_evaluations`: 효과성 점수

##### 2. ICF 코드 간 상관관계 반영

**목표**: 함께 나타나는 ICF 코드 조합에 가중치 부여

**구현 내용**:

- `core/matching/icf-correlation.ts` 생성
- ICF 코드 조합별 상관관계 데이터 구축
- 상관관계가 높은 조합에 보너스 점수 부여

**예시**:

- `b765`(손 떨림) + `d550`(식사) = 강한 상관관계 (0.9)
- `b230`(청각) + `d115`(듣기) = 강한 상관관계 (0.85)

**점수 계산**:

```typescript
correlationBonus = sum(correlation(code1, code2)) * 0.2;
// 최대 0.2 보너스
```

**예상 효과**: +3-5% 정확도 향상

#### 📈 중기 효과 (2-4주)

##### 3. 사용자 컨텍스트 기반 가중치

**목표**: 사용자 특성에 맞는 제품 우선순위 조정

**구현 내용**:

- `core/matching/context-weights.ts` 생성
- 연령대, 환경, 장애 유형별 가중치 적용
- 이전 사용 제품과의 유사도 반영

**가중치 예시**:

- 노인 사용자 → 안전성 제품 +0.15
- 실내 환경 → 실내용 제품 +0.1
- 이전 사용 제품 유사 → +0.2

**예상 효과**: +5-8% 정확도 향상

##### 4. 규칙 기반 점수 계산 개선

**목표**: 현재 단순한 점수 계산을 개선

**개선 사항**:

```typescript
// 기존: baseScore + coverage * 0.4
// 개선:
score =
  baseScore +
  (coverage === 1.0 ? 0.3 : coverage >= 0.8 ? 0.2 : coverage * 0.15) + // 커버리지 보너스 (비선형)
  Math.min(matched.length * 0.05, 0.15) + // 코드 개수 보너스
  correlationBonus; // 상관관계 보너스
```

**예상 효과**: +3-5% 정확도 향상

#### 🚀 장기 효과 (1-2개월)

##### 5. 벡터 DB 구축 및 시맨틱 매칭 강화

**목표**: 의미론적 유사도 기반 정확한 매칭

**구현 내용**:

- Supabase pgvector 확장 활용
- ICF-ISO 매핑 임베딩 생성 및 저장
- 사용자 입력 임베딩과 유사도 검색
- 실시간 학습 및 업데이트

**예상 효과**: +10-15% 정확도 향상

### 구현 로드맵

#### 1주차: 피드백 기반 점수 보정

- [ ] `core/matching/feedback-scorer.ts` 생성
- [ ] `conversion_events`, `recommendations`, `ippa_evaluations`에서 통계 수집
- [ ] `hybrid-matcher.ts`에 피드백 점수 통합
- [ ] 테스트 및 검증

**예상 효과**: +5-10% 정확도

#### 2주차: ICF 상관관계 반영

- [ ] `core/matching/icf-correlation.ts` 생성
- [ ] `icf_code_usage_logs`에서 상관관계 데이터 추출
- [ ] `getIsoMatches` 점수 계산에 상관관계 보너스 추가
- [ ] 테스트 및 검증

**예상 효과**: +3-5% 정확도

#### 3-4주차: 사용자 컨텍스트 가중치

- [ ] `core/matching/context-weights.ts` 생성
- [ ] 사용자 프로필 데이터 수집 강화
- [ ] 컨텍스트별 가중치 로직 구현
- [ ] 테스트 및 검증

**예상 효과**: +5-8% 정확도

#### 5-8주차: 벡터 DB 구축

- [ ] Supabase pgvector 확장 설정
- [ ] ICF-ISO 매핑 임베딩 생성 파이프라인
- [ ] 시맨틱 매칭 강화
- [ ] 실시간 학습 시스템 구축

**예상 효과**: +10-15% 정확도

### 예상 효과 요약

| 단계     | 기간              | 예상 정확도 | 누적 효과 |
| -------- | ----------------- | ----------- | --------- |
| 현재     | -                 | 60-70%      | -         |
| 1-2주 후 | 피드백 + 상관관계 | 70-75%      | +5-10%    |
| 1개월 후 | + 컨텍스트        | 80-85%      | +15-20%   |
| 2개월 후 | + 벡터 DB         | 85-90%      | +25-30%   |

### 구현 우선순위

**최우선 (즉시 시작)**:

1. ✅ 피드백 기반 점수 보정 - 이미 데이터 수집 중이므로 즉시 활용 가능
2. ✅ ICF 상관관계 반영 - `icf_code_usage_logs` 데이터 활용

**중기 (1개월 내)**: 3. 사용자 컨텍스트 가중치 4. 규칙 기반 점수 계산 개선

**장기 (2개월 내)**: 5. 벡터 DB 구축 및 시맨틱 매칭 강화

### 참고 파일

- `core/matching/hybrid-matcher.ts`: 하이브리드 매칭 메인 로직
- `core/matching/iso-mapping.ts`: 규칙 기반 매칭 및 점수 계산
- `core/matching/semantic-matcher.ts`: 시맨틱 매칭 (현재 기본 구현)
- `core/matching/knowledge-graph.ts`: 지식 그래프 추론
- `supabase/migrations/20250210000000_add_purchase_tracking.sql`: 구매 추적 스키마
- `supabase/migrations/20250211000000_add_icf_code_usage_tracking.sql`: ICF 코드 사용 통계
