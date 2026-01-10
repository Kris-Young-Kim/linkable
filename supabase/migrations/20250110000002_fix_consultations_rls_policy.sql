-- =========================================================
-- [LinkAble] Consultations RLS 정책 수정 (프로덕션용)
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-01-10
-- =========================================================
-- 
-- 문제: get_current_user_id() 함수가 JWT 클레임을 읽지 못하여 RLS 정책 실패
-- 해결: RLS 정책에서 JWT의 sub 필드를 직접 사용하여 clerk_id로 users 테이블 조회
-- =========================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "consultations_insert_own" ON consultations;

-- 개선된 INSERT 정책: JWT의 sub 필드(clerk_id)를 직접 사용
CREATE POLICY "consultations_insert_own"
ON consultations
FOR INSERT
WITH CHECK (
  -- JWT의 sub 필드가 clerk_id이므로, 이를 사용하여 users 테이블에서 user_id 조회
  user_id = (
    SELECT u.id
    FROM users u
    WHERE u.clerk_id = (
      -- JWT 클레임에서 clerk_id 추출 시도
      COALESCE(
        current_setting('request.jwt.claims', true)::json->>'clerk_id',
        current_setting('request.jwt.claims', true)::json->>'sub',
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'clerk_id'
      )
    )
    LIMIT 1
  )
);

COMMENT ON POLICY "consultations_insert_own" ON consultations IS 
  '사용자는 자신의 상담만 생성 가능 (JWT의 clerk_id를 직접 사용)';
