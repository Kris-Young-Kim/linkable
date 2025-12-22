# 데이터베이스 정규화 가이드

## 개요

데이터 정규화를 통해 중복 데이터를 제거하고 데이터 무결성을 강화했습니다.

**핵심 원칙**: 배열 데이터(JSONB, ARRAY)는 사용하지 않고, 별도 테이블을 만들어 1:N 관계로 관리합니다.

## 정규화된 코드 테이블

### 1. ISO 9999 코드
- **마스터 테이블**: `iso_codes`
- **관계 테이블**: `products.iso_code_id` → `iso_codes(id)` (FK)
- **기존 방식**: `products.iso_code VARCHAR(50)` ❌
- **정규화 방식**: `products.iso_code_id UUID` → `iso_codes(id)` ✅

### 2. ICF 코드
- **마스터 테이블**: `icf_codes`
- **관계 테이블**: `consultation_icf_codes` (상담과 ICF 코드의 1:N 관계)
- **기존 방식**: `analysis_results.icf_codes JSONB` ❌
- **정규화 방식**: `consultation_icf_codes` 테이블로 1:N 관계 ✅

## 생성된 코드 테이블

### ICF 코드 정규화

#### `icf_codes` - ICF 코드 마스터

**목적**: ICF 코드를 중앙에서 관리

**구조**:
```sql
CREATE TABLE icf_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ICF 코드 (예: "b210", "d550")
    category CHAR(1) NOT NULL,         -- 카테고리: b, d, e, p
    name VARCHAR(255),                  -- 코드명 (한글)
    name_en VARCHAR(255),               -- 코드명 (영문)
    description TEXT,                   -- 상세 설명
    parent_code VARCHAR(50),            -- 상위 코드 (계층 구조)
    level INTEGER DEFAULT 1,           -- 코드 레벨
    is_in_core_set BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `consultation_icf_codes` - 상담-ICF 코드 관계 (1:N)

**목적**: 상담과 ICF 코드의 1:N 관계 관리

**구조**:
```sql
CREATE TABLE consultation_icf_codes (
    id UUID PRIMARY KEY,
    consultation_id UUID NOT NULL,     -- 상담 ID
    icf_code_id UUID NOT NULL,         -- ICF 코드 ID
    source VARCHAR(50) NOT NULL,        -- 추출 소스 (chat_analysis, keyword_inference 등)
    confidence_score DECIMAL(3, 2),     -- 신뢰도 점수
    context JSONB,                      -- 추가 컨텍스트
    created_at TIMESTAMPTZ,
    
    FOREIGN KEY (consultation_id) REFERENCES consultations(id),
    FOREIGN KEY (icf_code_id) REFERENCES icf_codes(id),
    UNIQUE (consultation_id, icf_code_id, source)
);
```

**특징**:
- 한 상담에 여러 ICF 코드 연결 가능 (1:N)
- 추출 소스별로 구분 (chat_analysis, keyword_inference 등)
- 신뢰도 점수 관리

---

## 기존 코드 테이블

### 1. `iso_codes` - ISO 9999 코드 마스터

**목적**: ISO 9999 보조기기 분류 코드를 중앙에서 관리

**구조**:
```sql
CREATE TABLE iso_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ISO 코드 (예: "15 09")
    name VARCHAR(255) NOT NULL,        -- 코드명 (예: "식사 보조기기")
    description TEXT,                  -- 상세 설명
    parent_code VARCHAR(50),           -- 상위 코드 (계층 구조)
    level INTEGER DEFAULT 1,           -- 코드 레벨 (1: 대분류, 2: 중분류, 3: 소분류)
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**특징**:
- 계층 구조 지원 (parent_code)
- 코드 레벨 관리 (대분류/중분류/소분류)
- 활성화 상태 관리

### 2. `manufacturers` - 제조사 마스터

**목적**: 제조사 정보를 중앙에서 관리

