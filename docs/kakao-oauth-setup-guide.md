# 카카오 OAuth 설정 가이드

이 문서는 Clerk를 사용한 카카오 로그인 설정 방법을 안내합니다.

## 1. Clerk 대시보드 설정 확인

### 1.1 Clerk Frontend API URL 확인

현재 프로젝트에서 사용 중인 Clerk Frontend API URL을 확인하려면:

1. **환경변수 확인**:
   ```bash
   # .env.local 또는 Vercel 환경변수에서 확인
   NEXT_PUBLIC_CLERK_FRONTEND_API=your-app.clerk.accounts.dev
   ```

2. **코드에서 확인**:
   - `app/layout.tsx`에서 `NEXT_PUBLIC_CLERK_FRONTEND_API` 환경변수 사용
   - 환경변수가 없으면 Clerk가 자동으로 감지

3. **Clerk 대시보드에서 확인**:
   - https://dashboard.clerk.com 접속
   - 프로젝트 선택
   - Settings → API Keys
   - **Frontend API URL** 확인 (예: `your-app.clerk.accounts.dev`)

### 1.2 카카오 OAuth 제공자 설정

1. **Clerk 대시보드 접속**:
   - https://dashboard.clerk.com
   - 프로젝트 선택

2. **Social Connections 설정**:
   - User & Authentication → Social Connections
   - **Kakao** 찾기
   - **Enable** 클릭

3. **카카오 앱 정보 입력**:
   - **Client ID**: 카카오 REST API 키 (카카오 개발자 콘솔에서 확인)
   - **Client Secret**: 카카오 Client Secret (카카오 개발자 콘솔에서 생성)

4. **리다이렉트 URI 확인**:
   - Clerk가 자동으로 생성한 리다이렉트 URI 확인
   - 형식: `https://[your-clerk-domain]/v1/oauth_callback`
   - 예시: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
   - 또는 프록시 도메인 사용 시: `https://clerk.linkable.life/v1/oauth_callback`
   - **이 URI를 복사하여 카카오 개발자 콘솔에 등록해야 함**

## 2. 카카오 개발자 콘솔 설정

### 2.1 카카오 앱 생성 및 설정

1. **카카오 개발자 콘솔 접속**:
   - https://developers.kakao.com
   - 로그인

2. **내 애플리케이션 선택**:
   - 기존 앱이 있으면 선택, 없으면 "애플리케이션 추가하기" 클릭
   - 앱 이름: "LinkAble" (또는 원하는 이름)

3. **플랫폼 설정**:
   - **Web 플랫폼 등록**:
     - 사이트 도메인: `https://www.linkable.life`
     - 또는 `https://linkable.life` (프로토콜 포함)

4. **카카오 로그인 활성화**:
   - 제품 설정 → 카카오 로그인 → 활성화 설정: **ON**
   - Redirect URI 등록:
     ```
     https://[your-clerk-domain]/v1/oauth_callback
     ```
     - 예시: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
     - **중요**: Clerk 대시보드에서 확인한 정확한 URI를 입력해야 함
     - 여러 URI 등록 가능 (개발/프로덕션 환경별로)

5. **앱 키 확인**:
   - 앱 설정 → 앱 키
   - **REST API 키**: Clerk 대시보드의 Client ID에 입력
   - **Client Secret 생성**:
     - 제품 설정 → 카카오 로그인 → 보안
     - Client Secret 코드 발급
     - **이 값을 Clerk 대시보드의 Client Secret에 입력**

### 2.2 동의 항목 설정

1. **카카오 로그인 동의항목**:
   - 제품 설정 → 카카오 로그인 → 동의항목
   - 필수 동의 항목:
     - 닉네임 (필수)
     - 프로필 사진 (선택)
     - 카카오계정(이메일) (선택, 권장)

## 3. 설정 확인 체크리스트

