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

## 다음 단계

1. **자동 크롤링**: 쿠팡 파트너스 API 연동 (`lib/integrations/coupang.ts`)
2. **웹 스크래핑**: Puppeteer/Playwright 기반 크롤러
3. **관리자 UI**: `/admin/products`에서 크롤링 기능 추가

