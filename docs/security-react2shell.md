# React2Shell 취약점 방지 가이드

## 개요

React2Shell (CVE-2025-55182)는 React Server Components의 unsafe deserialization을 악용한 원격 코드 실행 취약점입니다.

## 현재 상태

✅ **안전한 버전 사용 중:**

- React: 19.2.1 (패치됨)
- Next.js: 16.0.7 (패치됨)
- React DOM: 19.2.1 (패치됨)

## 적용된 보안 조치

### 1. Next.js 보안 헤더 설정

`next.config.mjs`에 다음 보안 헤더가 추가되었습니다:

- `X-Content-Type-Options: nosniff` - MIME 타입 스니핑 방지
- `X-Frame-Options: DENY` - 클릭재킹 방지
- `X-XSS-Protection: 1; mode=block` - XSS 공격 방지
- `Referrer-Policy: strict-origin-when-cross-origin` - 리퍼러 정보 보호
- `Permissions-Policy` - 불필요한 권한 차단

### 2. Server Actions 보안 설정

Server Actions의 body 크기를 제한하여 DoS 공격을 방지합니다:

```javascript
experimental: {
  serverActions: {
    bodySizeLimit: '2mb',
  },
}
```

## 추가 보안 권장사항

### 1. 환경 변수 보안

- ✅ `NEXT_PUBLIC_*` 변수는 클라이언트에 노출되므로 민감한 정보 포함 금지
- ✅ 서버 전용 변수는 `NEXT_PUBLIC_` 접두사 없이 사용
- ✅ `.env.local` 파일은 `.gitignore`에 포함되어야 함

### 2. Server Components 사용 시 주의사항

- ✅ 신뢰할 수 없는 데이터는 항상 검증 및 sanitize
- ✅ 사용자 입력은 Server Actions에서 검증
- ✅ 외부 API 응답은 타입 검증 후 사용

### 3. 정기적인 업데이트

```bash
# 의존성 업데이트 확인
pnpm outdated

# 보안 취약점 확인
pnpm audit

# 패치된 버전으로 업데이트
pnpm update react react-dom next
```

## 모니터링

정기적으로 다음을 확인하세요:

1. React/Next.js 보안 공지: https://github.com/facebook/react/security
2. Next.js 보안 공지: https://github.com/vercel/next.js/security
3. CVE 데이터베이스: https://cve.mitre.org/

## 참고 자료

- [React2Shell 취약점 상세 정보](https://cve-2025-55182.com/)
- [Next.js 보안 가이드](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [React Server Components 보안](https://react.dev/reference/rsc/server-components)
