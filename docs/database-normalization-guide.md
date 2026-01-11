# 데이터베이스 정규화 가이드

## 목적

데이터베이스 정규화를 통해 중복 데이터를 제거하고 데이터의 무결성을 향상시킵니다.

**핵심 원칙**: 배열 데이터(JSONB, ARRAY)를 사용하지 않고, 별도 테이블을 만들어 1:N 관계로 관리합니다.

## 정규화된 코드 테이블

### 1. ISO 9999 코드

- **마스터 테이블**: `iso_codes`
- **관계 테이블**: `products.iso_code_id` → `iso_codes(id)` (FK)
- **기존 방식**: `products.iso_code VARCHAR(50)` 유지
- **정규화 방식**: `products.iso_code_id UUID` → `iso_codes(id)` 사용

### 2. ICF 코드

- **마스터 테이블**: `icf_codes`
- **관계 테이블**: `consultation_icf_codes` (상담과 ICF 코드의 1:N 관계)
- **기존 방식**: `analysis_results.icf_codes JSONB` 유지
- **정규화 방식**: `consultation_icf_codes` 테이블로 1:N 관계 관리

## 생성된 코드 테이블

### ICF 코드 정규화

#### `icf_codes` - ICF 코드 마스터

**목적**: ICF 코드를 정규화하여 관리

**정의**:

```sql
CREATE TABLE icf_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ICF 코드 (예: "b210", "d550")
    category CHAR(1) NOT NULL,         -- 카테고리: b, d, e, p
    name VARCHAR(255),                  -- 코드명(한글)
    name_en VARCHAR(255),               -- 코드명(영문)
    description TEXT,                   -- 상세 설명
    parent_code VARCHAR(50),            -- 상위 코드 (계층 구조)
    level INTEGER DEFAULT 1,           -- 코드 레벨
    is_in_core_set BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `consultation_icf_codes` - 상담-ICF 코드 관계(1:N)

**목적**: 상담과 ICF 코드의 1:N 관계 관리

**정의**:

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

- 한 상담에 여러 ICF 코드 연결 가능(1:N)
- 추출 소스별로 추적 (chat_analysis, keyword_inference 등)
- 신뢰도 점수 관리

---

## 기존 코드 테이블

### 1. `iso_codes` - ISO 9999 코드 마스터

**목적**: ISO 9999 보조기기 분류 코드를 정규화하여 관리

**정의**:

```sql
CREATE TABLE iso_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ISO 코드 (예: "15 09")
    name VARCHAR(255) NOT NULL,        -- 코드명(예: "식사 보조기기")
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

- 계층 구조 지원(parent_code)
- 코드 레벨 관리(대분류/중분류/소분류)
- 활성화 상태 관리

### 2. `manufacturers` - 제조사 마스터

**목적**: 제조사 정보를 정규화하여 관리

**정의**:

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

- 코드 기반 관리(대문자)
- 다국어 지원(한글/영문)
- 국가 정보 관리

### 3. `categories` - 상품 카테고리 마스터

**목적**: 상품 카테고리를 정규화하여 관리

**정의**:

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- 카테고리 코드 (예: "MOBILITY")
    name VARCHAR(255) NOT NULL,        -- 카테고리명(예: "이동 보조")
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

### 제거되지 않은 기존 컬럼 (하위 호환)

```sql
-- 기존 VARCHAR 컬럼은 제거하지 않음
iso_code VARCHAR(50),
manufacturer VARCHAR(100),
category VARCHAR(100)
```

**주의**: 기존 코드는 하위 호환을 위해 제거하지 않습니다. 필요시 마이그레이션 후 제거할 수 있습니다.

## 사용 방법

### 1. ICF 코드 조회 (정규화된 방식)

```typescript
// 상담의 ICF 코드 조회 (1:N 관계)
const { data: icfCodes } = await supabase
  .from("consultation_icf_codes")
  .select(
    `
    *,
    icf_codes!icf_code_id (code, category, name, name_en, description)
  `
  )
  .eq("consultation_id", consultationId);

// 카테고리별로 그룹화
const grouped = {
  b: icfCodes?.filter((c) => c.icf_codes.category === "b") || [],
  d: icfCodes?.filter((c) => c.icf_codes.category === "d") || [],
  e: icfCodes?.filter((c) => c.icf_codes.category === "e") || [],
  p: icfCodes?.filter((c) => c.icf_codes.category === "p") || [],
};
```

### 2. ICF 코드 조회 (하위 호환 뷰)

```typescript
// JSONB 형태로 조회 (기존 코드 호환)
const { data } = await supabase
  .from("view_consultation_icf_codes_jsonb")
  .select("icf_codes")
  .eq("consultation_id", consultationId)
  .single();

// 결과: { icf_codes: { b: [...], d: [...], e: [...] } }
```

### 3. ICF 코드 입력(정규화된 방식)

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

