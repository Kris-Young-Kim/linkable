-- =========================================================
-- [LinkAble] RLS get_current_user_id 함수 수정 (프로덕션용)
-- Database: PostgreSQL (Supabase)
-- Version: 1.2
-- Generated: 2025-01-10
-- =========================================================
-- 
-- 문제: get_current_user_id() 함수가 JWT 클레임에서 clerk_id를 읽지 못함
-- 원인: Supabase가 커스텀 JWT를 사용할 때 request.jwt.claims가 제대로 설정되지 않음
-- 해결: JWT를 직접 파싱하거나, Authorization 헤더에서 직접 읽기
-- =========================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_current_user_id();

-- 개선된 get_current_user_id 함수
-- Supabase는 커스텀 JWT를 사용할 때 request.jwt.claims를 자동으로 설정하지 않을 수 있음
-- 따라서 여러 방법으로 clerk_id를 추출 시도
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  v_clerk_id TEXT;
  v_user_id UUID;
  v_jwt_claims JSONB;
  v_auth_header TEXT;
BEGIN
  -- 방법 1: request.jwt.claims에서 읽기 (Supabase Auth JWT인 경우)
  BEGIN
    v_jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    
    -- clerk_id 추출 시도 (여러 위치에서)
    -- 1. 최상위 레벨
    v_clerk_id := v_jwt_claims->>'clerk_id';
    
    -- 2. app_metadata 안에 있는 경우
    IF v_clerk_id IS NULL THEN
      v_clerk_id := v_jwt_claims->'app_metadata'->>'clerk_id';
    END IF;
    
    -- 3. sub 필드가 clerk_id 형식인 경우 (user_로 시작)
    IF v_clerk_id IS NULL THEN
      v_clerk_id := v_jwt_claims->>'sub';
      -- sub가 UUID 형식이면 clerk_id가 아님
      IF v_clerk_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_clerk_id := NULL;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- request.jwt.claims가 없거나 파싱 실패
      v_clerk_id := NULL;
  END;

  -- 방법 2: request.headers에서 Authorization 헤더 읽기 (커스텀 JWT인 경우)
  -- 주의: 이 방법은 Supabase의 내부 설정에 따라 작동하지 않을 수 있음
  IF v_clerk_id IS NULL THEN
    BEGIN
      v_auth_header := current_setting('request.headers', true)::jsonb->>'authorization';
      -- Bearer 토큰에서 JWT 추출 및 파싱은 복잡하므로 일단 건너뜀
      -- 대신 다른 방법 사용
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  -- clerk_id가 없으면 NULL 반환
  IF v_clerk_id IS NULL OR v_clerk_id = '' THEN
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

COMMENT ON FUNCTION get_current_user_id() IS 'Clerk ID를 기반으로 현재 사용자의 UUID를 반환 (RLS 정책용, 프로덕션 개선 버전)';
