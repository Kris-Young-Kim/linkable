-- =========================================================
-- [LinkAble] 개발 단계 RLS 비활성화
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-20
-- =========================================================
-- 
-- 주의사항:
-- 1. 개발 초기, 중기에는 RLS를 비활성화합니다.
-- 2. 개발 마무리 단계에서 RLS를 활성화하여 보안을 강화합니다.
-- 3. 이 마이그레이션은 개발 환경에서만 사용하세요.
-- =========================================================

-- 모든 테이블의 RLS 비활성화 (테이블이 존재하는 경우에만)
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_disable TEXT[] := ARRAY[
    'users', 'consultations', 'chat_messages', 'analysis_results', 
    'recommendations', 'ippa_evaluations', 'notifications', 
    'consultation_feedback', 'point_transactions', 'user_coupons', 
    'conversion_events', 'icf_code_usage_logs', 'products', 'coupons', 
    'icf_code_statistics', 'icf_code_expansions', 'icf_auto_expand_config', 
    'icf_iso_embeddings'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_disable
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND information_schema.tables.table_name = tbl_name
    ) THEN
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl_name);
      RAISE NOTICE 'RLS 비활성화: %', tbl_name;
    ELSE
      RAISE NOTICE '테이블이 존재하지 않아 RLS 비활성화 건너뜀: %', tbl_name;
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'RLS 비활성화 완료 (개발 모드)';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '주의: 프로덕션 배포 전에 RLS를 다시 활성화하세요.';
  RAISE NOTICE 'RLS 활성화: supabase/migrations/20250218000000_add_rls_policies.sql';
  RAISE NOTICE '=========================================================';
END $$;