**구조**:
```sql
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- 제조사 코드 (예: "OTTOBOCK")
    name VARCHAR(255) NOT NULL,        -- 제조사명 (예: "오토복")
    name_en VARCHAR(255),              -- 영문명
    country VARCHAR(100),              -- 국가
    website_url TEXT,                  -- 웹사이트 URL
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**특징**:
- 코드 기반 관리 (대문자)
- 다국어 지원 (한글/영문)
- 국가 정보 관리

### 3. `categories` - 상품 카테고리 마스터

**목적**: 상품 카테고리를 중앙에서 관리

**구조**:
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- 카테고리 코드 (예: "MOBILITY")
    name VARCHAR(255) NOT NULL,        -- 카테고리명 (예: "이동 보조")
    name_en VARCHAR(255),              -- 영문명
    description TEXT,                  -- 상세 설명
    parent_code VARCHAR(50),           -- 상위 카테고리 (계층 구조)
    level INTEGER DEFAULT 1,           -- 카테고리 레벨
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**특징**:
- 계층 구조 지원
- 다국어 지원

## `products` 테이블 변경사항

### 추가된 FK 컬럼

```sql
ALTER TABLE products
ADD COLUMN iso_code_id UUID REFERENCES iso_codes(id),
ADD COLUMN manufacturer_id UUID REFERENCES manufacturers(id),
ADD COLUMN category_id UUID REFERENCES categories(id);
```

### 유지되는 기존 컬럼 (하위 호환성)

```sql
-- 기존 VARCHAR 컬럼은 유지됨
iso_code VARCHAR(50),
manufacturer VARCHAR(100),
category VARCHAR(100)
```

**이유**: 기존 코드와의 호환성을 위해 유지합니다. 필요시 나중에 제거할 수 있습니다.

## 사용 방법

### 1. ICF 코드 조회 (정규화된 구조)

```typescript
// 상담의 ICF 코드 조회 (1:N 관계)
const { data: icfCodes } = await supabase
  .from("consultation_icf_codes")
  .select(`
    *,
    icf_codes!icf_code_id (code, category, name, name_en, description)
  `)
  .eq("consultation_id", consultationId);

// 카테고리별로 그룹화
const grouped = {
  b: icfCodes?.filter(c => c.icf_codes.category === 'b') || [],
  d: icfCodes?.filter(c => c.icf_codes.category === 'd') || [],
  e: icfCodes?.filter(c => c.icf_codes.category === 'e') || [],
  p: icfCodes?.filter(c => c.icf_codes.category === 'p') || [],
};
```

### 2. ICF 코드 조회 (하위 호환성 뷰)

```typescript
// JSONB 형태로 조회 (기존 코드 호환성)
const { data } = await supabase
  .from("view_consultation_icf_codes_jsonb")
  .select("icf_codes")
  .eq("consultation_id", consultationId)
  .single();

// 결과: { icf_codes: { b: [...], d: [...], e: [...] } }
```

### 3. ICF 코드 저장 (정규화된 구조)

```typescript
// ICF 코드 마스터에서 ID 조회 또는 생성
const icfCodeIds = await Promise.all(
  icfCodes.map(async (code) => {
    // 코드가 이미 존재하는지 확인
    let { data: existing } = await supabase
      .from("icf_codes")
      .select("id")
      .eq("code", code.toLowerCase())
      .single();

    if (!existing) {
      // 없으면 생성
      const category = code[0].toLowerCase(); // b, d, e, p
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
    }
    return existing.id;
  })
);

// 상담-ICF 코드 관계 저장
await supabase.from("consultation_icf_codes").insert(
  icfCodeIds.map(icfCodeId => ({
    consultation_id: consultationId,
    icf_code_id: icfCodeId,
    source: "chat_analysis",
    confidence_score: 1.0,
  }))
);
```

### 4. 코드 테이블 조회

```typescript
// ISO 코드 목록 조회
const { data: isoCodes } = await supabase
  .from("iso_codes")
  .select("*")
  .eq("is_active", true)
  .order("display_order");