// 상담-ICF 코드 관계 입력
await supabase.from("consultation_icf_codes").insert(
  icfCodeIds.map((icfCodeId) => ({
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
  .select(
    `
    *,
    iso_codes!iso_code_id (code, name),
    manufacturers!manufacturer_id (code, name),
    categories!category_id (code, name)
  `
  )
  .eq("is_active", true);
```

### 3. Products 조회 (뷰 사용)

```typescript
// 뷰를 사용한 조회 (하위 호환)
const { data: products } = await supabase
  .from("view_products_with_codes")
  .select("*")
  .eq("is_active", true);
```

### 4. 코드로 상품 필터링

```typescript
// ISO 코드로 필터링(FK 사용)
const { data: products } = await supabase
  .from("products")
  .select(
    `
    *,
    iso_codes!iso_code_id (code, name)
  `
  )
  .eq("iso_codes.code", "15 09")
  .eq("is_active", true);

// 또는 기존 방식 (VARCHAR 필드 사용)
const { data: products } = await supabase
  .from("products")
  .select("*")
  .eq("iso_code", "15 09")
  .eq("is_active", true);
```

## 마이그레이션 계획

### 단계 1: 코드 테이블 생성 및 기존 데이터 마이그레이션

- 코드 테이블 생성
- 기존 데이터에 코드 참조 추가
- FK 컬럼 추가 및 데이터 업데이트

### 단계 2: API 코드 업데이트 (점진적)

- FK를 사용한 조회로 전환
- 기존 VARCHAR 필드는 제거하지 않음 (하위 호환)

### 단계 3: 기존 VARCHAR 필드 제거 (선택적)

- 모든 코드가 FK를 사용하도록 전환 완료
- VARCHAR 필드 제거 가능

## 관리자 UI 기능 추가

### 코드 관리 페이지 추가 (권장)

1. **ISO 코드 관리** (`/admin/iso-codes`)

   - ISO 코드 추가/수정/삭제
   - 계층 구조 설정
   - 코드 레벨 관리

2. **제조사 관리** (`/admin/manufacturers`)

   - 제조사 추가/수정/삭제
   - 국가별 필터링
   - 웹사이트 링크 관리

3. **카테고리 관리** (`/admin/categories`)
   - 카테고리 추가/수정/삭제
   - 계층 구조 설정

## 장점

### 1. 데이터 무결성 향상

- FK 제약조건으로 코드 입력 검증
- 코드 변경 시 자동 반영 (CASCADE 옵션)

### 2. 중복 제거

- 동일한 코드명이 여러 곳에 저장되는 문제 해결
- 코드 정보 일관성 유지

### 3. 제거 변경 용이

- 코드 정보 변경 시 한 곳만 수정
- 코드 사용 통계 추적 용이

### 4. 확장성

- 코드별로 상품 추가 용이
- 계층 구조 지원

## 참고사항

1. **하위 호환**: 기존 VARCHAR 필드는 제거하지 않아 기존 코드와 호환됩니다.

2. **데이터 병행**: FK와 VARCHAR 필드 모두 병행하여 사용할 수 있습니다. 점진적으로 전환 가능.

3. **마이그레이션 계획**:
   - 코드 테이블 생성 → 기존 데이터 마이그레이션 → FK 설정 → API 업데이트

## 참고 링크

- 마이그레이션: `supabase/migrations/20250220000000_normalize_code_tables.sql`
- 뷰 `view_products_with_codes` (하위 호환)

---

## 정규화 필요성 검토

### 현재 구조 상태

#### ✅ 정규화됨(정규화 원칙)

**핵심 테이블들이 기본적으로 정규화되어 있음 (기본 3NF 단계 수준)**:

- `consultations` (상담 세션)
- `chat_messages` (대화 로그)
- `analysis_results` (AI 분석 결과)
- `recommendations` (상담-상품 매칭)
- `ippa_evaluations` (평가 결과)

**운영(OLTP)과 분석/로그/통계를 분리한 구조**:

- `conversion_events`, `icf_code_usage_logs`, `icf_code_statistics` 같은 이벤트/통계 테이블이 운영과 분리되어 있음

### 정규화가 필요한 부분

#### A. JSONB / 배열(중첩된) 필드: 1NF 원칙에 위배되는 "반정규화"

**현재 구조는 MVP단계 괜찮지만 "활동/ICF코드 기준으로 분석/효과성검증"이 필요해지는 시점 정규화가 필요합니다**

| 테이블                | 필드                   | 현재 상태                          | 문제(정규화 필요)                                                     | 권장(정규화)                                        |
| --------------------- | ---------------------- | ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `consultations`       | `ippa_activities`      | JSONB (활동/점수 배열)             | 활동별 통계/분석/효과성 추적 어려움, 구조 변경 시 마이그레이션 어려움 | `consultation_ippa_activities` (별도 테이블)        |
| `ippa_evaluations`    | `activity_scores`      | JSONB (활동별 사전/사후/개선)      | "활동 기준" 분석/통계 추적 어려움                                     | `ippa_evaluation_activity_scores`                   |
| `analysis_results`    | `icf_codes`            | JSONB (b/d/e 카테고리별 코드 배열) | ICF 코드별 통계/분석 추적 어려움/확장 어려움                          | `analysis_icf_codes` (category, code, confidence 등 |
| `icf_code_statistics` | `associated_iso_codes` | TEXT[] (배열)                      | 중첩된 1NF 위배). iso_code와 keyword와 topN 추출 어려움               | 별도 테이블 생성(필요 시)                           |
| `icf_code_statistics` | `associated_keywords`  | TEXT[] (배열)                      | 동일 문제                                                             | 별도 테이블 생성(필요 시)                           |
| `icf_code_expansions` | `iso_hints`            | TEXT[] (배열)                      | 동일 문제                                                             | 별도 테이블 생성(필요 시)                           |

**현재까지의 결론**:

- "상담 단계에서 추출한" 경우 JSONB 제거 가능
- 하지만 추후 필요한 **추천/평가 기준 코드 통계가 필요**한데, 활동 점수(ippa)와 ICF 코드(analysis)는 정규화가 필요함
- **우선순위: HIGH**

#### B. 중복/파생 값이 생성: "업데이트 이상(Anomaly)" 위험

**추천/전환/구매 같은 이벤트가 발생할 때마다 '정답'이 달라지는 문제가 있습니다.**

| 테이블            | 필드/관계                                                        | 문제                                                                                   | 권장                                                                    |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `recommendations` | `purchase_completed`, `purchase_completed_at`, `purchase_amount` | `conversion_events`에서 구매 이벤트 발생 시 중복 값이 생성됨                           | 구매는 "이벤트 로그" 또는 "purchase 테이블 별도"로 관리                 |
| `users`           | `points`                                                         | `point_transactions`의 합계(계산)와 중복. 점진적으로 누적하여 운영 계산/정산 오류 위험 | `users.points`는 계산 필드로 설정하고, 트리거로 자동 계산하는 방식 권장 |

#### C. 코드/값이 "문자열로만 관리: 데이터베이스 확장 문제

**현재 CHECK 제약만 있는데 확장이 필요하면 "값이 바뀌어야" 하는 문제가 있습니다.**

| 테이블              | 필드                                      | 현재 방식        | 권장                                                                              |
| ------------------- | ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `consultations`     | `disability_type`, `disability_severity`  | TEXT (직접 입력) | 동일 값이 여러 곳에 입력되는 문제. (시각/청각 장애) 같은 통계/추천 유형 확장 필요 | 코드 테이블 lookup) 또는 ENUM/제약조건              |
| `products`          | `category`, `manufacturer`                | 문자열           | 카테고리/제조사 정보가 중복, 중복/일관 관리 어려움                                | `product_categories`, `manufacturers` 생성(필요 시) |
| `conversion_events` | `event_type`, `source`, `tracking_source` | 문자열+CHECK     | 이벤트 타입 확장 시 DDL 변경 필요                                                 | ENUM(제약조건) / 코드 테이블 생성 시)               |

#### D. 무결성(Integrity) 원칙에 위배되는"참조의 3NF위배" 위험

**정규화를 완전히 하지 않으면 DBA 운영 복잡도가 증가합니다.**

| 테이블               | 필드                                       | 문제                                                       | 권장                                                                                    |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `point_transactions` | `reference_type` + `reference_id`          | 다형성 참조의 FK를 만들 수 없어 무결성 검증 어려움         | (1) reference_type별 별도 테이블 (2) 점진적으로 존재 무결성 (3) 최소한 enum+무결성 함수 |
| `recommendations`    | `(consultation_id, product_id)`            | 중복 추천 row가 생성될 수 있음 (같은 상담에서 여러번 추천) | "상담당" 1개 추천이면 UNIQUE 권장                                                       |
| `ippa_evaluations`   | `(user_id, product_id, recommendation_id)` | 동일 조건으로 평가가 중복 생성 가능                        | UNIQUE 제약 추가 필요                                                                   |

### 정규화 우선순위

#### 🔴 우선순위 HIGH (추천/평가 기준 통계 필수)

**1. K-IPPA 활동 점수 기준 정규화**

**현재 문제**:

- 상담 단계 선택한 활동 baseline: `consultations.ippa_activities` (JSONB)
- 평가 단계 post score: `ippa_evaluations.activity_scores` (JSONB)

**정규화 필요점**:

- 활동별 추천 가능/평가 결과 분석 가능
- 특정 ICF 활동에서 어떤 상품이 효과적인지 분석 가능
- 핵심 KPI 통계 가능

**권장 구조**:

```sql
-- 상담 단계 활동 점수
CREATE TABLE consultation_ippa_activities (
    id UUID PRIMARY KEY,
    consultation_id UUID NOT NULL,
    icf_code VARCHAR(50) NOT NULL,
    importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
    pre_difficulty INTEGER NOT NULL CHECK (pre_difficulty BETWEEN 1 AND 5),
    collected_at TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE
);

-- 평가 단계 활동 점수
CREATE TABLE ippa_evaluation_activity_scores (
    id UUID PRIMARY KEY,
    evaluation_id UUID NOT NULL,
    icf_code VARCHAR(50) NOT NULL,
    importance INTEGER NOT NULL,
    pre_difficulty INTEGER NOT NULL,
    post_difficulty INTEGER NOT NULL,
    assistive_device TEXT,
    improvement INTEGER,
    effectiveness_score DECIMAL(5, 2),
    FOREIGN KEY (evaluation_id) REFERENCES ippa_evaluations(id) ON DELETE CASCADE
);
```

**2. AI 분석 ICF 코드 정규화(최소한 "코드 별 관리"**

**현재**: `analysis_results.icf_codes` (JSONB)

**권장**: JSONB를 제거하지 않더라도, 조회/통계 용도로**별도 테이블을 만들거나 방식(하이브리드)**

**단계**:

- `analysis_results.icf_codes`: 원본 형태로 보관 (감사/재현용)
- `analysis_icf_codes`: 조회/통계/분석용

**권장 구조**:

```sql
CREATE TABLE analysis_icf_codes (
    id UUID PRIMARY KEY,
    analysis_result_id UUID NOT NULL,
    icf_code VARCHAR(50) NOT NULL,
    category CHAR(1) NOT NULL CHECK (category IN ('b', 'd', 'e', 'p')),
    confidence_score DECIMAL(3, 2),
    source VARCHAR(50),
    context JSONB,
    FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id) ON DELETE CASCADE
);
```

#### 🟡 우선순위 MEDIUM (데이터 확장/운영 편의)

**1. disability_type, disability_severity를 lookup/코드화**

**주의**: 추천 유형/장애 기준 추천이 필요해질 수 있으므로 중요

**권장 구조**:

```sql
CREATE TABLE disability_types (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE disability_severities (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

**2. 추천/구매/전환의 "별도 소스"로 분리**

**문제**: 구매 완료 여부를 `recommendations`에 저장, `conversion_events`에 저장, 또는 `purchases` 테이블로 저장할지 설정 필요

**권장**:

- `conversion_events`를 별도 테이블로 사용
- `recommendations.purchase_completed` 같은 필드는 제거하거나 계산으로 통계

#### 🟢 우선순위 LOW (MVP에서 변경 불필요)

**1. 제조사/카테고리 생성**

- 이미 `manufacturers`, `categories` 테이블이 있음
- `products` 테이블에 FK 컬럼만 추가하면 됨

**2. ICF 통계의 배열 필드 생성**

- `icf_code_statistics.associated_iso_codes`, `associated_keywords` 등
- "필터링/정렬/통계"가 필요해지면 별도 테이블로 생성

### 크롤링 기능 정규화(확장 기능)

#### 크롤링 데이터의 3단계 정규화 계층

크롤링이 필요하면 **"정규화 계층"을 3단계로 설계해야 합니다**

**A. Raw(원문 보관) 계층 →"저장/압축/원본"**

- 크롤링한 HTML/JSON 원문을 그대로 보관
- 파싱 과정에서 오류 발생 시 재파싱 가능
- 나중에 분석/법적 증거/소스 변경 추적을 위해 필요

**B. Listing(원천 상품) 계층 →"소스별 상품 단계"**

- 브랜드/스마트스토어/제품명 등 `source + external_id` 기준으로 관리하는 원천 상품
- 가격 변동/배송/재고/할인 같은 "변하는 값"은 별도 스냅샷 테이블로 분리(정규화)

**C. Canonical(정제 상품) 계층 →"통합된 추천하는 상품"**

- 기존 ERD에서 `products`가 이에 해당
- 여러 source listing이 합쳐진 canonical product로 매핑(중복 제거, 정규화)

**핵심 원칙**:

> 크롤링 시스템은 "원천(source)"이 바뀌고 "가격/재고"가 계속 변합니다.  
> 그래서 `products` 한 테이블에 다 때려 넣으면 6개월 후에 무조건 운영이 지옥이 됩니다.

#### 향후 추가 시 필요한 테이블(정규화 확장 기능)

**1. 소스/채널 정의: `crawl_sources`**

**왜 필요한가**:

- 같은 상품이 소스별로 ID 추적이 어려워 크롤링 설정(이름/URL/헤더/robots)이 필요
- "어떤 소스에서 왔는지"가 PK가 아니라 문제

**정규화 필요점**: `source_code` (unique)로 소스별 listings에 `source_id` FK로 연결

**2. 크롤링 작업/요청 추적: `crawl_jobs`, `crawl_requests`**

**왜 필요한가 (DBA 필수)**:

- 크롤링은 100% 실패합니다(차단/타임아웃/파서 오류/구조 변경)
- "언제, 무엇을, 왜 실패했는지"를 DB에 남겨야 재시도/복구가 가능

**정규화 필요점**: Job(배치 단계)과 Request(페이지 단계)를 분리, request와 raw 문서와 스냅샷은 1:N)

**3. 원문 저장 `raw_documents`**

**왜 필요한가**:

- 파싱 결과만 저장하면 "파서 버그"가 났을 때 재파싱 불가
- 소스 구조 변경 시 기존 데이터를 다시 파싱해야 하는 경우 필요

**필수 필요점**:

- 원문은 용량이 매우 큼 → 파티셔닝/TTL(보관기간)/압축 정책 필요
- DB에 저장할지, S3/외부 스토리지로 저장할지 결정 필요
- **MVP**: DB에 JSON/텍스트로 저장 OK
- **운영 확장**: 원문은 외부 스토리지 + DB에는 메타/경로/링크만 저장

**4. 원천 상품: `product_listings`**

**정규화 필요점**:

- `products` (정제)와 분리해야 함
- listing은 "원천 소스의 상품 1개"이며, `source_id + external_id`가 유일 키

**왜 분리해야 하는가**:

- "같은 canonical product"가 브랜드에서 왔을 수도 스마트스토어에서 왔을 수도 있음
- listing을 분리하면:
  - 가격 변동은 listing 기준으로 추적
  - canonical product는 추천/분석의 기준으로 설정

**5. 가격/재고 변동 스냅샷: `listing_price_snapshots`, `listing_availability_snapshots`**

**정규화 필요점**:

- listing row를 업데이트로 덮어쓰지 말고, 스냅샷(시간축) 테이블로 분리
- 나중에 필요 "가격 변동", "재고 변동", "추천 후 구매율" 분석이 가능

**DBA 필수 필요점**:

- 스냅샷 테이블은 용량이 무한정 증가 → 파티셔닝/BRIN 인덱스/보관 정책 필요

**6. 이미지/옵션/스펙(변경) 테이블**

**크롤링 상품은 변경 가능**:

- 이미지 여러 개 (1:N)
- 옵션(사이즈/색상/용량)(1:N)
- 스펙(제조사/모델명/ISO9999 코드 포함)(1:N)

**정규화 권장**:

- 일단 JSONB로도 가능하지만 "조회/필터"가 필요해지면 별도 테이블이 필요합니다
- 단 "휠체어 보조기기+ 사이즈L + 의료용" 필터링이 필요하면 JSONB로도 충분

**7. 중복 제거/매핑: `product_listing_map`**

**정규화 필요점**:

- listing(원천) ↔ product(정제) 관계는 거의 항상 N:1 (여러 listing이 합쳐져서 canonical product로 매핑)
- 매핑은 신뢰도/매칭 방법/수동 여부 같은 운영 필드가 필요합니다

**필수 필요점**:

- 자동 매칭 결과를 검토하여 수동 매핑하는 경우 `match_status`가 필요
- 추천에서 "정제 상품(product)"을 보여주고, 실제 구매 링크는 "listing"으로 가격 추적하는 구조가 필요

#### DBA 필수 적용 필요점(운영에서 실패하는 부분)

**A. 유일성 제약조건 설정 (중복 입력 방지)**

- `product_listings`에 제약조건 `UNIQUE(source_id, external_id)`
- `listing_price_snapshots`에 `(listing_id, captured_at)` 또는 `(listing_id, captured_date, captured_hour)` 같은 중복 제약 조건 설정

**안되면**: 같은 상품이 여러 크롤링에서 listing으로 생성되어 추적/중복 어려움

**B. "스냅샷 테이블의 파티셔닝/인덱스"**

**크롤링 스냅샷은 데이터가 무한정 증가합니다**

**파티셔닝 적용 필요**:

- `raw_documents`
- `listing_price_snapshots`
- `crawl_requests`

**인덱스 권장**:

- 스냅샷은 `(listing_id, captured_at DESC)`
- 시간 조건이 많으면 테이블 BRIN(captured_at)로 설정(대용량에서 효율)

**C. 보관 정책(데이터 자동 삭제)**

- 원문(raw)은 보관기간이 제한적이므로 자동 삭제되는 경우가 많습니다(예: 30~90일)
- 스냅샷도 "최근 1년만 보관하고 그 이전은 별도 보관"하는 정책이 필요

**D. 크롤링 실패/재시도 추적**

**DB에 최소한 다음 필드가 있어야 운영합니다**:

- `status`: queued/running/succeeded/failed
- `error_code`, `error_message`
- `attempt_count`, `next_retry_at`
- `http_status`, `response_time_ms`

**E. 추천/전환 유형과 스냅샷의 "정답 테이블로 통일"**

**현재 ERD에서 `recommendations`에 구매완료/금액이 저장되고, `conversion_events`에 있습니다.**

**크롤링이 필요하면 다음과 같은 문제가 생깁니다**:

**권장(추천)**: 구매/전환은 이벤트 로그(`conversion_events`)로 통일

- `recommendations.purchase_completed` 같은 필드는 계산/파생으로 사용

**대안**: `purchases` 테이블을 별도로 만들어 관리

- 정산/구매가 "별도 테이블로 필요"하면 `purchases`가 필요

#### 구조 방식 선택 3가지 비교

**일반 원칙**: "정제 상품 vs 원천 상품"

- `products` = canonical(정제) 상품: 통합된 보조기기 상품(중복 제거, 상세/이미지/카테고리 포함
- `product_listings` = source listing(원천) 상품: 브랜드/스마트스토어/제품명 등 소스별 상품 단계 (`source_id + external_id`로 유일)

**방식 A) 추천은 "product 기준", 클릭/구매는 "listing 기준" (권장, 가장 일반적)**

**구조**:

- `recommendations`: `(consultation_id, product_id)`
- `conversion_events`: `(recommendation_id, listing_id nullable/선택, event_type, amount, 등`
- `product_listing_map`: listing ↔ product 매핑

**장점**:

- UI/추천 결과: 추천/분석은 product 기준으로 표시
- 원천 링크/가격은 listing에서 가져오면 가격 변동 추적 가능
- "같은 상품이 여러 채널에서 판매"를 명확히 구분

**단점/운영 필요점**:

- 클릭 추적 시 "어떤 listing을 클릭했는지" 설정 로직 필요 (예: 최고가/신뢰도/소스/가격이 있는 listing 기준)

**추천 사용 시나리오**: 추천 결과(상품 기준)에서 필요하고, 여러 채널 링크가 필요하면 listing 기준으로 생성해야 하는 구조

**방식 B) 추천 기준을 "listing 기준"으로 변경(단순, 제품명/채널이 중요)**

**구조**:

- `recommendations`: `(consultation_id, listing_id, product_id optional)`
- `conversion_events`: `recommendation_id` 참조

**장점**:

- 추천 즉시 클릭과 구매가 바로 URL로 연결되어 단순
- "어떤 소스에서 어떤 상품이 추천되었는지" 분석이 쉬움

**단점/운영 필요점**:

- 동일 상품이 소스별로 존재하면 추천이 중복으로 표시되어 UX가 어색
- "상품 기준 분석"이 필요하면 별도 product 매핑이 필요

**추천 사용 시나리오**: 1~2개 소스만 있고, 채널별 링크가 중요하면 이 방식

**방식 C) 하이브리드: 추천은 product, "추천 시점 기준 listing"을 별도 설정**

**구조**:

- `recommendations`: `(consultation_id, product_id, primary_listing_id)`
- 이벤트는 `listing_id`를 별도로 저장하거나 `primary_listing_id`를 기본값으로 사용

**장점**:

- 추천 시점에서 링크가 즉시 설정(단순 UX)
- 추천 시점의 "어떤 소스/어떤 가격" 스냅샷에 저장

**단점/운영 필요점**:

- `primary_listing`의 변경/삭제/링크 변경 시 listing 생성 로직이 필요
- 추천 시점 가격과 현재 가격이 다를 수 있음(차이/신뢰도)

**추천 사용 시나리오**: 추천 결과가 "브랜드 링크"가 중요하고, "어떤 소스" 운영 정책이 필요한 구조

**DBA 권장 결론(추천)**:

- 운영 확장 가능 분석이 필요하면 **방식 A**
- 소스가 적고 단순하면 **방식 B**
- UX 단순 + 운영 정책(어떤 소스 우선)이면 **방식 C**

### 결론

**현재 구조의 정규화 상태를 다음과 같이 유지하면**:

> 핵심 테이블들이 기본적으로 정규화되어 있음(기본 3NF 단계 수준),  
> 하지만 추후 필요한 활동/ICF 코드 기준 추천 & 평가 결과 분석이 필요해지는 시점에
> JSONB로 저장한 활동/ICF 기준 데이터를 정규화해야 합니다.  
> 그래서 `recommendations` 와 `conversion_events`에 구매/전환 중복 값이 생성되는 것은 운영 값이 달라질 수 있는 문제이므로, 소스 별도 테이블로 분리하는 것이 권장됩니다.

### 마이그레이션 계획

**단계별 계획**:

1. **Phase 1 (HIGH 우선순위)**: IPPA 활동 점수 정규화

   - `consultation_ippa_activities` 테이블 생성
   - `ippa_evaluation_activity_scores` 테이블 생성
   - 기존 JSONB 데이터 마이그레이션
   - API 코드 업데이트

2. **Phase 2 (HIGH 우선순위)**: ICF 코드 정규화 완료

   - `analysis_icf_codes` 테이블 생성 (이미 `consultation_icf_codes`가 있음)
   - 기존 JSONB 데이터 마이그레이션
   - API 코드 업데이트

3. **Phase 3 (MEDIUM 우선순위)**: 데이터 확장 편의

   - `disability_types`, `disability_severities` 테이블 생성
   - 구매/전환 소스 별도 분리

4. **Phase 4 (LOW 우선순위)**: 확장 기능
   - 크롤링 관련 테이블 추가
   - 배열 필드 생성 (필요 시)

### 크롤링 확장 DDL (향후 참고용)

아래 DDL은 기존 `products`, `recommendations`, `conversion_events`가 이미 존재한다고 가정하고 "크롤링 확장"만 추가합니다

#### 2-1) 크롤링 원천/스냅샷 관련 테이블 DDL

```sql
BEGIN;

-- UUID 생성
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 소스(채널/플랫폼) 정의
CREATE TABLE IF NOT EXISTS crawl_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code text NOT NULL UNIQUE, -- 'naver','smartstore','selfmall'
    display_name text NOT NULL,
    base_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) 크롤링 Job(배치 단계)
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES crawl_sources(id) ON DELETE RESTRICT,
    job_type text NOT NULL, -- 'search','detail','price_refresh'
    status text NOT NULL DEFAULT 'queued', -- queued/running/succeeded/failed
    started_at timestamptz,
    finished_at timestamptz,
    total_targets integer NOT NULL DEFAULT 0,
    success_count integer NOT NULL DEFAULT 0,
    fail_count integer NOT NULL DEFAULT 0,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source_status
ON crawl_jobs(source_id, status, created_at DESC);

-- 3) 크롤링 Request(페이지 단계) - 파티셔닝 적용(용량)
CREATE TABLE IF NOT EXISTS crawl_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    target_url text NOT NULL,
    status text NOT NULL DEFAULT 'queued', -- queued/running/succeeded/failed
    http_status integer,
    response_time_ms integer,
    attempt_count integer NOT NULL DEFAULT 0,
    next_retry_at timestamptz,
    error_code text,
    error_message text,
    fetched_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- (예시) 초기 파티션 2개 생성 (운영에서 자동 생성 함수 사용 권장)
CREATE TABLE IF NOT EXISTS crawl_requests_2025_01
PARTITION OF crawl_requests FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS crawl_requests_2025_02
PARTITION OF crawl_requests FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_crawl_requests_job_status
ON crawl_requests (job_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_next_retry
ON crawl_requests (next_retry_at)
WHERE next_retry_at IS NOT NULL;

-- 4) 원문(Raw) 저장- 파티셔닝 적용(용량)
-- 운영 확장이 필요하면 content_text를 외부 스토리지로 저장하고 storage_key만 저장하는 방식도 가능
CREATE TABLE IF NOT EXISTS raw_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES crawl_requests(id) ON DELETE CASCADE,
    content_type text NOT NULL, -- 'text/html','application/json'
    content_text text, -- or NULL if stored externally
    storage_key text, -- e.g. 's3://bucket/key' (선택)
    content_hash text, -- 변경 감지/dedupe
    created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS raw_documents_2025_01
PARTITION OF raw_documents FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS raw_documents_2025_02
PARTITION OF raw_documents FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_raw_documents_request
ON raw_documents (request_id);

CREATE INDEX IF NOT EXISTS idx_raw_documents_hash
ON raw_documents (content_hash);

-- 5) 원천 상품 Listing(소스별 상품)
CREATE TABLE IF NOT EXISTS product_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES crawl_sources(id) ON DELETE RESTRICT,
    external_id text NOT NULL, -- 소스 상품 ID
    product_url text NOT NULL,
    title text,
    brand text,
    seller_name text,
    currency text NOT NULL DEFAULT 'KRW',
    is_active boolean NOT NULL DEFAULT true,
    last_crawled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_product_listings_source_active
ON product_listings (source_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_listings_updated
ON product_listings (updated_at DESC);

-- 6) Listing 변동 스냅샷(가격/재고) - 파티셔닝 적용(용량)
CREATE TABLE IF NOT EXISTS listing_price_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    price numeric(12,2),
    shipping_fee numeric(12,2),
    stock_status text, -- 'in_stock','out_of_stock','unknown'
    captured_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (captured_at);

CREATE TABLE IF NOT EXISTS listing_price_snapshots_2025_01
PARTITION OF listing_price_snapshots FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS listing_price_snapshots_2025_02
PARTITION OF listing_price_snapshots FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_listing_price_listing_time
ON listing_price_snapshots (listing_id, captured_at DESC);

-- 7) 정제 상품(products) ↔ listing 매핑 (중복 제거/정규화 필요)
CREATE TABLE IF NOT EXISTS product_listing_map (
    listing_id uuid PRIMARY KEY REFERENCES product_listings(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    match_status text NOT NULL DEFAULT 'auto', -- auto/manual/rejected
    match_score numeric(5,2),
    match_reason text,
    matched_by uuid, -- users.id (관리자)
    matched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_listing_map_product
ON product_listing_map (product_id);

COMMIT;
```

#### 2-2) recommendations / conversion_events에 listing 연결 추가하는 DDL

**방식 A를 기준으로 "클릭/구매 이벤트가 어떤 listing에서 발생했는지"를 확인하려면 `conversion_events`에 `listing_id`를 추가하는 방법이 있습니다**

```sql
-- (방식 A/C 권장) conversion_events에 listing_id 추가
ALTER TABLE conversion_events
ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES product_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_listing_time
ON conversion_events (listing_id, created_at DESC);
```

**방식 C를 선택하면 recommendations에 기본 listing 추가:**

```sql
-- (방식 C) recommendations에 기본 listing 설정
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS primary_listing_id uuid REFERENCES product_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_primary_listing
ON recommendations(primary_listing_id);
```

#### 2-3) 파티션 자동 생성/보관 정책(함수)

**(1) 월별 파티션 자동 생성 함수**

운영에서 "매월 1일에 다음 달 파티션을 자동 생성하는 방식 구현:

```sql
CREATE OR REPLACE FUNCTION ensure_monthly_partition(
    p_parent regclass,
    p_col_name text,
    p_month date
) RETURNS void AS $$
DECLARE
    v_start date := date_trunc('month', p_month)::date;
    v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
    v_tbl text := format('%s_%s', p_parent::text, to_char(v_start, 'YYYY_MM'));
    v_sql text;
BEGIN
    v_sql := format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L);',
        v_tbl, p_parent, v_start::text, v_end::text
    );
    EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;
```

**사용 예**:

```sql
SELECT ensure_monthly_partition('crawl_requests', 'created_at', current_date);
SELECT ensure_monthly_partition('raw_documents', 'created_at', current_date);
SELECT ensure_monthly_partition('listing_price_snapshots', 'captured_at', current_date);
```

**(2) 보관 정책(오래된 파티션 삭제) 함수**

`keep_months` 기준으로 이전 파티션을 DROP (raw는 1~3개월, price snapshot은 6~12개월 같은 보관 정책 권장):

```sql
CREATE OR REPLACE FUNCTION drop_partitions_older_than(
    p_parent regclass,
    p_keep_months int
) RETURNS void AS $$
DECLARE
    r record;
    v_cutoff date := (date_trunc('month', now()) - (p_keep_months || ' months')::interval)::date;
BEGIN
    FOR r IN
        SELECT c.relname AS child
        FROM pg_inherits
        JOIN pg_class c ON pg_inherits.inhrelid = c.oid
        JOIN pg_class p ON pg_inherits.inhparent = p.oid
        WHERE p.oid = p_parent
    LOOP
        -- 테이블명 끝 YYYY_MM 패턴이 있는지(예: listing_price_snapshots_2025_01)
        -- 필수적으로 파티션 범위를 pg_get_expr로 가져와서 이전인지 확인하는 방법도 있음
        IF substring(r.child from '(\d{4}_\d{2})$') IS NOT NULL THEN
            IF to_date(substring(r.child from '(\d{4}_\d{2})$'), 'YYYY_MM') < v_cutoff THEN
                EXECUTE format('DROP TABLE IF EXISTS %I;', r.child);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**실행 예 (매월 1일 자동 실행)**:

```sql
SELECT drop_partitions_older_than('raw_documents', 3);
SELECT drop_partitions_older_than('crawl_requests', 6);
SELECT drop_partitions_older_than('listing_price_snapshots', 12);
```

### 중복 상품 매칭(자동/수동) 운영 테이블 추가

#### 3-1) 필요 요구사항

**자동 매칭은 100% 완벽하지 않습니다.**

**운영에서 필요한 것**:

1. 자동 규칙 생성(rule 기준 + score)
2. 검토 큐(pending → approved/rejected)
3. 수동 → `product_listing_map` 업데이트
4. "어떤 매칭이 되었는지/거부 수동되었는지" 감사 추적

#### 3-2) DDL: match_rules / match_queue / match_audit_logs

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 매칭 규칙(자동 매칭 규칙 설정)
CREATE TABLE IF NOT EXISTS match_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL UNIQUE,
    is_enabled boolean NOT NULL DEFAULT true,
    -- 규칙 타입 예시:
    -- 'exact_external_id', 'url_normalize', 'title_similarity', 'brand_model', 'embedding'
    rule_type text NOT NULL,
    -- 규칙 설정(임계값이 어느 정도, 필드 매칭 등
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    priority int NOT NULL DEFAULT 100, -- 우선순위 높을수록 먼저 적용
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_rules_enabled_priority
ON match_rules(is_enabled, priority);

-- 2) 매칭 큐 검토 대기
-- listing 1개에 대해 여러 후보(product 후보)가 나타날 수 있음
CREATE TABLE IF NOT EXISTS match_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    candidate_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    rule_id uuid REFERENCES match_rules(id) ON DELETE SET NULL,
    match_score numeric(6,3) NOT NULL DEFAULT 0,
    match_reason text,
    evidence jsonb, -- 어떤 필드가 일치했는지, 차이점이 무엇인지
    status text NOT NULL DEFAULT 'pending', -- pending/approved/rejected/expired
    reviewed_by uuid, -- users.id
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- 같은 listing과 같은 후보가 중복 생성되는 것을 방지
    UNIQUE(listing_id, candidate_product_id)
);

CREATE INDEX IF NOT EXISTS idx_match_queue_status_score
ON match_queue(status, match_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_queue_listing
ON match_queue(listing_id);

-- 3) 매칭 감사 로그(거부 이유/수동/거부되었는지)
CREATE TABLE IF NOT EXISTS match_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'approve','reject','auto_map','unmap'
    actor_id uuid, -- users.id or NULL for system
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_audit_listing_time
ON match_audit_logs(listing_id, created_at DESC);

COMMIT;
```

#### 3-3) 운영 시나리오 및 필수 필요점

**자동 매칭 테이블 사용법(추천)**:

1. **크롤링 → product_listings upsert**
2. **후보 생성**: 규칙 실행에서 후보(product)를 찾아 `match_queue`에 pending으로 입력
3. **임계값 이상은 자동 매핑**: score가 0.95 이상인 경우 `product_listing_map`에 자동으로 반영하고 로그 기록
4. **검토 필요 시 검토 UI에서 수동/거부**:
   - 수동 → `product_listing_map`(listing_id ↔ product_id) upsert
   - 거부 → `match_queue.status='rejected'`
5. **변경 감지/상품 변경 시 재검토**: listing의 content_hash/title/brand 변경 시 `match_queue`를 초기화하거나 expired 처리

**DBA가 제약해야 하는 것**:

- **중복 제약 조건**: `product_listings UNIQUE(source_id, external_id)`, `match_queue UNIQUE(listing_id, candidate_product_id)`
- **상태 기준 인덱스**: `match_queue(status, score DESC)`
- **감사 로그(거부 수동되었거나)**: 운영에서 감사/확장 필요 필드가 있으면 추가 필요
- **자동 매칭과 수동 매칭의 구분 가능**: `product_listing_map.match_status`를 auto/manual로 설정하고, 수동 매핑 시 manual이 auto를 덮어쓰도록 설정

### 운영에서 제대로 작동하는 "DBA 체크리스트" (최종 필요점)

**1) 데이터 폭증 테이블부터 파티션/보관 정책을 먼저 정해라**

- `listing_price_snapshots`, `raw_documents`, `crawl_requests`
- "무한정 쌓아두기"는 100% 장애로 돌아옵니다(백업, vacuum, 인덱스, 비용).

**2) 중복 제약 조건 (UNIQUE) 없으면 크롤링은 망한다**

