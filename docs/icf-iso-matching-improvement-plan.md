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
- [ISO 9999:2022 표준](https://www.iso.org/obp/ui/#iso:std:iso:9999:ed-7:v1:en)
- [Vector Embeddings 가이드](https://www.pinecone.io/learn/vector-embeddings/)
- [Semantic Similarity Matching](https://arxiv.org/html/2404.03122v1)
