# 네이버 OAuth 오류 해결 체크리스트

## 현재 오류
**"You did not grant access to your Naver account"**

이 오류는 네이버 로그인 과정에서 권한 부여가 실패했을 때 발생합니다.

---

## ✅ 단계별 확인 체크리스트

### 1단계: Clerk 대시보드 설정 확인 (가장 중요) ⭐

#### 1.1 Clerk 대시보드 접속
- [ ] https://dashboard.clerk.com 접속
- [ ] 프로덕션 프로젝트 선택 (linkable.life)

#### 1.2 네이버 OAuth 설정 확인
- [ ] User & Authentication → Social Connections → **Naver** 클릭
- [ ] Naver가 **Enabled** 상태인지 확인
- [ ] **Client ID** 필드 확인 (예: `PUa5ZtvLfFCMjiY7ni4e`)
- [ ] **Client Secret** 필드 확인

#### 1.3 Frontend API URL 확인
- [ ] Settings → API Keys → **Frontend API URL** 확인
- [ ] 현재 설정: `https://clerk.linkable.life` 또는 `clerk.linkable.life`
- [ ] 이 URL을 메모해두세요 (네이버 개발자 센터에 등록해야 함)

---

### 2단계: 네이버 개발자 센터 설정 확인 ⭐

#### 2.1 네이버 개발자 센터 접속
- [ ] https://developers.naver.com 접속
- [ ] 로그인
- [ ] **내 애플리케이션** 선택 (LinkAble 앱)

#### 2.2 API 설정 확인
- [ ] **API 설정** 탭 클릭
- [ ] **네이버 로그인** 섹션으로 이동

#### 2.3 서비스 URL 확인 (필수) ⚠️
- [ ] **서비스 URL** 필드 확인
- [ ] 다음 중 하나가 등록되어 있는지 확인:
  - `https://www.linkable.life`
  - `https://linkable.life`
- [ ] 등록되어 있지 않으면 **반드시 추가**
- [ ] 저장 버튼 클릭

#### 2.4 Callback URL 확인 (필수) ⚠️
- [ ] **Callback URL** 목록 확인
- [ ] 다음 URL이 **정확히** 등록되어 있는지 확인:
  - `https://clerk.linkable.life/v1/oauth_callback`
- [ ] ⚠️ **주의사항**:
  - 대소문자 정확히 일치해야 함
  - 슬래시(`/`) 정확히 일치해야 함
  - 프로토콜(`https://`) 정확히 일치해야 함
- [ ] ❌ 다음 URL이 있다면 **제거**:
  - `https://dapi.clerk.com/v1/oauth_debug/callback` (디버그 URI)
- [ ] 등록되어 있지 않으면 **추가**
- [ ] 저장 버튼 클릭

#### 2.5 Client ID 및 Client Secret 확인
- [ ] **Client ID** 확인 (예: `PUa5ZtvLfFCMjiY7ni4e`)
- [ ] **Client Secret** 확인
- [ ] 이 값들을 메모해두세요

#### 2.6 Client ID 일치 확인 (가장 중요) ⭐⭐⭐
- [ ] 네이버 개발자 센터의 **Client ID** 복사
- [ ] Clerk 대시보드의 **Client ID**와 비교
- [ ] **정확히 일치하는지** 확인:
  - 공백 없이 일치해야 함
  - 대소문자 정확히 일치해야 함
  - 특수문자 정확히 일치해야 함
- [ ] ❌ 일치하지 않으면:
  1. Clerk 대시보드 → Naver 설정
  2. Client ID를 네이버 개발자 센터의 값으로 **정확히 수정**
  3. 저장

#### 2.7 Client Secret 일치 확인
- [ ] 네이버 개발자 센터의 **Client Secret** 복사
- [ ] Clerk 대시보드의 **Client Secret**과 비교
- [ ] **정확히 일치하는지** 확인
- [ ] ❌ 일치하지 않으면:
  1. Clerk 대시보드 → Naver 설정
  2. Client Secret을 네이버 개발자 센터의 값으로 **정확히 수정**
  3. 저장

