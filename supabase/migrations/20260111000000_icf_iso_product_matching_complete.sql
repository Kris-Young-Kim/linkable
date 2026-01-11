-- =========================================================
-- [LinkAble] ICF-ISO-제품 매칭 시스템 완전 구현
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-11
-- =========================================================
--
-- 통합 내용:
-- 1. ICF-ISO-제품 매칭 함수 최적화
-- 2. ISO 9999:2022 계층 구조를 반영한 Materialized View
-- 3. 인덱스 최적화
-- 4. 통계 및 갱신 함수
--
-- 이 파일은 다음 마이그레이션들을 통합합니다:
-- - 20260111000000_optimize_icf_iso_product_matching.sql
-- - 20260111000003_fix_mv_iso_9999_hierarchy.sql
-- =========================================================

-- =========================================================
-- [1] 통합 매칭 함수: ICF 코드 배열 → 제품 목록
-- =========================================================

CREATE OR REPLACE FUNCTION get_products_by_icf_codes(
  p_icf_codes TEXT[],
  p_limit INTEGER DEFAULT 20,
  p_min_score NUMERIC DEFAULT 0.4
)
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR(255),
  iso_code VARCHAR(50),
  iso_code_id UUID,
  iso_label VARCHAR(255),
  match_score NUMERIC,
  match_reason TEXT,
  manufacturer VARCHAR(100),
  description TEXT,
  image_url TEXT,
  purchase_link TEXT,
  price DECIMAL(10, 2),
  category VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_iso_codes AS (
    -- ICF 코드로 매칭된 ISO 코드 및 점수 계산
    SELECT DISTINCT
      m.iso_code,
      m.iso_code_id,
      ic.code as iso_code_str,
      ic.name as iso_label,
      MAX(m.base_score) as base_score,
      -- ICF 매칭 비율 계산 (매칭된 ICF 수 / 전체 ICF 수)
      COUNT(DISTINCT unnest(m.icf_codes)) FILTER (
        WHERE unnest(m.icf_codes) = ANY(p_icf_codes)
      )::NUMERIC / GREATEST(ARRAY_LENGTH(p_icf_codes, 1), 1) as coverage_ratio
    FROM icf_iso_mappings m
    INNER JOIN iso_codes ic ON m.iso_code_id = ic.id
    WHERE m.is_active = true
      AND ic.is_active = true
      AND m.icf_codes && p_icf_codes  -- 배열 교집합 (GIN 인덱스 활용)
    GROUP BY m.iso_code, m.iso_code_id, ic.code, ic.name
  ),
  scored_iso_matches AS (
    -- 최종 점수 계산 (기본 점수 + 커버리지 비율)
    SELECT
      iso_code,
      iso_code_id,
      iso_code_str,
      iso_label,
      LEAST(base_score + (coverage_ratio * 0.3), 1.0) as final_score
    FROM matched_iso_codes
    WHERE base_score + (coverage_ratio * 0.3) >= p_min_score
  ),
  matched_products AS (
    -- ISO 코드로 제품 조회
    SELECT DISTINCT
      p.id as product_id,
      p.name as product_name,
      sim.iso_code_str,
      sim.iso_code_id,
      sim.iso_label,
      sim.final_score as match_score,
      p.manufacturer,
      p.description,
      p.image_url,
      p.purchase_link,
      p.price,
      p.category,
      -- 매칭 이유 생성
      format(
        'ICF 코드 매칭 (ISO: %s, 점수: %.2f)',
        sim.iso_label,
        sim.final_score
      ) as match_reason
    FROM products p
    INNER JOIN scored_iso_matches sim ON p.iso_code_id = sim.iso_code_id
    WHERE p.is_active = true
      AND p.iso_code_id IS NOT NULL
  )
  SELECT
    mp.product_id,
    mp.product_name,
    mp.iso_code_str,
    mp.iso_code_id,
    mp.iso_label,
    mp.match_score,
    mp.match_reason,
    mp.manufacturer,
    mp.description,
    mp.image_url,
    mp.purchase_link,
    mp.price,
    mp.category
  FROM matched_products mp
  ORDER BY mp.match_score DESC, mp.product_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_products_by_icf_codes IS 
  'ICF 코드 배열을 받아서 매칭된 제품 목록을 반환하는 통합 함수 (성능 최적화)';

