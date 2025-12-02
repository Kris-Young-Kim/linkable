-- KPI 데이터 집계를 위한 View 및 프로시저 생성
-- 목적: Analytics API 성능 최적화 및 데이터 집계 로직 중앙화

-- ============================================================================
-- 1. 전체 플랫폼 통계 View
-- ============================================================================

CREATE OR REPLACE VIEW view_platform_stats AS
SELECT 
  -- 추천 통계
  (SELECT COUNT(*) FROM recommendations) as total_recommendations,
  (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations) > 0 
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) / 
      (SELECT COUNT(*)::numeric FROM recommendations) * 100, 
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  (SELECT COUNT(*) FROM ippa_evaluations) as total_ippa_evaluations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) > 0
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM ippa_evaluations) / 
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- 상담 통계
  (SELECT COUNT(*) FROM consultations) as total_consultations,
  (SELECT COUNT(*) FROM consultations WHERE status = 'completed') as completed_consultations,
  CASE 
    WHEN (SELECT COUNT(*) FROM consultations) > 0
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM consultations WHERE status = 'completed') / 
      (SELECT COUNT(*)::numeric FROM consultations) * 100,
      2
    )
    ELSE 0
  END as consultation_completion_rate,
  
  -- 평균 효과성 점수
  CASE 
    WHEN (SELECT COUNT(*) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL) > 0
    THEN ROUND(
      (SELECT AVG(effectiveness_score) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL),
      2
    )
    ELSE 0
  END as average_effectiveness_score,
  
  -- 최근 30일 활동
  (SELECT COUNT(*) FROM recommendations WHERE created_at >= NOW() - INTERVAL '30 days') as recent_recommendations,
  (SELECT COUNT(*) FROM ippa_evaluations WHERE evaluated_at >= NOW() - INTERVAL '30 days') as recent_ippa_evaluations,
  
  -- 업데이트 시간
  NOW() as last_updated;

COMMENT ON VIEW view_platform_stats IS '전체 플랫폼 통계를 실시간으로 집계하는 View';

-- ============================================================================
-- 2. 일별 통계 View (최근 30일)
-- ============================================================================

CREATE OR REPLACE VIEW view_daily_stats AS
SELECT 
  DATE(created_at) as stat_date,
  COUNT(*) as recommendations_count,
  COUNT(*) FILTER (WHERE is_clicked = true) as clicked_count
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

COMMENT ON VIEW view_daily_stats IS '최근 30일 일별 추천 통계';

-- ============================================================================
-- 3. 사용자별 통계 View
-- ============================================================================

CREATE OR REPLACE VIEW view_user_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  u.points,
  u.created_at as user_created_at,
  
  -- 상담 통계
  COUNT(DISTINCT c.id) as total_consultations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_consultations,
  
  -- 추천 통계
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  
  -- K-IPPA 평가 통계
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) > 0
    THEN ROUND(
      COUNT(DISTINCT i.id)::numeric / 
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- 평균 효과성 점수
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 최근 활동
  MAX(r.created_at) as last_recommendation_at,
  MAX(i.evaluated_at) as last_ippa_evaluation_at

FROM users u
LEFT JOIN consultations c ON c.user_id = u.id
LEFT JOIN recommendations r ON r.consultation_id = c.id
LEFT JOIN ippa_evaluations i ON i.user_id = u.id
GROUP BY u.id, u.email, u.name, u.role, u.points, u.created_at;

COMMENT ON VIEW view_user_analytics IS '사용자별 상세 통계를 집계하는 View';

-- ============================================================================
-- 4. 상품별 통계 View
-- ============================================================================

CREATE OR REPLACE VIEW view_product_stats AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.iso_code,
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
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.iso_code, p.manufacturer, p.price;

COMMENT ON VIEW view_product_stats IS '상품별 추천 및 평가 통계를 집계하는 View';

-- ============================================================================
-- 5. ISO 코드별 통계 View
-- ============================================================================

CREATE OR REPLACE VIEW view_iso_code_stats AS
SELECT 
  p.iso_code,
  
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
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.iso_code;

COMMENT ON VIEW view_iso_code_stats IS 'ISO 코드별 추천 및 평가 통계를 집계하는 View';

-- ============================================================================
-- 6. 인덱스 생성 (성능 최적화)
-- ============================================================================

-- 추천 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_is_clicked ON recommendations(is_clicked);
CREATE INDEX IF NOT EXISTS idx_recommendations_consultation_id ON recommendations(consultation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_product_id ON recommendations(product_id);

-- 평가 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_evaluated_at ON ippa_evaluations(evaluated_at);
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_recommendation_id ON ippa_evaluations(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_user_id ON ippa_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_product_id ON ippa_evaluations(product_id);

-- 상담 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);

-- ============================================================================
-- 7. 사용자별 KPI 계산 프로시저
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_kpi(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  total_consultations BIGINT,
  completed_consultations BIGINT,
  total_recommendations BIGINT,
  clicked_recommendations BIGINT,
  click_through_rate NUMERIC,
  total_ippa_evaluations BIGINT,
  ippa_participation_rate NUMERIC,
  average_effectiveness_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    ua.total_consultations,
    ua.completed_consultations,
    ua.total_recommendations,
    ua.clicked_recommendations,
    CASE 
      WHEN ua.total_recommendations > 0
      THEN ROUND(
        ua.clicked_recommendations::numeric / ua.total_recommendations::numeric * 100,
        2
      )
      ELSE 0
    END as click_through_rate,
    ua.total_ippa_evaluations,
    ua.ippa_participation_rate,
    ua.average_effectiveness_score
  FROM view_user_analytics ua
  WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_kpi(UUID) IS '특정 사용자의 KPI를 계산하는 프로시저';

-- ============================================================================
-- 8. 기간별 통계 계산 프로시저
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_period_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_recommendations BIGINT,
  clicked_recommendations BIGINT,
  click_through_rate NUMERIC,
  total_ippa_evaluations BIGINT,
  average_effectiveness_score NUMERIC,
  total_consultations BIGINT,
  completed_consultations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_start_date as period_start,
    p_end_date as period_end,
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
    COUNT(DISTINCT i.id) as total_ippa_evaluations,
    CASE 
      WHEN COUNT(DISTINCT i.id) > 0
      THEN ROUND(
        AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
        2
      )
      ELSE NULL
    END as average_effectiveness_score,
    COUNT(DISTINCT c.id) as total_consultations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_consultations
  FROM recommendations r
  LEFT JOIN consultations c ON c.id = r.consultation_id
  LEFT JOIN ippa_evaluations i ON i.recommendation_id = r.id
  WHERE r.created_at >= p_start_date AND r.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_period_stats(TIMESTAMPTZ, TIMESTAMPTZ) IS '특정 기간의 통계를 계산하는 프로시저';