---

### 3단계: 동의 항목 설정 확인 (중요) ⚠️

#### 3.1 동의 항목 페이지로 이동
- [ ] 네이버 개발자 센터 → 내 애플리케이션 → API 설정 → 네이버 로그인
- [ ] **동의항목** 클릭

#### 3.2 필수 동의 항목 활성화
- [ ] **이름 (필수)**: ✅ **반드시 "활성화"** 상태여야 함
  - ❌ "비활성화"라면 → "활성화"로 변경
- [ ] **이메일 (필수 또는 선택)**: ✅ **"활성화" 권장**
  - Clerk에서 사용자 식별에 필요
  - ❌ "비활성화"라면 → "활성화"로 변경
- [ ] **프로필 사진 (선택)**: 선택사항이지만 권장
- [ ] **설정 저장** 버튼 클릭

---

### 4단계: 테스트 및 확인

#### 4.1 브라우저 캐시 삭제
- [ ] 개발자 도구(F12) 열기
- [ ] Network 탭 → "Disable cache" 체크
- [ ] 또는 하드 리프레시: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)

#### 4.2 시크릿 모드에서 테스트
- [ ] 시크릿 모드(프라이빗 브라우징) 열기
- [ ] https://linkable.life/sign-in 접속
- [ ] 네이버 로그인 버튼 클릭

#### 4.3 네이버 동의 화면 확인
- [ ] 네이버 로그인 페이지로 이동되는지 확인
- [ ] 동의 화면이 올바르게 표시되는지 확인
- [ ] **"동의"** 버튼이 보이는지 확인
- [ ] ⚠️ **반드시 "동의" 버튼 클릭** (취소하지 말 것)

#### 4.4 리다이렉트 확인
- [ ] 동의 후 LinkAble로 정상적으로 리다이렉트되는지 확인
- [ ] 로그인이 성공하는지 확인

---

## 🔍 문제가 계속되면 확인할 사항

### 추가 확인 사항
- [ ] 네이버 계정이 정상적으로 로그인되어 있는지 확인
- [ ] 네이버 앱이 정상적으로 승인되어 있는지 확인 (네이버 개발자 센터에서)
- [ ] 네이버 앱이 "서비스 중" 상태인지 확인
- [ ] 네이버 서버 측 일시적 오류가 아닌지 확인 (잠시 후 재시도)

### 환경변수 확인
- [ ] `.env.local` 파일 확인 (로컬 개발 환경)
- [ ] Vercel 환경변수 확인 (프로덕션 환경)
- [ ] `NEXT_PUBLIC_CLERK_FRONTEND_API=https://clerk.linkable.life` 설정 확인

---

## 📝 체크리스트 요약

가장 중요한 확인 사항 (우선순위 순):

1. ⭐⭐⭐ **Client ID 일치 확인** (Clerk = 네이버 개발자 센터)
2. ⭐⭐ **서비스 URL 등록 확인** (네이버 개발자 센터)
3. ⭐⭐ **Callback URL 정확히 일치 확인** (`https://clerk.linkable.life/v1/oauth_callback`)
4. ⭐ **동의 항목 활성화 확인** (이름, 이메일)
5. ⭐ **Client Secret 일치 확인** (Clerk = 네이버 개발자 센터)

---

## 🆘 여전히 해결되지 않으면

1. **Clerk 지원팀에 문의**: https://clerk.com/support
2. **네이버 개발자 센터 고객센터에 문의**: https://developers.naver.com/support
3. **오류 메시지와 함께 문의**:
   - 오류 메시지: "You did not grant access to your Naver account"
   - 네이버 앱 ID
   - Clerk 프로젝트 ID

---

## 참고 자료

- [네이버 OAuth 설정 가이드](./naver-oauth-setup-guide.md)
- [Clerk 공식 문서 - Social Connections](https://clerk.com/docs/authentication/social-connections)
- [네이버 개발자 센터 - 네이버 로그인](https://developers.naver.com/docs/login/overview/)
