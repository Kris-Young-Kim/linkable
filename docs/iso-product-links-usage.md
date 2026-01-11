# ISO 코드별 상품 링크 관리 사용 가이드

## 개요

ISO 코드별로 추천할 상품 링크를 관리하고 조회하는 방법을 설명합니다.

## 권장 방식: 데이터베이스 (products 테이블)

### 1. ISO 코드별 상품 등록

**중요**: 현재 시스템은 **Division 레벨(소분류, level=3, 6자리 코드)**에서 제품을 배정합니다.

```typescript
import { syncIsoCodeProducts } from "@/lib/integrations/iso-product-manager";

// Division 레벨 ISO 코드 "15 09 13" (식사 및 음주 보조기구)에 여러 상품 등록
await syncIsoCodeProducts("15 09 13", [
  {
    name: "무게조절 식기 세트",
    purchase_link: "https://naver.link/product1",
    platform: "naver",
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
]);
```

### 2. ISO 코드별 상품 조회

**중요**: Division 레벨(소분류, 6자리 코드)로 조회합니다.

```typescript
import { getIsoCodeProducts } from "@/lib/integrations/iso-product-manager";

// Division 레벨 ISO 코드 "15 09 13" (식사 및 음주 보조기구)의 모든 활성 상품 조회
const products = await getIsoCodeProducts("15 09 13");

// 결과:
// [
//   { id: "...", name: "무게조절 식기 세트", purchase_link: "...", ... },
//   { id: "...", name: "적응형 숟가락", purchase_link: "...", ... },
//   { id: "...", name: "특수 식기 세트", purchase_link: "...", ... },
// ]
```

### 3. 여러 ISO 코드 일괄 조회

```typescript
import { getMultipleIsoCodeProducts } from "@/lib/integrations/iso-product-manager";

// 여러 Division 레벨 ISO 코드의 상품을 한 번에 조회
const productsMap = await getMultipleIsoCodeProducts([
  "15 09 13",
  "18 30 01",
  "22 33 03",
]);

// 결과: Map 형태
// Map {
//   "15 09 13" => [상품1, 상품2, ...],  // 식사 및 음주 보조기구
//   "18 30 01" => [상품3, 상품4, ...],  // 수직 접근성 보조기구 (경사로)
//   "22 33 03" => [상품5, ...],         // 컴퓨터 및 단말기
// }
```

### 4. API에서 사용 예시

현재 `app/api/products/route.ts`는 이미 ISO 코드별 상품을 조회합니다:

```typescript
// app/api/products/route.ts (현재 구현)
const isoMatches = getIsoMatches(icfCodes);
const isoCodes = isoMatches.map((match) => match.isoCode);

// ISO 코드로 여러 상품 조회 (자동으로 여러 상품 반환)
const { data } = await supabase
  .from("products")
  .select("*")
  .in("iso_code", isoCodes)
  .eq("is_active", true);

// data에는 각 ISO 코드별로 여러 상품이 포함됨
```

### 5. ISO 코드별 통계 조회

```typescript
import { getIsoCodeStats } from "@/lib/integrations/iso-product-manager";

// Division 레벨 ISO 코드로 통계 조회
const stats = await getIsoCodeStats("15 09 13");

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

**중요**: Division 레벨(소분류, 6자리 코드)을 사용합니다.

```bash
# .env 파일
ISO_15_09_13_LINKS=https://naver.link/1,https://11st.link/1  # 식사 및 음주 보조기구
ISO_18_30_01_LINKS=https://naver.link/2                       # 수직 접근성 보조기구
ISO_22_33_03_LINKS=https://naver.link/3                       # 컴퓨터 및 단말기
```

### 2. 코드에서 사용

```typescript
import { getIsoCodeLinksFromEnv } from "@/lib/config/iso-links-env";

// Division 레벨 ISO 코드별 링크 조회
const links = getIsoCodeLinksFromEnv("15 09 13");
// 결과: ["https://naver.link/1", "https://11st.link/1"]

// 여러 Division 레벨 ISO 코드 조회
import { getMultipleIsoCodeLinksFromEnv } from "@/lib/config/iso-links-env";
const linksMap = getMultipleIsoCodeLinksFromEnv(["15 09 13", "18 30 01"]);
// 결과: Map { "15 09 13" => [...], "18 30 01" => [...] }
```

### 3. .env 방식의 제한사항

- 상품 상세 정보(가격, 이미지, 설명) 저장 불가
- 환경 변수 변경 시 재배포 필요
- ISO 코드가 많아지면 관리 어려움
- 우선순위 관리 어려움

## 실제 사용 시나리오

### 시나리오 1: AI가 ISO 코드 추천 → 상품 링크 반환

```typescript
// 1. AI가 ICF 코드 분석 후 ISO 코드 추천 (Division 레벨, 소분류)
const isoMatches = getIsoMatches(icfCodes); // ["15 09 13", "18 30 01", "22 33 03"]

