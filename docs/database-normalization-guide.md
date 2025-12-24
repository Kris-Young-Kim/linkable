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

---

## 정규화 개선 계획

### 현재 스키마 평가

#### ✅ 잘 된 점 (정규화 관점)

**핵심 업무 흐름이 엔티티로 잘 분리되어 있음 (기본 3NF 흐름 양호)**:
- `consultations` (세션 헤더)
- `chat_messages` (대화 로그)
- `analysis_results` (AI 분석 결과)
- `recommendations` (상담-상품 매칭)
- `ippa_evaluations` (효과성 평가)

**운영계(OLTP)와 분석계(로그/집계) 역할 분리**:
- `conversion_events`, `icf_code_usage_logs`, `icf_code_statistics` 등 이벤트/통계 테이블이 운영계와 분리되어 있음

### 정규화가 필요한 지점

#### A. JSONB / 배열(다중값) 컬럼: 1NF 관점에서 "반정규화"

**현재 구조는 MVP에선 빠르지만, "활동/ICF코드 단위로 검색·집계·필터링"이 늘어나는 순간 조인 테이블이 필요합니다.**

| 테이블 | 컬럼 | 현재 형태 | 문제(정규화/운영) | 권장(정규화) |
|--------|------|----------|------------------|--------------|
| `consultations` | `ippa_activities` | JSONB (활동/점수 묶음) | 활동별 통계/검색/검증 어려움, 구조 변경 시 마이그레이션 부담 | `consultation_ippa_activities` (행 단위) |
| `ippa_evaluations` | `activity_scores` | JSONB (활동별 사전/사후/개선) | "활동 단위" 분석/리포트가 어려움 | `ippa_evaluation_activity_scores` |
| `analysis_results` | `icf_codes` | JSONB (b/d/e 카테고리별 코드 배열) | ICF 코드별 정확도/빈도/근거 저장 확장 시 한계 | `analysis_icf_codes` (category, code, confidence 등) |
| `icf_code_statistics` | `associated_iso_codes` | TEXT[] (배열) | 다중값(1NF 위반). iso_code별/keyword별 topN 뽑기 비효율 | 연결 테이블 분리(필요 시) |
| `icf_code_statistics` | `associated_keywords` | TEXT[] (배열) | 위와 동일 | 연결 테이블 분리(필요 시) |
| `icf_code_expansions` | `iso_hints` | TEXT[] (배열) | 위와 동일 | 연결 테이블 분리(필요 시) |

**현실적인 결론**:
- "상담 화면에서 보여주기" 수준이면 JSONB 유지 가능
- 하지만 이 서비스는 **추천/효과성/코드 통계가 핵심**이라, 활동 점수(ippa)와 ICF 코드(analysis)는 정규화 이득이 큼
- **중요도: HIGH**

#### B. 중복/이중 저장 가능성: "업데이트 이상(Anomaly)" 위험

**추천/전환/구매는 이벤트가 많아서 한 곳에만 '정답'이 있는 게 좋습니다.**

| 테이블 | 컬럼/개념 | 이슈 | 권장 |
|--------|----------|------|------|
| `recommendations` | `purchase_completed`, `purchase_completed_at`, `purchase_amount` | `conversion_events`에도 구매 이벤트/금액이 들어갈 수 있어 중복 저장 가능성이 큼 | 구매는 "이벤트 로그" 또는 "purchase 테이블" 중 한 곳을 소스 오브 트루스로 고정 |
| `users` | `points` | `point_transactions`의 합계(원장)와 중복. 트리거로 맞추고 있지만 운영 중 오류/재처리 시 불일치 위험 | `users.points`는 캐시 컬럼로 인정하되, 정기적으로 원장 합계로 재계산/검증 루틴 권장 |

#### C. 코드/분류 값이 "문자열"로만 관리됨: 데이터 품질 문제

**현재는 CHECK 제약 일부가 있지만, 서비스가 커지면 "값 표준화"가 중요해집니다.**

| 테이블 | 컬럼 | 현재 리스크 | 권장 |
|--------|------|------------|------|
| `consultations` | `disability_type`, `disability_severity` | TEXT (자유 입력) | 동일 개념이 여러 값으로 저장 (오타/표기 차이) → 통계/추천 모델 품질 저하 | 코드 테이블(lookup) 또는 ENUM/도메인 |
| `products` | `category`, `manufacturer` | 문자열 | 카테고리/제조사 표준화 불가, 중복/표기 흔들림 | `product_categories`, `manufacturers` 분리(필요 시) |
| `conversion_events` | `event_type`, `source`, `tracking_source` | 문자열+CHECK | 이벤트 종류 확장 시 DDL 변경 잦음 | ENUM(고정이면) / 코드 테이블(자주 늘면) |