- listing은 `source_id + external_id` 유일이 사실상 생명줄
- price snapshot은 중복 제약 조건 설정(동일 시각 중복 삽입 방지)

**3) 원문 저장 전략 "DB vs 외부 스토리지"를 결정**

- **DB 저장**: 빠른 접근/원본 보관용, 비용/용량 제한
- **외부 스토리지 저장**: 운영 편의, 나중에 조회/복구/경로 링크 필요
- **필수적으로 원문은 외부 스토리지 + DB에는 메타/경로/링크만 저장하는 것이 권장됩니다**

**4) 추천/구매/전환 "정답 테이블로 통일"**

- `recommendations`에 구매 여부를 저장하면 안 되고 이벤트 로그는 별도로 관리
- 정답은 `conversion_events` (또는 `purchases`)로 설정하고 나머지는 파생으로 사용

**5) 실패/재시도/오류를 추적하는 필드가 있어야 한다**

- `attempt_count`, `next_retry_at`, `error_*` 없이 운영하면 "왜 실패했는지"를 알 수 없습니다.

### 최종 정리: 추천 구조

**구조 방식**: 방식 A (product 추천 + listing 이벤트 추적)

**크롤링 확장**:

- `crawl_*` + `product_listings` + `listing_price_snapshots` + `product_listing_map`

**매칭 운영**:

- `match_rules` + `match_queue` + `match_audit_logs`

**보관 정책**:

- raw는 1~3개월, request는 3~6개월, price snapshot은 6~12개월(추후 필요에 따라 설정)

### 참고 링크

- [데이터베이스 관리 가이드](./database-maintenance-guide.md)
- [ICF 코드 정규화 가이드](./icf-codes-normalization-guide.md)
