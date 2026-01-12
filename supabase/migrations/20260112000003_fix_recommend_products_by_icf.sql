-- =========================================================
-- [LinkAble] recommend_products_by_icf 함수 수정
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-12
-- =========================================================
--
-- 이 마이그레이션은 다음 문제를 해결합니다:
-- - "set-returning functions are not allowed in FILTER" 에러 수정
-- - FILTER 절 내에서 unnest() 사용 불가 문제를 서브쿼리로 해결
-- =========================================================

DROP FUNCTION IF EXISTS recommend_products_by_icf(TEXT[], INTEGER, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION recommend_products_by_icf(
  p_icf_codes TEXT[],
  p_limit INTEGER DEFAULT 20,
  p_min_score NUMERIC DEFAULT 0.4,
  p_use_quality_scores BOOLEAN DEFAULT true
)
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR(255),
  iso_code VARCHAR(50),
  iso_code_id UUID,
  iso_label VARCHAR(255),
  match_score NUMERIC,
  quality_score NUMERIC,
  final_score NUMERIC,
  match_reason TEXT,
  manufacturer VARCHAR(100),
  description TEXT,
  image_url TEXT,
  purchase_link TEXT,
  price DECIMAL(10, 2),
  category VARCHAR(100),
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH icf_overlaps AS (
    -- ICF 코드 매칭 개수를 서브쿼리로 계산 (FILTER 내 unnest 에러 수정)
    SELECT
      m.id as mapping_id,
      m.iso_code,
      m.iso_code_id,
      m.base_score,
      (
        SELECT COUNT(*)::NUMERIC
        FROM unnest(m.icf_codes) AS icf
        WHERE icf = ANY(p_icf_codes)
      ) as matched_count
    FROM icf_iso_mappings m
    WHERE m.is_active = true
      AND m.icf_codes && p_icf_codes
  ),
  matched_iso_codes AS (
    SELECT DISTINCT
      io.iso_code,
      io.iso_code_id,
      ic.code as iso_code_str,
      ic.name as iso_label,
      MAX(io.base_score) as base_score,
      MAX(io.matched_count) / GREATEST(ARRAY_LENGTH(p_icf_codes, 1), 1) as coverage_ratio
    FROM icf_overlaps io
    INNER JOIN iso_codes ic ON io.iso_code_id = ic.id
    WHERE ic.is_active = true
    GROUP BY io.iso_code, io.iso_code_id, ic.code, ic.name
  ),
  scored_iso_matches AS (
    SELECT
      mic.iso_code,
      mic.iso_code_id,
      mic.iso_code_str,
      mic.iso_label,
      LEAST(mic.base_score + (mic.coverage_ratio * 0.3), 1.0) as iso_match_score
    FROM matched_iso_codes mic
    WHERE mic.base_score + (mic.coverage_ratio * 0.3) >= p_min_score
  ),
  matched_products AS (
    SELECT DISTINCT
      p.id as product_id,
      p.name as product_name,
      sim.iso_code_str,
      sim.iso_code_id,
      sim.iso_label,
      sim.iso_match_score,
      COALESCE(pqs.overall_quality_score, 0.5) as quality_score,
      CASE
        WHEN p_use_quality_scores THEN
          (sim.iso_match_score * 0.7) + (COALESCE(pqs.overall_quality_score, 0.5) * 0.3)
        ELSE
          sim.iso_match_score
      END as final_score,
      p.manufacturer,
      p.description,
      p.image_url,
      p.purchase_link,
      p.price,
      p.category,
      format(
        'ICF 코드 매칭 (ISO: %s, 매칭점수: %.2f%s)',
        sim.iso_label,
        sim.iso_match_score,
        CASE
          WHEN p_use_quality_scores AND pqs.overall_quality_score IS NOT NULL
          THEN format(', 품질점수: %.2f', pqs.overall_quality_score)
          ELSE ''
        END
      ) as match_reason
    FROM products p
    INNER JOIN scored_iso_matches sim ON p.iso_code_id = sim.iso_code_id
    LEFT JOIN product_quality_scores pqs ON p.id = pqs.product_id
    WHERE p.is_active = true
      AND p.iso_code_id IS NOT NULL
  )
  SELECT
    mp.product_id,
    mp.product_name,
    mp.iso_code_str,
    mp.iso_code_id,
    mp.iso_label,
    mp.iso_match_score,
    mp.quality_score,
    mp.final_score,
    mp.match_reason,
    mp.manufacturer,
    mp.description,
    mp.image_url,
    mp.purchase_link,
    mp.price,
    mp.category,
    ROW_NUMBER() OVER (ORDER BY mp.final_score DESC, mp.iso_match_score DESC, mp.product_name)::INTEGER as rank
  FROM matched_products mp
  WHERE mp.final_score >= p_min_score
  ORDER BY mp.final_score DESC, mp.iso_match_score DESC, mp.product_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION recommend_products_by_icf IS
  'ICF 코드 배열을 받아서 제품 품질 점수를 반영한 추천 목록을 반환하는 함수 (FILTER 내 unnest 에러 수정됨)';
