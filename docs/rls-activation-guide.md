# RLS 정책 활성화 가이드

## 개요

이 가이드에서는 LinkAble 프로젝트의 Row Level Security (RLS) 정책을 활성화하는 방법을 설명합니다.

## 사전 준비

### 1. 사용자 규칙 업데이트

**중요**: Cursor의 사용자 규칙에서 다음 규칙을 **삭제**해야 합니다:

```
- Supabase RLS는 절대 사용하지 말고, 작업해.
```

**삭제 방법**:
1. Cursor 설정 열기 (Ctrl+, 또는 Cmd+,)
2. "Rules for AI" 또는 "User Rules" 섹션 찾기
3. 위 규칙을 찾아 삭제
4. 저장

### 2. 환경 변수 확인

다음 환경 변수가 설정되어 있는지 확인하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 단계별 가이드

### 단계 1: 마이그레이션 파일 확인

마이그레이션 파일 위치:
```
supabase/migrations/20250218000000_add_rls_policies.sql
```

이 파일에는 다음이 포함되어 있습니다:
- RLS 헬퍼 함수 (`get_current_user_id`, `get_current_user_role`, `is_admin_or_manager`)
- 모든 테이블에 대한 RLS 정책
- RLS 활성화 명령 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)

### 단계 2: 마이그레이션 적용

#### 방법 1: Supabase 대시보드에서 실행 (권장)

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 **SQL Editor** 클릭
   - **New query** 클릭

3. **마이그레이션 파일 내용 복사**
   - `supabase/migrations/20250218000000_add_rls_policies.sql` 파일 열기
   - 전체 내용 복사 (Ctrl+A, Ctrl+C)

4. **SQL Editor에 붙여넣기**
   - SQL Editor에 붙여넣기 (Ctrl+V)

5. **실행**
   - **Run** 버튼 클릭 (또는 Ctrl+Enter)
   - 실행 결과 확인

6. **성공 확인**
   - "Success" 메시지 확인
   - 에러가 없으면 정상적으로 적용된 것입니다

#### 방법 2: Supabase CLI 사용

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/linkable-MVP

# Supabase CLI로 마이그레이션 적용
supabase db push
```

또는 특정 마이그레이션만 적용:

```bash
supabase migration up
```

### 단계 3: RLS 정책 확인

#### 3.1 테이블별 RLS 활성화 확인

SQL Editor에서 다음 쿼리 실행:

```sql
-- RLS가 활성화된 테이블 목록 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
```

다음 테이블들이 `rowsecurity = true`로 표시되어야 합니다:
- users
- consultations
- chat_messages
- analysis_results
- recommendations
- ippa_evaluations
- notifications
- consultation_feedback
- point_transactions
- user_coupons
- conversion_events
- icf_code_usage_logs
- products
- coupons
- icf_code_statistics
- icf_code_expansions
- icf_auto_expand_config
- icf_iso_embeddings

#### 3.2 RLS 정책 확인

```sql
-- 모든 RLS 정책 목록 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### 3.3 헬퍼 함수 확인

```sql
-- 헬퍼 함수 확인
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_current_user_id', 'get_current_user_role', 'is_admin_or_manager')
ORDER BY routine_name;
```

### 단계 4: 테스트 실행

테스트 스크립트를 실행하여 RLS 정책이 올바르게 작동하는지 확인:

```bash
# 테스트 스크립트 실행
pnpm tsx scripts/test-rls-policies.ts
```

또는 수동으로 테스트:

```bash
# Node.js 스크립트 실행
node scripts/test-rls-policies.js
```

## 중요 사항

### Service Role Key와 RLS

**현재 상태**: 코드베이스는 Service Role Key를 사용하므로 RLS를 우회합니다.

**RLS를 완전히 활용하려면**:
1. 클라이언트 측에서 사용자 인증 토큰 사용
2. API에서 Clerk JWT를 Supabase JWT로 변환
3. API에서 사용자 컨텍스트를 명시적으로 전달

### Clerk 인증 연동

RLS 정책은 다음 헬퍼 함수를 사용합니다:
- `get_current_user_id()`: JWT 커스텀 클레임에서 `clerk_id` 추출
- `get_current_user_role()`: 사용자 역할 조회
- `is_admin_or_manager()`: 관리자/전문가 권한 확인

**JWT 커스텀 클레임 설정 필요**:
Supabase JWT에 `clerk_id`를 커스텀 클레임으로 추가해야 합니다.

## 문제 해결

### 에러: "permission denied"

- Supabase 대시보드에서 실행하는 경우, 관리자 권한이 필요합니다.
- 프로젝트 소유자 계정으로 로그인했는지 확인하세요.

### 에러: "function does not exist"

- 마이그레이션이 완전히 실행되지 않았을 수 있습니다.
- 헬퍼 함수가 생성되었는지 확인하세요.

### 에러: "policy already exists"

- 정책이 이미 존재하는 경우입니다.
- `DROP POLICY IF EXISTS` 후 다시 생성하거나 무시해도 됩니다.

### RLS가 작동하지 않는 경우

1. **Service Role Key 사용 확인**
   - Service Role Key를 사용하면 RLS를 우회합니다.
   - 클라이언트 측 인증으로 전환하거나 API에서 사용자 컨텍스트를 전달해야 합니다.

2. **JWT 커스텀 클레임 확인**
   - JWT에 `clerk_id`가 포함되어 있는지 확인하세요.

3. **헬퍼 함수 확인**
   - `get_current_user_id()` 함수가 올바르게 작동하는지 확인하세요.

## 롤백 방법

RLS를 비활성화하려면:

```sql
-- 모든 테이블의 RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultations DISABLE ROW LEVEL SECURITY;
-- ... (각 테이블마다 실행)
```

또는 정책만 삭제:

```sql
-- 특정 정책 삭제
DROP POLICY IF EXISTS "users_select_own" ON users;
-- ... (각 정책마다 실행)
```

## 참고 문서

- [Supabase RLS 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [Clerk 인증 연동 가이드](https://clerk.com/docs)
- 마이그레이션 파일: `supabase/migrations/20250218000000_add_rls_policies.sql`

