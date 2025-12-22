-- =========================================================
-- [LinkAble] 벡터 DB 활용 강화
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-21
-- =========================================================
-- 
-- 목적: ICF-ISO 매핑 임베딩 품질 개선 및 동적 임계값 조정 시스템 구축
-- 

-- =========================================================
-- [1] 벡터 검색 임계값 설정 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS vector_search_threshold_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- 설정 이름
    description TEXT, -- 설정 설명
    
    -- 기본 임계값
    base_threshold DECIMAL(3, 2) NOT NULL DEFAULT 0.70 CHECK (base_threshold >= 0 AND base_threshold <= 1),
    
    -- 동적 조정 설정
    enable_dynamic_adjustment BOOLEAN DEFAULT TRUE, -- 동적 조정 활성화
    min_threshold DECIMAL(3, 2) DEFAULT 0.60 CHECK (min_threshold >= 0 AND min_threshold <= 1), -- 최소 임계값
    max_threshold DECIMAL(3, 2) DEFAULT 0.85 CHECK (max_threshold >= 0 AND max_threshold <= 1), -- 최대 임계값
    
    -- 조정 파라미터
    success_rate_weight DECIMAL(3, 2) DEFAULT 0.3, -- 성공률 가중치 (0-1)
    usage_count_weight DECIMAL(3, 2) DEFAULT 0.2, -- 사용 횟수 가중치 (0-1)
    similarity_weight DECIMAL(3, 2) DEFAULT 0.5, -- 유사도 가중치 (0-1)
    
    -- 활성화 설정
    is_active BOOLEAN DEFAULT FALSE, -- 활성화 여부
    is_default BOOLEAN DEFAULT FALSE, -- 기본 설정 여부
    
    -- 메타데이터
    created_by TEXT, -- 생성자 (Clerk user ID)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE vector_search_threshold_configs IS '벡터 검색 임계값 설정';
COMMENT ON COLUMN vector_search_threshold_configs.base_threshold IS '기본 유사도 임계값 (0.0-1.0)';
COMMENT ON COLUMN vector_search_threshold_configs.enable_dynamic_adjustment IS '사용 통계 기반 동적 임계값 조정 활성화';

-- =========================================================
-- [2] 벡터 검색 성능 로그 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS vector_search_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    
    -- 검색 정보
    query_text TEXT NOT NULL, -- 검색 쿼리 텍스트
    query_icf_codes TEXT[] NOT NULL, -- 입력된 ICF 코드
    threshold_used DECIMAL(3, 2) NOT NULL, -- 사용된 임계값
    threshold_config_id UUID REFERENCES vector_search_threshold_configs(id) ON DELETE SET NULL,
    
    -- 검색 결과
    results_count INTEGER NOT NULL DEFAULT 0, -- 검색 결과 개수
    avg_similarity DECIMAL(5, 4), -- 평균 유사도
    max_similarity DECIMAL(5, 4), -- 최대 유사도
    min_similarity DECIMAL(5, 4), -- 최소 유사도
    
    -- 사용자 행동 (나중에 업데이트)
    top_result_clicked BOOLEAN DEFAULT FALSE, -- 최상위 결과 클릭 여부
    any_result_clicked BOOLEAN DEFAULT FALSE, -- 결과 중 하나라도 클릭 여부
    purchase_completed BOOLEAN DEFAULT FALSE, -- 구매 완료 여부
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE vector_search_performance_logs IS '벡터 검색 성능 측정 로그';
COMMENT ON COLUMN vector_search_performance_logs.threshold_used IS '사용된 유사도 임계값';

-- =========================================================
-- [3] 향상된 벡터 검색 함수 (동적 임계값 조정)
-- =========================================================

CREATE OR REPLACE FUNCTION search_similar_icf_iso_mappings_enhanced(
  query_embedding vector(768),
  base_threshold DECIMAL DEFAULT 0.7,
  enable_dynamic BOOLEAN DEFAULT TRUE,
  min_threshold DECIMAL DEFAULT 0.6,
  max_threshold DECIMAL DEFAULT 0.85,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  icf_codes TEXT[],
  iso_code VARCHAR(50),
  iso_label TEXT,
  iso_description TEXT,
  similarity DECIMAL,
  base_score DECIMAL(3, 2),
  usage_count INTEGER,
  success_rate DECIMAL(5, 4),
  adjusted_score DECIMAL(5, 4), -- 조정된 점수 (유사도 + 사용 통계)
  threshold_used DECIMAL(3, 2) -- 사용된 임계값
) AS $$
DECLARE
  dynamic_threshold DECIMAL(3, 2);
  result_count INTEGER;
