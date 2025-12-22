-- =========================================================
-- [LinkAble] 하이브리드 매칭 가중치 설정 및 A/B 테스트
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-21
-- =========================================================
-- 
-- 목적: 하이브리드 매칭 시스템의 가중치를 동적으로 관리하고 A/B 테스트 수행
-- 

-- =========================================================
-- [1] 매칭 가중치 설정 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS matching_weight_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- 설정 이름 (예: "default", "semantic_boost", "ab_test_variant_a")
    description TEXT, -- 설정 설명
    
    -- 가중치 설정 (합계가 1.0이 되도록 권장)
    weight_rule_based DECIMAL(3, 2) NOT NULL DEFAULT 0.30 CHECK (weight_rule_based >= 0 AND weight_rule_based <= 1),
    weight_semantic DECIMAL(3, 2) NOT NULL DEFAULT 0.40 CHECK (weight_semantic >= 0 AND weight_semantic <= 1),
    weight_knowledge_graph DECIMAL(3, 2) NOT NULL DEFAULT 0.20 CHECK (weight_knowledge_graph >= 0 AND weight_knowledge_graph <= 1),
    weight_keyword DECIMAL(3, 2) NOT NULL DEFAULT 0.10 CHECK (weight_keyword >= 0 AND weight_keyword <= 1),
    
    -- 추가 설정
    min_score DECIMAL(3, 2) DEFAULT 0.50, -- 최소 매칭 점수
    top_k INTEGER DEFAULT 10, -- 상위 K개 결과 반환
    similarity_threshold DECIMAL(3, 2) DEFAULT 0.70, -- 시맨틱 매칭 유사도 임계값
    
    -- 활성화 설정
    is_active BOOLEAN DEFAULT FALSE, -- 활성화 여부 (한 번에 하나만 활성화 권장)
    is_default BOOLEAN DEFAULT FALSE, -- 기본 설정 여부
    
    -- A/B 테스트 설정
    is_ab_test_variant BOOLEAN DEFAULT FALSE, -- A/B 테스트 변형 여부
    ab_test_name VARCHAR(100), -- A/B 테스트 이름 (같은 이름끼리 그룹화)
    ab_test_traffic_percentage INTEGER DEFAULT 0 CHECK (ab_test_traffic_percentage >= 0 AND ab_test_traffic_percentage <= 100), -- 트래픽 비율
    
    -- 메타데이터
    created_by TEXT, -- 생성자 (Clerk user ID)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건: 가중치 합계 검증 (선택적, 애플리케이션 레벨에서도 검증)
    CONSTRAINT check_weight_sum CHECK (
        ABS((weight_rule_based + weight_semantic + weight_knowledge_graph + weight_keyword) - 1.0) < 0.01
    )
);

COMMENT ON TABLE matching_weight_configs IS '하이브리드 매칭 시스템 가중치 설정';
COMMENT ON COLUMN matching_weight_configs.weight_rule_based IS '규칙 기반 매칭 가중치 (기본값: 0.30)';
COMMENT ON COLUMN matching_weight_configs.weight_semantic IS '시맨틱 매칭 가중치 (기본값: 0.40)';
COMMENT ON COLUMN matching_weight_configs.weight_knowledge_graph IS '지식 그래프 매칭 가중치 (기본값: 0.20)';
COMMENT ON COLUMN matching_weight_configs.weight_keyword IS '키워드 매칭 가중치 (기본값: 0.10)';
COMMENT ON COLUMN matching_weight_configs.is_ab_test_variant IS 'A/B 테스트 변형인지 여부';
COMMENT ON COLUMN matching_weight_configs.ab_test_traffic_percentage IS 'A/B 테스트 트래픽 비율 (0-100)';

