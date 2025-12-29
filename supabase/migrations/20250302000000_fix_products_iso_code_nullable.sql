-- =========================================================
-- [LinkAble] Fix products.iso_code nullable constraint
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-02
-- =========================================================
--
-- products 테이블의 iso_code 컬럼을 nullable로 변경합니다.
-- 현재 NOT NULL 제약조건이 있지만, 실제로는 선택사항으로 사용되고 있습니다.
-- =========================================================

-- iso_code 컬럼을 nullable로 변경
ALTER TABLE products ALTER COLUMN iso_code DROP NOT NULL;

-- 기본값을 N999999로 설정 (ISO 코드가 없는 상품을 위한 기본값)
ALTER TABLE products ALTER COLUMN iso_code SET DEFAULT 'N999999';

-- 기존 NULL 값들을 기본값으로 업데이트
UPDATE products SET iso_code = 'N999999' WHERE iso_code IS NULL;

COMMENT ON COLUMN products.iso_code IS 'ISO 9999 분류 코드 (선택사항, NULL 허용, 기본값: N999999)';

-- =========================================================
-- End of Migration
-- =========================================================