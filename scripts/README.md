# 상품 크롤링 스크립트 가이드

## 개요

수동으로 수집한 상품 데이터를 CSV 또는 JSON 파일로 일괄 등록할 수 있는 스크립트입니다.

## 사전 준비

### 1. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수가 설정되어 있어야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. tsx 설치 (선택사항)

TypeScript 파일을 직접 실행하려면 `tsx`를 설치하세요:

```bash
pnpm add -D tsx
```

또는 `npx tsx`를 사용할 수 있습니다.

## 사용법

### 기본 사용법

```bash
# CSV 파일로 상품 등록
npx tsx scripts/manual-product-import.ts --file scripts/example-products.csv

# JSON 파일로 상품 등록
npx tsx scripts/manual-product-import.ts --file scripts/example-products.json

# 링크 검증 포함
npx tsx scripts/manual-product-import.ts --file products.csv --validate-links

# Dry-run 모드 (실제 등록 없이 확인만)
npx tsx scripts/manual-product-import.ts --file products.csv --dry-run
```

### 옵션

- `--file <경로>`: 등록할 CSV 또는 JSON 파일 경로 (필수)
- `--validate-links`: 구매 링크 유효성 검증 (선택)
- `--dry-run`: 실제 등록 없이 파싱 결과만 확인 (선택)

## 파일 형식

### CSV 형식

```csv
name,iso_code,price,purchase_link,image_url,manufacturer,category,description
무게조절 식기 세트,15 09,25000,https://coupang.link/1,https://image.com/1.jpg,보조기기코리아,coupang,손 떨림 보조 식기
적응형 숟가락,15 09,15000,https://naver.link/1,https://image.com/2.jpg,보조기기코리아,naver,손 기능 보조 숟가락
```

**필수 필드:**
- `name`: 상품 이름
- `iso_code`: ISO 9999 코드 (예: "15 09")

**선택 필드:**
- `price`: 가격 (숫자)
- `purchase_link`: 구매 링크 (URL)
- `image_url`: 이미지 URL
- `manufacturer`: 제조사명
- `category`: 카테고리/플랫폼 (예: "coupang", "naver")
- `description`: 상품 설명
- `is_active`: 활성 상태 (true/false, 기본값: true)

### JSON 형식

```json
[
  {
    "name": "무게조절 식기 세트",
    "iso_code": "15 09",
    "price": 25000,
    "purchase_link": "https://coupang.link/1",
    "image_url": "https://image.com/1.jpg",
    "manufacturer": "보조기기코리아",
    "category": "coupang",
    "description": "손 떨림 보조 식기"
  }
]
```

## ISO 코드 형식

ISO 9999:2022 표준에 따라 다음 형식을 사용하세요:

- 올바른 형식: `15 09`, `18 30`, `12 22` (공백 포함)
- 잘못된 형식: `1509`, `15-09`, `15.09`

### 주요 ISO 코드 예시

- `15 09`: 식사 및 음주 보조기기
- `18 30`: 수직 접근성 보조기기
- `12 22`: 수동 휠체어
- `12 31`: 체위 변경 보조기기
- `21 06`: 청각 보조기기
- `22 30`: 의사소통 보조기기

전체 ISO 코드 목록은 `core/matching/iso-mapping.ts`를 참고하세요.

## 예제 파일

- `scripts/example-products.csv`: CSV 형식 예제
- `scripts/example-products.json`: JSON 형식 예제

## 동작 방식

1. **파일 파싱**: CSV 또는 JSON 파일을 읽어 상품 데이터 추출
2. **검증**: ISO 코드 형식 및 필수 필드 검증
3. **중복 확인**: 이름과 ISO 코드로 기존 상품 확인
4. **등록/업데이트**: 신규 상품은 생성, 기존 상품은 업데이트
5. **결과 출력**: 생성/업데이트/실패 통계 표시

## 주의사항

1. **ISO 코드 형식**: 반드시 공백 포함 형식 (`15 09`)을 사용하세요
2. **중복 처리**: 같은 이름과 ISO 코드를 가진 상품은 자동으로 업데이트됩니다
3. **링크 검증**: `--validate-links` 옵션 사용 시 시간이 오래 걸릴 수 있습니다
4. **대량 등록**: 100개 이상의 상품을 등록할 때는 시간이 걸릴 수 있습니다

## 문제 해결

### "데이터베이스 연결 실패" 에러

- `.env.local` 파일에 Supabase 환경 변수가 올바르게 설정되어 있는지 확인
- `SUPABASE_SERVICE_ROLE_KEY`가 올바른지 확인

### "유효하지 않은 ISO 코드" 경고

- ISO 코드 형식이 `XX XX` (공백 포함)인지 확인
- `core/matching/iso-mapping.ts`에서 사용 가능한 ISO 코드 확인

