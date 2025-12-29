-- =========================================================
-- [LinkAble] ICF Expansion 시스템 제거
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-03-01
-- =========================================================
-- 
-- 목적: Full ICF 코드를 모두 사용하므로 Core Set(핵심 요약 코드)과 
--       Expansion 시스템이 더 이상 필요하지 않습니다.
--       이 마이그레이션은 Expansion 관련 테이블, 함수, 제약조건을 제거합니다.
-- 

-- =========================================================
-- [1] 자동 확장 함수 제거
-- =========================================================

DROP FUNCTION IF EXISTS generate_icf_expansion_candidates(UUID);
DROP FUNCTION IF EXISTS execute_icf_auto_expansion(UUID, INTEGER, BOOLEAN);

-- =========================================================
-- [2] Expansion 관련 테이블 제거
-- =========================================================

-- 외래키 제약조건이 있을 수 있으므로 CASCADE로 제거
DROP TABLE IF EXISTS icf_auto_expand_candidates CASCADE;
DROP TABLE IF EXISTS icf_code_expansions CASCADE;
DROP TABLE IF EXISTS icf_auto_expand_config CASCADE;

-- =========================================================
-- [3] is_in_core_set 컬럼 처리
-- =========================================================

-- 옵션 1: 컬럼 제거 (주의: 기존 데이터에 영향)
-- ALTER TABLE icf_codes DROP COLUMN IF EXISTS is_in_core_set;

-- 옵션 2: 컬럼 유지하되 모든 코드를 동등하게 처리 (권장)
-- Full catalog를 사용하므로 모든 코드는 동등하게 처리
UPDATE icf_codes
SET is_in_core_set = FALSE
WHERE is_active = TRUE;

-- 기본값 변경
ALTER TABLE icf_codes 
ALTER COLUMN is_in_core_set SET DEFAULT FALSE;

-- 코멘트 업데이트
COMMENT ON COLUMN icf_codes.is_in_core_set IS 'Full catalog 사용으로 인해 더 이상 사용되지 않음. 모든 코드는 동등하게 처리됩니다.';

-- =========================================================
-- [4] 관련 인덱스 정리 (테이블 제거 시 자동 삭제되지만 명시적으로 확인)
-- =========================================================

-- 테이블이 제거되면 인덱스도 자동으로 제거됨

-- =========================================================
-- [5] 마이그레이션 완료 로그
-- =========================================================

DO $$
BEGIN
    RAISE NOTICE 'ICF Expansion 시스템 제거 완료';
    RAISE NOTICE '- Expansion 테이블 제거: icf_code_expansions, icf_auto_expand_config, icf_auto_expand_candidates';
    RAISE NOTICE '- 자동 확장 함수 제거: generate_icf_expansion_candidates, execute_icf_auto_expansion';
    RAISE NOTICE '- is_in_core_set 컬럼은 유지되지만 모든 코드는 동등하게 처리됩니다.';
END $$;
