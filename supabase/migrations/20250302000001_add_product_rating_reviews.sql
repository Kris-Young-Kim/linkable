-- =========================================================
-- [LinkAble] Add rating and review_count to products table
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-02
-- =========================================================

-- products 테이블에 별점과 리뷰 수 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

COMMENT ON COLUMN products.rating IS '상품 별점 (0.00 ~ 5.00)';
COMMENT ON COLUMN products.review_count IS '상품 리뷰 수';

-- 기존 데이터 초기화 (필요시)
-- UPDATE products SET review_count = 0 WHERE review_count IS NULL;
