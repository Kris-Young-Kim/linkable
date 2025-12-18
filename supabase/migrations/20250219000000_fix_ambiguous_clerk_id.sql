-- =========================================================
-- [LinkAble] RLS 헬퍼 함수 수정: clerk_id 변수명 충돌 해결
-- Database: PostgreSQL (Supabase)
-- Version: 1.1
-- Generated: 2025-02-19
-- =========================================================
-- 
-- 문제: get_current_user_id() 및 get_current_user_role() 함수에서
--       clerk_id 변수명이 모호하여 "column reference 'clerk_id' is ambiguous" 오류 발생
-- 해결: 함수 내부 변수명을 v_clerk_id로 변경하고 테이블 별칭 명확화
-- =========================================================

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

COMMENT ON FUNCTION get_current_user_id() IS 'Clerk ID를 기반으로 현재 사용자의 UUID를 반환 (RLS 정책용) - 변수명 충돌 해결 버전';

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

COMMENT ON FUNCTION get_current_user_role() IS '현재 사용자의 역할을 반환 (admin, manager, user) - 변수명 충돌 해결 버전';

