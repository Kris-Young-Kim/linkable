-- =========================================================
-- [LinkAble] Security Definer View 및 RLS 보안 이슈 수정
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-01-14
-- =========================================================
-- 
-- 목적:
-- 1. SECURITY DEFINER로 설정된 뷰들을 SECURITY INVOKER로 변경
-- 2. RLS가 비활성화된 테이블들에 RLS 활성화
-- =========================================================

-- =========================================================
-- [1] Security Definer View 수정
-- =========================================================
-- 
-- PostgreSQL에서 뷰를 SECURITY INVOKER로 만들기 위해
-- 뷰를 재생성합니다. 기본적으로 뷰는 SECURITY INVOKER입니다.

-- 1-1. icf_code_expansion_priority 뷰 재생성
DROP VIEW IF EXISTS public.icf_code_expansion_priority CASCADE;
CREATE VIEW public.icf_code_expansion_priority AS
SELECT 
  s.icf_code,
  s.category,
  s.is_in_core_set,
  s.total_usage_count,
  s.unique_consultations,
  s.usage_by_source,
  s.first_seen_at,
  s.last_seen_at,
  -- 우선순위 점수 계산 (사용 빈도 + 고유 상담 수 + 최근성)
  (
    s.total_usage_count * 1.0 +
    s.unique_consultations * 2.0 +
    CASE 
      WHEN s.last_seen_at > NOW() - INTERVAL '7 days' THEN 5.0
      WHEN s.last_seen_at > NOW() - INTERVAL '30 days' THEN 2.0
      ELSE 0.0
    END
  ) AS priority_score
FROM icf_code_statistics s
WHERE s.is_in_core_set = false
ORDER BY priority_score DESC;

COMMENT ON VIEW public.icf_code_expansion_priority IS 'ICF 코드 확장 우선순위 - Core Set에 없는 코드의 확장 필요성 분석';

-- 1-2. view_iso_code_stats 뷰 재생성
DROP VIEW IF EXISTS public.view_iso_code_stats CASCADE;
CREATE VIEW public.view_iso_code_stats AS
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

COMMENT ON VIEW public.view_iso_code_stats IS 'ISO 코드별 추천 및 평가 통계를 집계하는 View';

-- 1-3. view_ab_test_matching_results 뷰 재생성
DROP VIEW IF EXISTS public.view_ab_test_matching_results CASCADE;
CREATE VIEW public.view_ab_test_matching_results AS
SELECT
    wc.ab_test_name,
    wc.name as variant_name,
    wc.weight_rule_based,
    wc.weight_semantic,
    wc.weight_knowledge_graph,
    wc.weight_keyword,

    COUNT(DISTINCT mpl.id) as total_matches,
    AVG(mpl.execution_time_ms) as avg_execution_time_ms,
    AVG(mpl.top_match_score) as avg_top_match_score,
    AVG(mpl.average_match_score) as avg_average_match_score,
    AVG(mpl.match_count) as avg_match_count,

    COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.recommendation_clicked = TRUE) as clicked_count,
    COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.purchase_completed = TRUE) as purchase_count,
    AVG(mpl.feedback_rating) FILTER (WHERE mpl.feedback_rating IS NOT NULL) as avg_feedback_rating,

    CASE
        WHEN COUNT(DISTINCT mpl.id) > 0
        THEN ROUND(
            COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.recommendation_clicked = TRUE)::numeric /
            COUNT(DISTINCT mpl.id)::numeric * 100,
            2
        )
        ELSE 0
    END as click_through_rate,

    CASE
        WHEN COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.recommendation_clicked = TRUE) > 0
        THEN ROUND(
            COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.purchase_completed = TRUE)::numeric /
            COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.recommendation_clicked = TRUE)::numeric * 100,
            2
        )
        ELSE 0
    END as purchase_conversion_rate,

    MIN(mpl.created_at) as first_match_at,
    MAX(mpl.created_at) as last_match_at,
    COUNT(DISTINCT DATE(mpl.created_at)) as active_days

FROM matching_weight_configs wc
LEFT JOIN matching_performance_logs mpl ON mpl.weight_config_name = wc.name
WHERE wc.is_ab_test_variant = TRUE
  AND wc.ab_test_name IS NOT NULL
GROUP BY
    wc.ab_test_name,
    wc.name,
    wc.weight_rule_based,
    wc.weight_semantic,
    wc.weight_knowledge_graph,
    wc.weight_keyword
ORDER BY wc.ab_test_name, wc.name;

COMMENT ON VIEW public.view_ab_test_matching_results IS 'A/B 테스트별 매칭 성능 비교 뷰';

