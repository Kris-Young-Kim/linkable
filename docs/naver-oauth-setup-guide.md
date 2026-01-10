# 네이버 OAuth 설정 가이드

이 문서는 Clerk를 사용한 네이버 로그인 설정 방법을 안내합니다.

## 오류 상황

**오류 메시지**:

- `Production Keys are only allowed for domain "linkable.life"` (localhost에서 프로덕션 키 사용)
- `400 Bad Request` (네이버 OAuth 리다이렉트 URI 불일치)
- `You did not grant access to your Naver account` (네이버 계정 접근 권한 부여 실패)
- `Unable to log in to Linkable` (네이버 로그인 페이지에서 표시)
- `500 Internal Server Error` 또는 "페이지를 찾을 수 없습니다" (네이버 OAuth 동의 확인 페이지 오류)

**원인**:

1. 개발 환경(localhost)에서 프로덕션 Clerk 키를 사용하고 있음
2. 네이버 개발자 콘솔에 등록된 리다이렉트 URI가 Clerk의 실제 리다이렉트 URI와 일치하지 않음
3. 네이버 개발자 센터의 동의 항목이 올바르게 설정되지 않음
4. 네이버 개발자 센터의 서비스 URL이 등록되지 않음
5. 네이버 OAuth 동의 확인 페이지에서 서버 오류 발생 (500 Internal Server Error)

## 1. 개발 환경 설정 (localhost용)

### 1.1 개발용 Clerk 키 확인

**중요**: 로컬 개발 환경에서는 **테스트 키(Test Keys)**를 사용해야 합니다.

1. **Clerk 대시보드 접속**:

   - https://dashboard.clerk.com
   - 프로젝트 선택

2. **API Keys 확인**:

   - Settings → API Keys
   - **Test Keys** 섹션 확인
   - `pk_test_...` 형식의 키를 사용해야 함

3. **환경변수 설정** (`.env.local`):

   ```bash
   # 개발 환경용 테스트 키 사용
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # 개발 환경에서는 Frontend API를 명시적으로 설정하지 않거나
   # 테스트 환경의 Frontend API를 사용
   # NEXT_PUBLIC_CLERK_FRONTEND_API=your-app.clerk.accounts.dev
   ```

### 1.2 프로덕션 키 vs 테스트 키

- **프로덕션 키** (`pk_live_...`, `sk_live_...`):

  - 프로덕션 도메인(`linkable.life`)에서만 사용 가능
  - localhost에서 사용 시 오류 발생

- **테스트 키** (`pk_test_...`, `sk_test_...`):
  - 개발 환경(localhost)에서 사용 가능
  - 프로덕션 배포 전에는 테스트 키 사용 권장

## 2. Clerk 대시보드 설정

### 2.0 프로덕션 환경: 디버그 URI 제거 (중요)

**프로덕션 환경에서는 반드시 디버그 URI를 제거해야 합니다.**

#### 단계별 제거 방법:

1. **Clerk 대시보드 접속**:

   - https://dashboard.clerk.com
   - 프로덕션 프로젝트 선택

2. **네이버 OAuth 설정 페이지로 이동**:

   - User & Authentication → Social Connections
   - **Naver** 클릭 (또는 설정 아이콘 클릭)

3. **디버그 URI 필드 확인**:

   - "Authorized redirect URL (only for debug)" 또는 "Debug redirect URL" 필드 찾기
   - 현재 설정된 값 확인

4. **디버그 URI 제거 (중요: 읽기 전용 필드)**:

   ⚠️ **중요**: `https://dapi.clerk.com/v1/oauth_debug/callback`가 설정되어 있다면 반드시 제거해야 합니다.

   **실제 UI 상황**:

   - "Authorized redirect URL (only for debug)" 필드는 **읽기 전용 필드**입니다
   - 필드 옆에는 **복사(Copy) 버튼만** 있습니다
   - 필드를 클릭해도 편집할 수 없습니다

   **해결 방법**:

   ⚠️ **중요**: 읽기 전용 필드이므로, 이 필드 자체를 제거할 수 없습니다.
   하지만 **실제로 중요한 것은 네이버 개발자 센터의 Callback URL 설정**입니다.

   **방법 1: 네이버 개발자 센터에서만 제거 (가장 중요)** ⭐:

   Clerk 대시보드의 읽기 전용 디버그 URI 필드는 단순히 정보를 표시하는 것입니다.
   실제로 중요한 것은 네이버 개발자 센터의 Callback URL 설정입니다:

   1. 네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인
   2. Callback URL 목록 확인
   3. `https://dapi.clerk.com/v1/oauth_debug/callback`가 있다면 **제거**
   4. 올바른 프로덕션 URI만 남기기: `https://clerk.linkable.life/v1/oauth_callback`
   5. 저장

   ⚠️ **핵심**: Clerk 대시보드의 읽기 전용 디버그 URI 필드는 무시해도 됩니다.
   네이버 개발자 센터에서 디버그 URI를 제거하면 문제가 해결됩니다.

   **방법 2: Clerk 지원팀에 문의 (필요한 경우)**:

   만약 이 디버그 URI가 계속 문제를 일으킨다면:

   - Clerk 지원팀에 문의: https://clerk.com/support
   - 프로덕션 환경에서 디버그 URI 비활성화 요청

   **확인 방법**:

   - 네이버 개발자 센터의 Callback URL 목록에 디버그 URI가 없는지 확인
   - 프로덕션 URI만 등록되어 있는지 확인
   - ⚠️ **주의**: Clerk 대시보드의 읽기 전용 필드는 무시해도 됩니다

