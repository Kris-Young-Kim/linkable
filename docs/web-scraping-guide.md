# 웹 스크래핑 크롤러 가이드

## 개요

LinkAble 프로젝트의 웹 스크래핑 크롤러는 Playwright 기반으로 여러 보조기기 전문 쇼핑몰에서 상품 정보를 자동으로 수집하고 데이터베이스에 등록하는 시스템입니다.

## 아키텍처

### 파일 구조

```
scripts/crawlers/
├── types.ts              # 공통 타입 정의
├── utils.ts              # 유틸리티 함수 (재시도, 가격 파싱 등)
├── site-config.ts        # 사이트별 설정 관리
├── generic-scraper.ts    # 범용 크롤러 (설정 기반)
├── coupang-scraper.ts    # 쿠팡 전용 크롤러 (선택적)
├── naver-scraper.ts      # 네이버 쇼핑 전용 크롤러 (선택적)
├── web-scraper.ts        # 통합 웹 스크래퍼 (메인 스크립트)
└── test-steps.ts         # 단계별 테스트 스크립트
```

### 주요 컴포넌트

#### 1. `GenericScraper` 클래스

사이트별 설정(`SiteConfig`)을 기반으로 크롤링을 수행하는 범용 크롤러입니다.

**특징:**
- 사이트별 셀렉터 설정을 외부에서 관리
- 여러 셀렉터를 순차적으로 시도하여 안정성 향상
- Rate Limit 방지 (요청 간격 조절)
- 재시도 로직 내장

#### 2. `SiteConfig` 인터페이스

각 사이트의 크롤링 설정을 정의합니다.

```typescript
interface SiteConfig {
  name: string                    // 사이트 이름
  baseUrl: string                 // 기본 URL
  searchUrl?: string              // 검색 URL 패턴 (선택)
  selectors: {
    productList: string[]         // 상품 목록 셀렉터
    productName: string[]         // 상품명 셀렉터
    productPrice: string[]         // 가격 셀렉터
    productImage: string[]         // 이미지 셀렉터
    productLink: string[]          // 링크 셀렉터
  }
  enabled: boolean                // 활성화 여부
  notes?: string                  // 메모
}
```

## 사용법

### 기본 사용법

#### 1. 지원 사이트 목록 확인

```bash
pnpm crawl:products --list-sites
```

#### 2. 특정 사이트 크롤링

```bash
# 에이블라이프에서 "휠체어" 검색 (3개 상품)
pnpm crawl:products --keyword "휠체어" --iso-code "12 22" --platform ablelife --max 3

# 11번가에서 "보행기" 검색 (5개 상품)
pnpm crawl:products --keyword "보행기" --iso-code "12 03" --platform 11st --max 5
```

#### 3. 모든 사이트 크롤링

```bash
pnpm crawl:products --keyword "식기" --iso-code "15 09" --platform all --max 10
```

#### 4. Dry-run 모드 (실제 등록 안 함)

```bash
pnpm crawl:products --keyword "휠체어" --iso-code "12 22" --platform ablelife --max 3 --dry-run
```

### 명령줄 옵션

| 옵션 | 설명 | 필수 | 기본값 |
|------|------|------|--------|
| `--keyword <검색어>` | 검색할 키워드 | ✅ | - |
| `--iso-code <코드>` | ISO 9999 코드 (예: "12 22") | ❌ | "00 00" |
| `--platform <사이트>` | 크롤링할 사이트 (`ablelife`, `11st`, `all` 등) | ❌ | `all` |
| `--max <숫자>` | 최대 수집 개수 | ❌ | 10 |
| `--dry-run` | 실제 등록 없이 결과만 확인 | ❌ | false |
| `--list-sites` | 지원 사이트 목록 출력 | ❌ | false |

### 지원 사이트

현재 지원하는 사이트 목록:

1. **에이블라이프** (`ablelife`) - 보조기기 전문 쇼핑몰
2. **케어라이프몰** (`carelifemall`) - 보조기기 전문 쇼핑몰
3. **윌비** (`willbe`) - 보조기기 전문 쇼핑몰
4. **11번가** (`11st`) - 종합 쇼핑몰
5. **퍼모빌** (`permobil`) - 휠체어 전문 브랜드
6. **휠로피아** (`wheelopia`) - 휠체어 전문 쇼핑몰
7. **SK 이지무브** (`sk-easymove`) - 보조기기 전문 쇼핑몰

## 새 사이트 추가하기

### 1. `site-config.ts`에 사이트 추가