### Clerk 대시보드
- [ ] Kakao Social Connection이 **Enabled** 상태
- [ ] Client ID가 카카오 REST API 키와 일치
- [ ] Client Secret이 카카오 Client Secret과 일치
- [ ] 리다이렉트 URI 확인 및 복사

### 카카오 개발자 콘솔
- [ ] Web 플랫폼 등록 완료
- [ ] 사이트 도메인: `https://www.linkable.life` 등록
- [ ] 카카오 로그인 활성화: **ON**
- [ ] Redirect URI에 Clerk 리다이렉트 URI 정확히 등록
- [ ] REST API 키 확인
- [ ] Client Secret 생성 및 확인

### 코드 설정
- [ ] `app/sign-in/[[...sign-in]]/page.tsx`에 `SignIn` 컴포넌트 설정
- [ ] `app/sign-up/[[...sign-up]]/page.tsx`에 `SignUp` 컴포넌트 설정
- [ ] `app/layout.tsx`에 `ClerkProvider` 설정
- [ ] Deprecated prop 교체 완료 (`fallbackRedirectUrl`, `forceRedirectUrl`)

## 4. 테스트 방법

1. **브라우저 캐시 및 쿠키 삭제**
2. **시크릿 모드에서 테스트**
3. **로그인 페이지 접속**:
   - `https://www.linkable.life/sign-in`
4. **카카오 로그인 버튼 클릭**
5. **카카오 로그인 진행**
6. **리다이렉트 확인**:
   - 성공 시 `/dashboard`로 리다이렉트
   - 실패 시 오류 메시지 확인

## 5. 일반적인 오류 및 해결 방법

### 오류: "등록하지 않은 리다이렉트 URI를 사용해 인가 코드를 요청했습니다"

**원인**: 카카오 개발자 콘솔에 등록된 Redirect URI와 Clerk에서 사용하는 URI가 일치하지 않음

**해결 방법**:
1. Clerk 대시보드에서 정확한 리다이렉트 URI 확인
2. 카카오 개발자 콘솔의 Redirect URI 목록 확인
3. 정확히 일치하는지 확인 (대소문자, 슬래시, 프로토콜 포함)
4. 일치하지 않으면 카카오 개발자 콘솔에 정확한 URI 추가

### 오류: "Invalid client_id"

**원인**: Clerk 대시보드에 입력된 Client ID가 카카오 REST API 키와 일치하지 않음

**해결 방법**:
1. 카카오 개발자 콘솔에서 REST API 키 확인
2. Clerk 대시보드의 Client ID와 비교
3. 일치하지 않으면 Clerk 대시보드에서 수정

### 오류: "Invalid client_secret"

**원인**: Clerk 대시보드에 입력된 Client Secret이 카카오 Client Secret과 일치하지 않음

**해결 방법**:
1. 카카오 개발자 콘솔에서 Client Secret 확인
2. Clerk 대시보드의 Client Secret과 비교
3. 일치하지 않으면 Clerk 대시보드에서 수정

## 6. 현재 프로젝트 설정 확인

### Clerk Frontend API URL 확인

현재 프로젝트에서 사용 중인 Clerk Frontend API URL을 확인하려면:

```bash
# 환경변수 확인
echo $NEXT_PUBLIC_CLERK_FRONTEND_API

# 또는 Vercel 대시보드에서 확인
# Settings → Environment Variables → NEXT_PUBLIC_CLERK_FRONTEND_API
```

### 코드에서 확인 가능한 설정

- `app/layout.tsx`: ClerkProvider 설정
- `app/sign-in/[[...sign-in]]/page.tsx`: SignIn 컴포넌트 설정
- `app/sign-up/[[...sign-up]]/page.tsx`: SignUp 컴포넌트 설정

## 7. 참고 자료

- [Clerk 공식 문서 - Social Connections](https://clerk.com/docs/authentication/social-connections)
- [카카오 개발자 문서 - 카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [Clerk 공식 문서 - Custom Redirects](https://clerk.com/docs/guides/custom-redirects)
