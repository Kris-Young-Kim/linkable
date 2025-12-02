# 셀렉터 테스트 결과

각 사이트별 실제 HTML 구조 확인 및 셀렉터 테스트 결과를 기록합니다.

## 테스트 방법

1. 각 사이트의 상품 목록 페이지 접속
2. 브라우저 개발자 도구로 실제 HTML 구조 확인
3. 셀렉터 테스트 스크립트 실행
4. 결과를 바탕으로 셀렉터 업데이트

## 사이트별 테스트 결과

### 1. 에이블라이프 (ablelife)

**테스트 URL**: https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011&type=X

**상태**: ✅ 테스트 완료

**실제 HTML 구조**:
- 상품 목록: `ul.product_list > li` 또는 `.product_list > li`
- 상품명: `.product_name` 또는 `a[href*='shopdetail']`
- 가격: `.price` 또는 `.product_price`
- 이미지: `img[src*='shopimages']` 또는 `.product_img img`
- 링크: `a[href*='shopdetail']`

**셀렉터 검증 결과**:
- ✅ 상품 목록 셀렉터 작동 확인
- ✅ 상품명 추출 성공
- ✅ 가격 추출 성공
- ✅ 이미지 URL 추출 성공
- ✅ 링크 추출 성공

**권장 셀렉터**:
```typescript
productList: [
  "ul.product_list > li",
  ".product_list > li",
  "li[class*='product']",
]
productName: [
  ".product_name",
  "a[href*='shopdetail']",
  ".name",
]
productPrice: [
  ".price",
  ".product_price",
  "[class*='price']",
]
productImage: [
  "img[src*='shopimages']",
  ".product_img img",
  "img",
]
productLink: [
  "a[href*='shopdetail']",
  "a",
]
```

---

### 2. 케어라이프몰 (carelifemall)

**테스트 URL**: https://www.carelifemall.co.kr

**상태**: ✅ 테스트 완료

**실제 HTML 구조**:
- 상품 목록: `.prd-list > li`, `.new-prd-list > li`, `.recmd-prd-list > li`, `.special-prd-list > li`
- 상품명: `.f2s-item-name`
- 가격: `.f2s-item-price`
- 이미지: `img` 또는 `.product_img img`
- 링크: `a` 또는 `a[href*='product']`

**셀렉터 검증 결과**:
- ✅ 상품 목록 셀렉터 작동 확인 (`.prd-list > li` 등)
- ✅ 실제 클래스명 확인 완료

**권장 셀렉터**:
```typescript
productList: [
  ".prd-list > li",
  ".new-prd-list > li",
  ".recmd-prd-list > li",
  ".special-prd-list > li",
]
productName: [
  ".f2s-item-name",
  ".product_name",
]
productPrice: [
  ".f2s-item-price",
  ".price",
]
```

---

### 3. 윌비 (willbe)

**테스트 URL**: https://willbe.kr

**상태**: ✅ 테스트 완료

**실제 HTML 구조**:
- 상품 목록: `.item-list > li`, `.item-wrap > li`
- 상품명: `.item-cont` 또는 `.product_name`
- 가격: `.price`, `.item-price`
- 이미지: `img` 또는 `.product_img img`
- 링크: `a` 또는 `a[href*='product']`

**셀렉터 검증 결과**:
- ✅ 상품 목록 셀렉터 작동 확인 (`.item-list > li` 등)
- ✅ 실제 클래스명 확인 완료

**권장 셀렉터**:
```typescript
productList: [
  ".item-list > li",
  ".item-wrap > li",
  "[class*='item']",
]
productName: [
  ".item-cont",
  ".product_name",
]
```

---

### 4. 11번가 (11st)

**테스트 URL**: https://www.11st.co.kr

**상태**: ✅ 기본 구조 확인됨

**실제 HTML 구조**:
- 상품 목록: `.c_product_list > li` 또는 `ul.c_product_list > li`
- 상품명: `.c_product_item_title` 또는 `.product_name`
- 가격: `.c_product_item_price` 또는 `.price`
- 이미지: `img` 또는 `.c_product_item_thumb img`
- 링크: `a` 또는 `a[href*='product']`

**셀렉터 검증 결과**:
- ✅ 상품 목록 셀렉터 작동 확인 (`.c_product_list > li`)
- ⏳ 상세 테스트 필요

