-- =========================================================
-- [LinkAble] Phase 1: 제품 품질 점수 뷰 및 추천 함수 구현
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-12
-- =========================================================
--
-- Phase 1 목표:
-- 1. product_quality_scores 뷰 생성 (제품별 품질 점수 사전 계산)
-- 2. recommend_products_by_icf 함수 생성 (ICF 코드 기반 제품 추천)
-- 3. 기존 API에서 함수 호출로 변경 가능하도록 최적화
-- =========================================================

-- =========================================================
-- [1] 제품 품질 점수 뷰 (product_quality_scores)
-- =========================================================
-- 
-- 이 뷰는 제품별로 다음 지표를 사전 계산합니다:
-- - 클릭률 (click_through_rate)
-- - 평균 피드백 점수 (average_feedback_rating)
-- - 평균 효과성 점수 (average_effectiveness_score)
-- - 종합 품질 점수 (overall_quality_score)
-- =========================================================

CREATE OR REPLACE VIEW product_quality_scores AS
WITH product_clicks AS (
  -- 제품별 클릭 통계
  SELECT
    product_id,
    COUNT(*) as total_recommendations,
    COUNT(*) FILTER (WHERE is_clicked = true) as total_clicks,
    CASE 
      WHEN COUNT(*) > 0 
      THEN COUNT(*) FILTER (WHERE is_clicked = true)::NUMERIC / COUNT(*)::NUMERIC
      ELSE 0
    END as click_through_rate
  FROM recommendations
  WHERE product_id IS NOT NULL
  GROUP BY product_id
),
product_feedback AS (
  -- 제품별 피드백 통계 (상담 피드백을 추천과 연결)
  SELECT
    r.product_id,
    COUNT(DISTINCT cf.id) as total_feedbacks,
    AVG(cf.accuracy_rating) as average_feedback_rating
  FROM recommendations r
  INNER JOIN consultation_feedback cf ON r.consultation_id = cf.consultation_id
  WHERE cf.accuracy_rating IS NOT NULL
    AND r.product_id IS NOT NULL
  GROUP BY r.product_id
),
product_effectiveness AS (
  -- 제품별 효과성 점수 통계 (K-IPPA 평가)
  SELECT
    product_id,
    COUNT(*) as total_evaluations,
    AVG(effectiveness_score) as average_effectiveness_score
  FROM ippa_evaluations
  WHERE effectiveness_score IS NOT NULL
    AND product_id IS NOT NULL
  GROUP BY product_id
)
SELECT
  p.id as product_id,
  p.name as product_name,
  p.iso_code_id,
  -- 클릭 통계
  COALESCE(pc.total_recommendations, 0) as total_recommendations,
  COALESCE(pc.total_clicks, 0) as total_clicks,
  COALESCE(pc.click_through_rate, 0) as click_through_rate,
  -- 피드백 통계
  COALESCE(pf.total_feedbacks, 0) as total_feedbacks,
  COALESCE(pf.average_feedback_rating, 0) as average_feedback_rating,
  -- 효과성 통계
  COALESCE(pe.total_evaluations, 0) as total_evaluations,
  COALESCE(pe.average_effectiveness_score, 0) as average_effectiveness_score,
  -- 종합 품질 점수 계산 (0-1 범위)
  -- 공식: (클릭률 × 0.3) + (피드백 점수 × 0.3) + (효과성 점수 × 0.2) + (샘플 보너스 × 0.2)
  LEAST(
    (COALESCE(pc.click_through_rate, 0) * 0.3) +
    (CASE 
      WHEN COALESCE(pf.average_feedback_rating, 0) > 0 
      THEN ((COALESCE(pf.average_feedback_rating, 0) - 1) / 4) * 0.3  -- 1-5점을 0-0.3으로 변환
      ELSE 0
    END) +
    (CASE 
      WHEN COALESCE(pe.average_effectiveness_score, 0) > 0 
      THEN LEAST(COALESCE(pe.average_effectiveness_score, 0) / 20, 1) * 0.2  -- 최대 20점 기준
      ELSE 0
    END) +
    (CASE 
      WHEN (COALESCE(pc.total_recommendations, 0) + COALESCE(pf.total_feedbacks, 0) + COALESCE(pe.total_evaluations, 0)) > 0
      THEN LEAST(
        (COALESCE(pc.total_recommendations, 0) + COALESCE(pf.total_feedbacks, 0) + COALESCE(pe.total_evaluations, 0)) / 100.0,
        0.2
      )  -- 샘플 보너스 (최대 0.2점)
      ELSE 0
    END),
    1.0
  ) as overall_quality_score,
  -- 마지막 업데이트 시간
  GREATEST(
    COALESCE((SELECT MAX(created_at) FROM recommendations WHERE product_id = p.id), '1970-01-01'::timestamp),
    COALESCE((SELECT MAX(created_at) FROM consultation_feedback WHERE consultation_id IN (SELECT consultation_id FROM recommendations WHERE product_id = p.id)), '1970-01-01'::timestamp),
    COALESCE((SELECT MAX(evaluated_at) FROM ippa_evaluations WHERE product_id = p.id), '1970-01-01'::timestamp)
  ) as last_updated_at
