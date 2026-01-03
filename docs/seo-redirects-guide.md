# SEO 리디렉션 가이드

이 문서는 LinkAble의 SEO 최적화를 위한 리디렉션 규칙과 모범 사례를 제공합니다.

## 1. 리디렉션 상태 코드

### HTTP 상태 코드 분류

#### 영구 리디렉션 (301 Moved Permanently)
- **사용 시기**: URL이 영구적으로 변경된 경우
- **예시**: 
  - 도메인 변경
  - URL 구조 변경 (예: `/old-page` → `/new-page`)
  - 페이지 통합
- **SEO 영향**: 검색 엔진이 새 URL로 인덱싱을 업데이트함

#### 일시적 리디렉션 (302/307 Temporary Redirect)
- **302 Found**: 일시적 이동 (HTTP/1.0)
- **307 Temporary Redirect**: 일시적 이동 (HTTP/1.1, 메서드 보존)
- **사용 시기**: 
  - 인증 필요 페이지로 리디렉션
  - 임시 유지보수 페이지
  - A/B 테스트
- **SEO 영향**: 검색 엔진이 원본 URL을 유지함

### Next.js 리디렉션 구현

#### 서버 컴포넌트에서 리디렉션
```typescript
import { redirect } from "next/navigation"

// 기본 리디렉션 (307 Temporary Redirect)
redirect("/new-url")

// 영구 리디렉션 (301 Moved Permanently)
redirect("/old-url", "permanent")
```

#### next.config.mjs에서 리디렉션
```javascript
module.exports = {
  async redirects() {
    return [
      {
        source: "/old-page",
        destination: "/new-page",
        permanent: true, // 301 리디렉션
      },
      {
        source: "/temp-page",
        destination: "/maintenance",
        permanent: false, // 302/307 리디렉션
      },
    ]
  },
}
```

## 2. 현재 구현 상태

### ✅ 구현 완료

#### 1. Next.js `redirect()` 함수 사용
- **위치**: 모든 페이지 컴포넌트
- **상태 코드**: 307 (Temporary Redirect) - 기본값
- **사용 사례**:
  - 인증 필요 페이지로 리디렉션 (`/sign-in?redirect_url=...`)
  - 동적 라우트 리디렉션 (`/recommendations` → `/recommendations/[consultationId]`)
  - 평가 완료 후 추천 페이지로 리디렉션

#### 2. 메타 리프레시 및 자바스크립트 리디렉션
- **상태**: ✅ SEO 목적이 아닌 사용자 액션에 의한 리디렉션만 사용
- **사용 사례**:
  - `window.location.href`: 이메일 링크, 외부 링크
  - `window.location.reload()`: 페이지 새로고침 (리디렉션 아님)
- **SEO 영향**: 없음 (검색 엔진 크롤러가 따라가지 않음)

#### 3. 리디렉션 체인
- **상태**: ✅ 직접 리디렉션만 사용 (체인 없음)
- **확인된 리디렉션 경로**:
  - `/recommendations?consultationId=X` → `/recommendations/X` (직접)
  - 인증 필요 페이지 → `/sign-in?redirect_url=...` (직접)

### ⚠️ 확인 필요

#### 1. 영구 리디렉션 필요성
현재 코드에서는 영구 리디렉션이 필요한 경우가 거의 없습니다:
- 모든 리디렉션이 일시적 (인증, 동적 라우팅)
- URL 구조 변경이 없음

**향후 필요 시**:
- 도메인 변경 시: `next.config.mjs`에 영구 리디렉션 추가
- URL 구조 변경 시: `redirect(url, "permanent")` 사용

#### 2. HTTP → HTTPS 리디렉션
- **현재**: Vercel 배포 시 자동 처리
- **확인 필요**: 프로덕션 환경에서 HTTP 요청이 HTTPS로 리디렉션되는지 확인

## 3. 리디렉션 체인 최소화

### 리디렉션 체인이란?
여러 리디렉션이 연속으로 발생하는 경우:
```
A → B → C → D
```

### 문제점
- 검색 엔진 크롤링 속도 저하
- 사용자 경험 저하
- SEO 점수 감소

### 현재 구현
✅ **직접 리디렉션만 사용**
- 모든 리디렉션이 1단계로 완료됨
- 리디렉션 체인 없음

### 모범 사례
1. **직접 리디렉션 사용**: A → C (B를 거치지 않음)
2. **리디렉션 체인 모니터링**: 정기적으로 확인
3. **불필요한 리디렉션 제거**: 가능한 한 직접 링크 사용

## 4. 메타 리프레시 및 자바스크립트 리디렉션

### ❌ SEO 목적으로 사용하지 않음

#### 메타 리프레시
```html
<!-- ❌ 사용하지 않음 -->
<meta http-equiv="refresh" content="0; url=/new-page">
```

#### 자바스크립트 리디렉션
```javascript
// ❌ SEO 목적으로 사용하지 않음
window.location.href = "/new-page"
window.location.replace("/new-page")
```

### ✅ 현재 사용 사례 (SEO 영향 없음)

#### 1. 사용자 액션에 의한 리디렉션
```typescript
// 이메일 링크 열기 (SEO 영향 없음)
window.location.href = `mailto:${email}`
```

#### 2. 페이지 새로고침 (리디렉션 아님)
```typescript
// 데이터 업데이트 후 새로고침
window.location.reload()
```

#### 3. 클라이언트 사이드 라우팅
```typescript
// Next.js Router 사용 (SEO 친화적)
import { useRouter } from "next/navigation"
router.push("/new-page")
```

## 5. 리디렉션 모니터링

### 확인 항목
1. **리디렉션 체인**: 2단계 이상 리디렉션 확인
2. **리디렉션 루프**: 무한 리디렉션 확인
3. **리디렉션 상태 코드**: 301 vs 302/307 적절성 확인

### 도구
- **Google Search Console**: 리디렉션 오류 확인
- **Screaming Frog**: 리디렉션 체인 분석
- **Chrome DevTools**: Network 탭에서 리디렉션 확인

## 6. 모범 사례 체크리스트

### ✅ 완료된 항목
- [x] Next.js `redirect()` 함수 사용 (서버 사이드)
- [x] 메타 리프레시 사용하지 않음
- [x] SEO 목적 자바스크립트 리디렉션 사용하지 않음
- [x] 리디렉션 체인 없음 (직접 리디렉션만 사용)
- [x] 적절한 상태 코드 사용 (307 for temporary)

### ⚠️ 향후 확인 필요
- [ ] HTTP → HTTPS 리디렉션 확인 (프로덕션)
- [ ] 영구 리디렉션 필요 시 구현 (도메인 변경 등)
- [ ] 리디렉션 모니터링 정기 수행

## 7. 참고 자료

- [Next.js Redirects](https://nextjs.org/docs/app/api-reference/next-config-js/redirects)
- [Google Search Central - Redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
