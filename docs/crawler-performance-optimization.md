# 크롤러 성능 최적화 가이드

## 개요

크롤링 시 시간 제한 문제를 해결하기 위한 최적화 방법을 설명합니다.

## 적용된 최적화

### 1. 타임아웃 시간 증가

**변경 사항:**
- 페이지 로딩 타임아웃: 30초 → 60초
- 셀렉터 대기 타임아웃: 5-10초 → 15초

**효과:**
- 느린 네트워크 환경에서도 안정적으로 작동
- 동적 콘텐츠 로딩 시간 확보

### 2. 로딩 전략 변경

**변경 사항:**
- `waitUntil: "networkidle"` → `waitUntil: "domcontentloaded"`

**효과:**
- `networkidle`은 모든 네트워크 요청이 완료될 때까지 대기 (느림)
- `domcontentloaded`는 DOM이 로드되면 즉시 진행 (빠름)
- 약 50-70% 시간 단축 가능

### 3. 불필요한 리소스 차단

**변경 사항:**
- 폰트(font) 리소스 차단
- 미디어(media) 리소스 차단
- 이미지는 유지 (URL 추출 필요)

**효과:**
- 네트워크 대역폭 절약
- 페이지 로딩 시간 단축
- 약 30-40% 시간 단축 가능

### 4. 대기 시간 최적화

**변경 사항:**
- 페이지 로딩 후 대기 시간: 3초 → 2초

**효과:**
- 전체 크롤링 시간 단축
- 동적 콘텐츠는 셀렉터 대기로 처리

## 성능 비교

### 최적화 전
- 페이지 로딩: 30초 타임아웃
- 대기 시간: 3초
- 셀렉터 대기: 5-10초
- **예상 총 시간**: 40-50초/사이트

### 최적화 후
- 페이지 로딩: 60초 타임아웃 (더 여유롭지만 실제로는 더 빠름)
- 대기 시간: 2초
- 셀렉터 대기: 15초 (더 여유롭지만 실제로는 더 빠름)
- **예상 총 시간**: 20-30초/사이트

## 추가 최적화 옵션

### 1. 이미지 로딩 완전 차단 (선택적)

이미지 URL이 `data-src` 속성에 있는 경우, 이미지 로딩을 완전히 차단할 수 있습니다:

```typescript
// 이미지도 차단하는 경우
if (["image", "font", "media"].includes(resourceType)) {
  route.abort()
}
```

**주의:** 이미지 URL 추출이 실패할 수 있으므로, 사이트별로 테스트 필요

### 2. 병렬 처리 (고급)

여러 사이트를 동시에 크롤링:

```typescript
const results = await Promise.all([
  scraper1.scrape(options),
  scraper2.scrape(options),
  scraper3.scrape(options),
])
```

**주의:** Rate Limit에 걸릴 수 있으므로 주의 필요

### 3. 캐싱 (고급)

동일한 키워드로 크롤링한 결과를 캐시하여 재사용:

```typescript
const cacheKey = `${site}_${keyword}`
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}
```

## 문제 해결

### 여전히 타임아웃이 발생하는 경우

1. **타임아웃 시간 더 증가**
   ```typescript
   timeout: 90000 // 90초
   ```

2. **로딩 전략 변경**
   ```typescript
   waitUntil: "load" // domcontentloaded보다 느리지만 안정적
   ```

3. **대기 시간 증가**
   ```typescript
   await page.waitForTimeout(5000) // 5초
   ```

4. **셀렉터 타임아웃 증가**
   ```typescript
   timeout: 20000 // 20초
   ```

### 특정 사이트가 느린 경우

사이트별로 다른 설정 사용:

```typescript
// site-config.ts에 추가
timeout?: number
waitStrategy?: "domcontentloaded" | "load" | "networkidle"
```

## 모니터링

크롤링 시간을 측정하여 최적화 효과 확인:

```typescript
const startTime = Date.now()
await scraper.scrape(options)
const duration = Date.now() - startTime
console.log(`크롤링 소요 시간: ${duration}ms`)
```

## 권장 설정

### 빠른 크롤링 (권장)
- `waitUntil: "domcontentloaded"`
- `timeout: 60000`
- 리소스 차단: 폰트, 미디어
- 대기 시간: 2초

### 안정적인 크롤링
- `waitUntil: "load"`
- `timeout: 90000`
- 리소스 차단: 없음
- 대기 시간: 5초

## 참고 자료

- [Playwright Navigation Options](https://playwright.dev/docs/navigations)
- [Playwright Route Interception](https://playwright.dev/docs/network#route-interception)
- `scripts/crawlers/generic-scraper.ts` - 최적화된 크롤러 코드

