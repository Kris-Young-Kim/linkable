-- =========================================================
-- [LinkAble] Phase 2: 제품 ICF 점수 및 조합 패턴 분석 함수
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-12
-- =========================================================
--
-- Phase 2 목표:
-- 1. get_product_icf_scores 함수 추가 (제품별 ICF 코드 매칭 점수 조회)
-- 2. get_icf_combination_patterns 함수 추가 (ICF 코드 조합 패턴 분석)
-- 3. 실시간 학습 함수 주기적 실행 지원
-- =========================================================

-- =========================================================
-- [1] 제품별 ICF 코드 매칭 점수 조회 함수
-- =========================================================
-- 
-- 이 함수는 제품 ID를 받아서 해당 제품과 매칭되는 ICF 코드들의 점수를 반환합니다.
-- 제품 설명, 이름, 카테고리 등을 분석하여 ICF 코드와의 관련성을 계산합니다.
-- =========================================================

CREATE OR REPLACE FUNCTION get_product_icf_scores(
  p_product_id UUID,
  p_min_score NUMERIC DEFAULT 0.3,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  icf_code VARCHAR(50),
  icf_name TEXT,
  icf_category VARCHAR(1),
  match_score NUMERIC,
  match_method VARCHAR(50),
  match_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH product_info AS (
    -- 제품 정보 조회
    SELECT
      p.id,
      p.name,
      p.description,
      p.category,
      p.iso_code_id,
      ic.code as iso_code,
      ic.name as iso_name
    FROM products p
    LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
    WHERE p.id = p_product_id
      AND p.is_active = true
  ),
  iso_based_icf_matches AS (
    -- ISO 코드를 통해 매칭된 ICF 코드 (가장 신뢰도 높음)
    SELECT DISTINCT
      unnest(m.icf_codes) as icf_code,
      m.base_score as match_score,
      'iso_mapping'::VARCHAR(50) as match_method,
      format('ISO 코드 매핑 (%s)', ic.name) as match_reason
    FROM product_info pi
    INNER JOIN icf_iso_mappings m ON pi.iso_code_id = m.iso_code_id
    INNER JOIN iso_codes ic ON m.iso_code_id = ic.id
    WHERE m.is_active = true
      AND pi.iso_code_id IS NOT NULL
  ),
  keyword_based_matches AS (
    -- 키워드 기반 ICF 코드 매칭 (제품명, 설명에서 추출)
    SELECT DISTINCT
      icf.code as icf_code,
      CASE
        -- 제품명에 ICF 관련 키워드가 포함된 경우 높은 점수
        WHEN LOWER(pi.name) LIKE '%' || LOWER(icf.keywords) || '%' THEN 0.7
        -- 설명에 키워드가 포함된 경우 중간 점수
        WHEN pi.description IS NOT NULL AND LOWER(pi.description) LIKE '%' || LOWER(icf.keywords) || '%' THEN 0.5
        -- 카테고리 매칭
        WHEN pi.category IS NOT NULL AND LOWER(pi.category) LIKE '%' || LOWER(icf.keywords) || '%' THEN 0.4
        ELSE 0.3
      END as match_score,
      'keyword'::VARCHAR(50) as match_method,
      format('키워드 매칭 (%s)', icf.keywords) as match_reason
    FROM product_info pi
    CROSS JOIN (
      -- 주요 ICF 코드와 키워드 매핑 (예시)
      SELECT 'b210' as code, '시각' as keywords, 'b' as category
      UNION ALL SELECT 'b210', '눈', 'b'
      UNION ALL SELECT 'b210', '시력', 'b'
      UNION ALL SELECT 'b230', '청각', 'b'
      UNION ALL SELECT 'b230', '귀', 'b'
      UNION ALL SELECT 'b230', '청력', 'b'
      UNION ALL SELECT 'd550', '식사', 'd'
      UNION ALL SELECT 'd550', '먹기', 'd'
      UNION ALL SELECT 'd410', '앉기', 'd'
      UNION ALL SELECT 'd410', '좌식', 'd'
      UNION ALL SELECT 'd450', '걷기', 'd'
      UNION ALL SELECT 'd450', '보행', 'd'
      UNION ALL SELECT 'd360', '의사소통', 'd'
      UNION ALL SELECT 'd360', '소통', 'd'
      UNION ALL SELECT 'e110', '제품', 'e'
      UNION ALL SELECT 'e110', '물건', 'e'
      -- 더 많은 키워드 매핑 추가 가능
    ) icf
    WHERE pi.id = p_product_id
  ),
  combined_matches AS (
    -- ISO 기반 매칭과 키워드 매칭 통합
    SELECT
      COALESCE(iso.icf_code, kw.icf_code) as icf_code,
      GREATEST(
        COALESCE(iso.match_score, 0),
        COALESCE(kw.match_score, 0)
      ) as match_score,
      CASE
        WHEN iso.match_score IS NOT NULL AND kw.match_score IS NOT NULL THEN 'hybrid'
        WHEN iso.match_score IS NOT NULL THEN iso.match_method
        ELSE kw.match_method
      END as match_method,
      CASE
        WHEN iso.match_reason IS NOT NULL AND kw.match_reason IS NOT NULL 
        THEN format('%s + %s', iso.match_reason, kw.match_reason)
        WHEN iso.match_reason IS NOT NULL THEN iso.match_reason
        ELSE kw.match_reason
      END as match_reason
    FROM iso_based_icf_matches iso
    FULL OUTER JOIN keyword_based_matches kw ON iso.icf_code = kw.icf_code
  )
  SELECT
    cm.icf_code,
    COALESCE(icf.name, '알 수 없음') as icf_name,
    COALESCE(icf.category, SUBSTRING(cm.icf_code, 1, 1)) as icf_category,
    cm.match_score,
    cm.match_method,
    cm.match_reason
  FROM combined_matches cm
  LEFT JOIN (
    -- ICF 코드 정보 (실제 테이블이 있다면 조인)
    SELECT 'b210' as code, '시각 기능' as name, 'b' as category
    UNION ALL SELECT 'b230', '청각 기능', 'b'
    UNION ALL SELECT 'd550', '식사', 'd'
    UNION ALL SELECT 'd410', '앉기', 'd'
    UNION ALL SELECT 'd450', '걷기', 'd'
    UNION ALL SELECT 'd360', '의사소통', 'd'
    UNION ALL SELECT 'e110', '제품 및 물질', 'e'
    -- 더 많은 ICF 코드 정보 추가 필요
  ) icf ON cm.icf_code = icf.code
  WHERE cm.match_score >= p_min_score
  ORDER BY cm.match_score DESC, cm.icf_code
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_icf_scores IS 
  '제품 ID를 받아서 해당 제품과 매칭되는 ICF 코드들의 점수를 반환하는 함수';

-- =========================================================
-- [2] ICF 코드 조합 패턴 분석 함수
-- =========================================================
-- 
-- 이 함수는 자주 사용되는 ICF 코드 조합 패턴을 분석하여 반환합니다.
-- 상담 데이터를 기반으로 빈도, 성공률, 선호 ISO 코드 등을 계산합니다.
-- =========================================================

CREATE OR REPLACE FUNCTION get_icf_combination_patterns(
  p_min_frequency INTEGER DEFAULT 3,
  p_limit INTEGER DEFAULT 50,
  p_days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
  icf_codes TEXT[],
  icf_codes_key TEXT,
  frequency INTEGER,
  unique_consultations INTEGER,
  avg_feedback_rating NUMERIC,
  click_rate NUMERIC,
  purchase_rate NUMERIC,
  preferred_iso_codes TEXT[],
  success_rate NUMERIC,
  last_seen_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH date_filter AS (
    SELECT NOW() - (p_days_back || ' days')::INTERVAL as start_date
  ),
  consultation_icf_combinations AS (
    -- 상담별 ICF 코드 조합 추출
    SELECT DISTINCT
      c.id as consultation_id,
      c.created_at,
      ARRAY_AGG(DISTINCT cic.icf_code_id::TEXT ORDER BY cic.icf_code_id) as icf_codes,
      array_to_string(ARRAY_AGG(DISTINCT cic.icf_code_id::TEXT ORDER BY cic.icf_code_id), ',') as icf_codes_key
    FROM consultations c
    INNER JOIN consultation_icf_codes cic ON c.id = cic.consultation_id
    CROSS JOIN date_filter df
    WHERE c.created_at >= df.start_date
    GROUP BY c.id, c.created_at
    HAVING COUNT(DISTINCT cic.icf_code_id) > 0
  ),
  combination_stats AS (
    -- 조합별 기본 통계
    SELECT
      cic.icf_codes,
      cic.icf_codes_key,
      COUNT(DISTINCT cic.consultation_id) as frequency,
      COUNT(DISTINCT cic.consultation_id) as unique_consultations,
      MAX(cic.created_at) as last_seen_at
    FROM consultation_icf_combinations cic
    GROUP BY cic.icf_codes, cic.icf_codes_key
    HAVING COUNT(DISTINCT cic.consultation_id) >= p_min_frequency
  ),
  combination_feedback AS (
    -- 조합별 피드백 통계
    SELECT
      cic.icf_codes_key,
      AVG(cf.accuracy_rating) as avg_feedback_rating,
      COUNT(cf.id) as feedback_count
    FROM consultation_icf_combinations cic
    INNER JOIN consultation_feedback cf ON cic.consultation_id = cf.consultation_id
    WHERE cf.accuracy_rating IS NOT NULL
    GROUP BY cic.icf_codes_key
  ),
  combination_recommendations AS (
    -- 조합별 추천 통계 (클릭률, 구매율)
    SELECT
      cic.icf_codes_key,
      COUNT(DISTINCT r.id) as total_recommendations,
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as total_clicks,
      COUNT(DISTINCT r.id) FILTER (WHERE r.purchase_completed = true) as total_purchases,
      CASE 
        WHEN COUNT(DISTINCT r.id) > 0 
        THEN COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::NUMERIC / COUNT(DISTINCT r.id)::NUMERIC
        ELSE 0
      END as click_rate,
      CASE 
        WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) > 0
        THEN COUNT(DISTINCT r.id) FILTER (WHERE r.purchase_completed = true)::NUMERIC / 
             COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::NUMERIC
        ELSE 0
      END as purchase_rate
    FROM consultation_icf_combinations cic
    LEFT JOIN recommendations r ON cic.consultation_id = r.consultation_id
    GROUP BY cic.icf_codes_key
  ),
  combination_iso_preferences AS (
    -- 조합별 선호 ISO 코드 (클릭률이 높은 ISO 코드)
    SELECT
      cic.icf_codes_key,
      ARRAY_AGG(DISTINCT ic.code ORDER BY ic.code) FILTER (
        WHERE r.is_clicked = true
      ) as preferred_iso_codes
    FROM consultation_icf_combinations cic
    INNER JOIN recommendations r ON cic.consultation_id = r.consultation_id
    INNER JOIN products p ON r.product_id = p.id
    INNER JOIN iso_codes ic ON p.iso_code_id = ic.id
    WHERE r.is_clicked = true
      AND ic.code IS NOT NULL
    GROUP BY cic.icf_codes_key
  ),
  combination_success_rate AS (
    -- 조합별 성공률 계산 (피드백 4점 이상 또는 구매 완료)
    SELECT
      cic.icf_codes_key,
      CASE
        WHEN COUNT(DISTINCT cic.consultation_id) > 0 THEN
          (
            COUNT(DISTINCT cf.consultation_id) FILTER (WHERE cf.accuracy_rating >= 4) +
            COUNT(DISTINCT r.consultation_id) FILTER (WHERE r.purchase_completed = true)
          )::NUMERIC / COUNT(DISTINCT cic.consultation_id)::NUMERIC
        ELSE 0
      END as success_rate
    FROM consultation_icf_combinations cic
    LEFT JOIN consultation_feedback cf ON cic.consultation_id = cf.consultation_id
    LEFT JOIN recommendations r ON cic.consultation_id = r.consultation_id
    GROUP BY cic.icf_codes_key
  )
  SELECT
    cs.icf_codes,
    cs.icf_codes_key,
    cs.frequency::INTEGER,
    cs.unique_consultations::INTEGER,
    COALESCE(cf.avg_feedback_rating, 0)::NUMERIC as avg_feedback_rating,
    COALESCE(cr.click_rate, 0)::NUMERIC as click_rate,
    COALESCE(cr.purchase_rate, 0)::NUMERIC as purchase_rate,
    COALESCE(cio.preferred_iso_codes, ARRAY[]::TEXT[]) as preferred_iso_codes,
    COALESCE(csr.success_rate, 0)::NUMERIC as success_rate,
    cs.last_seen_at
  FROM combination_stats cs
  LEFT JOIN combination_feedback cf ON cs.icf_codes_key = cf.icf_codes_key
  LEFT JOIN combination_recommendations cr ON cs.icf_codes_key = cr.icf_codes_key
  LEFT JOIN combination_iso_preferences cio ON cs.icf_codes_key = cio.icf_codes_key
  LEFT JOIN combination_success_rate csr ON cs.icf_codes_key = csr.icf_codes_key
  ORDER BY cs.frequency DESC, csr.success_rate DESC, cs.last_seen_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_icf_combination_patterns IS 
  '자주 사용되는 ICF 코드 조합 패턴을 분석하여 반환하는 함수 (빈도, 성공률, 선호 ISO 코드 포함)';

-- =========================================================
-- [3] 실시간 학습 통계 일괄 업데이트 함수
-- =========================================================
-- 
-- 이 함수는 실시간 학습 통계를 일괄로 업데이트합니다.
-- Cron 작업에서 주기적으로 호출하여 최신 통계를 반영합니다.
-- =========================================================

CREATE OR REPLACE FUNCTION batch_update_realtime_learning_stats(
  p_days_back INTEGER DEFAULT 7,
  p_min_events INTEGER DEFAULT 5
)
RETURNS TABLE (
  updated_combinations INTEGER,
  total_events_processed INTEGER,
  avg_weight_adjustment NUMERIC
) AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_total_events INTEGER := 0;
  v_total_adjustment NUMERIC := 0;
  v_avg_adjustment NUMERIC := 0;
  v_table_exists BOOLEAN := false;
  v_stats_table_exists BOOLEAN := false;
  v_rec RECORD;
BEGIN
  -- realtime_learning_events 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'realtime_learning_events'
  ) INTO v_table_exists;

  -- realtime_learning_stats 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'realtime_learning_stats'
  ) INTO v_stats_table_exists;

  -- 테이블이 없으면 빈 결과 반환
  IF NOT v_table_exists OR NOT v_stats_table_exists THEN
    RAISE NOTICE 'realtime_learning_events 또는 realtime_learning_stats 테이블이 존재하지 않습니다. 빈 결과를 반환합니다.';
    RETURN QUERY
    SELECT
      0::INTEGER,
      0::INTEGER,
      1.0::NUMERIC;
    RETURN;
  END IF;

  -- 최근 N일간의 이벤트 집계 및 통계 업데이트
  -- 각 조합에 대해 통계 업데이트 함수를 호출하여 실제 업데이트 수행
  FOR v_rec IN (
    SELECT
      icf_codes_key,
      iso_code,
      event_type,
      feedback_rating,
      COUNT(*) as event_count
    FROM realtime_learning_events
    WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY icf_codes_key, iso_code, event_type, feedback_rating
    HAVING COUNT(*) >= p_min_events
  ) LOOP
    -- 총 이벤트 수 누적
    v_total_events := v_total_events + v_rec.event_count;
    
    -- 실제 통계 업데이트 수행
    -- update_realtime_learning_stats는 내부적으로 집계를 처리하므로
    -- 각 이벤트 타입별로 한 번씩 호출
    PERFORM update_realtime_learning_stats(
      string_to_array(v_rec.icf_codes_key, ','),
      v_rec.iso_code,
      v_rec.event_type,
      v_rec.feedback_rating
    );
  END LOOP;
  
  -- 고유 조합 수 계산 (icf_codes_key, iso_code 기준)
  -- 업데이트된 조합의 수를 정확히 계산
  SELECT COUNT(DISTINCT (icf_codes_key, iso_code))::INTEGER
  INTO v_updated_count
  FROM realtime_learning_events
  WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND (
      SELECT COUNT(*)
      FROM realtime_learning_events re2
      WHERE re2.icf_codes_key = realtime_learning_events.icf_codes_key
        AND re2.iso_code = realtime_learning_events.iso_code
        AND re2.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    ) >= p_min_events;

  -- 평균 가중치 조정 계산
  SELECT
    AVG(weight_adjustment)::NUMERIC
  INTO v_avg_adjustment
  FROM realtime_learning_stats
  WHERE last_adjustment_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  RETURN QUERY
  SELECT
    v_updated_count,
    v_total_events,
    COALESCE(v_avg_adjustment, 1.0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_update_realtime_learning_stats IS 
  '실시간 학습 통계를 일괄로 업데이트하는 함수 (Cron 작업용)';

-- =========================================================
-- [4] 인덱스 최적화
-- =========================================================

-- consultation_icf_codes 인덱스 (조합 패턴 분석용)
CREATE INDEX IF NOT EXISTS idx_consultation_icf_codes_consultation_icf 
ON consultation_icf_codes(consultation_id, icf_code_id);

-- recommendations 인덱스 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_recommendations_consultation_clicked 
ON recommendations(consultation_id, is_clicked) 
WHERE is_clicked = true;

-- realtime_learning_events 인덱스 (일괄 업데이트용)
-- 테이블이 존재하는 경우에만 인덱스 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'realtime_learning_events'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_created_key 
    ON realtime_learning_events(created_at DESC, icf_codes_key, iso_code);
  END IF;
END $$;

-- =========================================================
-- 완료
-- =========================================================