-- =========================================================
-- [2] 사전 계산된 매핑 우선 사용 함수 (캐시 활용)
-- =========================================================

CREATE OR REPLACE FUNCTION get_products_by_icf_codes_with_cache(
  p_icf_codes TEXT[],
  p_limit INTEGER DEFAULT 20,
  p_min_score NUMERIC DEFAULT 0.4,
  p_use_precomputed BOOLEAN DEFAULT true
)
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR(255),
  iso_code VARCHAR(50),
  iso_code_id UUID,
  iso_label VARCHAR(255),
  match_score NUMERIC,
  match_reason TEXT,
  manufacturer VARCHAR(100),
  description TEXT,
  image_url TEXT,
  purchase_link TEXT,
  price DECIMAL(10, 2),
  category VARCHAR(100),
  source VARCHAR(50)  -- 'precomputed' or 'computed'
) AS $$
DECLARE
  v_icf_key TEXT;
  v_precomputed_data JSONB;
  v_table_exists BOOLEAN;
BEGIN
  -- ICF 코드 배열을 정렬하여 키 생성
  v_icf_key := array_to_string(ARRAY(SELECT unnest(p_icf_codes) ORDER BY unnest), ',');

  -- 사전 계산된 매핑 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'icf_iso_precomputed_mappings'
  ) INTO v_table_exists;

  -- 사전 계산된 매핑이 있고 사용 옵션이 활성화되고 테이블이 존재하는 경우
  IF p_use_precomputed AND v_table_exists THEN
    BEGIN
      SELECT iso_matches INTO v_precomputed_data
      FROM icf_iso_precomputed_mappings
      WHERE icf_codes_key = v_icf_key
        AND confidence_score >= p_min_score
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- 테이블이 없거나 오류 발생 시 NULL로 설정하여 실시간 계산으로 폴백
        v_precomputed_data := NULL;
    END;

    -- 사전 계산된 매핑이 있으면 사용
    IF v_precomputed_data IS NOT NULL THEN
      -- 사용 통계 업데이트 (비동기로 처리 가능)
      BEGIN
        UPDATE icf_iso_precomputed_mappings
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE icf_codes_key = v_icf_key;
      EXCEPTION
        WHEN OTHERS THEN
          -- 업데이트 실패해도 계속 진행 (통계는 선택적)
          NULL;
      END;

      -- 사전 계산된 ISO 코드로 제품 조회
      RETURN QUERY
      WITH precomputed_iso_codes AS (
        SELECT
          (match->>'isoCode')::VARCHAR as iso_code,
          (match->>'score')::NUMERIC as match_score
        FROM jsonb_array_elements(v_precomputed_data) as match
        WHERE (match->>'score')::NUMERIC >= p_min_score
      ),
      matched_products AS (
        SELECT DISTINCT
          p.id as product_id,
          p.name as product_name,
          ic.code as iso_code_str,
          p.iso_code_id,
          ic.name as iso_label,
          pic.match_score,
          p.manufacturer,
          p.description,
          p.image_url,
          p.purchase_link,
          p.price,
          p.category,
          format('사전 계산된 매칭 (ISO: %s, 점수: %.2f)', ic.name, pic.match_score) as match_reason
        FROM products p
        INNER JOIN iso_codes ic ON p.iso_code_id = ic.id
        INNER JOIN precomputed_iso_codes pic ON ic.code = pic.iso_code
        WHERE p.is_active = true
          AND p.iso_code_id IS NOT NULL
      )
      SELECT
        mp.product_id,
        mp.product_name,
        mp.iso_code_str,
        mp.iso_code_id,
        mp.iso_label,
        mp.match_score,
        mp.match_reason,
        mp.manufacturer,
        mp.description,
        mp.image_url,
        mp.purchase_link,
        mp.price,
        mp.category,
        'precomputed'::VARCHAR as source
      FROM matched_products mp
      ORDER BY mp.match_score DESC, mp.product_name
      LIMIT p_limit;
      
      RETURN;
    END IF;
  END IF;

  -- 사전 계산된 매핑이 없으면 실시간 계산
  RETURN QUERY
  SELECT
    r.product_id,
    r.product_name,
    r.iso_code,
    r.iso_code_id,
    r.iso_label,
    r.match_score,
    r.match_reason,
    r.manufacturer,
    r.description,
    r.image_url,
    r.purchase_link,
    r.price,
    r.category,
    'computed'::VARCHAR as source
  FROM get_products_by_icf_codes(p_icf_codes, p_limit, p_min_score) r;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_products_by_icf_codes_with_cache IS 
  'ICF 코드 배열을 받아서 제품을 반환하는 함수 (사전 계산된 매핑 우선 사용)';

