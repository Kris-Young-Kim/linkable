# RLS 헬퍼 함수 수정: clerk_id 변수명 충돌 해결

## 문제

테스트 실행 시 다음 오류가 발생합니다:

```
column reference "clerk_id" is ambiguous
```

## 원인

`get_current_user_id()` 및 `get_current_user_role()` 함수 내부에서 `clerk_id` 변수명이 테이블 컬럼명과 충돌하여 발생하는 문제입니다.

## 해결 방법

### 방법 1: Supabase Dashboard에서 직접 실행 (권장)

1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. SQL Editor 열기
4. 다음 SQL 실행:

```sql
-- get_current_user_id 함수 수정: 변수명 충돌 해결
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  v_clerk_id TEXT;
  v_user_id UUID;
BEGIN
  -- JWT 커스텀 클레임에서 clerk_id 추출 시도
  BEGIN
    v_clerk_id := current_setting('request.jwt.claims', true)::json->>'clerk_id';
  EXCEPTION
    WHEN OTHERS THEN
      v_clerk_id := NULL;
  END;

  -- clerk_id가 없으면 NULL 반환
  IF v_clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- users 테이블에서 user_id 조회 (SECURITY DEFINER로 RLS 우회)
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.clerk_id = v_clerk_id
  LIMIT 1;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_current_user_role 함수도 동일하게 수정
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_clerk_id TEXT;
  v_user_role TEXT;
BEGIN
  -- JWT 커스텀 클레임에서 clerk_id 추출
  BEGIN
    v_clerk_id := current_setting('request.jwt.claims', true)::json->>'clerk_id';
  EXCEPTION
    WHEN OTHERS THEN
      v_clerk_id := NULL;
  END;

  IF v_clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- users 테이블에서 role 조회 (SECURITY DEFINER로 RLS 우회)
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.clerk_id = v_clerk_id
  LIMIT 1;

  RETURN v_user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 방법 2: 마이그레이션 파일 적용

생성된 마이그레이션 파일을 적용:

```bash
# Supabase CLI 사용
supabase db push

# 또는 특정 마이그레이션만 적용
supabase migration up
```

마이그레이션 파일 위치:
- `supabase/migrations/20250219000000_fix_ambiguous_clerk_id.sql`

## 변경 사항

### 이전 (문제 있는 코드)
```sql
DECLARE
  clerk_id TEXT;  -- 변수명이 테이블 컬럼명과 충돌
  user_id UUID;
BEGIN
  ...
  WHERE users.clerk_id = clerk_id  -- 모호한 참조
```

### 수정 후
```sql
DECLARE
  v_clerk_id TEXT;  -- 변수명에 접두사 추가
  v_user_id UUID;
BEGIN
  ...
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.clerk_id = v_clerk_id  -- 명확한 참조
```

## 테스트

수정 후 테스트 실행:

```bash
pnpm test:rls:comprehensive
```

모든 테스트가 통과해야 합니다.

## 참고

- 원본 마이그레이션 파일(`supabase/migrations/20250218000000_add_rls_policies.sql`)도 수정되었습니다.
- 다음에 마이그레이션을 다시 적용하면 자동으로 수정된 버전이 적용됩니다.

