# ISO 코드별 상품 링크 관리 사용 가이드

## 개요

ISO 코드별로 추천할 상품 링크를 관리하고 조회하는 방법을 설명합니다.

## 권장 방식: 데이터베이스 (products 테이블)

### 1. ISO 코드별 상품 등록

```typescript
import { syncIsoCodeProducts } from "@/lib/integrations/iso-product-manager"

// ISO 코드 "15 09" (식사 보조기기)에 여러 상품 등록
await syncIsoCodeProducts("15 09", [
  {
    name: "무게조절 식기 세트",
    purchase_link: "https://coupang.link/product1",
    platform: "coupang",
    price: 25000,
    description: "손 떨림을 보정하는 무게조절 식기",
    image_url: "https://example.com/image1.jpg",
  },
  {
    name: "적응형 숟가락",
    purchase_link: "https://naver.link/product2",
    platform: "naver",
    price: 15000,
    description: "손 기능 저하 시 사용하는 적응형 숟가락",
  },
  {
    name: "특수 식기 세트",
    purchase_link: "https://11st.link/product3",
    platform: "11st",
    price: 30000,
  },
])
```

### 2. ISO 코드별 상품 조회

```typescript
import { getIsoCodeProducts } from "@/lib/integrations/iso-product-manager"

// ISO 코드 "15 09"의 모든 활성 상품 조회
const products = await getIsoCodeProducts("15 09")

// 결과:
// [
//   { id: "...", name: "무게조절 식기 세트", purchase_link: "...", ... },
//   { id: "...", name: "적응형 숟가락", purchase_link: "...", ... },
//   { id: "...", name: "특수 식기 세트", purchase_link: "...", ... },
// ]
```

### 3. 여러 ISO 코드 일괄 조회

```typescript
import { getMultipleIsoCodeProducts } from "@/lib/integrations/iso-product-manager"

// 여러 ISO 코드의 상품을 한 번에 조회
const productsMap = await getMultipleIsoCodeProducts(["15 09", "18 30", "22 30"])

// 결과: Map 형태
// Map {
//   "15 09" => [상품1, 상품2, ...],
//   "18 30" => [상품3, 상품4, ...],
//   "22 30" => [상품5, ...],
// }
```

### 4. API에서 사용 예시

현재 `app/api/products/route.ts`는 이미 ISO 코드별 상품을 조회합니다:

```typescript
// app/api/products/route.ts (현재 구현)
const isoMatches = getIsoMatches(icfCodes)
const isoCodes = isoMatches.map((match) => match.isoCode)

// ISO 코드로 여러 상품 조회 (자동으로 여러 상품 반환)
const { data } = await supabase
  .from("products")
  .select("*")
  .in("iso_code", isoCodes)
  .eq("is_active", true)

// data에는 각 ISO 코드별로 여러 상품이 포함됨
```

### 5. ISO 코드별 통계 조회

```typescript
import { getIsoCodeStats } from "@/lib/integrations/iso-product-manager"

const stats = await getIsoCodeStats("15 09")

// 결과:
// {
//   totalProducts: 3,
//   totalLinks: 3,
//   averagePrice: 23333.33,
//   minPrice: 15000,
//   maxPrice: 30000,
// }
```

## 대안 방식: .env 파일

### 1. .env 파일 설정

```bash
# .env 파일
ISO_15_09_LINKS=https://coupang.link/1,https://naver.link/1,https://11st.link/1
ISO_18_30_LINKS=https://coupang.link/2,https://naver.link/2
ISO_22_30_LINKS=https://coupang.link/3
```

### 2. 코드에서 사용

```typescript
import { getIsoCodeLinksFromEnv } from "@/lib/config/iso-links-env"

// ISO 코드별 링크 조회
const links = getIsoCodeLinksFromEnv("15 09")
// 결과: ["https://coupang.link/1", "https://naver.link/1", "https://11st.link/1"]

// 여러 ISO 코드 조회
import { getMultipleIsoCodeLinksFromEnv } from "@/lib/config/iso-links-env"
const linksMap = getMultipleIsoCodeLinksFromEnv(["15 09", "18 30"])
// 결과: Map { "15 09" => [...], "18 30" => [...] }
```

### 3. .env 방식의 제한사항

- 상품 상세 정보(가격, 이미지, 설명) 저장 불가
- 환경 변수 변경 시 재배포 필요
- ISO 코드가 많아지면 관리 어려움
- 우선순위 관리 어려움

## 실제 사용 시나리오

### 시나리오 1: AI가 ISO 코드 추천 → 상품 링크 반환

```typescript
// 1. AI가 ICF 코드 분석 후 ISO 코드 추천
const isoMatches = getIsoMatches(icfCodes) // ["15 09", "18 30"]

// 2. ISO 코드별 상품 조회
const productsMap = await getMultipleIsoCodeProducts(
  isoMatches.map((m) => m.isoCode)
)

// 3. 각 ISO 코드별로 여러 상품이 있으면 모두 추천
for (const [isoCode, products] of productsMap) {
  console.log(`${isoCode}에 대한 추천 상품:`, products.length, "개")
  // 예: "15 09에 대한 추천 상품: 3개"
}
```

### 시나리오 2: 관리자 페이지에서 ISO 코드별 상품 관리

```typescript
// app/admin/products/[isoCode]/page.tsx
import { getIsoCodeProducts, syncIsoCodeProducts } from "@/lib/integrations/iso-product-manager"

// ISO 코드별 상품 목록 표시
const products = await getIsoCodeProducts("15 09")

// 새 상품 추가
await syncIsoCodeProducts("15 09", [
  {
    name: "새로운 식사 보조기기",
    purchase_link: "https://new-link.com",
    platform: "coupang",
    price: 20000,
  },
])
```

## 데이터베이스 vs .env 비교

| 항목 | 데이터베이스 | .env 파일 |
|------|------------|----------|
| 상품 상세 정보 | ✅ 가능 | ❌ 불가능 |
| 동적 업데이트 | ✅ 가능 | ❌ 재배포 필요 |
| 확장성 | ✅ 우수 | ❌ 제한적 |
| 관리 편의성 | ✅ 관리자 UI 가능 | ⚠️ 수동 편집 |
| 우선순위 관리 | ✅ 가능 | ❌ 불가능 |
| 권장 사용 | ✅ 프로덕션 | 프로토타입만 |

## 결론

**데이터베이스 방식을 권장합니다.**

- 현재 `products` 테이블 구조로 이미 ISO 코드별 여러 상품 관리 가능
- 추가 스키마 변경 불필요
- 상품별 상세 정보 관리 가능
- 관리자 UI에서 쉽게 관리 가능