// 제조사 목록 조회
const { data: manufacturers } = await supabase
  .from("manufacturers")
  .select("*")
  .eq("is_active", true)
  .order("display_order");

// 카테고리 목록 조회
const { data: categories } = await supabase
  .from("categories")
  .select("*")
  .eq("is_active", true)
  .order("display_order");
```

### 2. Products 조회 (FK 사용)

```typescript
// FK를 사용한 조회 (권장)
const { data: products } = await supabase
  .from("products")
  .select(`
    *,
    iso_codes!iso_code_id (code, name),
    manufacturers!manufacturer_id (code, name),
    categories!category_id (code, name)
  `)
  .eq("is_active", true);
```

### 3. Products 조회 (뷰 사용)

```typescript
// 뷰를 사용한 조회 (하위 호환성)
const { data: products } = await supabase
  .from("view_products_with_codes")
  .select("*")
  .eq("is_active", true);
```

### 4. 코드로 상품 필터링

```typescript
// ISO 코드로 필터링 (FK 사용)
const { data: products } = await supabase
  .from("products")
  .select(`
    *,
    iso_codes!iso_code_id (code, name)
  `)
  .eq("iso_codes.code", "15 09")
  .eq("is_active", true);

// 또는 기존 방식 (VARCHAR 필드 사용)
const { data: products } = await supabase
  .from("products")
  .select("*")
  .eq("iso_code", "15 09")
  .eq("is_active", true);
```

## 마이그레이션 전략

### 단계 1: 코드 테이블 생성 및 데이터 마이그레이션 ✅

- 코드 테이블 생성
- 기존 데이터에서 코드 추출 및 삽입
- FK 컬럼 추가 및 값 업데이트

### 단계 2: API 코드 업데이트 (진행 중)

- FK를 사용한 조회로 점진적 전환
- 기존 VARCHAR 필드는 유지 (하위 호환성)

### 단계 3: 기존 VARCHAR 필드 제거 (선택적)

- 모든 코드가 FK를 사용하도록 전환 완료 후
- VARCHAR 필드 제거 가능

## 관리자 UI 개선 사항

### 코드 관리 페이지 추가 (권장)

1. **ISO 코드 관리** (`/admin/iso-codes`)
   - ISO 코드 추가/수정/삭제
   - 계층 구조 시각화
   - 코드 레벨 관리

2. **제조사 관리** (`/admin/manufacturers`)
   - 제조사 추가/수정/삭제
   - 국가별 필터링
   - 웹사이트 링크 관리

3. **카테고리 관리** (`/admin/categories`)
   - 카테고리 추가/수정/삭제
   - 계층 구조 시각화

## 장점

### 1. 데이터 무결성 강화

- FK 제약조건으로 잘못된 코드 입력 방지
- 코드 변경 시 자동 반영 (CASCADE 옵션)

### 2. 중복 제거

- 동일한 코드명이 여러 곳에 저장되는 문제 해결
- 코드 정보 일관성 유지

### 3. 유지보수 용이

- 코드 정보 변경 시 한 곳만 수정
- 코드 사용 통계 집계 용이

### 4. 확장성

- 코드별 메타데이터 추가 용이
- 계층 구조 지원

## 주의사항

1. **하위 호환성**: 기존 VARCHAR 필드는 유지되므로 기존 코드는 계속 작동합니다.

2. **데이터 동기화**: FK와 VARCHAR 필드 간 동기화가 필요할 수 있습니다. 트리거로 자동화 가능.

3. **마이그레이션 순서**: 
   - 코드 테이블 생성 → 데이터 마이그레이션 → FK 설정 → API 업데이트

## 참고 파일

- 마이그레이션: `supabase/migrations/20250220000000_normalize_code_tables.sql`
- 뷰: `view_products_with_codes` (하위 호환성)