5. **올바른 프로덕션 리다이렉트 URI 확인**:

   - Settings → API Keys → Frontend API URL 확인
   - 프로덕션 도메인 확인 (예: `clerk.linkable.life`)
   - 올바른 URI 형식: `https://clerk.linkable.life/v1/oauth_callback`
   - 이 URI는 네이버 개발자 센터에도 등록되어 있어야 함

6. **설정 저장**:
   - 변경사항 저장
   - 저장 후 즉시 적용됨

#### 프로덕션 환경 체크리스트:

- [ ] **네이버 개발자 센터에서 디버그 URI 제거됨** ⭐ (가장 중요)
  - 네이버 개발자 센터 → API 설정 → 네이버 로그인 → Callback URL 확인
  - Callback URL 목록에서 `https://dapi.clerk.com/v1/oauth_debug/callback` 제거 확인
  - ⚠️ **참고**: Clerk 대시보드의 읽기 전용 디버그 URI 필드는 무시해도 됩니다
- [ ] **프로덕션 리다이렉트 URI가 올바르게 설정됨**
  - Settings → API Keys → Frontend API URL 확인
  - 올바른 URI: `https://clerk.linkable.life/v1/oauth_callback` (또는 프로덕션 도메인)
- [ ] **네이버 개발자 센터에 프로덕션 URI만 등록됨**
  - 네이버 개발자 센터 → API 설정 → 네이버 로그인 → Callback URL 확인
  - 프로덕션 URI만 등록되어 있는지 확인
  - 디버그 URI는 목록에 없어야 함

### 2.1 네이버 OAuth 제공자 활성화

1. **Clerk 대시보드 접속**:

   - https://dashboard.clerk.com
   - 프로젝트 선택

2. **Social Connections 설정**:

   - User & Authentication → Social Connections
   - **Naver** 찾기
   - **Enable** 클릭

3. **네이버 앱 정보 입력**:

   - **Client ID**: 네이버 Client ID (네이버 개발자 센터에서 확인)
   - **Client Secret**: 네이버 Client Secret (네이버 개발자 센터에서 확인)

4. **리다이렉트 URI 설정 (중요)**:

   ⚠️ **디버그 URI 제거 필수**:

   - Clerk 대시보드의 네이버 설정에서 "Authorized redirect URL (only for debug)" 필드 확인
   - 만약 `https://dapi.clerk.com/v1/oauth_debug/callback`가 설정되어 있다면:
     1. 해당 필드를 **비우거나 삭제**
     2. 또는 올바른 리다이렉트 URI로 변경

   ✅ **올바른 리다이렉트 URI 설정**:

   - 형식: `https://[your-clerk-domain]/v1/oauth_callback`
   - 예시: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
   - 또는 프록시 도메인 사용 시: `https://clerk.linkable.life/v1/oauth_callback`
   - **이 URI를 복사하여 네이버 개발자 센터에도 등록해야 함**

   📝 **Clerk 대시보드에서 리다이렉트 URI 확인 방법**:

   - Settings → API Keys → Frontend API URL 확인
   - 또는 User & Authentication → Social Connections → Naver → 리다이렉트 URI 확인
   - 확인한 URI를 네이버 개발자 센터의 Callback URL에 정확히 등록

## 3. 네이버 개발자 센터 설정

### 3.1 네이버 앱 생성 및 설정

1. **네이버 개발자 센터 접속**:

   - https://developers.naver.com
   - 로그인

2. **내 애플리케이션 선택**:

   - 기존 앱이 있으면 선택, 없으면 "애플리케이션 등록" 클릭
   - 앱 이름: "LinkAble" (또는 원하는 이름)
   - 사용 API: **네이버 로그인** 선택