-- =========================================================
-- [3] 인덱스 최적화
-- =========================================================

-- ISO 코드 매칭을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_icf_iso_mappings_iso_active 
ON icf_iso_mappings(iso_code_id, is_active) 
WHERE is_active = true;

-- 제품 조회 최적화를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_products_iso_active_created 
ON products(iso_code_id, is_active, created_at DESC) 
WHERE is_active = true AND iso_code_id IS NOT NULL;

-- 사전 계산된 매핑 조회 최적화 (테이블이 존재하는 경우에만)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'icf_iso_precomputed_mappings'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_precomputed_icf_key_confidence 
    ON icf_iso_precomputed_mappings(icf_codes_key, confidence_score DESC);
  END IF;
END $$;

-- =========================================================
-- [4] ISO 9999:2022 계층 구조를 반영한 Materialized View
-- =========================================================

-- 기존 Materialized View 삭제 (있다면)
DROP MATERIALIZED VIEW IF EXISTS mv_icf_iso_product_matches CASCADE;

-- 인덱스도 함께 삭제
DROP INDEX IF EXISTS idx_mv_icf_iso_product_icf CASCADE;
DROP INDEX IF EXISTS idx_mv_icf_iso_product_iso CASCADE;
DROP INDEX IF EXISTS idx_mv_icf_iso_product_active CASCADE;
DROP INDEX IF EXISTS idx_mv_icf_iso_product_mapping_iso CASCADE;
DROP INDEX IF EXISTS idx_mv_icf_iso_product_product_iso CASCADE;
DROP INDEX IF EXISTS idx_mv_icf_iso_product_match_type_score CASCADE;
DROP INDEX IF EXISTS idx_mv_icf_iso_product_mapping_product CASCADE;

