# RLS 정책 테스트 가이드

이 문서는 RLS 정책이 올바르게 작동하는지 확인하는 방법을 설명합니다.

## 사전 준비

### 1. 환경 변수 설정

`.env` 파일에 다음 환경 변수가 설정되어 있어야 합니다:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**중요**: `SUPABASE_JWT_SECRET`은 Supabase Dashboard > Settings > API > JWT Settings에서 확인할 수 있습니다.

### 2. RLS 정책 활성화 확인

RLS 정책이 활성화되어 있는지 확인:

```bash
pnpm test:rls
```

## 테스트 실행

### 기본 RLS 테스트

RLS 활성화 및 헬퍼 함수 존재 여부를 확인:

```bash
pnpm test:rls
```

이 테스트는 다음을 확인합니다:
- RLS 활성화 여부
- 헬퍼 함수 존재 여부 (`get_current_user_id`, `get_current_user_role`, `is_admin_or_manager`)
- 테이블 접근 가능 여부

### 종합 RLS 테스트 (JWT 기반)

실제 JWT를 사용하여 RLS 정책이 올바르게 작동하는지 확인:

```bash
pnpm test:rls:comprehensive
```

이 테스트는 다음을 확인합니다:

#### 1. JWT 생성 및 검증
- JWT 생성 성공 여부
- JWT 구조 검증

#### 2. 사용자별 데이터 접근 제어
- ✅ 사용자가 자신의 데이터 조회 가능
- ❌ 사용자가 다른 사용자의 데이터 조회 불가
- ✅ 사용자가 자신의 사용자 정보 조회 가능
- ❌ 사용자가 다른 사용자의 정보 조회 불가

#### 3. 관리자 권한 테스트
- ✅ 관리자가 모든 사용자 조회 가능
- ✅ 관리자가 모든 상담 조회 가능
- ❌ 일반 사용자가 모든 사용자 조회 불가

#### 4. 헬퍼 함수 테스트
- `get_current_user_id()` 함수 동작 확인
- `get_current_user_role()` 함수 동작 확인
- `is_admin_or_manager()` 함수 동작 확인 (일반 사용자/관리자)

## 테스트 결과 해석

### 성공적인 테스트 결과

```
✅ 통과: 12개
❌ 실패: 0개
```

모든 테스트가 통과하면 RLS 정책이 올바르게 작동하는 것입니다.

### 실패한 테스트 해결 방법

#### 1. "JWT 생성 실패" 오류

**원인**: `SUPABASE_JWT_SECRET`이 설정되지 않았거나 잘못되었습니다.

**해결 방법**:
1. Supabase Dashboard > Settings > API > JWT Settings에서 JWT Secret 확인
2. `.env` 파일에 `SUPABASE_JWT_SECRET` 추가

#### 2. "접근 차단 확인 실패" 오류

**원인**: RLS 정책이 제대로 작동하지 않거나, JWT에 `clerk_id`가 포함되지 않았습니다.

**해결 방법**:
1. RLS 정책이 활성화되어 있는지 확인
2. JWT에 `clerk_id` 커스텀 클레임이 포함되어 있는지 확인
3. `get_current_user_id()` 함수가 올바르게 작동하는지 확인

#### 3. "관리자 권한 확인 실패" 오류

**원인**: `get_current_user_role()` 함수가 올바르게 작동하지 않거나, 사용자 역할이 데이터베이스에 저장되지 않았습니다.

**해결 방법**:
1. `users` 테이블에 `role` 컬럼이 있는지 확인
2. 테스트 사용자의 `role`이 올바르게 설정되어 있는지 확인
3. `get_current_user_role()` 함수가 올바르게 작동하는지 확인

## 수동 테스트

자동 테스트 외에도 수동으로 테스트할 수 있습니다:

### 1. Supabase SQL Editor에서 테스트

```sql
-- 현재 사용자 ID 확인
SELECT get_current_user_id();

-- 현재 사용자 역할 확인
SELECT get_current_user_role();

-- 관리자 여부 확인
SELECT is_admin_or_manager();
```

### 2. API 엔드포인트 테스트

다음 API 엔드포인트를 호출하여 RLS 정책이 적용되는지 확인:

```bash
# 사용자 인증 필요
curl -X GET https://your-api.com/api/consultations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 주의 사항

1. **Service Role Key**: Service Role Key를 사용하면 RLS를 우회합니다. 실제 사용자 인증을 테스트하려면 JWT를 사용해야 합니다.

2. **테스트 데이터**: 종합 테스트는 테스트 데이터를 자동으로 생성하고 정리합니다. 프로덕션 환경에서는 주의하세요.

3. **JWT Secret**: `SUPABASE_JWT_SECRET`은 절대 공개되어서는 안 됩니다. `.env` 파일을 Git에 커밋하지 마세요.

## 다음 단계

RLS 정책 테스트가 통과하면:

1. ✅ API Route에서 `getSupabaseUserClient()` 사용 확인
2. ✅ 클라이언트 측 인증 통합 (선택적)
3. ✅ 프로덕션 환경 배포 전 최종 테스트

## 참고 문서

- `docs/rls-activation-guide.md`: RLS 활성화 가이드
- `supabase/migrations/20250218000000_add_rls_policies.sql`: RLS 정책 마이그레이션
- `scripts/test-rls-policies.ts`: 기본 RLS 테스트 스크립트
- `scripts/test-rls-policies-comprehensive.ts`: 종합 RLS 테스트 스크립트