3. **서비스 환경 설정**:

   - **서비스 URL**: `https://www.linkable.life` (프로덕션)
   - **서비스 URL**: `http://localhost:3000` (개발 환경, 선택사항)

4. **네이버 로그인 활성화**:

   - 내 애플리케이션 선택 후 → **API 설정** 탭 클릭
   - **네이버 로그인** 섹션에서 다음 설정 확인:

   **서비스 URL** (필수):

   - 프로덕션: `https://www.linkable.life` 또는 `https://linkable.life`
   - 개발 환경: `http://localhost:3000` (선택사항)
   - ⚠️ **중요**: 서비스 URL이 등록되지 않으면 "Unable to log in" 오류 발생

   **Callback URL** 등록:

   ```
   https://[your-clerk-domain]/v1/oauth_callback
   ```

   - 예시: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
   - 또는: `https://clerk.linkable.life/v1/oauth_callback`
   - **중요**: Clerk 대시보드에서 확인한 정확한 URI를 입력해야 함
   - **주의**: `https://dapi.clerk.com/v1/oauth_debug/callback` 같은 디버그 URI는 사용하지 않음
   - 여러 URL 등록 가능 (개발/프로덕션 환경별로)

5. **앱 키 확인**:
   - **Client ID**: Clerk 대시보드의 Client ID에 입력
   - **Client Secret**: Clerk 대시보드의 Client Secret에 입력

### 3.2 동의 항목 설정 (중요)

⚠️ **"You did not grant access to your Naver account" 오류 해결**:

이 오류는 네이버 개발자 센터의 동의 항목 설정이 올바르지 않을 때 발생합니다.

1. **네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인 → 동의항목**:

   **필수 동의 항목 설정**:

   - ✅ **이름 (필수)**: 반드시 활성화되어 있어야 함
   - ✅ **이메일 (필수 또는 선택)**: 권장 (Clerk에서 사용자 식별에 필요)
   - ✅ **프로필 사진 (선택)**: 선택사항이지만 권장

   **동의 화면 설정**:

   - 동의 화면에 표시될 앱 이름 확인
   - 동의 화면에 표시될 서비스 약관 URL 확인 (필요한 경우)
   - 사용자가 동의 화면에서 "동의" 버튼을 클릭할 수 있도록 설정

2. **동의 항목 활성화 확인**:

   - 각 동의 항목이 **"활성화"** 상태인지 확인
   - 동의 항목이 비활성화되어 있으면 사용자가 권한을 부여할 수 없음

3. **테스트**:
   - 네이버 개발자 센터에서 설정 저장
   - 브라우저 캐시 및 쿠키 삭제
   - 시크릿 모드에서 다시 테스트
   - 네이버 로그인 시 동의 화면이 올바르게 표시되는지 확인

## 4. 설정 확인 체크리스트

### Clerk 대시보드

- [ ] Naver Social Connection이 **Enabled** 상태
- [ ] Client ID가 네이버 Client ID와 일치
- [ ] Client Secret이 네이버 Client Secret과 일치
- [ ] 리다이렉트 URI 확인 및 복사
- [ ] 개발 환경에서는 **Test Keys** 사용 중

### 네이버 개발자 센터

- [ ] 네이버 로그인 API 활성화
- [ ] **서비스 URL 필수 등록**: `https://www.linkable.life` (프로덕션)
- [ ] **서비스 URL 선택 등록**: `http://localhost:3000` (개발 환경)
- [ ] Callback URL에 Clerk 리다이렉트 URI 정확히 등록
- [ ] **주의**: `https://dapi.clerk.com/v1/oauth_debug/callback` 같은 디버그 URI는 제거
- [ ] **동의 항목 설정 확인** (중요):
  - 이름 (필수) 활성화됨
  - 이메일 (필수 또는 선택) 활성화됨 (권장)
  - 프로필 사진 (선택) 활성화됨 (권장)
- [ ] Client ID 확인
- [ ] Client Secret 확인
- [ ] 모든 설정 저장 완료

### 환경변수 설정

- [ ] 개발 환경: `.env.local`에 테스트 키 설정
  ```bash
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
- [ ] 프로덕션 환경: Vercel 환경변수에 프로덕션 키 설정
  ```bash
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
  CLERK_SECRET_KEY=sk_live_...
  ```

## 5. 프로덕션 환경 전용 가이드

### 5.1 프로덕션에서 디버그 URI 제거

**프로덕션 환경에서는 디버그 URI를 반드시 제거해야 합니다.**

#### 문제점:

- 디버그 URI(`https://dapi.clerk.com/v1/oauth_debug/callback`)는 개발/디버깅 전용
- 프로덕션에서 사용 시 보안 문제 및 OAuth 오류 발생 가능
- 네이버 로그인 실패 원인