-- ISO 9999:2022 계층 구조를 고려한 Materialized View 생성
CREATE MATERIALIZED VIEW mv_icf_iso_product_matches AS
WITH iso_hierarchy AS (
  -- ISO 코드의 계층 구조를 미리 계산
  SELECT 
    ic.id,
    ic.code,
    ic.name,
    ic.level,
    ic.parent_code,
    -- Class 코드 추출 (level 1)
    CASE 
      WHEN ic.level = 1 THEN ic.code
      WHEN ic.level = 2 THEN SPLIT_PART(ic.code, ' ', 1)
      WHEN ic.level = 3 THEN SPLIT_PART(ic.code, ' ', 1)
    END as class_code,
    -- Subclass 코드 추출 (level 2)
    CASE 
      WHEN ic.level = 2 THEN ic.code
      WHEN ic.level = 3 THEN SPLIT_PART(ic.code, ' ', 1) || ' ' || SPLIT_PART(ic.code, ' ', 2)
    END as subclass_code,
    -- Division 코드 (level 3만 해당)
    CASE 
      WHEN ic.level = 3 THEN ic.code
    END as division_code
  FROM iso_codes ic
  WHERE ic.is_active = true
),
mapping_with_hierarchy AS (
  -- ICF-ISO 매핑에 ISO 코드의 계층 정보 추가
  SELECT 
    m.id as mapping_id,
    m.icf_codes,
    m.iso_code,
    m.iso_code_id,
    m.base_score,
    m.label as mapping_label,
    m.description as mapping_description,
    ih.level as iso_level,
    ih.class_code,
    ih.subclass_code,
    ih.division_code,
    ih.name as iso_label
  FROM icf_iso_mappings m
  INNER JOIN iso_hierarchy ih ON m.iso_code_id = ih.id
  WHERE m.is_active = true
),
product_with_hierarchy AS (
  -- 제품의 ISO 코드 계층 정보 추가
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.manufacturer,
    p.description as product_description,
    p.image_url,
    p.purchase_link,
    p.price,
    p.category,
    p.is_active as product_active,
    p.created_at as product_created_at,
    p.iso_code_id,
    ih.code as product_iso_code,
    ih.level as product_iso_level,
    ih.class_code as product_class_code,
    ih.subclass_code as product_subclass_code,
    ih.division_code as product_division_code
  FROM products p
  INNER JOIN iso_hierarchy ih ON p.iso_code_id = ih.id
  WHERE p.is_active = true
    AND p.iso_code_id IS NOT NULL
    AND ih.level = 3  -- 제품은 Division 레벨(level 3)에만 배정됨
)
SELECT DISTINCT
  m.mapping_id,
  m.icf_codes,
  m.iso_code as mapping_iso_code,
  m.iso_code_id as mapping_iso_code_id,
  m.iso_level as mapping_iso_level,
  m.iso_label,
  m.base_score,
  m.mapping_label,
  m.mapping_description,
  p.product_id,
  p.product_name,
  p.product_iso_code,
  p.iso_code_id as product_iso_code_id,
  p.manufacturer,
  p.product_description,
  p.image_url,
  p.purchase_link,
  p.price,
  p.category,
  p.product_active,
  p.product_created_at,
  -- 매칭 타입: exact (정확히 일치), subclass (Subclass 레벨 매칭), class (Class 레벨 매칭)
  CASE 
    WHEN m.iso_level = 3 AND m.division_code = p.product_division_code THEN 'exact'
    WHEN m.iso_level = 2 AND m.subclass_code = p.product_subclass_code THEN 'subclass'
    WHEN m.iso_level = 1 AND m.class_code = p.product_class_code THEN 'class'
    ELSE 'unknown'
  END as match_type,
  -- 매칭 점수: 정확한 매칭일수록 높은 점수
  CASE 
    WHEN m.iso_level = 3 AND m.division_code = p.product_division_code THEN m.base_score
    WHEN m.iso_level = 2 AND m.subclass_code = p.product_subclass_code THEN m.base_score * 0.8  -- Subclass 매칭은 80% 점수
    WHEN m.iso_level = 1 AND m.class_code = p.product_class_code THEN m.base_score * 0.6  -- Class 매칭은 60% 점수
    ELSE 0
  END as match_score
FROM mapping_with_hierarchy m
INNER JOIN product_with_hierarchy p ON (
  -- ISO 9999:2022 계층 구조에 따른 매칭 조건
  -- 1. Division 레벨 매핑 → 정확히 해당 Division 제품만
  (m.iso_level = 3 AND m.division_code = p.product_division_code)
  OR
  -- 2. Subclass 레벨 매핑 → 해당 Subclass의 모든 Division 제품
  (m.iso_level = 2 AND m.subclass_code = p.product_subclass_code)
  OR
  -- 3. Class 레벨 매핑 → 해당 Class의 모든 Division 제품
  (m.iso_level = 1 AND m.class_code = p.product_class_code)
)
ORDER BY 
  m.mapping_id,
  match_score DESC,
  p.product_created_at DESC;

-- Materialized View 인덱스 생성
CREATE INDEX idx_mv_icf_iso_product_icf 
ON mv_icf_iso_product_matches USING GIN(icf_codes);

CREATE INDEX idx_mv_icf_iso_product_mapping_iso 
ON mv_icf_iso_product_matches(mapping_iso_code_id);

CREATE INDEX idx_mv_icf_iso_product_product_iso 
ON mv_icf_iso_product_matches(product_iso_code_id);

CREATE INDEX idx_mv_icf_iso_product_match_type_score 
ON mv_icf_iso_product_matches(match_type, match_score DESC);

CREATE INDEX idx_mv_icf_iso_product_active 
ON mv_icf_iso_product_matches(product_active, product_created_at DESC)
WHERE product_active = true;

