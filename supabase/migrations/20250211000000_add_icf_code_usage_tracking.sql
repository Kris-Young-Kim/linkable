-- ICF 코드 사용 통계 추적 테이블
-- Core Set에 없는 코드의 사용 빈도와 컨텍스트를 수집하여 확장 전략 수립에 활용

CREATE TABLE IF NOT EXISTS icf_code_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icf_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
  is_in_core_set BOOLEAN NOT NULL DEFAULT false,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('chat_analysis', 'keyword_inference', 'semantic_match', 'manual_input')),
  context JSONB, -- 추가 컨텍스트 정보 (예: 사용된 키워드, 매칭된 ISO 코드 등)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_code ON icf_code_usage_logs(icf_code);
CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_category ON icf_code_usage_logs(category);
CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_core_set ON icf_code_usage_logs(is_in_core_set);
CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_created_at ON icf_code_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_consultation ON icf_code_usage_logs(consultation_id);

-- ICF 코드별 집계 통계 테이블 (성능 최적화를 위한 머티리얼라이즈드 뷰 대신 테이블 사용)
CREATE TABLE IF NOT EXISTS icf_code_statistics (
  icf_code TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
  is_in_core_set BOOLEAN NOT NULL DEFAULT false,
  total_usage_count INTEGER NOT NULL DEFAULT 0,
  unique_consultations INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  usage_by_source JSONB DEFAULT '{}'::jsonb, -- source별 사용 횟수
  associated_iso_codes TEXT[] DEFAULT '{}', -- 함께 사용된 ISO 코드 목록
  associated_keywords TEXT[] DEFAULT '{}', -- 함께 사용된 키워드 목록
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_icf_code_statistics_category ON icf_code_statistics(category);
CREATE INDEX IF NOT EXISTS idx_icf_code_statistics_core_set ON icf_code_statistics(is_in_core_set);
CREATE INDEX IF NOT EXISTS idx_icf_code_statistics_usage_count ON icf_code_statistics(total_usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_icf_code_statistics_last_seen ON icf_code_statistics(last_seen_at DESC);

-- 통계 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_icf_code_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO icf_code_statistics (
    icf_code,
    category,
    is_in_core_set,
    total_usage_count,
    unique_consultations,
    first_seen_at,
    last_seen_at,
    usage_by_source,
    updated_at
  )
  VALUES (
    NEW.icf_code,
    NEW.category,
    NEW.is_in_core_set,
    1,
    1,
    NEW.created_at,
    NEW.created_at,
    jsonb_build_object(NEW.source, 1),
    NOW()
  )
  ON CONFLICT (icf_code) DO UPDATE SET
    total_usage_count = icf_code_statistics.total_usage_count + 1,
    unique_consultations = CASE 
      WHEN NEW.consultation_id IS NOT NULL AND 
           NOT EXISTS (
             SELECT 1 FROM icf_code_usage_logs 
             WHERE icf_code = NEW.icf_code 
             AND consultation_id = NEW.consultation_id
             AND id != NEW.id
           )
      THEN icf_code_statistics.unique_consultations + 1
      ELSE icf_code_statistics.unique_consultations
    END,
    last_seen_at = GREATEST(icf_code_statistics.last_seen_at, NEW.created_at),
    first_seen_at = LEAST(icf_code_statistics.first_seen_at, NEW.created_at),
    usage_by_source = jsonb_set(
      COALESCE(icf_code_statistics.usage_by_source, '{}'::jsonb),
      ARRAY[NEW.source],
      to_jsonb(COALESCE((icf_code_statistics.usage_by_source->>NEW.source)::integer, 0) + 1)
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_icf_code_statistics
AFTER INSERT ON icf_code_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_icf_code_statistics();

-- 확장 우선순위 분석을 위한 뷰
CREATE OR REPLACE VIEW icf_code_expansion_priority AS
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

-- 코멘트
COMMENT ON TABLE icf_code_usage_logs IS 'ICF 코드 사용 로그 - 모든 ICF 코드 사용 이벤트를 기록';
COMMENT ON TABLE icf_code_statistics IS 'ICF 코드 통계 - 코드별 집계된 사용 통계';
COMMENT ON VIEW icf_code_expansion_priority IS 'ICF 코드 확장 우선순위 - Core Set에 없는 코드의 확장 필요성 분석';