#### 해결 방법:

**Clerk 대시보드에서 제거 (구체적인 방법)**:

1. https://dashboard.clerk.com 접속
2. 프로덕션 프로젝트 선택
3. User & Authentication → Social Connections → Naver 클릭
4. "Authorized redirect URL (only for debug)" 필드 찾기
5. **디버그 URI 삭제 방법**:

   **실제 UI 상황 (읽기 전용 필드)**:

   ⚠️ **중요**: "Authorized redirect URL (only for debug)" 필드는 **읽기 전용 필드**입니다.

   - 필드를 클릭해도 편집할 수 없습니다
   - 필드 옆에는 **복사(Copy) 버튼만** 있습니다
   - 텍스트를 선택하거나 삭제할 수 없습니다

   **해결 방법**:

   **방법 1: 네이버 개발자 센터에서만 제거 (가장 중요)** ⭐:

   Clerk 대시보드의 읽기 전용 필드는 실제로 문제가 되지 않습니다.
   **중요한 것은 네이버 개발자 센터의 Callback URL 설정**입니다:

   - 네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인
   - Callback URL 목록에서 `https://dapi.clerk.com/v1/oauth_debug/callback` 제거
   - 올바른 프로덕션 URI만 남기기: `https://clerk.linkable.life/v1/oauth_callback`
   - 저장

   ⚠️ **핵심**: Clerk 대시보드의 읽기 전용 디버그 URI 필드는 무시해도 됩니다.
   네이버 개발자 센터에서 디버그 URI를 제거하면 문제가 해결됩니다.

   **방법 2: Clerk 지원팀에 문의 (필요한 경우)**:

   만약 이 디버그 URI가 계속 문제를 일으킨다면:

   - Clerk 지원팀에 문의: https://clerk.com/support
   - 프로덕션 환경에서 디버그 URI 비활성화 요청

**네이버 개발자 센터에서도 제거 (구체적인 방법)**:

1. https://developers.naver.com 접속
2. 내 애플리케이션 선택
3. **API 설정** 탭 클릭
4. **네이버 로그인** 섹션으로 이동
5. **Callback URL** 목록 확인
6. **디버그 URI 제거 방법**:

   - Callback URL 목록에서 `https://dapi.clerk.com/v1/oauth_debug/callback` 찾기
   - 해당 URI 옆의 **"삭제"** 또는 **"X"** 버튼 클릭
   - 또는 URI를 선택한 후 **"제거"** 버튼 클릭
   - 확인 대화상자에서 **"삭제"** 또는 **"확인"** 클릭

7. **올바른 프로덕션 URI만 남기기**:
   - `https://clerk.linkable.life/v1/oauth_callback` (또는 프로덕션 도메인)
   - 이 URI만 목록에 남아있는지 확인
8. **저장 버튼 클릭** (변경사항 저장)
9. **재확인**: 저장 후 Callback URL 목록을 다시 확인하여 디버그 URI가 제거되었는지 확인

### 5.2 프로덕션 환경변수 확인

프로덕션 환경(Vercel 등)에서 환경변수 확인:

```bash
# 프로덕션 환경변수 (Vercel Dashboard → Settings → Environment Variables)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # 프로덕션 키
CLERK_SECRET_KEY=sk_live_...  # 프로덕션 키
NEXT_PUBLIC_CLERK_FRONTEND_API=clerk.linkable.life  # 프로덕션 도메인
```

⚠️ **주의**: 프로덕션에서는 `pk_live_...` 형식의 키를 사용해야 합니다.

## 6. 일반적인 오류 및 해결 방법

### 오류: "Production Keys are only allowed for domain 'linkable.life'"

**원인**: localhost에서 프로덕션 Clerk 키를 사용하고 있음

**해결 방법**:

1. Clerk 대시보드에서 **Test Keys** 확인
2. `.env.local` 파일에 테스트 키 설정
3. 개발 서버 재시작 (`pnpm dev`)

### 오류: "등록하지 않은 리다이렉트 URI입니다"

**원인**: 네이버 개발자 센터에 등록된 Callback URL과 Clerk에서 사용하는 URI가 일치하지 않음

**해결 방법**:

1. Clerk 대시보드에서 정확한 리다이렉트 URI 확인
   - 형식: `https://[your-clerk-domain]/v1/oauth_callback`
   - 예: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
2. 네이버 개발자 센터의 Callback URL 목록 확인
3. 정확히 일치하는지 확인 (대소문자, 슬래시, 프로토콜 포함)
4. 일치하지 않으면 네이버 개발자 센터에 정확한 URI 추가
5. **주의**: `https://dapi.clerk.com/v1/oauth_debug/callback` 같은 디버그 URI는 제거