CREATE INDEX idx_mv_icf_iso_product_mapping_product 
ON mv_icf_iso_product_matches(mapping_id, product_id);

COMMENT ON MATERIALIZED VIEW mv_icf_iso_product_matches IS 
  'ICF-ISO-제품 매칭 결과를 사전 계산한 Materialized View (ISO 9999:2022 계층 구조 반영)';

-- =========================================================
-- [5] 통계 및 갱신 함수
-- =========================================================

CREATE OR REPLACE FUNCTION get_icf_iso_matching_stats(
  p_icf_codes TEXT[]
)
RETURNS TABLE (
  total_mappings INTEGER,
  matched_iso_codes INTEGER,
  matched_products INTEGER,
  avg_score NUMERIC,
  max_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT m.id) as total_mappings,
      COUNT(DISTINCT m.iso_code_id) as matched_iso_codes,
      COUNT(DISTINCT p.id) as matched_products,
      AVG(m.base_score) as avg_score,
      MAX(m.base_score) as max_score
    FROM icf_iso_mappings m
    INNER JOIN iso_codes ic ON m.iso_code_id = ic.id
    LEFT JOIN products p ON p.iso_code_id = m.iso_code_id AND p.is_active = true
    WHERE m.is_active = true
      AND ic.is_active = true
      AND m.icf_codes && p_icf_codes
  )
  SELECT
    s.total_mappings::INTEGER,
    s.matched_iso_codes::INTEGER,
    s.matched_products::INTEGER,
    COALESCE(s.avg_score, 0)::NUMERIC,
    COALESCE(s.max_score, 0)::NUMERIC
  FROM stats s;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_icf_iso_matching_stats IS 
  'ICF 코드 매칭 통계를 반환하는 함수 (성능 모니터링용)';

CREATE OR REPLACE FUNCTION refresh_mv_icf_iso_product_matches()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_icf_iso_product_matches;
EXCEPTION
  WHEN OTHERS THEN
    -- CONCURRENTLY가 실패하면 일반 REFRESH 시도
    REFRESH MATERIALIZED VIEW mv_icf_iso_product_matches;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_mv_icf_iso_product_matches IS 
  'mv_icf_iso_product_matches Materialized View를 갱신하는 함수';

-- =========================================================
-- [6] 검증 쿼리
-- =========================================================

DO $$
DECLARE
  v_exact_count INTEGER;
  v_subclass_count INTEGER;
  v_class_count INTEGER;
  v_total_count INTEGER;
  v_view_exists BOOLEAN;
BEGIN
  -- Materialized View 존재 여부 확인
  SELECT EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE matviewname = 'mv_icf_iso_product_matches'
  ) INTO v_view_exists;
  
  IF NOT v_view_exists THEN
    RAISE WARNING 'Materialized View가 생성되지 않았습니다.';
    RETURN;
  END IF;
  
  -- 컬럼 존재 여부 확인
  BEGIN
    SELECT COUNT(*) INTO v_exact_count
    FROM mv_icf_iso_product_matches
    WHERE match_type = 'exact';
    
    SELECT COUNT(*) INTO v_subclass_count
    FROM mv_icf_iso_product_matches
    WHERE match_type = 'subclass';
    
    SELECT COUNT(*) INTO v_class_count
    FROM mv_icf_iso_product_matches
    WHERE match_type = 'class';
    
    SELECT COUNT(*) INTO v_total_count
    FROM mv_icf_iso_product_matches;
    
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'ICF-ISO-제품 매칭 시스템 구축 완료';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '전체 매칭 수: %', v_total_count;
    RAISE NOTICE 'Division 레벨 정확 매칭: %', v_exact_count;
    RAISE NOTICE 'Subclass 레벨 매칭: %', v_subclass_count;
    RAISE NOTICE 'Class 레벨 매칭: %', v_class_count;
    RAISE NOTICE '=========================================================';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE WARNING 'match_type 컬럼이 존재하지 않습니다. Materialized View 생성이 실패했을 수 있습니다.';
    WHEN OTHERS THEN
      RAISE WARNING '검증 중 오류 발생: %', SQLERRM;
  END;
END $$;
