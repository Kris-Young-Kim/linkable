-- =========================================================
-- [LinkAble] iso_code 컬럼 제거 마이그레이션
-- Database: PostgreSQL (Supabase)
-- Version: 1.3
-- Generated: 2025-01-20
-- =========================================================
-- 
-- 목적: iso_code VARCHAR 컬럼을 제거하고 iso_code_id FK만 사용
-- 
-- 변경 사항:
-- 1. 기존 iso_code 문자열을 iso_code_id로 마이그레이션 (이미 완료된 경우 스킵)
-- 2. iso_code 컬럼 제거
-- =========================================================

-- =========================================================
-- [1] 기존 iso_code를 iso_code_id로 마이그레이션 (아직 연결되지 않은 제품만)
-- =========================================================

-- iso_code_id가 NULL이고 iso_code가 있는 제품들을 iso_code_id로 연결
UPDATE products p
SET iso_code_id = ic.id,
    updated_at = now()
FROM iso_codes ic
WHERE p.iso_code_id IS NULL
  AND p.iso_code IS NOT NULL
  AND p.iso_code = ic.code
  AND ic.is_active = true;

-- 로그 출력
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM products
  WHERE iso_code_id IS NOT NULL;
  
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'iso_code → iso_code_id 마이그레이션 완료';
  RAISE NOTICE '마이그레이션된 제품 수: %', migrated_count;
  RAISE NOTICE '=========================================================';
END $$;

-- =========================================================
-- [2] iso_code 컬럼 제거 전 확인
-- =========================================================

-- iso_code_id가 NULL인 제품 확인
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM products
  WHERE iso_code_id IS NULL
    AND iso_code IS NOT NULL
    AND iso_code != 'N999999'
    AND iso_code != '00 00';
  
  IF null_count > 0 THEN
    RAISE WARNING '=========================================================';
    RAISE WARNING '경고: iso_code_id가 NULL인 제품이 %개 있습니다.', null_count;
    RAISE WARNING '이 제품들은 iso_code 컬럼 제거 후 ISO 코드 정보를 잃게 됩니다.';
    RAISE WARNING '=========================================================';
  END IF;
END $$;

-- =========================================================
-- [3] iso_code 컬럼 제거
-- =========================================================

-- iso_code 컬럼을 참조하는 뷰들 먼저 삭제/수정
DROP VIEW IF EXISTS view_product_stats CASCADE;
DROP VIEW IF EXISTS view_iso_code_stats CASCADE;
DROP VIEW IF EXISTS view_products_with_codes CASCADE;

-- iso_code 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS iso_code;

-- =========================================================
-- [4] 뷰 재생성 (iso_code_id 기반)
-- =========================================================

-- products 테이블 조인 뷰 재생성 (iso_code_id 기반)
CREATE OR REPLACE VIEW view_products_with_codes AS
SELECT 
    p.id,
    p.name,
    p.iso_code_id,
    ic.code as iso_code,
    ic.name as iso_code_name,
    p.manufacturer_id,
    m.code as manufacturer_code,
    m.name as manufacturer,
    p.category_id,
    c.code as category_code,
    c.name as category,
    p.description,
    p.image_url,
    p.purchase_link,
    p.price,
    p.is_active,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
LEFT JOIN categories c ON p.category_id = c.id;

COMMENT ON VIEW view_products_with_codes IS 'products 테이블과 코드 테이블 조인 뷰 (iso_code_id 기반)';

-- view_product_stats 뷰 재생성 (iso_code_id 기반)
CREATE OR REPLACE VIEW view_product_stats AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  ic.code as iso_code,
  p.manufacturer,
  p.price,
  
  -- 추천 통계
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND(
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
      COUNT(DISTINCT r.id)::numeric * 100,
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 최근 활동
  MAX(r.created_at) as last_recommended_at

FROM products p
LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, ic.code, p.manufacturer, p.price;

COMMENT ON VIEW view_product_stats IS '상품별 추천 및 평가 통계를 집계하는 View (iso_code_id 기반)';

-- view_iso_code_stats 뷰 재생성 (iso_code_id 기반)
CREATE OR REPLACE VIEW view_iso_code_stats AS
SELECT 
  ic.code as iso_code,
  
  -- 추천 통계
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND(
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
      COUNT(DISTINCT r.id)::numeric * 100,
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 상품 수
  COUNT(DISTINCT p.id) as product_count

FROM products p
LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY ic.code;

COMMENT ON VIEW view_iso_code_stats IS 'ISO 코드별 추천 및 평가 통계를 집계하는 View (iso_code_id 기반)';

-- =========================================================
-- [5] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'iso_code 컬럼 제거 마이그레이션 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - products.iso_code 컬럼 제거됨';
  RAISE NOTICE '  - products.iso_code_id FK만 사용';
  RAISE NOTICE '  - view_products_with_codes 뷰 재생성됨';
  RAISE NOTICE '  - view_product_stats 뷰 재생성됨 (iso_code_id 기반)';
  RAISE NOTICE '  - view_iso_code_stats 뷰 재생성됨 (iso_code_id 기반)';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '주의: 코드에서 iso_code 문자열 필터링을 사용하는 경우';
  RAISE NOTICE '      iso_code_id FK 조인을 사용하도록 변경해야 합니다.';
  RAISE NOTICE '=========================================================';
END $$;
