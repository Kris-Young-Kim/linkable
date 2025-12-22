# ICF 코드 정규화 가이드

## 개요

ICF 코드를 JSONB 배열에서 별도 테이블로 분리하여 정규화했습니다.

**원칙**: 배열 데이터는 사용하지 않고, 별도 테이블을 만들어 1:N 관계로 관리합니다.

## 변경 사항

### 이전 구조 (JSONB 배열) ❌

```sql
-- analysis_results 테이블
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY,
    consultation_id UUID NOT NULL,
    icf_codes JSONB,  -- {"b": ["b210", "b765"], "d": ["d550"], "e": ["e115"]}
    ...
);
```

**문제점**:
- 배열 데이터로 인한 정규화 위반
- 코드 정보 중복 저장
- 코드별 통계 집계 어려움
- 코드 변경 시 여러 곳 수정 필요

### 새로운 구조 (1:N 관계) ✅

```sql
-- ICF 코드 마스터
CREATE TABLE icf_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- "b210", "d550" 등
    category CHAR(1) NOT NULL,         -- 'b', 'd', 'e', 'p'
    name VARCHAR(255),
    description TEXT,
    is_in_core_set BOOLEAN,
    ...
);

-- 상담-ICF 코드 관계 (1:N)
CREATE TABLE consultation_icf_codes (
    id UUID PRIMARY KEY,
    consultation_id UUID NOT NULL,
    icf_code_id UUID NOT NULL,
    source VARCHAR(50),                 -- 'chat_analysis', 'keyword_inference' 등
    confidence_score DECIMAL(3, 2),
    ...
);
```

**장점**:
- 정규화된 구조로 데이터 무결성 강화
- 코드 정보 중앙 관리
- 코드별 통계 집계 용이
- 코드 변경 시 한 곳만 수정

## 마이그레이션 전략

### 1. 기존 데이터 마이그레이션

마이그레이션 스크립트가 자동으로 처리:
- `analysis_results.icf_codes` JSONB → `consultation_icf_codes` 테이블
- `icf_code_statistics` → `icf_codes` 마스터 테이블
- `icf_code_usage_logs` → 누락된 코드 자동 추가

### 2. 하위 호환성 유지

- `analysis_results.icf_codes` JSONB 컬럼은 유지 (deprecated)
- `view_consultation_icf_codes_jsonb` 뷰 제공 (기존 코드 호환)

### 3. 점진적 전환

1. **Phase 1**: 새 데이터는 정규화된 구조로 저장
2. **Phase 2**: 기존 코드를 정규화된 구조로 전환
3. **Phase 3**: JSONB 컬럼 제거 (선택적)

## API 코드 업데이트

### 이전 코드 (JSONB 사용) ❌

```typescript
// analysis_results에서 JSONB 조회
const { data } = await supabase
  .from("analysis_results")
  .select("icf_codes")
  .eq("consultation_id", consultationId)
  .single();

const icfCodes = data.icf_codes as { b?: string[]; d?: string[]; e?: string[] };
const allCodes = [
  ...(icfCodes.b || []),
  ...(icfCodes.d || []),
  ...(icfCodes.e || []),
];
```

### 새로운 코드 (정규화된 구조) ✅

```typescript
// consultation_icf_codes에서 조회
const { data: relations } = await supabase
  .from("consultation_icf_codes")
  .select(`
    icf_code_id,
    icf_codes!icf_code_id (code, category, name)
  `)
  .eq("consultation_id", consultationId);

// 카테고리별로 그룹화
const grouped = {
  b: relations?.filter(r => r.icf_codes.category === 'b').map(r => r.icf_codes.code) || [],
  d: relations?.filter(r => r.icf_codes.category === 'd').map(r => r.icf_codes.code) || [],
  e: relations?.filter(r => r.icf_codes.category === 'e').map(r => r.icf_codes.code) || [],
  p: relations?.filter(r => r.icf_codes.category === 'p').map(r => r.icf_codes.code) || [],
};

// 또는 간단히 모든 코드만
const allCodes = relations?.map(r => r.icf_codes.code) || [];
```

### 하위 호환성 뷰 사용 (임시)

```typescript
// 기존 코드와 호환되는 방식
const { data } = await supabase
  .from("view_consultation_icf_codes_jsonb")
  .select("icf_codes")
  .eq("consultation_id", consultationId)
  .single();

// 결과는 기존과 동일한 형태
const icfCodes = data.icf_codes as { b?: string[]; d?: string[]; e?: string[] };
```

## ICF 코드 저장

### 이전 방식 (JSONB) ❌

```typescript
await supabase.from("analysis_results").upsert({
  consultation_id: consultationId,
  icf_codes: {
    b: ["b210", "b765"],
    d: ["d550"],
    e: ["e115"],
  },
});
```

### 새로운 방식 (정규화) ✅

```typescript
// 1. ICF 코드 마스터에서 ID 조회 또는 생성
const getOrCreateIcfCode = async (code: string) => {
  const category = code[0].toLowerCase(); // 'b', 'd', 'e', 'p'
  
  // 기존 코드 확인
  let { data: existing } = await supabase
    .from("icf_codes")
    .select("id")
    .eq("code", code.toLowerCase())
    .single();

  if (existing) {
    return existing.id;
  }

  // 없으면 생성
  const { data: newCode } = await supabase
    .from("icf_codes")
    .insert({
      code: code.toLowerCase(),
      category,
      is_in_core_set: false,
    })
    .select("id")
    .single();

  return newCode.id;
};

// 2. 상담-ICF 코드 관계 저장
const icfCodes = ["b210", "b765", "d550", "e115"];
const icfCodeIds = await Promise.all(icfCodes.map(getOrCreateIcfCode));

await supabase.from("consultation_icf_codes").insert(
  icfCodeIds.map(icfCodeId => ({
    consultation_id: consultationId,
    icf_code_id: icfCodeId,
    source: "chat_analysis",
    confidence_score: 1.0,
  }))
);
```

## 헬퍼 함수 사용

```typescript
// PostgreSQL 함수 사용
const { data } = await supabase.rpc('get_consultation_icf_codes', {
  p_consultation_id: consultationId
});

// 결과: [{ code: 'b210', category: 'b', name: '시각 기능', source: 'chat_analysis' }, ...]
```

## 참고 파일

- 마이그레이션: `supabase/migrations/20250220000001_normalize_icf_codes.sql`
- 뷰: `view_consultation_icf_codes_jsonb` (하위 호환성)
- 뷰: `view_consultation_icf_codes_detail` (상세 조회)
- 함수: `get_consultation_icf_codes(UUID)` (헬퍼 함수)

