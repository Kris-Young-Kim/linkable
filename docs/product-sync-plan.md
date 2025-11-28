# 상품 데이터 수집 및 ISO 코드별 추천 링크 관리 계획

## 개요

ISO 코드별로 추천할 상품 링크를 체계적으로 관리하기 위한 설계 문서입니다.

## 현재 구조 분석

### 기존 `products` 테이블 구조
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    iso_code VARCHAR(50) NOT NULL,  -- ISO 9999 코드
    purchase_link TEXT,              -- 구매 링크
    ...
)
```

**현재 동작 방식:**
- `app/api/products/route.ts`에서 ISO 코드로 상품을 필터링
- 하나의 ISO 코드에 여러 상품이 연결될 수 있음 (이미 가능)
- 각 상품은 고유한 `purchase_link`를 가짐

## 구현 방안

### 방안 1: 기존 구조 활용 (권장) ✅

**장점:**
- 추가 스키마 변경 불필요
- 이미 구현되어 있음
- 상품별 상세 정보 관리 가능 (가격, 제조사, 이미지 등)

**구현 방법:**
1. `products` 테이블에 ISO 코드별로 여러 상품 등록
2. 예: ISO "15 09" (식사 보조기기)에 대해 여러 상품 등록
   - 상품 A: 무게조절 식기 (쿠팡 링크)
   - 상품 B: 적응형 숟가락 (네이버 링크)
   - 상품 C: 특수 식기 세트 (11번가 링크)

**사용 예시:**
```typescript
// ISO 코드 "15 09"에 대한 상품들
const products = await supabase
  .from("products")
  .select("*")
  .eq("iso_code", "15 09")
  .eq("is_active", true)
// 결과: 여러 상품 반환 (각각 다른 purchase_link)
```

### 방안 2: ISO 코드별 추천 링크 전용 테이블 생성

**장점:**
- ISO 코드와 링크의 명시적 매핑
- 빠른 조회 가능
- 링크 우선순위 관리 가능

**스키마 설계:**
```sql
CREATE TABLE iso_code_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso_code VARCHAR(50) NOT NULL,
    purchase_link TEXT NOT NULL,
    platform VARCHAR(50), -- 'coupang', 'naver', '11st', 'gmarket', 'manual'
    priority INTEGER DEFAULT 0, -- 우선순위 (높을수록 먼저 추천)
    title VARCHAR(255), -- 링크 설명 (예: "쿠팡 최저가", "네이버 쇼핑")
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 인덱스
    CONSTRAINT idx_iso_code_recommendations_iso_code 
        UNIQUE (iso_code, purchase_link)
);

CREATE INDEX idx_iso_code_recommendations_active 
    ON iso_code_recommendations(iso_code, is_active, priority DESC);
```

**사용 예시:**
```typescript
// ISO 코드별 추천 링크 조회
const recommendations = await supabase
  .from("iso_code_recommendations")
  .select("*")
  .eq("iso_code", "15 09")
  .eq("is_active", true)
  .order("priority", { ascending: false })
// 결과: 여러 링크 반환 (우선순위 순)
```

## 권장 방안: 방안 1 (기존 구조 활용)

### 이유
1. **이미 구현됨**: 현재 구조로도 ISO 코드별 여러 상품 추천 가능
2. **확장성**: 상품별 상세 정보(가격, 이미지, 설명) 관리 가능
3. **유지보수**: 추가 테이블 관리 불필요
4. **일관성**: 기존 `products` 테이블과 `recommendations` 테이블 구조와 일치

### 구현 가이드

#### 1. 상품 등록 시 ISO 코드별 다중 링크 관리

```typescript
// lib/integrations/product-sync.ts에 추가할 함수
export async function syncIsoCodeProducts(
  isoCode: string,
  products: Array<{
    name: string
    purchase_link: string
    platform?: string
    price?: number
    image_url?: string
    description?: string
  }>
) {
  const supabase = getSupabaseServerClient()
  
  for (const product of products) {
    await upsertProduct({
      name: product.name,
      iso_code: isoCode,
      purchase_link: product.purchase_link,
      price: product.price,
      image_url: product.image_url,
      description: product.description,
      category: product.platform, // 플랫폼 정보를 category에 저장
    })
  }
}
```

#### 2. API에서 ISO 코드별 상품 조회 (이미 구현됨)

```typescript
// app/api/products/route.ts (현재 코드)
const isoMatches = getIsoMatches(icfCodes)
const isoCodes = isoMatches.map((match) => match.isoCode)

// ISO 코드로 여러 상품 조회 (이미 구현됨)
const { data } = await supabase
  .from("products")
  .select("*")
  .in("iso_code", isoCodes) // 하나의 ISO 코드에 여러 상품 가능
  .eq("is_active", true)
```

#### 3. 관리자 UI에서 ISO 코드별 상품 관리

```typescript
// app/admin/products/page.tsx (구현 필요)
// - ISO 코드별 상품 목록 표시
// - 상품 추가/수정/삭제
// - purchase_link 검증
```

## .env 파일 방식 (대안)

### 사용 시나리오
- 빠른 프로토타입
- 소수의 ISO 코드만 관리
- 코드 변경 없이 링크만 업데이트하고 싶을 때

### 구현 예시

```typescript
// .env 파일
ISO_15_09_LINKS=https://coupang.link/1,https://naver.link/1,https://11st.link/1
ISO_18_30_LINKS=https://coupang.link/2,https://naver.link/2
ISO_22_30_LINKS=https://coupang.link/3

// lib/config/iso-links.ts
export function getIsoCodeLinks(isoCode: string): string[] {
  const envKey = `ISO_${isoCode.replace(/\s/g, "_")}_LINKS`
  const links = process.env[envKey]
  
  if (!links) {
    return []
  }
  
  return links.split(",").map(link => link.trim())
}

// 사용 예시
const links = getIsoCodeLinks("15 09")
// 결과: ["https://coupang.link/1", "https://naver.link/1", "https://11st.link/1"]
```

### .env 방식의 단점
- ISO 코드가 많아지면 관리 어려움
- 상품 상세 정보(가격, 이미지, 설명) 저장 불가
- 환경 변수 변경 시 재배포 필요
- 우선순위 관리 어려움

## 최종 권장사항

**데이터베이스 방식 (방안 1)을 권장합니다.**

### 구현 단계

1. **Phase 1: 상품 데이터 수집**
   - [ ] ISO 코드별 대표 상품 링크 수집 (최소 20-30개)
   - [ ] 쿠팡/네이버/11번가 제휴 링크 생성
   - [ ] `products` 테이블에 초기 데이터 입력

2. **Phase 2: 상품 동기화 API**
   - [ ] `app/api/products/sync/route.ts` 구현
   - [ ] 링크 검증 로직 추가
   - [ ] 상품 업데이트 스케줄러 설계

3. **Phase 3: 관리자 UI**
   - [ ] `/admin/products` 페이지 생성
   - [ ] ISO 코드별 상품 목록 표시
   - [ ] 상품 추가/수정/삭제 기능

4. **Phase 4: 추천 로직 개선**
   - [ ] ISO 코드별 상품 랭킹 알고리즘 개선
   - [ ] 플랫폼별 우선순위 설정
   - [ ] 클릭률 기반 자동 랭킹

## 참고사항

- 현재 `app/api/products/route.ts`는 이미 ISO 코드별 여러 상품을 조회하고 랭킹합니다.
- `products` 테이블에 ISO 코드별로 여러 상품을 등록하면 자동으로 추천됩니다.
- 추가 구현이 필요한 부분은 상품 데이터 수집 및 관리자 UI입니다.

