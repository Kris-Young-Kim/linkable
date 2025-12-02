# 셀렉터 테스트 가이드

## 개요

각 사이트의 실제 HTML 구조에 맞게 셀렉터를 테스트하고 최적화하는 가이드입니다.

## 테스트 프로세스

### 1단계: 브라우저 초기화 테스트

```bash
pnpm test:crawl --step 1
```

**확인 사항:**
- ✅ 브라우저가 정상적으로 실행되는가?
- ✅ Context 생성이 성공하는가?
- ✅ User-Agent 설정이 적용되는가?

### 2단계: 페이지 접속 테스트

```bash
pnpm test:crawl --step 2
```

**확인 사항:**
- ✅ 페이지가 정상적으로 로드되는가?
- ✅ URL이 올바른가?
- ✅ 페이지 제목이 표시되는가?

### 3단계: 셀렉터 찾기 테스트

```bash
pnpm test:crawl --step 3
```

**확인 사항:**
- ✅ 상품 목록 셀렉터가 작동하는가?
- ✅ 스크린샷이 저장되는가? (`test-page-screenshot.png`)
- ✅ 페이지의 주요 클래스가 출력되는가?

**출력 정보:**
- 발견된 클래스 목록
- li, ul 요소 개수
- 페이지 본문 일부

### 4단계: 상품 정보 추출 테스트

```bash
pnpm test:crawl --step 4
```

**확인 사항:**
- ✅ 상품명이 올바르게 추출되는가?
- ✅ 가격이 올바르게 추출되는가?
- ✅ 이미지 URL이 올바른가?
- ✅ 구매 링크가 올바른가?

**출력 정보:**
- 첫 번째 상품의 HTML 구조
- 각 필드별 추출된 값

## 사이트별 셀렉터 확인 방법

### 방법 1: 브라우저 개발자 도구 사용

1. Chrome/Edge 브라우저에서 해당 사이트 접속
2. F12로 개발자 도구 열기
3. Elements 탭에서 HTML 구조 확인
4. 상품 목록 요소를 찾아 우클릭 → Copy → Copy selector

### 방법 2: 테스트 스크립트 사용

```bash
# 특정 사이트로 테스트 URL 변경 후
pnpm test:crawl --step 3
```

`test-steps.ts`의 `TEST_URL`을 수정하여 특정 사이트 테스트:

```typescript
const TEST_URL = `https://www.ablelife.co.kr`
```

### 방법 3: 스크린샷 확인

테스트 실행 후 생성된 `test-page-screenshot.png` 파일을 확인하여:
- 페이지가 정상적으로 로드되었는지 확인
- 상품 목록이 보이는지 확인
- 레이아웃 구조 파악

## 셀렉터 수정 방법

### 1. `site-config.ts` 파일 열기

```typescript
export const SITE_CONFIGS: Record<string, SiteConfig> = {
  ablelife: {
    // ...
    selectors: {
      productList: [
        ".product_list > li",  // 여기 수정
        // ...
      ],
      // ...
    },
  },
}
```

### 2. 셀렉터 우선순위

셀렉터 배열의 첫 번째 요소가 가장 우선순위가 높습니다. 여러 셀렉터를 시도하여 안정성을 높입니다.

**예시:**
```typescript
productList: [
  ".product_list > li",        // 1순위: 가장 정확한 셀렉터
  "ul.products > li",          // 2순위: 대체 셀렉터
  "[class*='product']",        // 3순위: 일반적인 셀렉터
]
```

### 3. 셀렉터 테스트

수정 후 다시 테스트:

```bash
pnpm test:crawl --step 3
```

## 사이트별 셀렉터 가이드

### 에이블라이프 (ablelife)

**예상 구조:**
- 상품 목록: `.product_list > li` 또는 `ul.product_list > li`
- 상품명: `.product_name` 또는 `a[href*='shopdetail']`
- 가격: `.price` 또는 `.product_price`

**테스트:**
```bash
# test-steps.ts에서 TEST_URL 수정 후
pnpm test:crawl --step 3
```

### 케어라이프몰 (carelifemall)

**확인 필요:**
- 실제 HTML 구조 확인
- 상품 목록 셀렉터 검증

### 윌비 (willbe)

**확인 필요:**
- 실제 HTML 구조 확인
- 상품 목록 셀렉터 검증

### 11번가 (11st)

**예상 구조:**
- 상품 목록: `.c_product_list > li`
- 상품명: `.c_product_item_title`
- 가격: `.c_product_item_price`

### 퍼모빌 (permobil)

**확인 필요:**
- 실제 HTML 구조 확인
- 상품 목록 셀렉터 검증

### 휠로피아 (wheelopia)

**확인 필요:**
- 실제 HTML 구조 확인
- 상품 목록 셀렉터 검증

### SK 이지무브 (sk-easymove)

**확인 필요:**
- 실제 HTML 구조 확인
- 상품 목록 셀렉터 검증

## 일반적인 셀렉터 패턴

### 상품 목록

```css
/* 일반적인 패턴 */
.product_list > li
ul.products > li
[class*='product'] > li
.items > li
```

### 상품명

```css
/* 일반적인 패턴 */
.product_name
.name
h3
h4
a[href*='product']
.title
```

### 가격

```css
/* 일반적인 패턴 */
.price
.product_price
[class*='price']
.cost
.num
```

### 이미지

```css
/* 일반적인 패턴 */
img
.product_img img
img[src*='product']
.thumbnail img
```

### 링크

```css
/* 일반적인 패턴 */
a
a[href*='product']
a[href*='detail']
.product_link
```

## 문제 해결

### 문제 1: 셀렉터를 찾을 수 없음

**증상**: "상품 목록을 찾을 수 없습니다"

**해결:**
1. 스크린샷 확인 (`test-page-screenshot.png`)
2. 브라우저 개발자 도구로 실제 구조 확인
3. 페이지 로딩 시간 증가 (동적 콘텐츠)
4. 다른 셀렉터 패턴 시도

### 문제 2: 상품 정보가 추출되지 않음

**증상**: 상품명이나 가격이 비어있음

**해결:**
1. `test-steps.ts --step 4`로 HTML 구조 확인
2. 해당 필드의 셀렉터 수정
3. 여러 셀렉터 옵션 추가

### 문제 3: 잘못된 데이터 추출

**증상**: 다른 요소의 데이터가 추출됨

**해결:**
1. 더 구체적인 셀렉터 사용
2. 부모 요소부터 찾은 후 자식 요소 선택
3. `:nth-child()` 등으로 위치 지정

## 체크리스트

각 사이트별로 다음을 확인하세요:

- [ ] 브라우저 초기화 성공
- [ ] 페이지 접속 성공
- [ ] 상품 목록 셀렉터 작동
- [ ] 상품명 추출 성공
- [ ] 가격 추출 성공
- [ ] 이미지 URL 추출 성공
- [ ] 구매 링크 추출 성공
- [ ] 실제 크롤링 테스트 성공

## 참고 자료

- [CSS Selector 가이드](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- `docs/web-scraping-guide.md` - 전체 크롤러 가이드
- `scripts/crawlers/test-steps.ts` - 테스트 스크립트

