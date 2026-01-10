-- =========================================================
-- [LinkAble] consultations RLS 정책 수정
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2026-01-10
-- =========================================================
--
-- 문제:
-- 기존 consultations_insert_own 정책이 request.jwt.claims를 직접
-- 파싱하고 있어 JWT 형식이 맞지 않으면 실패
--
-- 해결:
-- get_current_user_id() 함수를 사용하여 일관된 사용자 식별
-- =========================================================

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS consultations_insert_own ON consultations;

-- 새 INSERT 정책 생성 (get_current_user_id() 함수 사용)
CREATE POLICY consultations_insert_own ON consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_current_user_id());

-- SELECT 정책 추가 (없는 경우)
DROP POLICY IF EXISTS consultations_select_own ON consultations;
CREATE POLICY consultations_select_own ON consultations
  FOR SELECT
  TO authenticated
  USING (user_id = get_current_user_id());

-- UPDATE 정책 추가 (없는 경우)
DROP POLICY IF EXISTS consultations_update_own ON consultations;
CREATE POLICY consultations_update_own ON consultations
  FOR UPDATE
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- DELETE 정책 추가 (없는 경우)
DROP POLICY IF EXISTS consultations_delete_own ON consultations;
CREATE POLICY consultations_delete_own ON consultations
  FOR DELETE
  TO authenticated
  USING (user_id = get_current_user_id());

-- =========================================================
-- 완료 메시지
-- =========================================================
DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'consultations RLS 정책 수정 완료';
  RAISE NOTICE '- get_current_user_id() 함수 사용으로 통일';
  RAISE NOTICE '- SELECT, INSERT, UPDATE, DELETE 정책 추가';
  RAISE NOTICE '=========================================================';
END $$;
