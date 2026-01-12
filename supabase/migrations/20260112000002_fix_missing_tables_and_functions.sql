-- =========================================================
-- [LinkAble] 누락된 테이블 및 함수 추가, recommend_products_by_icf 함수 수정
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-12
-- =========================================================
--
-- 이 마이그레이션은 다음 문제들을 해결합니다:
-- 1. pgvector 확장 활성화
-- 2. matching_weight_configs 테이블 누락
-- 3. matching_performance_logs 테이블 누락
-- 4. icf_iso_precomputed_mappings 테이블 누락
-- 5. search_similar_icf_iso_mappings 함수 누락
-- 6. get_realtime_weight_adjustment 함수 누락
-- 7. recommend_products_by_icf 함수의 "set-returning functions are not allowed in FILTER" 에러 수정
-- =========================================================

-- =========================================================
-- [0] pgvector 확장 활성화
-- =========================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- =========================================================
-- [1] matching_weight_configs 테이블 생성
-- =========================================================

CREATE TABLE IF NOT EXISTS matching_weight_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    -- 가중치 설정
    weight_rule_based DECIMAL(3, 2) NOT NULL DEFAULT 0.30 CHECK (weight_rule_based >= 0 AND weight_rule_based <= 1),
    weight_semantic DECIMAL(3, 2) NOT NULL DEFAULT 0.40 CHECK (weight_semantic >= 0 AND weight_semantic <= 1),
    weight_knowledge_graph DECIMAL(3, 2) NOT NULL DEFAULT 0.20 CHECK (weight_knowledge_graph >= 0 AND weight_knowledge_graph <= 1),
    weight_keyword DECIMAL(3, 2) NOT NULL DEFAULT 0.10 CHECK (weight_keyword >= 0 AND weight_keyword <= 1),

    -- 추가 설정
    min_score DECIMAL(3, 2) DEFAULT 0.50,
    top_k INTEGER DEFAULT 10,
    similarity_threshold DECIMAL(3, 2) DEFAULT 0.70,

    -- 활성화 설정
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,

    -- A/B 테스트 설정
    is_ab_test_variant BOOLEAN DEFAULT FALSE,
    ab_test_name VARCHAR(100),
    ab_test_traffic_percentage INTEGER DEFAULT 0 CHECK (ab_test_traffic_percentage >= 0 AND ab_test_traffic_percentage <= 100),

    -- 메타데이터
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_weight_sum CHECK (
        ABS((weight_rule_based + weight_semantic + weight_knowledge_graph + weight_keyword) - 1.0) < 0.01
    )
);

COMMENT ON TABLE matching_weight_configs IS '하이브리드 매칭 시스템 가중치 설정';

-- =========================================================
-- [2] matching_performance_logs 테이블 생성
-- =========================================================

CREATE TABLE IF NOT EXISTS matching_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    weight_config_id UUID REFERENCES matching_weight_configs(id) ON DELETE SET NULL,
    weight_config_name VARCHAR(255),

    icf_codes TEXT[] NOT NULL,
    icf_code_count INTEGER NOT NULL,
    analysis_summary TEXT,

    matched_iso_codes TEXT[] NOT NULL,
    match_count INTEGER NOT NULL,
    top_match_score DECIMAL(5, 4),
    average_match_score DECIMAL(5, 4),

    execution_time_ms INTEGER,
    semantic_match_used BOOLEAN DEFAULT FALSE,
    knowledge_graph_used BOOLEAN DEFAULT FALSE,

    recommendation_clicked BOOLEAN DEFAULT FALSE,
    purchase_completed BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE matching_performance_logs IS '하이브리드 매칭 성능 측정 로그';

-- =========================================================
-- [3] icf_iso_precomputed_mappings 테이블 생성
-- =========================================================

CREATE TABLE IF NOT EXISTS icf_iso_precomputed_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icf_codes_key TEXT NOT NULL,
    icf_codes TEXT[] NOT NULL,
    iso_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
    match_method VARCHAR(50) DEFAULT 'hybrid',
    confidence_score DECIMAL(3, 2) DEFAULT 0.70,
    success_rate DECIMAL(5, 4) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT icf_iso_precomputed_mappings_unique UNIQUE (icf_codes_key)
);

