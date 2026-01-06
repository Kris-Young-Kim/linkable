# Google OAuth 설정 가이드

이 문서는 Clerk를 사용한 Google 로그인 설정 방법을 안내합니다.

## 오류 상황

**오류 메시지**: `Missing required parameter: client_id` (400 invalid_request)

**원인**: Clerk 대시보드에서 Google OAuth 제공자 설정이 완료되지 않았거나, Client ID가 누락되었습니다.

## 1. Clerk 대시보드 설정

### 1.1 Google OAuth 제공자 활성화

1. **Clerk 대시보드 접속**:
   - https://dashboard.clerk.com
   - 프로젝트 선택

2. **Social Connections 설정**:
   - User & Authentication → Social Connections
   - **Google** 찾기
   - **Enable** 클릭

3. **Google 앱 정보 입력**:
   - **Client ID**: Google Cloud Console에서 생성한 OAuth 2.0 Client ID
   - **Client Secret**: Google Cloud Console에서 생성한 OAuth 2.0 Client Secret

4. **리다이렉트 URI 확인**:
   - Clerk가 자동으로 생성한 리다이렉트 URI 확인
   - 형식: `https://[your-clerk-domain]/v1/oauth_callback`
   - 예시: `https://clerk.linkable.life/v1/oauth_callback`
   - 또는 기본 도메인: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
   - **이 URI를 복사하여 Google Cloud Console에 등록해야 함**

## 2. Google Cloud Console 설정

### 2.1 프로젝트 생성 및 OAuth 동의 화면 설정

1. **Google Cloud Console 접속**:
   - https://console.cloud.google.com
   - 로그인

2. **프로젝트 선택 또는 생성**:
   - 상단에서 프로젝트 선택
   - 새 프로젝트가 필요하면 "프로젝트 만들기" 클릭
   - 프로젝트 이름: "LinkAble" (또는 원하는 이름)

3. **OAuth 동의 화면 설정**:
   - APIs & Services → OAuth consent screen
   - User Type 선택:
     - **External** (일반 사용자용) 또는 **Internal** (Google Workspace 조직용)
   - 앱 정보 입력:
     - 앱 이름: "LinkAble"
     - 사용자 지원 이메일: 본인 이메일
     - 개발자 연락처 정보: 본인 이메일
   - 범위(Scopes) 추가:
     - `openid`
     - `email`
     - `profile`
   - 테스트 사용자 추가 (External 선택 시):
     - 테스트 중인 이메일 주소 추가
   - 저장 및 계속

### 2.2 OAuth 2.0 클라이언트 ID 생성

1. **사용자 인증 정보 생성**:
   - APIs & Services → Credentials
   - "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"

2. **애플리케이션 유형 선택**:
   - **웹 애플리케이션** 선택

3. **이름 입력**:
   - 이름: "LinkAble Web Client" (또는 원하는 이름)

4. **승인된 리디렉션 URI 추가**:
   - Clerk 대시보드에서 확인한 리다이렉트 URI 입력
   - 예시: `https://clerk.linkable.life/v1/oauth_callback`
   - 또는: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
   - **중요**: Clerk 대시보드에서 확인한 정확한 URI를 입력해야 함

5. **만들기 클릭**:
   - **Client ID** 복사 (Clerk 대시보드의 Client ID에 입력)
   - **Client Secret** 복사 (Clerk 대시보드의 Client Secret에 입력)
   - **주의**: Client Secret은 한 번만 표시되므로 즉시 복사해야 함

### 2.3 추가 설정 (선택사항)

1. **승인된 JavaScript 원본**:
   - 필요 시 `https://www.linkable.life` 추가
   - 또는 `https://linkable.life`

2. **승인된 리디렉션 URI 추가**:
   - 개발 환경용 URI도 추가 가능
   - 예: `http://localhost:3000/v1/oauth_callback` (로컬 개발용)

## 3. 설정 확인 체크리스트

### Clerk 대시보드
- [ ] Google Social Connection이 **Enabled** 상태
- [ ] Client ID가 Google Cloud Console의 OAuth 2.0 Client ID와 일치
- [ ] Client Secret이 Google Cloud Console의 OAuth 2.0 Client Secret과 일치
- [ ] 리다이렉트 URI 확인 및 복사

### Google Cloud Console
- [ ] OAuth 동의 화면 설정 완료
- [ ] OAuth 2.0 클라이언트 ID 생성 완료
- [ ] 승인된 리디렉션 URI에 Clerk 리다이렉트 URI 정확히 등록
- [ ] Client ID 확인 및 복사
- [ ] Client Secret 확인 및 복사

### 코드 설정
- [ ] `app/sign-in/[[...sign-in]]/page.tsx`에 `SignIn` 컴포넌트 설정
- [ ] `app/sign-up/[[...sign-up]]/page.tsx`에 `SignUp` 컴포넌트 설정
- [ ] `app/layout.tsx`에 `ClerkProvider` 설정

## 4. 일반적인 오류 및 해결 방법

### 오류: "Missing required parameter: client_id"

**원인**: Clerk 대시보드에 Google OAuth Client ID가 입력되지 않았거나 잘못 입력됨

**해결 방법**:
1. Google Cloud Console에서 OAuth 2.0 Client ID 확인
2. Clerk 대시보드 → User & Authentication → Social Connections → Google
3. Client ID 필드에 Google Cloud Console의 Client ID 정확히 입력
4. 저장

### 오류: "redirect_uri_mismatch"

**원인**: Google Cloud Console에 등록된 Redirect URI와 Clerk에서 사용하는 URI가 일치하지 않음

**해결 방법**:
1. Clerk 대시보드에서 정확한 리다이렉트 URI 확인
2. Google Cloud Console → APIs & Services → Credentials
3. OAuth 2.0 클라이언트 ID 선택
4. "승인된 리디렉션 URI"에 Clerk 리다이렉트 URI 정확히 추가
5. 저장

### 오류: "access_denied"

**원인**: OAuth 동의 화면 설정이 완료되지 않았거나, 테스트 사용자로 등록되지 않음

**해결 방법**:
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. OAuth 동의 화면 설정 완료 확인
3. External 선택 시 테스트 사용자에 본인 이메일 추가
4. 앱을 Google에 검증 제출 (프로덕션 배포 시)

## 5. 현재 프로젝트 설정 확인

### Clerk Frontend API URL 확인

```bash
# 설정 확인 스크립트 실행
pnpm check:clerk
```

현재 설정된 Frontend API URL을 확인하고, Google Cloud Console에 해당 리다이렉트 URI를 등록해야 합니다.

### 예시 리다이렉트 URI

현재 프로젝트 설정 (`NEXT_PUBLIC_CLERK_FRONTEND_API=https://clerk.linkable.life`) 기준:

```
https://clerk.linkable.life/v1/oauth_callback
```

이 URI를 Google Cloud Console의 "승인된 리디렉션 URI"에 추가해야 합니다.

## 6. 참고 자료

- [Clerk 공식 문서 - Social Connections](https://clerk.com/docs/authentication/social-connections)
- [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com)
