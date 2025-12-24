-- =========================================================
-- [LinkAble] AI 품질 측정 결과 저장 및 점수 반영 시스템
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-02-27
-- =========================================================
-- 
-- 목적: ICF 정확도 측정 결과를 데이터베이스에 저장하고 점수에 반영
-- 
-- 기능:
-- 1. ICF 추출 정확도 측정 결과 저장
-- 2. ISO 매칭 정확도 측정 결과 저장
-- 3. 측정 결과 기반 점수 계산 및 업데이트
-- =========================================================

-- =========================================================
-- [1] ICF 추출 정확도 측정 결과 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS ai_quality_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('icf_extraction', 'iso_matching')),
    
    -- 전체 정확도 지표
    overall_precision DECIMAL(5, 4) NOT NULL, -- 전체 정밀도 (0.0-1.0)
    overall_recall DECIMAL(5, 4) NOT NULL, -- 전체 재현율 (0.0-1.0)
    overall_f1 DECIMAL(5, 4) NOT NULL, -- 전체 F1 점수 (0.0-1.0)
    
    -- ISO 매칭 전용 지표 (iso_matching 타입일 때만 사용)
    top1_accuracy DECIMAL(5, 4), -- Top-1 정확도
    top3_accuracy DECIMAL(5, 4), -- Top-3 정확도
    top5_accuracy DECIMAL(5, 4), -- Top-5 정확도
    
    -- 테스트 통계
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    
    -- 카테고리별 상세 결과 (JSONB)
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- 매칭 방법별 비교 (ISO 매칭 전용)
    matching_method_comparison JSONB DEFAULT '{}'::jsonb,
    
    -- 목표 달성 여부
    target_accuracy DECIMAL(5, 4) DEFAULT 0.85, -- 목표 정확도 (기본값: 85%)
    target_achieved BOOLEAN GENERATED ALWAYS AS (overall_f1 >= target_accuracy) STORED,
    
    -- 메타데이터
    measured_by TEXT, -- 측정한 사용자/시스템
    notes TEXT, -- 추가 메모
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_quality_measurements IS 'AI 품질 측정 결과 (ICF 추출 및 ISO 매칭 정확도)';
COMMENT ON COLUMN ai_quality_measurements.measurement_type IS '측정 유형: icf_extraction(ICF 추출), iso_matching(ISO 매칭)';
COMMENT ON COLUMN ai_quality_measurements.overall_f1 IS '전체 F1 점수 (정확도의 주요 지표)';
COMMENT ON COLUMN ai_quality_measurements.target_achieved IS '목표 정확도(85%) 달성 여부 (자동 계산)';
COMMENT ON COLUMN ai_quality_measurements.category_breakdown IS '카테고리별 상세 정확도 (JSON 형식)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_quality_measurements_type 
ON ai_quality_measurements(measurement_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_quality_measurements_target 
ON ai_quality_measurements(target_achieved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_quality_measurements_f1 
ON ai_quality_measurements(overall_f1 DESC);

-- =========================================================
-- [2] 최신 측정 결과 뷰
-- =========================================================

CREATE OR REPLACE VIEW v_latest_ai_quality_measurements AS
SELECT DISTINCT ON (measurement_type)
    id,
    measurement_type,
    overall_precision,
    overall_recall,
    overall_f1,
    top1_accuracy,
    top3_accuracy,
    top5_accuracy,
    total_tests,
    passed_tests,
    failed_tests,
    target_accuracy,
    target_achieved,
    category_breakdown,
    matching_method_comparison,
    created_at
FROM ai_quality_measurements
ORDER BY measurement_type, created_at DESC;

COMMENT ON VIEW v_latest_ai_quality_measurements IS '최신 AI 품질 측정 결과 (측정 유형별)';

-- =========================================================
-- [3] 점수 계산 함수
-- =========================================================

-- ICF 정확도를 5점 만점 점수로 변환하는 함수
CREATE OR REPLACE FUNCTION calculate_ai_quality_score(
    p_icf_f1 DECIMAL,
    p_iso_f1 DECIMAL DEFAULT NULL
)
RETURNS DECIMAL(3, 2) AS $$
DECLARE
    v_icf_score DECIMAL(3, 2);
    v_iso_score DECIMAL(3, 2);
    v_final_score DECIMAL(3, 2);
BEGIN
    -- ICF 추출 정확도 점수 (F1 점수를 5점 만점으로 변환)
    -- 0.85 (85%) = 4.25점, 1.0 (100%) = 5.0점
    v_icf_score := LEAST(5.0, (p_icf_f1 / 0.85) * 4.25);
    
    -- ISO 매칭 정확도 점수 (있는 경우)
    IF p_iso_f1 IS NOT NULL THEN
        v_iso_score := LEAST(5.0, (p_iso_f1 / 0.85) * 4.25);
        -- 두 점수의 평균 (ICF 60%, ISO 40%)
        v_final_score := (v_icf_score * 0.6) + (v_iso_score * 0.4);
    ELSE
        -- ICF 점수만 사용
        v_final_score := v_icf_score;
    END IF;
    
    -- 최소 1.0점 보장
    RETURN GREATEST(1.0, v_final_score);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_ai_quality_score IS 'ICF/ISO 정확도를 5점 만점 점수로 변환';

-- =========================================================
-- [4] 점수 업데이트 함수
-- =========================================================

-- 최신 측정 결과를 기반으로 점수를 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_ai_quality_score()
RETURNS TABLE(
    measurement_type TEXT,
    overall_f1 DECIMAL,
    calculated_score DECIMAL,
    target_achieved BOOLEAN
) AS $$
DECLARE
    v_icf_measurement RECORD;
    v_iso_measurement RECORD;
    v_icf_f1 DECIMAL;
    v_iso_f1 DECIMAL;
    v_final_score DECIMAL;
BEGIN
    -- 최신 ICF 추출 정확도 조회
    SELECT overall_f1 INTO v_icf_f1
    FROM v_latest_ai_quality_measurements
    WHERE measurement_type = 'icf_extraction'
    LIMIT 1;
    
    -- 최신 ISO 매칭 정확도 조회
    SELECT overall_f1 INTO v_iso_f1
    FROM v_latest_ai_quality_measurements
    WHERE measurement_type = 'iso_matching'
    LIMIT 1;
    
    -- 점수 계산
    IF v_icf_f1 IS NOT NULL THEN
        v_final_score := calculate_ai_quality_score(v_icf_f1, v_iso_f1);
        
        -- 결과 반환
        RETURN QUERY
        SELECT 
            'icf_extraction'::TEXT,
            v_icf_f1,
            v_final_score,
            (v_icf_f1 >= 0.85) AS target_achieved;
        
        IF v_iso_f1 IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                'iso_matching'::TEXT,
                v_iso_f1,
                v_final_score,
                (v_iso_f1 >= 0.85) AS target_achieved;
        END IF;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_ai_quality_score IS '최신 측정 결과를 기반으로 AI 품질 점수 계산 및 반환';

-- =========================================================
-- [5] 측정 결과 저장 함수
-- =========================================================

-- ICF 추출 정확도 측정 결과를 저장하는 함수
CREATE OR REPLACE FUNCTION save_icf_extraction_measurement(
    p_overall_precision DECIMAL,
    p_overall_recall DECIMAL,
    p_overall_f1 DECIMAL,
    p_total_tests INTEGER,
    p_passed_tests INTEGER,
    p_failed_tests INTEGER,
    p_category_breakdown JSONB DEFAULT '{}'::jsonb,
    p_measured_by TEXT DEFAULT 'system',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_measurement_id UUID;
BEGIN
    INSERT INTO ai_quality_measurements (
        measurement_type,
        overall_precision,
        overall_recall,
        overall_f1,
        total_tests,
        passed_tests,
        failed_tests,
        category_breakdown,
        measured_by,
        notes
    ) VALUES (
        'icf_extraction',
        p_overall_precision,
        p_overall_recall,
        p_overall_f1,
        p_total_tests,
        p_passed_tests,
        p_failed_tests,
        p_category_breakdown,
        p_measured_by,
        p_notes
    )
    RETURNING id INTO v_measurement_id;
    
    RETURN v_measurement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION save_icf_extraction_measurement IS 'ICF 추출 정확도 측정 결과 저장';

-- ISO 매칭 정확도 측정 결과를 저장하는 함수
CREATE OR REPLACE FUNCTION save_iso_matching_measurement(
    p_overall_precision DECIMAL,
    p_overall_recall DECIMAL,
    p_overall_f1 DECIMAL,
    p_top1_accuracy DECIMAL DEFAULT NULL,
    p_top3_accuracy DECIMAL DEFAULT NULL,
    p_top5_accuracy DECIMAL DEFAULT NULL,
    p_total_tests INTEGER,
    p_passed_tests INTEGER,
    p_failed_tests INTEGER,
    p_category_breakdown JSONB DEFAULT '{}'::jsonb,
    p_matching_method_comparison JSONB DEFAULT '{}'::jsonb,
    p_measured_by TEXT DEFAULT 'system',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_measurement_id UUID;
BEGIN
    INSERT INTO ai_quality_measurements (
        measurement_type,
        overall_precision,
        overall_recall,
        overall_f1,
        top1_accuracy,
        top3_accuracy,
        top5_accuracy,
        total_tests,
        passed_tests,
        failed_tests,
        category_breakdown,
        matching_method_comparison,
        measured_by,
        notes
    ) VALUES (
        'iso_matching',
        p_overall_precision,
        p_overall_recall,
        p_overall_f1,
        p_top1_accuracy,
        p_top3_accuracy,
        p_top5_accuracy,
        p_total_tests,
        p_passed_tests,
        p_failed_tests,
        p_category_breakdown,
        p_matching_method_comparison,
        p_measured_by,
        p_notes
    )
    RETURNING id INTO v_measurement_id;
    
    RETURN v_measurement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION save_iso_matching_measurement IS 'ISO 매칭 정확도 측정 결과 저장';

-- =========================================================
-- [6] 통계 집계 뷰
-- =========================================================

CREATE OR REPLACE VIEW v_ai_quality_trends AS
SELECT 
    measurement_type,
    DATE(created_at) AS measurement_date,
    COUNT(*) AS measurement_count,
    AVG(overall_f1) AS avg_f1,
    MAX(overall_f1) AS max_f1,
    MIN(overall_f1) AS min_f1,
    AVG(CASE WHEN target_achieved THEN 1.0 ELSE 0.0 END) AS target_achievement_rate,
    COUNT(*) FILTER (WHERE target_achieved) AS target_achieved_count
FROM ai_quality_measurements
GROUP BY measurement_type, DATE(created_at)
ORDER BY measurement_type, measurement_date DESC;

COMMENT ON VIEW v_ai_quality_trends IS 'AI 품질 측정 결과 추이 (일별 집계)';

-- =========================================================
-- [7] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'AI 품질 측정 결과 저장 및 점수 반영 시스템 구축 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - ai_quality_measurements: 측정 결과 저장';
  RAISE NOTICE '생성된 뷰:';
  RAISE NOTICE '  - v_latest_ai_quality_measurements: 최신 측정 결과';
  RAISE NOTICE '  - v_ai_quality_trends: 측정 결과 추이';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - calculate_ai_quality_score(): 정확도를 5점 만점으로 변환';
  RAISE NOTICE '  - update_ai_quality_score(): 최신 측정 결과 기반 점수 계산';
  RAISE NOTICE '  - save_icf_extraction_measurement(): ICF 추출 정확도 저장';
  RAISE NOTICE '  - save_iso_matching_measurement(): ISO 매칭 정확도 저장';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '사용 방법:';
  RAISE NOTICE '  1. 측정 스크립트 실행 후 결과를 DB에 저장';
  RAISE NOTICE '  2. SELECT * FROM update_ai_quality_score(); 로 점수 확인';
  RAISE NOTICE '  3. SELECT * FROM v_latest_ai_quality_measurements; 로 최신 결과 확인';
  RAISE NOTICE '=========================================================';
END $$;