#### D. 무결성(Integrity) 관점에서 "구조는 3NF여도" 위험한 지점

**정규화라기보다 DBA 운영 리스크입니다.**

| 테이블 | 컬럼 | 이슈 | 권장 |
|--------|------|------|------|
| `point_transactions` | `reference_type` + `reference_id` | 폴리모픽 참조라 FK를 걸 수 없어 고아 레코드/오타 발생 가능 | (1) reference_type별 분리 테이블, (2) 트리거로 존재검증, (3) 최소한 enum+검증 함수 |
| `recommendations` | `(consultation_id, product_id)` | 중복 추천 row가 생길 수 있음 (재실행/재추천 로직에서) | "의도"가 1회 추천이면 UNIQUE 권장 |
| `ippa_evaluations` | `(user_id, product_id, recommendation_id)` | 동일 추천에 대한 평가 중복 가능 | UNIQUE 정책 정의 필요 |

### 정규화 우선순위

#### ✅ 우선순위 HIGH (추천/효과성/코드 기반 서비스 핵심)

**1. K-IPPA 활동 점수 구조 정규화**

**현재 문제**:
- 상담 시 선택한 활동 baseline: `consultations.ippa_activities` (JSONB)
- 평가 시 post score: `ippa_evaluations.activity_scores` (JSONB)

**정규화 후 이점**:
- 활동별 추천 성능/효과성 분석 가능
- 특정 ICF 활동에서 어떤 제품군이 효과적인지 분석 가능
- 핵심 KPI 계산이 쉬워짐

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

**2. AI 분석 ICF 코드 정규화 (최소한 "코드 행" 저장)**

**현재**: `analysis_results.icf_codes` (JSONB)

**권장**: JSONB를 유지하더라도, 조회/통계용으로 **행 테이블을 하나 두는 방식(이중화)**

**예시**:
- `analysis_results.icf_codes`: 원문 그대로 보관 (감사/리플레이용)
- `analysis_icf_codes`: 조회/랭킹/통계용

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

#### ✅ 우선순위 MEDIUM (데이터 품질/운영 안정성)

**1. disability_type, disability_severity를 lookup/코드화**

**이유**: 추천 모델/룰 기반 추천이 들어갈수록 값 표준화는 중요

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

**2. 추천/구매/전환의 "진실의 원천"을 하나로 정리**

**문제**: 구매 완료 여부를 `recommendations`에 둘지, `conversion_events`에 둘지, 또는 `purchases` 테이블로 둘지 결정 필요

**권장**:
- `conversion_events`를 소스 오브 트루스로 사용
- `recommendations.purchase_completed` 등은 제거하거나 뷰로 계산

#### ✅ 우선순위 LOW (MVP에서는 보류 가능)

**1. 제조사/카테고리 분리**

- 이미 `manufacturers`, `categories` 테이블이 있음
- `products` 테이블에서 FK 연결만 완료하면 됨

**2. ICF 통계의 배열 컬럼 분리**

- `icf_code_statistics.associated_iso_codes`, `associated_keywords` 등
- "검색/필터/리포트 요구"가 커질 때 단계적으로 해도 됨

### 크롤링 기능 관련 정규화 (확장 포인트)

#### 크롤링 데이터의 3단계 정규화 계층

크롤링이 들어오면 **"정규화 계층"을 3단으로 나누는 게 실무 표준**입니다.

**A. Raw(원문 보관) 계층 — "증거/재현/디버깅"**
- 크롤링한 HTML/JSON 원문을 그대로 저장
- 파싱 로직이 바뀌어도 재파싱 가능
- 장애 분석/법적 이슈/원천 사이트 변경 대응에 유리

**B. Listing(원천 상품) 계층 — "소스별 상품 단위"**
- 쿠팡/스마트스토어/자사몰 등 `source + external_id` 기준으로 한 건의 원천상품
- 가격/재고/배송/리뷰/랭킹 같은 "자주 변하는 값"은 별도 스냅샷 테이블로 분리(정규화)