```typescript
export const SITE_CONFIGS: Record<string, SiteConfig> = {
  // ... 기존 사이트들 ...
  
  newsite: {
    name: "새 사이트",
    baseUrl: "https://example.com",
    searchUrl: "https://example.com/search?q={keyword}", // 선택적
    selectors: {
      productList: [
        ".product_list > li",      // 우선순위 높은 셀렉터
        "ul.products > li",        // 대체 셀렉터
      ],
      productName: [
        ".product_name",
        "h3",
        "a",
      ],
      productPrice: [
        ".price",
        "[class*='price']",
      ],
      productImage: [
        "img",
        ".product_img img",
      ],
      productLink: [
        "a",
        "a[href*='product']",
      ],
    },
    enabled: true,
    notes: "사이트 설명",
  },
}
```

### 2. 셀렉터 테스트

```bash
# 단계별 테스트 스크립트 사용
pnpm test:crawl --step 1  # 브라우저 초기화
pnpm test:crawl --step 2  # 페이지 접속
pnpm test:crawl --step 3  # 셀렉터 찾기
pnpm test:crawl --step 4  # 상품 정보 추출
```

### 3. 실제 크롤링 테스트

```bash
pnpm crawl:products --keyword "테스트" --platform newsite --max 3 --dry-run
```

## 셀렉터 디버깅

### 문제 해결

#### 1. 상품 목록을 찾을 수 없음

**증상**: "상품 목록을 찾을 수 없습니다" 오류

**해결 방법**:
1. 브라우저 개발자 도구로 실제 HTML 구조 확인
2. `test-steps.ts`로 스크린샷 확인 (`test-page-screenshot.png`)
3. `site-config.ts`의 `productList` 셀렉터 수정

#### 2. 상품 정보 추출 실패

**증상**: 상품명, 가격 등이 추출되지 않음

**해결 방법**:
1. 각 필드별 셀렉터를 순차적으로 확인
2. `test-steps.ts --step 4`로 실제 HTML 구조 확인
3. `site-config.ts`의 해당 셀렉터 수정

#### 3. 페이지 로딩 시간 초과

**증상**: 타임아웃 오류

**해결 방법**:
1. `generic-scraper.ts`의 `waitForTimeout` 값 증가
2. `waitUntil` 옵션 변경 (`networkidle` → `domcontentloaded`)

## 동작 원리

### 크롤링 프로세스

1. **브라우저 초기화**: Playwright로 Chromium 브라우저 실행
2. **페이지 접속**: 검색 URL 또는 메인 페이지로 이동
3. **페이지 로딩 대기**: 동적 콘텐츠 로딩 완료 대기 (3초)
4. **상품 목록 찾기**: 여러 셀렉터를 순차적으로 시도
5. **상품 정보 추출**: 각 상품의 이름, 가격, 이미지, 링크 추출
6. **Rate Limit 방지**: 요청 간 1초 대기
7. **데이터베이스 등록**: Supabase에 상품 정보 저장

### 에러 처리

- **재시도 로직**: 각 상품 추출 시 최대 3회 재시도
- **지수 백오프**: 재시도 간격 점진적 증가
- **부분 실패 허용**: 일부 상품 추출 실패해도 계속 진행

## 성능 최적화

### 1. Rate Limit 방지

- 요청 간 1초 이상 대기
- User-Agent 설정으로 봇 차단 방지
- 헤드리스 모드 사용

### 2. 메모리 관리

- 각 사이트 크롤링 후 브라우저 컨텍스트 닫기
- 사용하지 않는 페이지 즉시 닫기

### 3. 타임아웃 설정

- 페이지 로딩: 30초
- 셀렉터 대기: 5-10초
- 네트워크 대기: `networkidle`

## 주의사항

1. **법적 고려사항**
   - 각 사이트의 이용약관 확인
   - robots.txt 확인
   - 과도한 요청 방지

2. **사이트 구조 변경**
   - 쇼핑몰 사이트는 구조 변경이 잦음
   - 정기적으로 셀렉터 확인 필요

3. **데이터 품질**
   - 수집된 데이터는 검증 후 사용
   - 가격, 링크 등 중요 정보 확인

## 향후 개선 사항

1. **자동 셀렉터 감지**: AI 기반 셀렉터 자동 추출
2. **스케줄링**: 주기적 자동 크롤링
3. **모니터링**: 크롤링 성공률 및 오류 추적
4. **캐싱**: 중복 크롤링 방지
5. **병렬 처리**: 여러 사이트 동시 크롤링

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [CSS Selector 가이드](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- `scripts/crawlers/test-steps.ts` - 단계별 테스트 스크립트
- `scripts/crawlers/site-config.ts` - 사이트별 설정

