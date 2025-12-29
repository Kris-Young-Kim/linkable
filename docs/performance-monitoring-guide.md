# 성능 모니터링 가이드

이 문서는 LinkAble MVP의 성능 모니터링 시스템 사용 방법을 설명합니다.

## 개요

성능 모니터링 시스템은 다음을 추적합니다:

1. **Core Web Vitals**: LCP, FID, CLS, FCP, TTFB, INP
2. **API 성능**: 응답 시간, 에러율, 요청/응답 크기
3. **데이터베이스 쿼리 성능**: 인덱스 사용률, 느린 쿼리

## 구성 요소

### 1. Web Vitals 추적

**파일**: `lib/performance/web-vitals.ts`, `components/performance/web-vitals-tracker.tsx`

**기능**:
- 자동으로 Core Web Vitals 지표 수집
- Supabase에 자동 저장
- 평가 기준에 따른 자동 분류 (good, needs-improvement, poor)

**사용 방법**:
- `app/layout.tsx`에 `<WebVitalsTracker />` 컴포넌트가 자동으로 포함되어 있습니다.
- 별도 설정 없이 자동으로 작동합니다.

**지표 설명**:
- **LCP (Largest Contentful Paint)**: 최대 콘텐츠 렌더링 시간 (목표: ≤ 2.5초)
- **FID (First Input Delay)**: 첫 입력 지연 시간 (목표: ≤ 100ms)
- **CLS (Cumulative Layout Shift)**: 누적 레이아웃 이동 (목표: ≤ 0.1)
- **FCP (First Contentful Paint)**: 첫 콘텐츠 렌더링 시간 (목표: ≤ 1.8초)
- **TTFB (Time to First Byte)**: 첫 바이트 수신 시간 (목표: ≤ 800ms)
- **INP (Interaction to Next Paint)**: 상호작용 후 다음 페인트 시간 (목표: ≤ 200ms)

### 2. API 성능 측정

**파일**: `lib/performance/api-performance.ts`

**기능**:
- API 요청/응답 시간 자동 측정
- 에러율 추적
- 요청/응답 크기 측정

**사용 방법**:
```typescript
import { measureApiPerformance } from "@/lib/performance/api-performance";

const response = await measureApiPerformance(
  "/api/products",
  "GET",
  () => fetch("/api/products"),
  userId
);
```

### 3. 성능 모니터링 대시보드

**파일**: `components/admin/performance-monitoring-dashboard.tsx`

**접근 경로**: `/admin/dashboard` (관리자 전용)

**기능**:
- Web Vitals 추이 차트
- API 성능 통계
- 페이지별 성능 분석
- 기간별 필터링 (1일, 7일, 30일, 90일)

## 데이터베이스 스키마

### performance_web_vitals 테이블

```sql
CREATE TABLE performance_web_vitals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    metric_name VARCHAR(50), -- LCP, FID, CLS, FCP, TTFB, INP
    metric_value DECIMAL(10, 2),
    metric_rating VARCHAR(20), -- good, needs-improvement, poor
    page_path TEXT,
    page_url TEXT,
    user_agent TEXT,
    connection_type VARCHAR(50),
    device_memory INTEGER,
    hardware_concurrency INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### performance_api_logs 테이블

```sql
CREATE TABLE performance_api_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    endpoint TEXT,
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

## 집계 뷰

### view_web_vitals_daily_stats

일별 Web Vitals 통계:
- 평균값, 중앙값, P75, P95, P99
- 좋음/개선 필요/나쁨 비율

### view_api_performance_daily_stats

일별 API 성능 통계:
- 평균 응답 시간, P95 응답 시간
- 에러율
- 요청/응답 크기

### view_web_vitals_by_page

페이지별 Web Vitals 통계 (최근 30일):
- 페이지 경로별 집계
- 지표별 평균값 및 좋음 비율

## API 엔드포인트

### GET /api/admin/analytics/performance

성능 모니터링 데이터 조회 (관리자 전용)

**쿼리 파라미터**:
- `dateRange`: 기간 선택 (1day, 7days, 30days, 90days)
- `type`: 데이터 타입 (web-vitals, api, all)

**응답 예시**:
```json
{
  "webVitals": [
    {
      "date": "2025-02-28",
      "metric_name": "LCP",
      "avg_value": 2450.5,
      "good_percentage": 85.2
    }
  ],
  "apiPerformance": [
    {
      "date": "2025-02-28",
      "endpoint": "/api/products",
      "avg_response_time_ms": 450.2,
      "error_rate_percentage": 0.5
    }
  ],
  "pageStats": [
    {
      "page_path": "/chat",
      "metric_name": "LCP",
      "avg_value": 2300.0,
      "good_percentage": 90.0
    }
  ]
}
```

## 성능 최적화 권장사항

### 1. Web Vitals 개선

- **LCP 개선**: 이미지 최적화, 중요 리소스 프리로딩
- **FID 개선**: JavaScript 번들 크기 감소, 코드 스플리팅
- **CLS 개선**: 이미지/동영상 크기 명시, 폰트 로딩 최적화

### 2. API 성능 개선

- **응답 시간 단축**: 데이터베이스 쿼리 최적화, 캐싱 활용
- **에러율 감소**: 에러 핸들링 강화, 재시도 로직 추가

### 3. 데이터베이스 최적화

- 인덱스 활용: 자주 사용되는 쿼리 패턴에 인덱스 추가
- 쿼리 최적화: 불필요한 JOIN 제거, SELECT 필드 최소화

## 모니터링 알림 설정

성능 지표가 임계값을 초과할 때 알림을 받으려면:

1. Supabase Edge Function 또는 외부 모니터링 서비스 연동
2. 주기적으로 집계 뷰를 확인하여 임계값 초과 시 알림

**임계값 예시**:
- LCP > 3초
- FID > 300ms
- CLS > 0.25
- API 응답 시간 > 1초
- 에러율 > 1%

## 참고 자료

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