**C. Canonical(정제 상품) 계층 — "서비스가 추천하는 표준 상품"**
- 지금 ERD의 `products`가 여기에 해당
- 여러 source listing을 하나의 canonical product에 매핑(중복 제거, 통합)

**핵심 포인트**:
> 크롤링 시스템은 "원천(source)"이 바뀌고 "가격/재고"가 계속 변합니다.  
> 그래서 `products` 한 테이블에 다 때려 넣으면 6개월 후에 무조건 운영이 지옥이 됩니다.

#### 꼭 추가되면 좋은 테이블 (정규화 확장 포인트)

**1. 소스/채널 정의: `crawl_sources`**

**왜 필요한가**:
- 같은 상품도 소스마다 ID 체계가 다르고, 크롤링 정책(레이트리밋/헤더/파서/robots)이 다름
- "어느 사이트에서 왔는지"가 PK의 일부가 됨

**정규화 포인트**: `source_code` (unique)로 표준화, listings는 `source_id` FK만 들고 있음

**2. 크롤링 작업/실행 추적: `crawl_jobs`, `crawl_requests`**

**왜 필요한가 (DBA 실무)**:
- 크롤링은 100% 장애가 납니다(차단/타임아웃/파서 깨짐/구조 변경)
- "언제, 무엇을, 왜 실패했는지"를 DB에 남겨야 재시도/복구가 가능합니다

**정규화 포인트**: Job(배치 단위)과 Request(페이지 단위)를 분리, request는 raw 저장과 연결됨(1:N)

**3. 원문 저장: `raw_documents`**

**왜 필요한가**:
- 파싱 결과만 저장하면 "파서 버그"가 났을 때 재현이 안 됨
- 소스 구조 변경 시 과거 데이터를 다시 파싱해야 할 때가 많음

**실무 포인트**:
- 원문은 용량이 매우 큼 → 파티셔닝/TTL(보관기간)/압축 정책 필요
- DB에 넣을지, S3/스토리지에 넣고 DB에는 경로만 둘지 결정해야 함
- **MVP**: DB에 JSON/텍스트 저장 OK
- **운영 규모**: 원문은 오브젝트 스토리지 + DB에는 메타/해시/경로만 추천

**4. 원천 상품: `product_listings`**

**정규화 핵심**:
- `products` (정제)와 분리해야 함
- listing은 "원천 소스의 상품 1개"이며, `source_id + external_id`가 유일 키

**왜 이게 중요?**:
- "같은 canonical product"가 쿠팡에도 있고 스마트스토어에도 있음
- listing을 분리하면:
  - 가격/재고는 listing 단위로 추적
  - canonical product는 추천/검색의 기준으로 안정적으로 유지

**5. 가격/재고/배송 등 변동값: `listing_price_snapshots`, `listing_availability_snapshots`**

**정규화 핵심**:
- listing row를 업데이트로 덮어쓰지 말고, 스냅샷(시간축) 테이블로 분리
- 이렇게 해야 "가격변동", "재고변동", "추천 후 구매율" 분석이 가능합니다

**DBA 실무 포인트**:
- 스냅샷 테이블은 가장 빨리 커짐 → 파티셔닝/BRIN 인덱스/보관정책 필수

**6. 이미지/옵션/속성(규격) 테이블**

**크롤링 상품에는 대개**:
- 이미지 여러 장(1:N)
- 옵션(사이즈/색상/좌우/규격)(1:N)
- 속성(재질/호환/사이즈/ISO9999 코드 후보 등)(1:N)

**정규화 전략**:
- 단순히 JSONB로도 가능하지만, "조회/필터"가 요구되면 분리 테이블이 맞습니다
- 예: "무릎보조기 + 사이즈 L + 좌측" 필터링이 필요해지면 JSONB는 고통

**7. 중복 제거/매핑: `product_listing_map`**

**정규화 핵심**:
- listing(원천) ↔ product(정제) 관계는 거의 항상 N:1 (여러 listing이 하나의 canonical product로 합쳐짐)
- 매핑에는 신뢰도/매칭근거/승인여부 같은 운영 필드가 필요합니다

**실무 포인트**:
- 자동 매칭 결과를 사람이 승인하는 플로우가 있으면 `match_status`가 필수
- 추천에서 "정제상품(product)"를 쓰되, 실제 구매 링크는 "listing"을 타게 하는 구조가 많음

