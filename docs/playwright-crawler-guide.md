# Playwright 크롤러 사용 가이드

Playwright를 사용한 보조기기 정보 크롤링 도구입니다.

## 설치

```bash
# Playwright 브라우저 설치 (최초 1회)
pnpm exec playwright install
```

## 기본 사용법

### 1. URL 직접 지정

```bash
# 기본 사용 (10개 제품 추출)
pnpm crawl:playwright --url "https://example.com/products"

# 최대 개수 지정
pnpm crawl:playwright --url "https://example.com/products" --max 20

# 브라우저를 보면서 실행 (디버깅용)
pnpm crawl:playwright --url "https://example.com/products" --headed
```

### 2. 사이트 이름 사용

```bash
# 에이블라이프 사이트 크롤링
pnpm crawl:playwright --site ablelife --category "휠체어" --max 10

# 휠로피아 사이트 크롤링
pnpm crawl:playwright --site wheelopia --max 5
```

### 3. 데이터베이스에 저장

```bash
# ISO 코드와 함께 저장
pnpm crawl:playwright --url "https://example.com/products" --iso-code "12 22" --save

# 사이트 이름 사용 시
pnpm crawl:playwright --site ablelife --category "휠체어" --iso-code "12 22" --save
```

## 추출되는 정보

- **보조기기명**: 제품의 이름
- **모델명**: 제품 모델 번호 (있는 경우)
- **가격**: 제품 가격
- **특징**: 제품의 주요 특징/스펙
- **이미지**: 제품 이미지 URL
- **구매 링크**: 제품 구매 페이지 URL
- **제조사**: 제조사명 (있는 경우)
- **설명**: 제품 설명

## 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--url` | 크롤링할 URL | `--url "https://example.com/products"` |
| `--site` | 사이트 이름 | `--site ablelife` |
| `--category` | 카테고리 | `--category "휠체어"` |
| `--iso-code` | ISO 9999 코드 | `--iso-code "12 22"` |
| `--max` | 최대 추출 개수 | `--max 20` |
| `--save` | 데이터베이스에 저장 | `--save` |
| `--headed` | 브라우저 표시 (디버깅) | `--headed` |

## 예시

### 에이블라이프 휠체어 크롤링

```bash
pnpm crawl:playwright \
  --site ablelife \
  --category "휠체어" \
  --iso-code "12 22" \
  --max 15 \
  --save
```

### 특정 URL 크롤링 및 저장

```bash
pnpm crawl:playwright \
  --url "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011" \
  --iso-code "12 22" \
  --max 10 \
  --save
```

## 지원 사이트

현재 지원하는 사이트 목록 확인:

```bash
tsx scripts/crawlers/web-scraper.ts --list-sites
```

## 주의사항

1. **Rate Limiting**: 각 요청 사이에 2초 대기 시간이 있습니다.
2. **타임아웃**: 페이지 로딩 타임아웃은 30초입니다.
3. **헤드리스 모드**: 기본적으로 브라우저를 표시하지 않습니다 (`--headed`로 변경 가능).
4. **데이터 저장**: `--save` 옵션 없이는 콘솔에만 출력됩니다.

## 문제 해결

### 제품을 찾을 수 없음

- 페이지 구조가 변경되었을 수 있습니다.
- 셀렉터를 확인하고 `--headed` 옵션으로 브라우저를 보면서 디버깅하세요.

### 타임아웃 오류

- 네트워크 연결을 확인하세요.
- `--headed` 옵션으로 페이지 로딩 상태를 확인하세요.

### 저장 오류

- 환경 변수(`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)가 설정되어 있는지 확인하세요.
- 데이터베이스 연결 상태를 확인하세요.