-- 1-4. view_platform_stats 뷰 재생성
DROP VIEW IF EXISTS public.view_platform_stats CASCADE;
CREATE VIEW public.view_platform_stats AS
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
      -- recommendation_id가 있고 해당 추천이 클릭된 평가만 카운트
      (SELECT COUNT(*)::numeric 
       FROM ippa_evaluations i
       INNER JOIN recommendations r ON i.recommendation_id = r.id
       WHERE r.is_clicked = true 
         AND i.recommendation_id IS NOT NULL) / 
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

COMMENT ON VIEW public.view_platform_stats IS '전체 플랫폼 통계를 실시간으로 집계하는 View';

-- 1-5. view_consultation_icf_codes_jsonb 뷰 재생성
DROP VIEW IF EXISTS public.view_consultation_icf_codes_jsonb CASCADE;
CREATE VIEW public.view_consultation_icf_codes_jsonb AS
SELECT 
    c.id as consultation_id,
    jsonb_build_object(
        'b', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'b'),
            '[]'::jsonb
        ),
        'd', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'd'),
            '[]'::jsonb
        ),
        'e', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'e'),
            '[]'::jsonb
        ),
        'p', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'p'),
            '[]'::jsonb
        )
    ) as icf_codes
FROM consultations c
LEFT JOIN consultation_icf_codes cic ON cic.consultation_id = c.id
LEFT JOIN icf_codes ic ON cic.icf_code_id = ic.id
GROUP BY c.id;

COMMENT ON VIEW public.view_consultation_icf_codes_jsonb IS '상담별 ICF 코드를 JSONB 형태로 조회 (하위 호환성)';

-- 1-6. view_user_analytics 뷰 재생성
DROP VIEW IF EXISTS public.view_user_analytics CASCADE;
CREATE VIEW public.view_user_analytics AS
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

COMMENT ON VIEW public.view_user_analytics IS '사용자별 상세 통계를 집계하는 View';

-- 1-7. view_daily_stats 뷰 재생성
DROP VIEW IF EXISTS public.view_daily_stats CASCADE;
CREATE VIEW public.view_daily_stats AS
SELECT 
  DATE(created_at) as stat_date,
  COUNT(*) as recommendations_count,
  COUNT(*) FILTER (WHERE is_clicked = true) as clicked_count
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

COMMENT ON VIEW public.view_daily_stats IS '최근 30일 일별 추천 통계';

-- 1-8. product_quality_scores 뷰 재생성
DROP VIEW IF EXISTS public.product_quality_scores CASCADE;
CREATE VIEW public.product_quality_scores AS
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

COMMENT ON VIEW public.product_quality_scores IS 
  '제품별 품질 점수를 사전 계산한 뷰 (클릭률, 피드백, 효과성 점수 포함)';

-- 1-9. view_products_with_codes 뷰 재생성
DROP VIEW IF EXISTS public.view_products_with_codes CASCADE;
CREATE VIEW public.view_products_with_codes AS
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

COMMENT ON VIEW public.view_products_with_codes IS 'products 테이블과 코드 테이블 조인 뷰 (하위 호환성)';

-- 1-10. view_consultation_icf_codes_detail 뷰 재생성
DROP VIEW IF EXISTS public.view_consultation_icf_codes_detail CASCADE;
CREATE VIEW public.view_consultation_icf_codes_detail AS
SELECT 
    c.id as consultation_id,
    cic.id as relation_id,
    ic.id as icf_code_id,
    ic.code as icf_code,
    ic.category,
    ic.name as icf_code_name,
    ic.name_en as icf_code_name_en,
    ic.description,
    ic.is_in_core_set,
    cic.source,
    cic.confidence_score,
    cic.context,
    cic.created_at
FROM consultations c
INNER JOIN consultation_icf_codes cic ON cic.consultation_id = c.id
INNER JOIN icf_codes ic ON cic.icf_code_id = ic.id;

COMMENT ON VIEW public.view_consultation_icf_codes_detail IS '상담별 ICF 코드 상세 조회 뷰';

-- 1-11. view_product_stats 뷰 재생성
DROP VIEW IF EXISTS public.view_product_stats CASCADE;
CREATE VIEW public.view_product_stats AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.iso_code_id,
  p.manufacturer_id,
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
GROUP BY p.id, p.name, p.iso_code_id, p.manufacturer_id, p.price;

COMMENT ON VIEW public.view_product_stats IS '상품별 추천 및 평가 통계를 집계하는 View';

