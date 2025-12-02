# Observability 스택 구성 가이드

이 문서는 LinkAble MVP의 Observability(관찰 가능성) 스택 구성 방법을 설명합니다. Vercel Log Drains와 Supabase Edge logging을 통합하여 애플리케이션의 로그, 메트릭, 에러를 모니터링합니다.

## 개요

Observability 스택은 다음을 포함합니다:
- **Vercel Log Drains**: Vercel 서버리스 함수 로그를 외부 서비스로 전송
- **Supabase Edge Logging**: Supabase Edge Functions 및 데이터베이스 로그 수집
- **에러 추적**: 실시간 에러 모니터링 및 알림

## 1. Vercel Log Drains 설정

### 1.1 Log Drains 개요

Vercel Log Drains는 Vercel 서버리스 함수의 로그를 외부 서비스(예: Datadog, Logtail, Axiom)로 전송합니다.

### 1.2 Logtail 설정 (권장)

**Logtail**은 Vercel과 통합이 잘 되어 있고 무료 티어를 제공합니다.

#### 단계 1: Logtail 계정 생성
1. [Logtail](https://logtail.com/)에 가입
2. 새 소스(Source) 생성
3. Source Token 복사

#### 단계 2: Vercel에 Log Drain 추가
1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Log Drains
3. "Create Log Drain" 클릭
4. 설정:
   - **Name**: `linkable-production-logs`
   - **URL**: `https://in.logtail.com`
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_SOURCE_TOKEN
     Content-Type: application/json
     ```
   - **Environments**: Production, Preview (선택)
5. 저장

#### 단계 3: 로그 확인
- Logtail 대시보드에서 실시간 로그 확인
- 필터링: `level:error`, `category:consultation` 등

### 1.3 Axiom 설정 (대안)

**Axiom**은 빠른 쿼리 성능과 무료 티어를 제공합니다.

#### 단계 1: Axiom 계정 생성
1. [Axiom](https://axiom.co/)에 가입
2. 새 데이터셋 생성 (예: `linkable-logs`)
3. API Token 생성

#### 단계 2: Vercel Log Drain 설정
- **URL**: `https://api.axiom.co/v1/datasets/linkable-logs/ingest`
- **Headers**:
  ```
  Authorization: Bearer YOUR_API_TOKEN
  Content-Type: application/x-ndjson
  ```

### 1.4 로그 형식

현재 `lib/logging.ts`에서 사용하는 로그 형식:

```typescript
logEvent({
  category: "consultation" | "matching" | "validation" | "system" | "product" | "recommendation",
  action: string,
  payload?: Record<string, unknown>,
  level?: "info" | "warn" | "error"
})
```

**로그 예시**:
```json
{
  "timestamp": "2025-01-20T10:30:00Z",
  "category": "consultation",
  "action": "chat_api_error",
  "level": "error",
  "payload": {
    "error": "Failed to process request",
    "consultation_id": "abc123"
  }
}
```

## 2. Supabase Edge Logging 설정

### 2.1 Supabase 로그 확인

Supabase는 기본적으로 다음 로그를 제공합니다:
- **Postgres 로그**: 데이터베이스 쿼리 및 에러
- **Edge Functions 로그**: Edge Functions 실행 로그
- **Auth 로그**: 인증 관련 로그

### 2.2 Supabase 대시보드에서 로그 확인

1. Supabase 대시보드 → 프로젝트 선택
2. **Logs** 메뉴에서 다음 확인:
   - **API Logs**: REST API 요청/응답
   - **Postgres Logs**: 데이터베이스 쿼리
   - **Auth Logs**: 인증 이벤트
   - **Edge Functions Logs**: Edge Functions 실행

### 2.3 Edge Functions 로깅

Edge Functions에서 로그를 남기려면:

```typescript
// supabase/functions/example/index.ts
Deno.serve(async (req) => {
  console.log("[Edge Function] Request received:", {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  })

  try {
    // 함수 로직
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[Edge Function] Error:", error)
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
```

### 2.4 Supabase 로그를 외부 서비스로 전송 (선택사항)

Supabase는 직접적인 Log Drain을 제공하지 않지만, 다음 방법으로 로그를 수집할 수 있습니다:

#### 방법 1: Supabase API로 로그 조회
- Supabase Management API를 사용하여 주기적으로 로그 조회
- Cron Job으로 실행하여 외부 서비스로 전송

#### 방법 2: Postgres 트리거 사용
- 중요한 이벤트를 Postgres 트리거로 캡처
- 외부 웹훅으로 전송

## 3. 에러 추적 설정

### 3.1 Sentry 통합 (권장)

**Sentry**는 실시간 에러 추적 및 성능 모니터링을 제공합니다.

#### 단계 1: Sentry 프로젝트 생성
1. [Sentry](https://sentry.io/)에 가입
2. Next.js 프로젝트 생성
3. DSN 복사

#### 단계 2: Next.js에 Sentry 설치
```bash
pnpm add @sentry/nextjs
```

#### 단계 3: Sentry 초기화
```bash
npx @sentry/wizard@latest -i nextjs
```

#### 단계 4: 환경 변수 설정
```env
NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
SENTRY_AUTH_TOKEN=your_auth_token_here
```

#### 단계 5: 커스텀 에러 핸들링
```typescript
// lib/error-handler.ts
import * as Sentry from "@sentry/nextjs"

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      category: "application",
    },
  })
}
```

### 3.2 Vercel Analytics 통합

Vercel Analytics는 Core Web Vitals와 에러를 자동으로 수집합니다.

1. Vercel 대시보드 → 프로젝트 → Analytics
2. Analytics 활성화
3. 대시보드에서 실시간 메트릭 확인

## 4. 로그 수집 전략

### 4.1 로그 레벨별 처리

- **Error**: 즉시 알림 (Sentry, 이메일)
- **Warn**: 주기적 검토 (주간 리포트)
- **Info**: 장기 저장 및 분석

### 4.2 로그 보관 정책

- **Production 로그**: 30일 보관
- **Error 로그**: 90일 보관
- **중요 이벤트**: 영구 보관 (별도 저장소)

### 4.3 로그 필터링 및 검색

Logtail/Axiom에서 다음 필터 사용:
- `level:error` - 에러만 조회
- `category:consultation` - 상담 관련 로그
- `action:chat_api_error` - 특정 액션 로그
- `timestamp:>2025-01-20` - 날짜 범위

## 5. 알림 설정

### 5.1 에러 알림

**Sentry 알림 규칙**:
- 에러 발생 시 즉시 Slack/이메일 알림
- 같은 에러가 10분 내 5회 이상 발생 시 알림
- 새로운 에러 발생 시 알림

### 5.2 성능 알림

**Vercel Analytics 알림**:
- LCP > 3초 시 알림
- TTFB > 1초 시 알림
- 에러율 > 1% 시 알림

### 5.3 로그 기반 알림

**Logtail/Axiom 알림**:
- 특정 키워드 포함 로그 발생 시 알림
- 로그 볼륨 급증 시 알림
- 특정 패턴 감지 시 알림

## 6. 모니터링 대시보드

### 6.1 주요 메트릭

다음 메트릭을 모니터링합니다:
- **에러율**: 전체 요청 대비 에러 비율
- **응답 시간**: API 엔드포인트별 평균 응답 시간
- **상담 완료율**: 시작된 상담 중 완료된 비율
- **추천 클릭률**: 생성된 추천 중 클릭된 비율
- **K-IPPA 제출률**: 클릭된 추천 중 평가 제출 비율

### 6.2 대시보드 구성

**Logtail/Axiom 대시보드**:
1. 에러 로그 실시간 모니터링
2. 카테고리별 로그 분포 차트
3. 시간대별 로그 볼륨 그래프

**Sentry 대시보드**:
1. 에러 발생 추이
2. 에러별 발생 빈도
3. 사용자 영향도 분석

## 7. 트러블슈팅

### 7.1 로그가 수집되지 않는 경우

1. **Vercel Log Drain 확인**:
   - Settings → Log Drains에서 활성 상태 확인
   - URL 및 헤더 설정 확인

2. **환경 변수 확인**:
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` 설정 확인
   - Sentry DSN 설정 확인

3. **로그 서비스 상태 확인**:
   - Logtail/Axiom 서비스 상태 페이지 확인

### 7.2 로그 볼륨이 너무 많은 경우

1. **로그 레벨 조정**:
   - 개발 환경: `info` 레벨
   - 프로덕션: `warn`, `error` 레벨만

2. **샘플링 적용**:
   - Sentry: 샘플링 비율 설정
   - Logtail: 필터링 규칙 적용

## 8. 비용 최적화

### 8.1 무료 티어 활용

- **Logtail**: 월 1GB 무료
- **Axiom**: 월 500MB 무료
- **Sentry**: 월 5,000 이벤트 무료

### 8.2 로그 볼륨 최적화

- 불필요한 로그 제거
- 로그 레벨 조정
- 샘플링 적용

## 9. 참고 자료

- [Vercel Log Drains 문서](https://vercel.com/docs/observability/log-drains)
- [Supabase Logs 문서](https://supabase.com/docs/guides/platform/logs)
- [Sentry Next.js 문서](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Logtail 문서](https://logtail.com/docs)
- [Axiom 문서](https://axiom.co/docs)

## 10. 체크리스트

### 초기 설정
- [ ] Logtail/Axiom 계정 생성
- [ ] Vercel Log Drain 설정
- [ ] Sentry 프로젝트 생성 및 통합
- [ ] 환경 변수 설정
- [ ] 로그 수집 확인

### 모니터링 설정
- [ ] 에러 알림 규칙 설정
- [ ] 성능 알림 규칙 설정
- [ ] 대시보드 구성
- [ ] 주간 리포트 설정

### 운영
- [ ] 로그 보관 정책 수립
- [ ] 로그 볼륨 모니터링
- [ ] 비용 최적화 적용