FROM products p
LEFT JOIN product_clicks pc ON p.id = pc.product_id
LEFT JOIN product_feedback pf ON p.id = pf.product_id
LEFT JOIN product_effectiveness pe ON p.id = pe.product_id
WHERE p.is_active = true;

COMMENT ON VIEW product_quality_scores IS 
  '제품별 품질 점수를 사전 계산한 뷰 (클릭률, 피드백, 효과성 점수 포함)';

-- 인덱스 생성 (뷰는 인덱스를 직접 생성할 수 없으므로, 기본 테이블에 인덱스가 필요)
-- 이미 존재하는 인덱스 확인 후 필요시 추가

-- =========================================================
-- [2] ICF 코드 기반 제품 추천 함수 (recommend_products_by_icf)
-- =========================================================
-- 
-- 이 함수는 ICF 코드 배열을 받아서 다음을 수행합니다:
-- 1. ICF 코드 → ISO 코드 매칭
-- 2. ISO 코드 → 제품 매칭
-- 3. 제품 품질 점수 반영
-- 4. 최종 점수로 정렬하여 추천
-- =========================================================

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
    -- 최종 ISO 매칭 점수 계산
    SELECT
      iso_code,
      iso_code_id,
      iso_code_str,
      iso_label,
      LEAST(base_score + (coverage_ratio * 0.3), 1.0) as iso_match_score
    FROM matched_iso_codes
    WHERE base_score + (coverage_ratio * 0.3) >= p_min_score
  ),
  matched_products AS (
    -- ISO 코드로 제품 조회 및 품질 점수 조인
    SELECT DISTINCT
      p.id as product_id,
      p.name as product_name,
      sim.iso_code_str,
      sim.iso_code_id,
      sim.iso_label,
      sim.iso_match_score,
      COALESCE(pqs.overall_quality_score, 0.5) as quality_score,  -- 품질 점수가 없으면 기본값 0.5
      -- 최종 점수 계산: ISO 매칭 점수 (70%) + 품질 점수 (30%)
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
      -- 매칭 이유 생성
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
  'ICF 코드 배열을 받아서 제품 품질 점수를 반영한 추천 목록을 반환하는 함수';

-- =========================================================
-- [3] 제품 품질 점수 뷰 갱신 함수 (선택사항)
-- =========================================================
-- 
-- 뷰는 자동으로 최신 데이터를 반영하지만, 
-- 성능 최적화를 위해 Materialized View로 전환할 수 있습니다.
-- 현재는 일반 뷰로 구현하여 항상 최신 데이터를 반영합니다.
-- =========================================================

-- 성능 모니터링을 위한 통계 함수
CREATE OR REPLACE FUNCTION get_product_quality_stats()
RETURNS TABLE (
  total_products INTEGER,
  products_with_clicks INTEGER,
  products_with_feedback INTEGER,
  products_with_effectiveness INTEGER,
  avg_quality_score NUMERIC,
  max_quality_score NUMERIC,
  min_quality_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_products,
    COUNT(*) FILTER (WHERE total_clicks > 0)::INTEGER as products_with_clicks,
    COUNT(*) FILTER (WHERE total_feedbacks > 0)::INTEGER as products_with_feedback,
    COUNT(*) FILTER (WHERE total_evaluations > 0)::INTEGER as products_with_effectiveness,
    AVG(overall_quality_score)::NUMERIC as avg_quality_score,
    MAX(overall_quality_score)::NUMERIC as max_quality_score,
    MIN(overall_quality_score)::NUMERIC as min_quality_score
  FROM product_quality_scores;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_quality_stats IS 
  '제품 품질 점수 뷰의 통계 정보를 반환하는 함수';

-- =========================================================
-- [4] 인덱스 최적화 (성능 향상)
-- =========================================================

-- recommendations 테이블 인덱스 (이미 존재할 수 있음)
CREATE INDEX IF NOT EXISTS idx_recommendations_product_id_clicked 
ON recommendations(product_id, is_clicked) 
WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_consultation_product 
ON recommendations(consultation_id, product_id);

-- consultation_feedback 인덱스
CREATE INDEX IF NOT EXISTS idx_consultation_feedback_consultation_rating 
ON consultation_feedback(consultation_id, accuracy_rating) 
WHERE accuracy_rating IS NOT NULL;

-- ippa_evaluations 인덱스
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_product_effectiveness 
ON ippa_evaluations(product_id, effectiveness_score) 
WHERE effectiveness_score IS NOT NULL;

-- =========================================================
-- 완료
-- =========================================================
