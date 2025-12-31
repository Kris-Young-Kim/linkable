-- =========================================================
-- [LinkAble] Replace "00 00" ISO codes with "N999999"
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-05
-- =========================================================
--
-- products 테이블에서 비표준 ISO 코드 "00 00"을 
-- 표준 비분류 코드 "N999999"로 일괄 변경합니다.
-- =========================================================

-- "00 00" 값을 "N999999"로 업데이트
UPDATE products 
SET iso_code = 'N999999' 
WHERE iso_code = '00 00' OR iso_code = '00 00 ' OR TRIM(iso_code) = '00 00';

-- 업데이트 결과 확인 (주석 처리 - 필요시 주석 해제하여 확인)
-- SELECT 
--   COUNT(*) FILTER (WHERE iso_code = 'N999999') as n999999_count,
--   COUNT(*) FILTER (WHERE iso_code = '00 00' OR TRIM(iso_code) = '00 00') as remaining_00_00_count,
--   COUNT(*) as total_products
-- FROM products;

COMMENT ON COLUMN products.iso_code IS 'ISO 9999 분류 코드 (선택사항, NULL 허용, 기본값: N999999). 비표준 코드 "00 00"은 "N999999"로 통일됨.';

-- =========================================================
-- End of Migration
-- =========================================================