#### DBA 실무 적용 포인트 (현업에서 안 하면 사고나는 것들)

**A. 유일키/업서트 전략 (중복 삽입 방지)**

- `product_listings`에 반드시: `UNIQUE(source_id, external_id)`
- `listing_price_snapshots`는: `(listing_id, captured_at)` 또는 `(listing_id, captured_date, captured_hour)` 같은 중복 방지 키 고려

**이걸 안 하면**: 같은 상품이 매 크롤링마다 새 listing으로 생성 → 추천/통계 전부 깨짐

**B. "큰 테이블"의 파티셔닝/인덱싱**

**크롤링/스냅샷은 데이터가 폭발합니다.**

**파티셔닝 추천 대상**:
- `raw_documents`
- `listing_price_snapshots`
- `crawl_requests`

**인덱스 전략**:
- 스냅샷: `(listing_id, captured_at DESC)`
- 시간 조건이 많은 테이블: BRIN(captured_at)도 고려(대용량에서 효율적)

**C. 보관 정책(데이터 수명주기)**

- 원문(raw)은 보관기간을 짧게 가져가는 경우가 많습니다(예: 30~90일)
- 스냅샷도 "최근 1년은 촘촘히, 그 이전은 일 단위 집계만 남기기" 같은 정책이 실무적

**D. 크롤링 실패/재시도 설계**

**DB에 최소한 아래가 있어야 운영됩니다**:
- `status`: queued/running/succeeded/failed
- `error_code`, `error_message`
- `attempt_count`, `next_retry_at`
- `http_status`, `response_time_ms`

**E. 추천/전환 모델과 연결할 "정답 데이터" 정리**

**현재 ERD에서 `recommendations`에 구매완료/금액이 있고, `conversion_events`도 있습니다.**

**크롤링까지 들어오면 더 혼재되기 쉬워서, 다음 중 하나로 통일하는 게 좋습니다**:

**안1(추천)**: 구매/전환은 이벤트 로그(`conversion_events`)만 정답
- `recommendations.purchase_completed` 같은 컬럼은 캐시/파생으로만 사용

**안2**: `purchases` 테이블을 별도로 두고 정답화
- 결제/구매가 "정형 데이터"로 중요해지면 `purchases`가 좋음

#### 연결 방식 대안 3가지 비교

**공통 전제**: "정제상품 vs 원천상품"
- `products` = canonical(정제) 상품: 서비스가 보여주는 표준 상품(중복 제거, 설명/이미지/카테고리 등)
- `product_listings` = source listing(원천) 상품: 쿠팡/스마트스토어/자사몰 등 소스별 상품 단위 (`source_id + external_id`로 유니크)

**대안 A) 추천은 "product 기준", 클릭/구매는 "listing 선택" (권장, 가장 균형형)**

**구조**:
- `recommendations`: `(consultation_id, product_id)`
- `conversion_events`: `(recommendation_id, listing_id nullable/필수, event_type, amount, …)`
- `product_listing_map`: listing → product 매핑

**장점**:
- UI/추천 품질: 추천/검색은 product 중심으로 깔끔
- 원천 링크/가격은 listing에서 가져오면 되므로 가격 변동/재고 변동에 유리
- "같은 제품을 여러 마켓에서 판매"를 자연스럽게 처리

**단점/운영 포인트**:
- 클릭 시점에 "어느 listing을 보여줄지" 결정 로직 필요 (예: 최저가/신뢰도 높은 소스/재고 있는 listing 우선)

**추천 사용 케이스**: 추천 품질(제품 단위)이 핵심이고, 실구매 링크는 여러 소스 중 선택해야 하는 서비스

**대안 B) 추천 자체를 "listing 기준"으로 저장 (단순, 실구매 트래킹은 쉬움)**

**구조**:
- `recommendations`: `(consultation_id, listing_id, product_id optional)`
- `conversion_events`: `recommendation_id` 중심

**장점**:
- 추천 → 클릭 → 구매가 항상 동일 URL로 이어져 트래킹이 단순
- "어떤 소스의 어떤 상품이 성과가 좋았는지" 분석이 쉽다

**단점/운영 포인트**:
- 동일 제품이 소스마다 존재하면 추천이 중복으로 보이는 UX가 생김
- "제품 단위 분석"을 하려면 결국 product 매핑이 필요