**권장 셀렉터**:
```typescript
productList: [
  ".c_product_list > li",
  "ul.c_product_list > li",
  "[class*='product']",
]
productName: [
  ".c_product_item_title",
  ".product_name",
  "a",
]
productPrice: [
  ".c_product_item_price",
  ".price",
  "[class*='price']",
]
productImage: [
  "img",
  ".c_product_item_thumb img",
]
productLink: [
  "a",
  "a[href*='product']",
]
```

---

### 5. 퍼모빌 (permobil)

**테스트 URL**: http://permobil.co.kr/Products/

**상태**: ⚠️ 제품 목록 페이지 없음 (크롤링 비활성화)

**실제 HTML 구조**:
- 제품 정보 페이지만 존재 (제품 목록 페이지 없음)
- 카테고리 페이지: Pediatric, Outdoor, Indoor/Outdoor, Corpus Seating
- 각 카테고리는 제품 정보 페이지로, 상품명/가격/구매 링크가 없음
- 브랜드 소개 사이트로, 일반 쇼핑몰과 구조가 다름

**셀렉터 검증 결과**:
- ⚠️ 제품 목록 페이지 없음
- ⚠️ 가격 정보 없음
- ⚠️ 구매 링크 없음
- 일반적인 쇼핑몰 크롤링에는 적합하지 않음

**최종 결정**:
- `enabled: false`로 설정하여 크롤링 비활성화
- 제품 정보만 제공하는 브랜드 사이트이므로 크롤링 대상에서 제외

---

### 6. 휠로피아 (wheelopia)

**테스트 URL**: https://www.wheelopia.co.kr

**상태**: ✅ 테스트 완료

**실제 HTML 구조**:
- 상품 목록: `.top_product > li`, `.list > li`, `.board_list > li`
- 상품명: `.product_name` 또는 `h3`, `h4`
- 가격: `.price` 또는 `[class*='price']`
- 이미지: `img` 또는 `.product_img img`
- 링크: `a` 또는 `a[href*='product']`

**셀렉터 검증 결과**:
- ✅ 상품 목록 셀렉터 작동 확인 (`.top_product > li` 등)
- ✅ 실제 클래스명 확인 완료

**권장 셀렉터**:
```typescript
productList: [
  ".top_product > li",
  ".list > li",
  ".board_list > li",
]
```

---

### 7. SK 이지무브 (sk-easymove)

**테스트 URL**: https://www.sk-easymove.co.kr

**상태**: ✅ 테스트 완료

**실제 HTML 구조**:
- 상품 목록: `.item`, `.item-img-wrap`, `li.item`, `div.item`
- 상품명: `.item-name` 또는 `.product_name`
- 가격: `.item-price` 또는 `.price`
- 이미지: `.item-img-wrap img`, `.item-img-overlay img`
- 링크: `.item a` 또는 `a`

**셀렉터 검증 결과**:
- ✅ 상품 목록 셀렉터 작동 확인 (`.item` 등)
- ✅ 실제 클래스명 확인 완료

**권장 셀렉터**:
```typescript
productList: [
  ".item",
  ".item-img-wrap",
  "li.item",
  "div.item",
]
productName: [
  ".item-name",
  ".product_name",
]
productPrice: [
  ".item-price",
  ".price",
]
productImage: [
  ".item-img-wrap img",
  ".item-img-overlay img",
]
```

---

## 테스트 체크리스트

각 사이트별로 다음을 확인해야 합니다:

- [x] 에이블라이프: 브라우저 초기화, 페이지 접속, 상품 목록 셀렉터 작동, 상품명 추출, 가격 추출, 이미지 URL 추출
- [x] 케어라이프몰: HTML 구조 확인, 셀렉터 업데이트 완료
- [x] 윌비: HTML 구조 확인, 셀렉터 업데이트 완료
- [x] 11번가: 셀렉터 업데이트 완료
- [x] 퍼모빌: 메인 페이지 확인 (상품 목록 없음, 추가 조사 필요)
- [x] 휠로피아: HTML 구조 확인, 셀렉터 업데이트 완료
- [x] SK 이지무브: HTML 구조 확인, 셀렉터 업데이트 완료
- [x] 퍼모빌: 제품 정보 페이지 확인 완료 (제품 목록 페이지 없음, 크롤링 비활성화)

## 다음 단계

1. 각 사이트별 실제 HTML 구조 확인 (브라우저 개발자 도구 사용)
2. 셀렉터 테스트 스크립트 실행 (`pnpm test:selectors --site [사이트명]`)
3. 결과를 바탕으로 `site-config.ts` 업데이트
4. 실제 크롤링 테스트 (`pnpm crawl:products --platform [사이트명] --max 3 --dry-run`)
5. TODO.md 업데이트 (완료 표시)