BEGIN
  -- 동적 임계값 계산 (성공률과 사용 횟수 기반)
  IF enable_dynamic THEN
    -- 평균 성공률과 사용 횟수를 기반으로 임계값 조정
    SELECT 
      LEAST(
        GREATEST(
          base_threshold - (AVG(success_rate) - 0.5) * 0.1, -- 성공률이 높으면 임계값 낮춤
          min_threshold
        ),
        max_threshold
      )
    INTO dynamic_threshold
    FROM icf_iso_embeddings
    WHERE usage_count > 0
    LIMIT 1;
    
    -- 데이터가 없으면 기본값 사용
    IF dynamic_threshold IS NULL THEN
      dynamic_threshold := base_threshold;
    END IF;
  ELSE
    dynamic_threshold := base_threshold;
  END IF;
  
  -- 벡터 검색 수행
  RETURN QUERY
  SELECT
    e.id,
    e.icf_codes,
    e.iso_code,
    e.iso_label,
    e.iso_description,
    -- 코사인 유사도 계산
    (1 - (e.embedding <=> query_embedding))::DECIMAL AS similarity,
    e.base_score,
    e.usage_count,
    e.success_rate,
    -- 조정된 점수: 유사도 + 성공률 + 사용 횟수 보너스
    LEAST(
      (1 - (e.embedding <=> query_embedding))::DECIMAL * 0.6 +
      e.success_rate * 0.3 +
      LEAST(e.usage_count::DECIMAL / 100.0, 0.1) * 0.1, -- 사용 횟수 보너스 (최대 0.1)
      1.0
    ) AS adjusted_score,
    dynamic_threshold AS threshold_used
  FROM icf_iso_embeddings e
  WHERE (1 - (e.embedding <=> query_embedding)) >= dynamic_threshold
  ORDER BY 
    -- 조정된 점수로 정렬
    (LEAST(
      (1 - (e.embedding <=> query_embedding))::DECIMAL * 0.6 +
      e.success_rate * 0.3 +
      LEAST(e.usage_count::DECIMAL / 100.0, 0.1) * 0.1,
      1.0
    )) DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_similar_icf_iso_mappings_enhanced IS '향상된 벡터 검색 함수 (동적 임계값 조정 및 하이브리드 스코어링)';

-- =========================================================
-- [4] 임베딩 품질 개선을 위한 텍스트 생성 함수
-- =========================================================

CREATE OR REPLACE FUNCTION generate_enhanced_embedding_text(
  p_icf_codes TEXT[],
  p_icf_codes_text TEXT,
  p_iso_code VARCHAR(50),
  p_iso_label TEXT,
  p_iso_description TEXT
)
RETURNS TEXT AS $$
DECLARE
  enhanced_text TEXT;
BEGIN
  -- 더 풍부한 컨텍스트를 포함한 텍스트 생성
  enhanced_text := format(
    'ICF 코드 조합: %s. ICF 코드 설명: %s. ISO 9999 분류 코드: %s. ISO 코드명: %s. ISO 코드 설명: %s. 보조기기 매칭: ICF 코드 조합에 해당하는 기능적 제한을 해결하기 위한 ISO 9999 분류 코드 %s의 보조기기 제품.',
    array_to_string(p_icf_codes, ', '),
    p_icf_codes_text,
    p_iso_code,
    p_iso_label,
    COALESCE(p_iso_description, ''),
    p_iso_code
  );
  
  RETURN enhanced_text;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_enhanced_embedding_text IS '임베딩 품질 개선을 위한 향상된 텍스트 생성 함수';

-- =========================================================
-- [5] 인덱스 생성
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_vector_search_performance_logs_consultation ON vector_search_performance_logs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_vector_search_performance_logs_created_at ON vector_search_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vector_search_performance_logs_threshold ON vector_search_performance_logs(threshold_used);

-- =========================================================
-- [6] 트리거 생성
-- =========================================================

CREATE TRIGGER update_vector_search_threshold_configs_modtime 
  BEFORE UPDATE ON vector_search_threshold_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_search_performance_logs_modtime 
  BEFORE UPDATE ON vector_search_performance_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [7] 기본 설정 삽입
-- =========================================================

INSERT INTO vector_search_threshold_configs (
    name,
    description,
    base_threshold,
    enable_dynamic_adjustment,
    min_threshold,
    max_threshold,
    success_rate_weight,
    usage_count_weight,
    similarity_weight,
    is_active,
    is_default
) VALUES (
    'default',
    '기본 벡터 검색 임계값 설정 (동적 조정 활성화)',
    0.70,
    TRUE,
    0.60,
    0.85,
    0.3,
    0.2,
    0.5,
    TRUE,
    TRUE
) ON CONFLICT (name) DO UPDATE SET
    base_threshold = EXCLUDED.base_threshold,
    enable_dynamic_adjustment = EXCLUDED.enable_dynamic_adjustment,
    updated_at = NOW();

-- =========================================================
-- [8] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '벡터 DB 활용 강화 시스템 구축 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - vector_search_threshold_configs: 임계값 설정 관리';
  RAISE NOTICE '  - vector_search_performance_logs: 성능 측정 로그';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - search_similar_icf_iso_mappings_enhanced: 향상된 벡터 검색';
  RAISE NOTICE '  - generate_enhanced_embedding_text: 향상된 임베딩 텍스트 생성';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '기본 설정이 생성되었습니다:';
  RAISE NOTICE '  - 이름: default';
  RAISE NOTICE '  - 기본 임계값: 0.70';
  RAISE NOTICE '  - 동적 조정: 활성화';
  RAISE NOTICE '=========================================================';
END $$;