### 오류: "Invalid client_id"

**원인**: Clerk 대시보드에 입력된 Client ID가 네이버 Client ID와 일치하지 않음

**해결 방법**:

1. 네이버 개발자 센터에서 Client ID 확인
2. Clerk 대시보드의 Client ID와 비교
3. 일치하지 않으면 Clerk 대시보드에서 수정

### 오류: "Invalid client_secret"

**원인**: Clerk 대시보드에 입력된 Client Secret이 네이버 Client Secret과 일치하지 않음

**해결 방법**:

1. 네이버 개발자 센터에서 Client Secret 확인
2. Clerk 대시보드의 Client Secret과 비교
3. 일치하지 않으면 Clerk 대시보드에서 수정

### 오류: "OAuth 2.0 Parameter: client_id" 또는 "You did not grant access to your Naver account" (client_id 오류 포함)

**오류 메시지**:

- `error=access_denied&error_description=OAuth%202.0%20Parameter%3A%20client_id`
- `You did not grant access to your Naver account`

**원인**:

1. Clerk 대시보드에 입력된 Client ID가 네이버 개발자 센터의 Client ID와 일치하지 않음
2. 네이버 개발자 센터의 Client ID가 올바르지 않거나 변경됨
3. 네이버 OAuth 동의 화면에서 사용자가 권한을 부여하지 않았거나, 네이버 개발자 센터의 동의 항목 설정이 올바르지 않음
4. 네이버 개발자 센터의 서비스 URL이 등록되지 않음

**해결 방법**:

#### Step 1: Client ID 확인 및 수정 (가장 중요) ⭐

1. **네이버 개발자 센터에서 Client ID 확인**:

   - https://developers.naver.com 접속
   - 내 애플리케이션 선택 → API 설정 → 네이버 로그인
   - **Client ID** 복사 (예: `PUa5ZtvLfFCMjiY7ni4e`)

2. **Clerk 대시보드에서 Client ID 확인 및 수정**:

   - https://dashboard.clerk.com 접속
   - User & Authentication → Social Connections → Naver 클릭
   - **Client ID** 필드 확인
   - 네이버 개발자 센터의 Client ID와 **정확히 일치하는지** 확인
   - 일치하지 않으면 네이버 개발자 센터의 Client ID로 **정확히 수정**
   - ⚠️ **주의**: 공백, 대소문자, 특수문자까지 정확히 일치해야 함

3. **Client Secret도 함께 확인**:

   - 네이버 개발자 센터에서 **Client Secret** 확인
   - Clerk 대시보드의 **Client Secret**과 비교
   - 일치하지 않으면 수정

4. **설정 저장**:
   - Clerk 대시보드에서 변경사항 저장
   - 저장 후 즉시 적용됨

#### Step 2: 네이버 개발자 센터 설정 확인

1. **서비스 URL 확인 (필수)**:

   - 네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인
   - **서비스 URL**이 등록되어 있는지 확인
   - 프로덕션: `https://www.linkable.life` 또는 `https://linkable.life`
   - ⚠️ **중요**: 서비스 URL이 등록되지 않으면 OAuth 오류 발생

2. **Callback URL 확인**:
   - Callback URL 목록 확인
   - `https://clerk.linkable.life/v1/oauth_callback` (프로덕션)이 정확히 등록되어 있는지 확인
   - 대소문자, 슬래시, 프로토콜까지 정확히 일치해야 함

#### Step 3: 네이버 개발자 센터 - 동의 항목 활성화

1. **네이버 개발자 센터 접속**: https://developers.naver.com
2. **내 애플리케이션 선택**: LinkAble 앱 선택
3. **API 설정 탭 클릭**
4. **네이버 로그인 섹션으로 이동**
5. **동의항목 클릭**
6. **필수 동의 항목 활성화**:
   - **이름 (필수)**: ✅ **반드시 활성화**되어 있어야 함
     - 상태가 "비활성화"라면 "활성화"로 변경
   - **이메일 (필수 또는 선택)**: ✅ **활성화 권장**
     - Clerk에서 사용자 식별에 필요
     - 상태가 "비활성화"라면 "활성화"로 변경
   - **프로필 사진 (선택)**: 선택사항이지만 권장
7. **설정 저장**

#### Step 4: 동의 화면에서 권한 부여 확인

⚠️ **중요**: 이 오류는 사용자가 네이버 동의 화면에서 **"동의"** 버튼을 클릭하지 않았을 때도 발생합니다.

1. **네이버 로그인 버튼 클릭**
2. **네이버 동의 화면 확인**:
   - 동의 화면이 올바르게 표시되는지 확인
   - **"동의"** 버튼이 보이는지 확인
