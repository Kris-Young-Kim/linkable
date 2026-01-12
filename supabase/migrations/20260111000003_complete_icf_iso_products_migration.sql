-- =============================================================================
-- ICF-ISO 매핑 및 Products 정규화 완료 마이그레이션
-- =============================================================================
-- 목적: 문서(prompts/20260110_205325_db.md)에 명시된 데이터베이스 구조 변경 완료
-- 참고: 
--   - ICF-ISO 매핑 테이블은 이미 생성됨 (20260110000000_create_icf_iso_mappings.sql)
--   - 이 마이그레이션은 남은 products 정규화 작업을 완료
-- =============================================================================

-- =============================================================================
-- 1. Products 테이블 상태 확인
-- =============================================================================
-- 참고: products.iso_code 컬럼은 이미 제거되었음 (20250120000000_remove_iso_code_column.sql)
-- 현재 products 테이블은 iso_code_id FK만 사용 중

-- Products 테이블 상태 확인 및 로깅
DO $$
DECLARE
  v_products_total INTEGER;
  v_products_linked INTEGER;
  v_products_unlinked INTEGER;
  v_products_percentage NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_products_total FROM products;
  SELECT COUNT(*) INTO v_products_linked FROM products WHERE iso_code_id IS NOT NULL;
  SELECT COUNT(*) INTO v_products_unlinked FROM products WHERE iso_code_id IS NULL;
  
  IF v_products_total > 0 THEN
    v_products_percentage := ROUND((v_products_linked::NUMERIC / v_products_total::NUMERIC * 100), 2);
  ELSE
    v_products_percentage := 0;
  END IF;
  
  RAISE NOTICE 'Products 테이블 상태:';
  RAISE NOTICE '  - 전체 제품: %개', v_products_total;
  RAISE NOTICE '  - ISO 연결 완료: %개', v_products_linked;
  RAISE NOTICE '  - 연결 비율: %%%', v_products_percentage;
  RAISE NOTICE '  - ISO 미연결: %개', v_products_unlinked;
  
  IF v_products_unlinked > 0 THEN
    RAISE WARNING 'ISO 코드가 연결되지 않은 제품이 %개 있습니다.', v_products_unlinked;
  END IF;
END $$;

-- =============================================================================
-- 2. ICF-ISO 매핑 테이블 확인 및 기본 데이터 보완
-- =============================================================================
-- 문서에 명시된 기본 매핑 규칙이 없을 경우 추가

-- 기본 ICF-ISO 매핑 데이터 (문서 예시)
-- 중요: ISO 코드는 반드시 Division 레벨(level 3, 6자리)이어야 함
-- 중복 방지를 위해 NOT EXISTS 사용
INSERT INTO icf_iso_mappings (icf_codes, iso_code, label, description, base_score, source)
SELECT * FROM (VALUES
  -- 보행 보조기기 (Division 레벨)
  (ARRAY['d450'], '12 06 03', '보행 프레임', '양팔로 조작하는 보행 프레임 (워커)', 0.75, 'manual'),
  
  -- 식사 및 음주 보조기기 (Division 레벨)
  (ARRAY['d550'], '15 09 13', '커트러리 및 식사도구', '식사 활동을 돕는 커트러리, 젓가락 및 빨대', 0.70, 'manual'),
  
  -- 전동 휠체어 (Division 레벨)
  (ARRAY['d465', 'd450'], '12 23 03', '수동 직접 조향 전동 휠체어', '수동 직접 조향 기능을 갖춘 전동 휠체어', 0.78, 'manual'),
  
  -- 수동 휠체어 (Division 레벨)
  (ARRAY['d465'], '12 22 03', '일수 핸드림 구동 휠체어', '양손으로 핸드림을 조작하는 수동 휠체어', 0.70, 'manual'),
  
  -- 목욕 보조기기 (Division 레벨)
  (ARRAY['d510'], '09 33 04', '목욕 보드', '목욕 시 안전한 이동을 돕는 목욕 보드', 0.72, 'manual'),
  
  -- 수직 접근성 보조기기 (Division 레벨)
  (ARRAY['d450', 'e120'], '18 30 03', '승강기', '수직 이동을 돕는 승강기', 0.85, 'manual')
) AS v(icf_codes, iso_code, label, description, base_score, source)
WHERE NOT EXISTS (
  SELECT 1 FROM icf_iso_mappings m
  WHERE m.iso_code = v.iso_code
    AND m.icf_codes = v.icf_codes
);

-- iso_code_id FK 연결 (iso_codes 테이블과 매칭)
UPDATE icf_iso_mappings m
SET iso_code_id = ic.id
FROM iso_codes ic
WHERE m.iso_code = ic.code
  AND m.iso_code_id IS NULL;

-- =============================================================================
-- 3. 인덱스 최적화 (성능 향상)
-- =============================================================================

-- products 테이블의 iso_code_id 인덱스 확인 및 생성
CREATE INDEX IF NOT EXISTS idx_products_iso_code_id 
ON products(iso_code_id) 
WHERE iso_code_id IS NOT NULL;

-- icf_iso_mappings 테이블의 iso_code_id 인덱스 확인 및 생성
CREATE INDEX IF NOT EXISTS idx_icf_iso_mappings_iso_code_id 
ON icf_iso_mappings(iso_code_id) 
WHERE iso_code_id IS NOT NULL;

-- =============================================================================
-- 4. 데이터 무결성 검증
-- =============================================================================

-- iso_code_id가 NULL인 제품 확인
DO $$
DECLARE
  v_unlinked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_unlinked_count
  FROM products p
  WHERE p.iso_code_id IS NULL;
  
  IF v_unlinked_count > 0 THEN
    RAISE WARNING 'ISO 코드가 연결되지 않은 제품이 %개 있습니다.', v_unlinked_count;
  ELSE
    RAISE NOTICE '모든 제품이 ISO 코드와 연결되어 있습니다.';
  END IF;
END $$;

-- =============================================================================
-- 5. 마이그레이션 완료 로그
-- =============================================================================

DO $$
DECLARE
  v_products_total INTEGER;
  v_products_linked INTEGER;
  v_products_percentage NUMERIC;
  v_mappings_total INTEGER;
BEGIN
  -- Products 통계
  SELECT COUNT(*) INTO v_products_total FROM products;
  SELECT COUNT(*) INTO v_products_linked FROM products WHERE iso_code_id IS NOT NULL;
  v_products_percentage := ROUND((v_products_linked::NUMERIC / v_products_total::NUMERIC * 100), 2);
  
  -- ICF-ISO 매핑 통계
  SELECT COUNT(*) INTO v_mappings_total FROM icf_iso_mappings;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '마이그레이션 완료 요약';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Products 테이블:';
  RAISE NOTICE '  - 전체 제품: %개', v_products_total;
  RAISE NOTICE '  - ISO 연결 완료: %개', v_products_linked;
  RAISE NOTICE '  - 연결 비율: %%%', v_products_percentage;
  RAISE NOTICE 'ICF-ISO 매핑:';
  RAISE NOTICE '  - 매핑 규칙: %개', v_mappings_total;
  RAISE NOTICE '========================================';
END $$;