**추천 사용 케이스**: 1~2개 소스만 쓰고, 마켓별 차이가 큰 서비스(가격/배송/옵션이 핵심)

**대안 C) 하이브리드: 추천은 product, "추천 당시 대표 listing"을 함께 고정**

**구조**:
- `recommendations`: `(consultation_id, product_id, primary_listing_id)`
- 이벤트는 `listing_id`를 그대로 쓰거나, `primary_listing_id`를 기본값으로 사용

**장점**:
- 추천 화면에서 링크가 즉시 결정(단순 UX)
- 추천 당시의 "대표 소스/대표 가격" 스냅샷에 유리

**단점/운영 포인트**:
- `primary_listing`이 품절/차단/링크 변경 시 대체 listing 선택 로직이 필요
- 추천 당시 가격과 현재 가격 차이 표시 정책 필요(법/신뢰)

**추천 사용 케이스**: 추천 결과에 "바로가기 링크"가 중요하고, "대표 소스" 운영 정책이 있는 서비스

**DBA 관점 결론(추천)**:
- 운영 안정성과 분석 밸런스가 가장 좋은 건 **대안 A**
- 소스가 적고 트래킹 단순화가 최우선이면 **대안 B**
- UX 단순 + 운영정책(대표마켓)이 있으면 **대안 C**

### 결론

**이 스키마의 정규화 상태를 한 줄로 말하면**:

> 핵심 엔티티 분리는 잘 되어 있고(기본 3NF 흐름 양호),  
> 다만 이 서비스의 본질이 "활동/ICF 코드 기반 추천 & 효과성 측정"이기 때문에  
> JSONB로 묶인 활동/ICF 구조는 빠른 시점에 정규화할수록 데이터 활용 가치가 크게 올라갑니다.  
> 그리고 `recommendations` ↔ `conversion_events`의 구매/전환 중복 저장 가능성은 운영 중 가장 흔한 장애 포인트라, 소스 오브 트루스를 정하는 걸 추천합니다.

### 마이그레이션 전략

**단계별 접근**:

1. **Phase 1 (HIGH 우선순위)**: IPPA 활동 점수 정규화
   - `consultation_ippa_activities` 테이블 생성
   - `ippa_evaluation_activity_scores` 테이블 생성
   - 기존 JSONB 데이터 마이그레이션
   - API 코드 업데이트

2. **Phase 2 (HIGH 우선순위)**: ICF 코드 정규화 완료
   - `analysis_icf_codes` 테이블 생성 (이미 `consultation_icf_codes`는 있음)
   - 기존 JSONB 데이터 마이그레이션
   - API 코드 업데이트

3. **Phase 3 (MEDIUM 우선순위)**: 데이터 품질 개선
   - `disability_types`, `disability_severities` 테이블 생성
   - 구매/전환 소스 오브 트루스 정리

4. **Phase 4 (LOW 우선순위)**: 확장 기능
   - 크롤링 관련 테이블 추가
   - 배열 컬럼 분리 (필요 시)

### 크롤링 확장 DDL (완전한 스크립트)

아래 DDL은 기존 `products`, `recommendations`, `conversion_events`가 이미 존재한다고 가정하고 "크롤링 확장"만 추가합니다.

#### 2-1) 크롤링/원천/스냅샷 테이블 DDL

```sql
BEGIN;

-- UUID 생성
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 소스(마켓/채널) 정의
CREATE TABLE IF NOT EXISTS crawl_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code text NOT NULL UNIQUE, -- 'coupang','smartstore','selfmall'
    display_name text NOT NULL,
    base_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) 크롤링 Job(배치 단위)
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

-- 3) 크롤링 Request(페이지 단위) - 파티션 대상(대용량)
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

-- (예시) 월 파티션 2개 생성 (운영에서는 자동 생성 함수 사용 권장)
CREATE TABLE IF NOT EXISTS crawl_requests_2025_01
PARTITION OF crawl_requests FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS crawl_requests_2025_02
PARTITION OF crawl_requests FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_crawl_requests_job_status
ON crawl_requests (job_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_next_retry
ON crawl_requests (next_retry_at)
WHERE next_retry_at IS NOT NULL;

-- 4) 원문(Raw) 저장 - 파티션 대상(대용량)
-- 운영 규모가 커지면 content_text는 오브젝트 스토리지로 빼고 storage_key만 두는 방식을 추천
CREATE TABLE IF NOT EXISTS raw_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES crawl_requests(id) ON DELETE CASCADE,
    content_type text NOT NULL, -- 'text/html','application/json'
    content_text text, -- or NULL if stored externally
    storage_key text, -- e.g. 's3://bucket/key' (선택)
    content_hash text, -- 변경감지/dedupe
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

-- 6) Listing 변동 스냅샷(가격/재고) - 파티션 대상(초대용량)
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

-- 7) 정제상품(products) ↔ listing 매핑 (중복 제거/통합의 핵심)
CREATE TABLE IF NOT EXISTS product_listing_map (
    listing_id uuid PRIMARY KEY REFERENCES product_listings(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    match_status text NOT NULL DEFAULT 'auto', -- auto/manual/rejected
    match_score numeric(5,2),
    match_reason text,
    matched_by uuid, -- users.id (검수자)
    matched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_listing_map_product
ON product_listing_map (product_id);

COMMIT;
```