3. **⚠️ 반드시 "동의" 버튼 클릭**:
   - **"동의"** 또는 **"허용"** 버튼을 클릭해야 함
   - **"취소"** 또는 **"거부"**를 클릭하면 이 오류 발생
4. **동의 후 리다이렉트 확인**:
   - 동의 후 LinkAble로 정상적으로 리다이렉트되는지 확인

#### Step 5: 추가 확인 사항

- 네이버 계정이 정상적으로 로그인되어 있는지 확인
- 네이버 앱이 정상적으로 승인되어 있는지 확인 (네이버 개발자 센터에서)
- 서비스 URL이 올바르게 등록되어 있는지 확인 (`https://www.linkable.life`)
- Callback URL이 올바르게 등록되어 있는지 확인
- 브라우저 캐시 및 쿠키 삭제 후 다시 시도
- 시크릿 모드에서 다시 테스트

**체크리스트**:

- [ ] **네이버 개발자 센터의 Client ID = Clerk 대시보드의 Client ID** (정확히 일치) ⭐
- [ ] **네이버 개발자 센터의 Client Secret = Clerk 대시보드의 Client Secret** (정확히 일치)
- [ ] 네이버 개발자 센터에 서비스 URL 등록됨 (`https://www.linkable.life`)
- [ ] 네이버 개발자 센터에 Callback URL 정확히 등록됨
- [ ] 동의 항목 (이름, 이메일) 활성화됨
- [ ] 네이버 로그인 API 활성화됨
- [ ] Clerk 대시보드에서 설정 저장 완료
- [ ] 네이버 개발자 센터에서 설정 저장 완료

### 오류: "You did not grant access to your Naver account" (일반적인 경우)

**원인**: 네이버 OAuth 동의 화면에서 사용자가 권한을 부여하지 않았거나, 네이버 개발자 센터의 동의 항목 설정이 올바르지 않음

**해결 방법**:

#### Step 1: 네이버 개발자 센터 - 동의 항목 활성화

1. **네이버 개발자 센터 접속**: https://developers.naver.com
2. **내 애플리케이션 선택**: LinkAble 앱 선택
3. **API 설정 탭 클릭**
4. **네이버 로그인 섹션으로 이동**
5. **동의항목 클릭**
6. **필수 동의 항목 활성화**:
   - **이름 (필수)**: ✅ **반드시 활성화**되어 있어야 함
     - 상태가 "비활성화"라면 "활성화"로 변경
   - **이메일 (필수 또는 선택)**: ✅ **활성화 권장**
     - Clerk에서 사용자 식별에 필요
     - 상태가 "비활성화"라면 "활성화"로 변경
   - **프로필 사진 (선택)**: 선택사항이지만 권장
7. **설정 저장**

#### Step 2: 동의 화면에서 권한 부여 확인

⚠️ **중요**: 이 오류는 사용자가 네이버 동의 화면에서 **"동의"** 버튼을 클릭하지 않았을 때 발생합니다.

1. **네이버 로그인 버튼 클릭**
2. **네이버 동의 화면 확인**:
   - 동의 화면이 올바르게 표시되는지 확인
   - **"동의"** 버튼이 보이는지 확인
3. **⚠️ 반드시 "동의" 버튼 클릭**:
   - **"동의"** 또는 **"허용"** 버튼을 클릭해야 함
   - **"취소"** 또는 **"거부"**를 클릭하면 이 오류 발생
4. **동의 후 리다이렉트 확인**:
   - 동의 후 LinkAble로 정상적으로 리다이렉트되는지 확인

#### Step 3: 추가 확인 사항

- 네이버 계정이 정상적으로 로그인되어 있는지 확인
- 네이버 앱이 정상적으로 승인되어 있는지 확인 (네이버 개발자 센터에서)
- 서비스 URL이 올바르게 등록되어 있는지 확인 (`https://www.linkable.life`)
- Callback URL이 올바르게 등록되어 있는지 확인
- 브라우저 캐시 및 쿠키 삭제 후 다시 시도

### 오류: "페이지를 찾을 수 없습니다" 또는 500 Internal Server Error

**오류 메시지**:

- `GET https://nid.naver.com/oauth2/consent/confirm?... 500 (Internal Server Error)`
- "페이지를 찾을 수 없습니다"

**원인**: 네이버 OAuth 동의 확인 페이지에서 서버 오류가 발생. 다음 중 하나 이상의 문제가 있을 수 있습니다:

1. 네이버 개발자 센터의 Callback URL이 올바르게 등록되지 않음
2. 네이버 개발자 센터의 서비스 URL이 올바르게 등록되지 않음
3. 네이버 앱이 정상적으로 승인되지 않음
4. 네이버 개발자 센터의 동의 항목 설정 문제
5. 네이버 서버 측 일시적 오류