// 2. Division 레벨 ISO 코드별 상품 조회
const productsMap = await getMultipleIsoCodeProducts(
  isoMatches.map((m) => m.isoCode)
);

// 3. 각 Division 레벨별로 여러 상품이 있으면 모두 추천
for (const [isoCode, products] of productsMap) {
  console.log(`Division ${isoCode}에 대한 추천 상품:`, products.length, "개");
  // 예: "Division 15 09 13에 대한 추천 상품: 10개"
  //     "Division 18 30 01에 대한 추천 상품: 5개"
}
```

### 시나리오 2: 관리자 페이지에서 ISO 코드별 상품 관리

```typescript
// app/admin/products/[isoCode]/page.tsx
import {
  getIsoCodeProducts,
  syncIsoCodeProducts,
} from "@/lib/integrations/iso-product-manager";

// Division 레벨 ISO 코드별 상품 목록 표시
const products = await getIsoCodeProducts("15 09 13");

// 새 상품 추가 (Division 레벨에 배정)
await syncIsoCodeProducts("15 09 13", [
  {
    name: "새로운 식사 보조기기",
    purchase_link: "https://new-link.com",
    platform: "naver",
    price: 20000,
  },
]);
```

## 데이터베이스 vs .env 비교

| 항목           | 데이터베이스      | .env 파일      |
| -------------- | ----------------- | -------------- |
| 상품 상세 정보 | ✅ 가능           | ❌ 불가능      |
| 동적 업데이트  | ✅ 가능           | ❌ 재배포 필요 |
| 확장성         | ✅ 우수           | ❌ 제한적      |
| 관리 편의성    | ✅ 관리자 UI 가능 | ⚠️ 수동 편집   |
| 우선순위 관리  | ✅ 가능           | ❌ 불가능      |
| 권장 사용      | ✅ 프로덕션       | 프로토타입만   |

## ISO 코드 레벨 설명

### Class 레벨 (대분류, level=1, 2자리 코드)

가장 상위 분류 레벨로, 제품 배정에는 사용하지 않습니다. 참고용으로만 사용됩니다.

| 코드 | 이름                                                                               |
| ---- | ---------------------------------------------------------------------------------- |
| 04   | 생리적, 심리적 기능을 측정, 자극 또는 훈련하기 위한 보조기구                       |
| 06   | 보조기 및 보철물                                                                   |
| 09   | 자가 관리 활동 및 자가 관리 참여를 위한 보조기구                                   |
| 12   | 개인 이동 및 운송과 관련된 활동 및 참여를 위한 보조기구                            |
| 15   | 가사 활동 및 가사 생활 참여를 위한 보조기구                                        |
| 18   | 인간이 만든 실내 및 실외 환경에서 활동을 지원하기 위한 가구, 비품 및 기타 보조기구 |
| 22   | 통신 및 정보 관리를 위한 보조기구                                                  |
| 24   | 물체 및 장치를 제어, 운반, 이동 및 취급하기 위한 보조기구                          |
| 27   | 물리적 환경의 요소를 제어, 적응 또는 측정하기 위한 보조기구                        |
| 28   | 업무 활동 및 고용 참여를 위한 보조기구                                             |
| 30   | 레크리에이션 및 레저용 보조기구                                                    |

### Subclass 레벨 (중분류, level=2, 4자리 코드)

Class의 하위 분류로, 제품 배정에는 사용하지 않습니다. 참고용으로만 사용됩니다.

예: `12 22` (수동 휠체어), `15 09` (식음용 보조기구), `18 30` (수직 접근성을 위한 보조장치)

### Division 레벨 (소분류, level=3, 6자리 코드)

**현재 시스템에서 제품 배정에 사용하는 레벨**입니다. 가장 세분화된 분류 레벨입니다.

예: `12 22 01` (수동 휠체어 - 일반형), `15 09 13` (식사 및 음주 보조기구), `18 30 01` (수직 접근성 보조기구 - 경사로)

## 결론

**데이터베이스 방식을 권장합니다.**

- 현재 `products` 테이블 구조로 이미 Division 레벨(소분류)에서 여러 상품 관리 가능
- 추가 스키마 변경 불필요
- 상품별 상세 정보 관리 가능
- 관리자 UI에서 쉽게 관리 가능
- **Division 레벨(소분류, level=3)에서 제품을 배정하여 정확한 분류로 상품 추천 가능**