### "컬럼 수가 맞지 않습니다" 경고

- CSV 파일의 헤더와 데이터 행의 컬럼 수가 일치하는지 확인
- 쉼표가 포함된 필드는 따옴표로 감싸야 합니다

## 웹 스크래핑 크롤러

### 개요

Playwright 기반 웹 스크래핑 크롤러로 쿠팡, 네이버 쇼핑 등에서 상품 정보를 자동으로 수집하고 데이터베이스에 등록할 수 있습니다.

### 사전 준비

1. **Playwright 브라우저 설치** (최초 1회)
   ```bash
   npx playwright install chromium
   ```

2. **환경 변수 설정** (수동 크롤링과 동일)
   - `.env.local` 파일에 Supabase 환경 변수 설정

### 사용법

#### 기본 사용법

```bash
# 쿠팡만 크롤링 (5개 상품)
pnpm crawl:products --keyword "무게조절 식기" --iso-code "15 09" --platform coupang --max 5

# 네이버 쇼핑만 크롤링 (10개 상품)
pnpm crawl:products --keyword "보행기" --iso-code "12 03" --platform naver --max 10

# 모든 플랫폼 크롤링 (10개 상품)
pnpm crawl:products --keyword "식기" --iso-code "15 09" --max 10

# Dry-run 모드 (실제 등록 안 함)
pnpm crawl:products --keyword "식기" --iso-code "15 09" --dry-run
```

#### 옵션

- `--keyword <검색어>`: 검색할 키워드 (필수)
- `--iso-code <코드>`: ISO 9999 코드 (예: "15 09") (선택, 추천)
- `--platform <플랫폼>`: 크롤링할 플랫폼 (`coupang`, `naver`, `all`) (기본값: `all`)
- `--max <숫자>`: 최대 수집 개수 (기본값: 10)
- `--dry-run`: 실제 등록 없이 결과만 확인

### 예시

```bash
# 쿠팡에서 "보행기" 검색하여 ISO "12 03"으로 등록 (5개)
pnpm crawl:products --keyword "보행기" --iso-code "12 03" --platform coupang --max 5

# 네이버 쇼핑에서 "청각 보조기기" 검색 (10개)
pnpm crawl:products --keyword "청각 보조기기" --iso-code "21 06" --platform naver --max 10

# 모든 플랫폼에서 "식기" 검색 (ISO 코드 없이)
pnpm crawl:products --keyword "식기" --max 10
```

### 동작 방식

1. **브라우저 실행**: Playwright로 헤드리스 브라우저 실행
2. **검색 페이지 접속**: 쿠팡/네이버 쇼핑 검색 페이지로 이동
3. **상품 정보 추출**: 상품명, 가격, 이미지, 링크 추출
4. **Rate Limit 방지**: 요청 간 1초 대기
5. **데이터베이스 등록**: 수집한 상품을 Supabase에 자동 등록

### 주의사항

1. **셀렉터 변경**: 쇼핑몰 사이트 구조 변경 시 셀렉터 수정 필요
2. **Rate Limit**: 요청 간격을 1초 이상 유지하여 차단 방지
3. **에러 처리**: 일부 상품 추출 실패해도 계속 진행
4. **ISO 코드**: ISO 코드 없이 등록하면 추천에 사용되지 않을 수 있음

### 문제 해결

#### "상품이 수집되지 않습니다"

- 셀렉터가 사이트 구조 변경으로 인해 작동하지 않을 수 있음
- `scripts/crawlers/coupang-scraper.ts` 또는 `naver-scraper.ts`의 셀렉터 확인
- 브라우저 개발자 도구로 실제 HTML 구조 확인 후 셀렉터 수정

#### "크롤링이 너무 느립니다"

- `--max` 옵션으로 수집 개수 제한
- Rate Limit 방지를 위해 요청 간격이 1초로 설정되어 있음

#### "브라우저 실행 오류"

- Playwright 브라우저가 설치되어 있는지 확인: `npx playwright install chromium`

## 다음 단계

1. **셀렉터 테스트 및 조정**: 각 사이트별 실제 HTML 구조 확인 및 셀렉터 최적화 (`docs/selector-testing-guide.md`)
2. **관리자 UI 연동**: `/admin/products`에서 크롤링 기능 추가
3. **자동 크롤링**: 쿠팡 파트너스 API 연동 (`lib/integrations/coupang.ts`) (API 확보 후)
4. **n8n 워크플로우**: Schedule Trigger 기반 자동 크롤링 (API 확보 후)

## 참고 문서

- **웹 스크래핑 전체 가이드**: `docs/web-scraping-guide.md`
- **셀렉터 테스트 가이드**: `docs/selector-testing-guide.md`