**해결 방법**:

#### Step 1: 네이버 개발자 센터 설정 확인

1. **네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인**:

   **서비스 URL 확인** (필수):

   - 프로덕션: `https://www.linkable.life` 또는 `https://linkable.life`
   - ⚠️ **중요**: 서비스 URL이 등록되지 않으면 500 오류 발생 가능
   - 서비스 URL이 정확히 등록되어 있는지 확인

   **Callback URL 확인** (필수):

   - `https://clerk.linkable.life/v1/oauth_callback` (프로덕션)
   - 또는 `https://your-app.clerk.accounts.dev/v1/oauth_callback`
   - ⚠️ **중요**: Callback URL이 정확히 등록되어 있어야 함
   - 대소문자, 슬래시, 프로토콜까지 정확히 일치해야 함
   - 디버그 URI(`https://dapi.clerk.com/v1/oauth_debug/callback`)는 제거

2. **동의 항목 확인**:

   - 이름 (필수): 활성화되어 있어야 함
   - 이메일 (필수 또는 선택): 활성화 권장
   - 각 동의 항목이 "활성화" 상태인지 확인

3. **앱 상태 확인**:
   - 네이버 앱이 정상적으로 승인되어 있는지 확인
   - 앱이 "서비스 중" 상태인지 확인

#### Step 2: Clerk 대시보드 설정 확인

1. **Clerk 대시보드 → User & Authentication → Social Connections → Naver**:
   - Naver가 **Enabled** 상태인지 확인
   - **Client ID**가 네이버 개발자 센터의 Client ID와 정확히 일치하는지 확인
   - **Client Secret**이 네이버 개발자 센터의 Client Secret과 정확히 일치하는지 확인

#### Step 3: 재시도 및 테스트

1. **네이버 개발자 센터에서 설정 저장**
2. **Clerk 대시보드에서 설정 저장**
3. **브라우저 캐시 및 쿠키 삭제**
4. **시크릿 모드에서 다시 테스트**
5. **잠시 후 재시도** (네이버 서버 측 일시적 오류일 수 있음)

#### Step 4: 네이버 고객센터 문의 (필요한 경우)

만약 위 방법으로 해결되지 않는다면:

- 네이버 개발자 센터 고객센터에 문의
- 오류 메시지와 함께 문의 (500 Internal Server Error)
- 네이버 앱 ID와 함께 문의

### 오류: "Unable to log in to Linkable" (네이버 로그인 페이지에서 표시)

**원인**: 네이버 개발자 센터 설정이 올바르지 않음. 다음 중 하나 이상의 문제가 있을 수 있습니다:

1. 서비스 URL이 등록되지 않았거나 잘못 등록됨
2. Callback URL이 정확히 일치하지 않음
3. Client ID/Secret이 잘못 입력됨
4. 네이버 로그인 API가 활성화되지 않음

**해결 방법**:

1. **네이버 개발자 센터 → 내 애플리케이션 → API 설정 확인**:

   - **서비스 URL** 필수 등록:
     - 프로덕션: `https://www.linkable.life` 또는 `https://linkable.life`
     - 개발 환경: `http://localhost:3000` (선택사항)
   - **Callback URL** 정확히 등록:
     - `https://[your-clerk-domain]/v1/oauth_callback`
     - 예: `https://clerk.linkable.life/v1/oauth_callback`
     - 또는: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
     - ⚠️ **주의**: `https://dapi.clerk.com/v1/oauth_debug/callback` 같은 디버그 URI는 제거

2. **Clerk 대시보드 → User & Authentication → Social Connections → Naver 확인**:

   - Naver가 **Enabled** 상태인지 확인
   - **Client ID**가 네이버 개발자 센터의 Client ID와 정확히 일치하는지 확인
   - **Client Secret**이 네이버 개발자 센터의 Client Secret과 정확히 일치하는지 확인
   - **리다이렉트 URI 확인 및 수정**:
     - "Authorized redirect URL (only for debug)" 필드 확인
     - ❌ `https://dapi.clerk.com/v1/oauth_debug/callback`가 설정되어 있다면 **삭제 또는 비우기**
     - ✅ 올바른 리다이렉트 URI 확인:
       - Settings → API Keys → Frontend API URL 확인
       - 올바른 URI: `https://[your-clerk-domain]/v1/oauth_callback`
       - 예: `https://clerk.linkable.life/v1/oauth_callback`
     - 설정 저장

3. **네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인**:

   - **네이버 로그인** API가 활성화되어 있는지 확인
   - **서비스 URL**이 올바르게 등록되어 있는지 확인
   - **Callback URL**이 Clerk 리다이렉트 URI와 정확히 일치하는지 확인
   - 대소문자, 슬래시, 프로토콜까지 정확히 일치해야 함