#### 2-2) recommendations / conversion_events에 listing 연결을 넣는 DDL

**대안 A를 기준으로 "클릭/구매 이벤트가 어떤 listing에서 발생했는지"를 남기려면 `conversion_events`에 `listing_id`를 추가하는 게 가장 깔끔합니다.**

```sql
-- (대안 A/C 권장) conversion_events에 listing_id 추가
ALTER TABLE conversion_events
ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES product_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_listing_time
ON conversion_events (listing_id, created_at DESC);
```

**대안 C를 쓰면 recommendations에 대표 listing도 추가:**

```sql
-- (대안 C) recommendations에 대표 listing을 고정
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS primary_listing_id uuid REFERENCES product_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_primary_listing
ON recommendations(primary_listing_id);
```

#### 2-3) 파티션 자동 생성/보관정책(템플릿)

**(1) 월 파티션 생성 함수 템플릿**

운영에서는 "매월 1일"에 다음 달 파티션까지 미리 생성하는 방식 추천:

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

**(2) 보관정책(오래된 파티션 삭제) 템플릿**

`keep_months` 기준으로 이전 파티션 DROP (raw는 1~3개월, price snapshot은 6~12개월 등 정책 분리 권장):

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
        -- 테이블명 끝 YYYY_MM 파싱 가정 (예: listing_price_snapshots_2025_01)
        -- 실무에서는 파티션 범위를 pg_get_expr로 읽어 더 안전하게 처리 가능
        IF substring(r.child from '(\d{4}_\d{2})$') IS NOT NULL THEN
            IF to_date(substring(r.child from '(\d{4}_\d{2})$'), 'YYYY_MM') < v_cutoff THEN
                EXECUTE format('DROP TABLE IF EXISTS %I;', r.child);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**실행 예(외부 스케줄러에서)**:
```sql
SELECT drop_partitions_older_than('raw_documents', 3);
SELECT drop_partitions_older_than('crawl_requests', 6);
SELECT drop_partitions_older_than('listing_price_snapshots', 12);
```

### 중복 상품 매칭(자동/수동 승인) 운영 테이블 설계

#### 3-1) 핵심 개념

**자동 매칭은 100% 완벽하지 않습니다.**

**운영에서 필요한 건**:
1. 자동 후보 생성(rule 기반 + score)
2. 검수 큐(pending → approved/rejected)
3. 승인 시 `product_listing_map` 갱신
4. "왜 매칭됐는지/누가 승인했는지" 감사 추적

#### 3-2) DDL: match_rules / match_queue / match_audit_logs

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 매칭 룰(자동 매칭 로직의 설정)
CREATE TABLE IF NOT EXISTS match_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL UNIQUE,
    is_enabled boolean NOT NULL DEFAULT true,
    -- 룰 타입 예시:
    -- 'exact_external_id', 'url_normalize', 'title_similarity', 'brand_model', 'embedding'
    rule_type text NOT NULL,
    -- 룰별 설정(임계값, 가중치, 필드 매핑 등)
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    priority int NOT NULL DEFAULT 100, -- 낮을수록 먼저 적용
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_rules_enabled_priority
ON match_rules(is_enabled, priority);