-- =========================================================
-- [2] 매칭 성능 측정 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS matching_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- 매칭 설정 정보
    weight_config_id UUID REFERENCES matching_weight_configs(id) ON DELETE SET NULL,
    weight_config_name VARCHAR(255), -- 스냅샷 (설정 변경 시에도 추적 가능)
    
    -- 입력 정보
    icf_codes TEXT[] NOT NULL, -- 입력된 ICF 코드
    icf_code_count INTEGER NOT NULL, -- ICF 코드 개수
    analysis_summary TEXT, -- 분석 요약
    
    -- 매칭 결과
    matched_iso_codes TEXT[] NOT NULL, -- 매칭된 ISO 코드
    match_count INTEGER NOT NULL, -- 매칭 개수
    top_match_score DECIMAL(5, 4), -- 최고 매칭 점수
    average_match_score DECIMAL(5, 4), -- 평균 매칭 점수
    
    -- 성능 지표
    execution_time_ms INTEGER, -- 실행 시간 (밀리초)
    semantic_match_used BOOLEAN DEFAULT FALSE, -- 시맨틱 매칭 사용 여부
    knowledge_graph_used BOOLEAN DEFAULT FALSE, -- 지식 그래프 사용 여부
    
    -- 사용자 행동 (나중에 업데이트)
    recommendation_clicked BOOLEAN DEFAULT FALSE, -- 추천 클릭 여부
    purchase_completed BOOLEAN DEFAULT FALSE, -- 구매 완료 여부
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5), -- 피드백 점수
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE matching_performance_logs IS '하이브리드 매칭 성능 측정 로그';
COMMENT ON COLUMN matching_performance_logs.weight_config_name IS '가중치 설정 이름 (스냅샷)';
COMMENT ON COLUMN matching_performance_logs.top_match_score IS '최고 매칭 점수';
COMMENT ON COLUMN matching_performance_logs.execution_time_ms IS '매칭 실행 시간 (밀리초)';

-- =========================================================
-- [3] A/B 테스트 결과 집계 뷰
-- =========================================================

CREATE OR REPLACE VIEW view_ab_test_matching_results AS
SELECT 
    wc.ab_test_name,
    wc.name as variant_name,
    wc.weight_rule_based,
    wc.weight_semantic,
    wc.weight_knowledge_graph,
    wc.weight_keyword,
    
    -- 성능 지표
    COUNT(DISTINCT mpl.id) as total_matches,
    AVG(mpl.execution_time_ms) as avg_execution_time_ms,
    AVG(mpl.top_match_score) as avg_top_match_score,
    AVG(mpl.average_match_score) as avg_average_match_score,
    AVG(mpl.match_count) as avg_match_count,
    
    -- 사용자 행동 지표
    COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.recommendation_clicked = TRUE) as clicked_count,
    COUNT(DISTINCT mpl.id) FILTER (WHERE mpl.purchase_completed = TRUE) as purchase_count,
    AVG(mpl.feedback_rating) FILTER (WHERE mpl.feedback_rating IS NOT NULL) as avg_feedback_rating,
    
    -- 전환율 계산
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
    
    -- 기간 정보
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
-- [4] 인덱스 생성
-- =========================================================

-- 가중치 설정
CREATE INDEX IF NOT EXISTS idx_matching_weight_configs_active ON matching_weight_configs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_matching_weight_configs_default ON matching_weight_configs(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_matching_weight_configs_ab_test ON matching_weight_configs(ab_test_name, is_ab_test_variant) WHERE is_ab_test_variant = TRUE;

-- 성능 로그
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_config ON matching_performance_logs(weight_config_id, created_at);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_config_name ON matching_performance_logs(weight_config_name, created_at);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_consultation ON matching_performance_logs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_user ON matching_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_created_at ON matching_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_performance_logs_icf_codes ON matching_performance_logs USING GIN(icf_codes);

-- =========================================================
-- [5] 트리거 생성
-- =========================================================

CREATE TRIGGER update_matching_weight_configs_modtime 
  BEFORE UPDATE ON matching_weight_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_performance_logs_modtime 
  BEFORE UPDATE ON matching_performance_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [6] 기본 설정 삽입
-- =========================================================

-- 기본 설정 (현재 하이브리드 매칭 시스템의 기본값)
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
-- [7] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '하이브리드 매칭 가중치 설정 및 A/B 테스트 시스템 구축 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - matching_weight_configs: 가중치 설정 관리';
  RAISE NOTICE '  - matching_performance_logs: 성능 측정 로그';
  RAISE NOTICE '생성된 뷰:';
  RAISE NOTICE '  - view_ab_test_matching_results: A/B 테스트 결과 집계';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '기본 설정이 생성되었습니다:';
  RAISE NOTICE '  - 이름: default';
  RAISE NOTICE '  - 가중치: 규칙 30%, 시맨틱 40%, 지식 그래프 20%, 키워드 10%';
  RAISE NOTICE '=========================================================';
END $$;