4. **환경변수 확인**:

   ```bash
   # .env.local 파일 확인
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # 개발 환경
   CLERK_SECRET_KEY=sk_test_...  # 개발 환경
   NEXT_PUBLIC_CLERK_FRONTEND_API=your-app.clerk.accounts.dev  # 선택사항
   ```

5. **설정 저장 후 테스트**:
   - 네이버 개발자 센터에서 설정 저장
   - Clerk 대시보드에서 설정 저장
   - 브라우저 캐시 및 쿠키 삭제
   - 개발 서버 재시작 (`pnpm dev`)
   - 시크릿 모드에서 다시 테스트

**체크리스트**:

- [ ] 네이버 개발자 센터에 서비스 URL 등록됨 (`https://www.linkable.life`)
- [ ] 네이버 개발자 센터에 Callback URL 정확히 등록됨
- [ ] Clerk 대시보드의 Client ID = 네이버 개발자 센터의 Client ID
- [ ] Clerk 대시보드의 Client Secret = 네이버 개발자 센터의 Client Secret
- [ ] 네이버 로그인 API 활성화됨
- [ ] 디버그 URI 제거됨

## 7. 현재 프로젝트 설정 확인

### Clerk Frontend API URL 확인

```bash
# 설정 확인 스크립트 실행
pnpm check:clerk
```

현재 설정된 Frontend API URL을 확인하고, 네이버 개발자 센터에 해당 리다이렉트 URI를 등록해야 합니다.

### 예시 리다이렉트 URI

프로덕션 환경 (`NEXT_PUBLIC_CLERK_FRONTEND_API=https://clerk.linkable.life`) 기준:

```
https://clerk.linkable.life/v1/oauth_callback
```

개발 환경 (기본 Clerk 도메인 사용) 기준:

```
https://your-app.clerk.accounts.dev/v1/oauth_callback
```

이 URI를 네이버 개발자 센터의 "Callback URL"에 추가해야 합니다.

## 8. 단계별 해결 가이드

### Step 1: 개발 환경 키 확인 및 설정

1. Clerk 대시보드 → Settings → API Keys
2. **Test Keys** 섹션에서 키 복사
3. `.env.local` 파일 생성/수정:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
4. 개발 서버 재시작

### Step 2: Clerk 네이버 OAuth 설정 확인 및 디버그 URI 제거

1. Clerk 대시보드 → User & Authentication → Social Connections
2. Naver가 **Enabled** 상태인지 확인
3. Client ID와 Client Secret이 올바르게 입력되어 있는지 확인
4. **리다이렉트 URI 확인 및 수정**:
   - "Authorized redirect URL (only for debug)" 필드 확인
   - 만약 `https://dapi.clerk.com/v1/oauth_debug/callback`가 설정되어 있다면:
     - ❌ **삭제하거나 비우기** (디버그 URI는 프로덕션에서 사용하지 않음)
   - 올바른 리다이렉트 URI 확인:
     - Settings → API Keys → Frontend API URL 확인
     - 올바른 URI 형식: `https://[your-clerk-domain]/v1/oauth_callback`
     - 예: `https://clerk.linkable.life/v1/oauth_callback`
     - 또는: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
5. 설정 저장

### Step 3: 네이버 개발자 센터 Callback URL 수정

1. 네이버 개발자 센터 → 내 애플리케이션
2. 해당 앱 선택 → API 설정 → 네이버 로그인
3. **Callback URL** 섹션 확인
4. 잘못된 URI 제거:
   - ❌ `https://dapi.clerk.com/v1/oauth_debug/callback`
5. 올바른 URI 추가:
   - ✅ `https://[your-clerk-domain]/v1/oauth_callback`
   - 예: `https://clerk.linkable.life/v1/oauth_callback`
   - 또는: `https://your-app.clerk.accounts.dev/v1/oauth_callback`
6. 저장

### Step 4: 테스트

1. 브라우저 캐시 및 쿠키 삭제
2. 시크릿 모드에서 테스트
3. 로그인 페이지 접속: `http://localhost:3000/sign-in`
4. 네이버 로그인 버튼 클릭
5. 네이버 로그인 진행
6. 리다이렉트 확인

## 9. 참고 자료

- [Clerk 공식 문서 - Social Connections](https://clerk.com/docs/authentication/social-connections)
- [네이버 개발자 센터 - 네이버 로그인](https://developers.naver.com/docs/login/overview/)
- [Clerk 공식 문서 - Environment Variables](https://clerk.com/docs/quickstarts/nextjs#environment-variables)