-- 2) 매칭 큐(검수 대상)
-- listing 1건에 대해 여러 후보(product 후보)가 들어갈 수 있음
CREATE TABLE IF NOT EXISTS match_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    candidate_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    rule_id uuid REFERENCES match_rules(id) ON DELETE SET NULL,
    match_score numeric(6,3) NOT NULL DEFAULT 0,
    match_reason text,
    evidence jsonb, -- 어떤 필드가 일치했는지, 유사도 값 등
    status text NOT NULL DEFAULT 'pending', -- pending/approved/rejected/expired
    reviewed_by uuid, -- users.id
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- 같은 listing에 같은 후보가 중복 생성되는 것을 방지
    UNIQUE(listing_id, candidate_product_id)
);

CREATE INDEX IF NOT EXISTS idx_match_queue_status_score
ON match_queue(status, match_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_queue_listing
ON match_queue(listing_id);

-- 3) 매칭 감사 로그(누가 무엇을 승인/거절했는지)
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

#### 3-3) 운영 플로우(실무 포인트)

**자동 매칭 파이프라인 (추천)**:

1. **크롤링 → product_listings upsert**
2. **후보 생성**: 룰 실행해서 후보(product)를 찾고 `match_queue`에 pending으로 삽입
3. **임계치 이상은 자동 승인**: score ≥ 0.95 같은 경우 `product_listing_map`에 바로 반영하고 로그 남김
4. **나머지는 검수 UI에서 승인/거절**:
   - 승인 시: `product_listing_map`(listing_id → product_id) upsert
   - 거절 시: `match_queue.status='rejected'`
5. **재크롤링/상품 변경 감지 시**: listing의 content_hash/title/brand 변화가 크면 `match_queue`를 재오픈하거나 expired 처리

**DBA가 반드시 챙길 것**:
- **중복 방지 키**: `product_listings UNIQUE(source_id, external_id)`, `match_queue UNIQUE(listing_id, candidate_product_id)`
- **상태 기반 인덱스**: `match_queue(status, score DESC)`
- **감사 로그(누가 승인했나)**: 운영에서 분쟁/품질 이슈 생기면 이게 생명줄
- **자동 매칭과 수동 매칭이 충돌하지 않도록**: `product_listing_map.match_status`를 auto/manual로 분리하고, 수동 승인 시 manual이 auto를 덮어쓰게 정책화

### 운영에서 바로 체감되는 "DBA 체크리스트" (현장 포인트)

**1) 데이터 폭증 테이블부터 파티션/보관정책을 먼저 정해라**

- `listing_price_snapshots`, `raw_documents`, `crawl_requests`
- "무한정 쌓아두기"는 100% 장애로 돌아옵니다(백업, vacuum, 인덱스, 비용).

**2) 중복 방지 키(UNIQUE) 없으면 크롤링은 망한다**

- listing은 `source_id + external_id` 유니크가 사실상 생명줄
- price snapshot은 중복 방지 정책을 별도로 설계(동일 시각 중복 삽입 방지)

**3) 원문 저장은 "DB vs 스토리지"를 조기에 결정**

- **DB 저장**: 개발/디버깅 쉬움, 비용/용량 위험
- **스토리지 저장**: 운영에 유리, 다만 조회/권한/정합성 설계 필요
- **실무에서는 원문은 스토리지 + DB에 해시/경로만이 오래갑니다.**

**4) 추천/구매/전환 "정답 테이블"을 하나로 고정**

- `recommendations`에 구매여부를 두면 편하지만, 이벤트 로그와 충돌나기 쉬움
- 정답은 `conversion_events` (또는 `purchases`)로 고정하고 나머지는 파생값으로 운용 추천

**5) 장애/차단/재시도는 애초에 데이터 모델에 넣어라**

- `attempt_count`, `next_retry_at`, `error_*` 없이 운영하면 "왜 누락됐지?"를 영원히 못 잡습니다.

### 마지막 정리: 추천 조합

**연결 방식**: 대안 A (product 추천 + listing 이벤트 기록)

**크롤링 확장**: 
- `crawl_*` + `product_listings` + `listing_price_snapshots` + `product_listing_map`

**매칭 운영**: 
- `match_rules` + `match_queue` + `match_audit_logs`

**보관정책**: 
- raw는 1~3개월, request는 3~6개월, price snapshot은 6~12개월(서비스 성장에 맞춰 조정)

### 참고 자료

- [데이터베이스 관리 원칙](./database-maintenance-guide.md)
- [ICF 코드 정규화 가이드](./icf-codes-normalization-guide.md)