COMMENT ON TABLE icf_iso_precomputed_mappings IS '사전 계산된 ICF-ISO 매핑 캐시';

-- =========================================================
-- [4] 인덱스 생성
-- =========================================================

-- matching_weight_configs 인덱스
CREATE INDEX IF NOT EXISTS idx_matching_weight_configs_active ON matching_weight_configs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_matching_weight_configs_default ON matching_weight_configs(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_matching_weight_configs_ab_test ON matching_weight_configs(ab_test_name, is_ab_test_variant) WHERE is_ab_test_variant = TRUE;

-- matching_performance_logs 인덱스
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_config ON matching_performance_logs(weight_config_id, created_at);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_config_name ON matching_performance_logs(weight_config_name, created_at);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_consultation ON matching_performance_logs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_user ON matching_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_created_at ON matching_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_icf_codes ON matching_performance_logs USING GIN(icf_codes);

-- icf_iso_precomputed_mappings 인덱스
CREATE INDEX IF NOT EXISTS idx_precomputed_icf_codes_key ON icf_iso_precomputed_mappings(icf_codes_key);
CREATE INDEX IF NOT EXISTS idx_precomputed_icf_codes_array ON icf_iso_precomputed_mappings USING GIN(icf_codes);
CREATE INDEX IF NOT EXISTS idx_precomputed_usage_count ON icf_iso_precomputed_mappings(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_precomputed_success_rate ON icf_iso_precomputed_mappings(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_precomputed_confidence ON icf_iso_precomputed_mappings(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_precomputed_last_used ON icf_iso_precomputed_mappings(last_used_at DESC NULLS LAST);

-- =========================================================
-- [5] 기본 가중치 설정 삽입
-- =========================================================

INSERT INTO matching_weight_configs (
    name,
    description,
    weight_rule_based,
    weight_semantic,
    weight_knowledge_graph,
    weight_keyword,
    min_score,
    top_k,
    similarity_threshold,
    is_active,
    is_default
) VALUES (
    'default',
    '기본 하이브리드 매칭 설정 (규칙 30%, 시맨틱 40%, 지식 그래프 20%, 키워드 10%)',
    0.30,
    0.40,
    0.20,
    0.10,
    0.50,
    10,
    0.70,
    TRUE,
    TRUE
) ON CONFLICT (name) DO UPDATE SET
    weight_rule_based = EXCLUDED.weight_rule_based,
    weight_semantic = EXCLUDED.weight_semantic,
    weight_knowledge_graph = EXCLUDED.weight_knowledge_graph,
    weight_keyword = EXCLUDED.weight_keyword,
    updated_at = NOW();

-- =========================================================
-- [6] search_similar_icf_iso_mappings 함수 생성
-- =========================================================

CREATE OR REPLACE FUNCTION search_similar_icf_iso_mappings(
    query_embedding extensions.vector(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    mapping_id UUID,
    icf_codes TEXT[],
    iso_code VARCHAR(50),
    iso_code_id UUID,
    label VARCHAR(255),
    base_score NUMERIC,
    similarity FLOAT
) AS $$
BEGIN
    -- embedding 컬럼이 있는 경우에만 벡터 검색 수행
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'icf_iso_mappings' AND column_name = 'embedding'
    ) THEN
        RETURN QUERY
        SELECT
            m.id as mapping_id,
            m.icf_codes,
            m.iso_code,
            m.iso_code_id,
            m.label,
            m.base_score,
            1 - (m.embedding <=> query_embedding) as similarity
        FROM icf_iso_mappings m
        WHERE m.is_active = true
          AND m.embedding IS NOT NULL
          AND 1 - (m.embedding <=> query_embedding) >= similarity_threshold
        ORDER BY similarity DESC
        LIMIT max_results;
    ELSE
        -- embedding 컬럼이 없으면 빈 결과 반환
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_similar_icf_iso_mappings IS '벡터 유사도 기반 ICF-ISO 매핑 검색 함수';

-- =========================================================
-- [7] get_realtime_weight_adjustment 함수 생성
-- =========================================================

CREATE OR REPLACE FUNCTION get_realtime_weight_adjustment(
    p_icf_codes TEXT[],
    p_iso_code TEXT
)
RETURNS TABLE (
    weight_adjustment NUMERIC,
    sample_count INTEGER,
    click_rate NUMERIC,
    purchase_rate NUMERIC
) AS $$
DECLARE
    v_config realtime_learning_configs%ROWTYPE;
    v_click_count INTEGER;
    v_purchase_count INTEGER;
    v_total_count INTEGER;
    v_click_rate NUMERIC;
    v_purchase_rate NUMERIC;
    v_adjustment NUMERIC := 1.0;
BEGIN
    -- 활성화된 실시간 학습 설정 조회
    SELECT * INTO v_config
    FROM realtime_learning_configs
    WHERE is_active = true
    LIMIT 1;

    -- 설정이 없으면 기본값 반환
    IF v_config IS NULL THEN
        RETURN QUERY SELECT 1.0::NUMERIC, 0, 0.0::NUMERIC, 0.0::NUMERIC;
        RETURN;
    END IF;

    -- 해당 ICF-ISO 조합의 통계 조회
    SELECT
        COUNT(*) FILTER (WHERE r.is_clicked = true),
        COUNT(*) FILTER (WHERE r.purchase_completed = true),
        COUNT(*)
    INTO v_click_count, v_purchase_count, v_total_count
    FROM recommendations r
    INNER JOIN products p ON r.product_id = p.id
    INNER JOIN iso_codes ic ON p.iso_code_id = ic.id
    INNER JOIN consultations c ON r.consultation_id = c.id
    INNER JOIN analysis_results ar ON c.id = ar.consultation_id
    WHERE ic.code = p_iso_code
      AND ar.icf_codes ?| p_icf_codes;

    -- 최소 샘플 수 확인
    IF v_total_count < v_config.min_sample_count THEN
        RETURN QUERY SELECT 1.0::NUMERIC, v_total_count, 0.0::NUMERIC, 0.0::NUMERIC;
        RETURN;
    END IF;

    -- 비율 계산
    v_click_rate := v_click_count::NUMERIC / GREATEST(v_total_count, 1);
    v_purchase_rate := v_purchase_count::NUMERIC / GREATEST(v_total_count, 1);

    -- 가중치 조정 계산
    v_adjustment := 1.0;

    -- 클릭률 기반 조정
    IF v_click_rate >= v_config.click_rate_threshold THEN
        v_adjustment := v_adjustment + (v_config.click_rate_boost_factor * (v_click_rate / v_config.click_rate_threshold));
    END IF;

    -- 구매율 기반 조정
    v_adjustment := v_adjustment + (v_config.purchase_rate_boost_factor * v_purchase_rate);

    -- 최대/최소 제한
    v_adjustment := LEAST(v_adjustment, v_config.max_weight_boost);
    v_adjustment := GREATEST(v_adjustment, v_config.min_weight_penalty);

    RETURN QUERY SELECT v_adjustment, v_total_count, v_click_rate, v_purchase_rate;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_realtime_weight_adjustment IS 'ICF-ISO 조합의 실시간 가중치 조정 계수 조회';

-- =========================================================
-- [8] recommend_products_by_icf 함수 수정 (FILTER 내 unnest 에러 수정)
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
    -- ICF 코드 매칭 개수를 미리 계산
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
  'ICF 코드 배열을 받아서 제품 품질 점수를 반영한 추천 목록을 반환하는 함수 (수정됨)';

-- =========================================================
-- [9] A/B 테스트 결과 집계 뷰 생성
-- =========================================================

CREATE OR REPLACE VIEW view_ab_test_matching_results AS
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

COMMENT ON VIEW view_ab_test_matching_results IS 'A/B 테스트별 매칭 성능 비교 뷰';

-- =========================================================
-- 완료
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '마이그레이션 완료: 누락된 테이블 및 함수 추가';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - matching_weight_configs';
  RAISE NOTICE '  - matching_performance_logs';
  RAISE NOTICE '  - icf_iso_precomputed_mappings';
  RAISE NOTICE '생성/수정된 함수:';
  RAISE NOTICE '  - search_similar_icf_iso_mappings';
  RAISE NOTICE '  - get_realtime_weight_adjustment';
  RAISE NOTICE '  - recommend_products_by_icf (FILTER 내 unnest 에러 수정)';
  RAISE NOTICE '=========================================================';
END $$;