-- =========================================================
-- [2] RLS 활성화
-- =========================================================
-- 
-- 개발 단계에서 RLS가 비활성화된 테이블들에 RLS를 활성화합니다.
-- 주의: RLS를 활성화한 후에는 적절한 정책(POLICY)이 필요합니다.
-- 개발 단계에서는 모든 사용자가 접근할 수 있도록 정책을 설정하거나,
-- Service Role Key를 사용하는 API에서는 RLS가 우회됩니다.

-- 2-1. matching_performance_logs 테이블 RLS 활성화
ALTER TABLE IF EXISTS public.matching_performance_logs 
  ENABLE ROW LEVEL SECURITY;

-- 2-2. matching_weight_configs 테이블 RLS 활성화
ALTER TABLE IF EXISTS public.matching_weight_configs 
  ENABLE ROW LEVEL SECURITY;

-- 2-3. icf_iso_precomputed_mappings 테이블 RLS 활성화
ALTER TABLE IF EXISTS public.icf_iso_precomputed_mappings 
  ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- [3] 기본 RLS 정책 생성 (개발 단계용)
-- =========================================================
-- 
-- 개발 단계에서는 모든 사용자가 읽기/쓰기 가능하도록 설정합니다.
-- 프로덕션 배포 전에 적절한 정책으로 변경해야 합니다.

-- 3-1. matching_performance_logs 기본 정책
DO $$
BEGIN
  -- SELECT 정책 (모든 사용자 읽기 가능)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'matching_performance_logs' 
    AND policyname = 'matching_performance_logs_select_all'
  ) THEN
    CREATE POLICY "matching_performance_logs_select_all"
    ON public.matching_performance_logs
    FOR SELECT
    USING (true);
  END IF;

  -- INSERT 정책 (모든 사용자 쓰기 가능)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'matching_performance_logs' 
    AND policyname = 'matching_performance_logs_insert_all'
  ) THEN
    CREATE POLICY "matching_performance_logs_insert_all"
    ON public.matching_performance_logs
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 3-2. matching_weight_configs 기본 정책
DO $$
BEGIN
  -- SELECT 정책 (모든 사용자 읽기 가능)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'matching_weight_configs' 
    AND policyname = 'matching_weight_configs_select_all'
  ) THEN
    CREATE POLICY "matching_weight_configs_select_all"
    ON public.matching_weight_configs
    FOR SELECT
    USING (true);
  END IF;

  -- INSERT 정책 (모든 사용자 쓰기 가능)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'matching_weight_configs' 
    AND policyname = 'matching_weight_configs_insert_all'
  ) THEN
    CREATE POLICY "matching_weight_configs_insert_all"
    ON public.matching_weight_configs
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 3-3. icf_iso_precomputed_mappings 기본 정책
DO $$
BEGIN
  -- SELECT 정책 (모든 사용자 읽기 가능)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'icf_iso_precomputed_mappings' 
    AND policyname = 'icf_iso_precomputed_mappings_select_all'
  ) THEN
    CREATE POLICY "icf_iso_precomputed_mappings_select_all"
    ON public.icf_iso_precomputed_mappings
    FOR SELECT
    USING (true);
  END IF;

  -- INSERT 정책 (모든 사용자 쓰기 가능)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'icf_iso_precomputed_mappings' 
    AND policyname = 'icf_iso_precomputed_mappings_insert_all'
  ) THEN
    CREATE POLICY "icf_iso_precomputed_mappings_insert_all"
    ON public.icf_iso_precomputed_mappings
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- =========================================================
-- 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '보안 이슈 수정 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '수정된 뷰 (SECURITY INVOKER로 변경):';
  RAISE NOTICE '  - icf_code_expansion_priority';
  RAISE NOTICE '  - view_iso_code_stats';
  RAISE NOTICE '  - view_ab_test_matching_results';
  RAISE NOTICE '  - view_platform_stats';
  RAISE NOTICE '  - view_consultation_icf_codes_jsonb';
  RAISE NOTICE '  - view_user_analytics';
  RAISE NOTICE '  - view_daily_stats';
  RAISE NOTICE '  - product_quality_scores';
  RAISE NOTICE '  - view_products_with_codes';
  RAISE NOTICE '  - view_consultation_icf_codes_detail';
  RAISE NOTICE '  - view_product_stats';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS 활성화된 테이블:';
  RAISE NOTICE '  - matching_performance_logs';
  RAISE NOTICE '  - matching_weight_configs';
  RAISE NOTICE '  - icf_iso_precomputed_mappings';
  RAISE NOTICE '';
  RAISE NOTICE '주의: 프로덕션 배포 전에 RLS 정책을 적절히 수정하세요.';
  RAISE NOTICE '현재는 개발 단계용으로 모든 사용자가 접근 가능합니다.';
  RAISE NOTICE '=========================================================';
END $$;
