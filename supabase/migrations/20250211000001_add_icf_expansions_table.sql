-- ICF 코드 확장 이벤트 기록 테이블
CREATE TABLE IF NOT EXISTS icf_code_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icf_code TEXT NOT NULL,
  expanded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expanded_by TEXT, -- Clerk user ID
  iso_hints TEXT[] DEFAULT '{}',
  notes TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_icf_code_expansions_code ON icf_code_expansions(icf_code);
CREATE INDEX IF NOT EXISTS idx_icf_code_expansions_expanded_at ON icf_code_expansions(expanded_at DESC);

-- 자동 확장 설정 테이블
CREATE TABLE IF NOT EXISTS icf_auto_expand_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  threshold NUMERIC(5, 2) NOT NULL DEFAULT 20.0,
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT, -- Clerk user ID
  
  -- 단일 설정만 유지
  CONSTRAINT single_config CHECK (id = (SELECT id FROM icf_auto_expand_config LIMIT 1))
);

-- 초기 설정 삽입
INSERT INTO icf_auto_expand_config (enabled, threshold)
VALUES (false, 20.0)
ON CONFLICT DO NOTHING;

-- 코멘트
COMMENT ON TABLE icf_code_expansions IS 'ICF 코드 확장 이벤트 기록';
COMMENT ON TABLE icf_auto_expand_config IS '자동 확장 설정';

