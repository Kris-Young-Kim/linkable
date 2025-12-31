-- =========================================================
-- [LinkAble] Create precomputed ICF-ISO mappings table
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-02
-- =========================================================
--
-- 자주 사용되는 ICF 조합에 대한 사전 계산된 ISO 매핑을 저장하는 테이블
-- 실시간 계산 대신 빠른 조회를 통해 성능 향상 및 일관성 보장
-- =========================================================

CREATE TABLE IF NOT EXISTS icf_iso_precomputed_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ICF 코드 조합 식별자
  icf_codes TEXT[] NOT NULL, -- ICF 코드 배열 (정렬된 상태)
  icf_codes_key TEXT NOT NULL, -- 정렬된 ICF 코드를 쉼표로 연결한 키 (인덱스용)
  
  -- 매핑 결과 (JSONB로 여러 ISO 매칭 저장)
  iso_matches JSONB NOT NULL, -- [{isoCode, label, description, score, matchedIcf, reason}, ...]
  
  -- 메타데이터
  match_method VARCHAR(50) NOT NULL DEFAULT 'hybrid', -- 'rule', 'semantic', 'hybrid', 'knowledge_graph'
  confidence_score DECIMAL(3, 2) DEFAULT 0.8, -- 신뢰도 점수 (0-1)
  
  -- 사용 통계 (학습 기반)
  usage_count INTEGER DEFAULT 0, -- 사용 횟수
  success_rate DECIMAL(5, 4) DEFAULT 0.0, -- 성공률 (클릭/구매 전환율)
  last_used_at TIMESTAMP WITH TIME ZONE, -- 마지막 사용 시각
  
  -- 생성 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT icf_iso_precomputed_mappings_unique UNIQUE (icf_codes_key)
);

COMMENT ON TABLE icf_iso_precomputed_mappings IS '사전 계산된 ICF-ISO 매핑 캐시 (성능 최적화 및 일관성 보장)';
COMMENT ON COLUMN icf_iso_precomputed_mappings.icf_codes_key IS '정렬된 ICF 코드를 쉼표로 연결한 키 (예: "b765,d550")';
COMMENT ON COLUMN icf_iso_precomputed_mappings.iso_matches IS 'ISO 매칭 결과 배열 (JSONB)';
COMMENT ON COLUMN icf_iso_precomputed_mappings.match_method IS '매칭 방법: rule(규칙), semantic(시맨틱), hybrid(하이브리드), knowledge_graph(지식그래프)';
COMMENT ON COLUMN icf_iso_precomputed_mappings.confidence_score IS '매핑 신뢰도 (0-1, 높을수록 신뢰도 높음)';
COMMENT ON COLUMN icf_iso_precomputed_mappings.success_rate IS '실제 사용자 행동 기반 성공률 (클릭/구매 전환율)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_precomputed_icf_codes_key ON icf_iso_precomputed_mappings(icf_codes_key);
CREATE INDEX IF NOT EXISTS idx_precomputed_icf_codes_array ON icf_iso_precomputed_mappings USING GIN(icf_codes);
CREATE INDEX IF NOT EXISTS idx_precomputed_usage_count ON icf_iso_precomputed_mappings(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_precomputed_success_rate ON icf_iso_precomputed_mappings(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_precomputed_confidence ON icf_iso_precomputed_mappings(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_precomputed_last_used ON icf_iso_precomputed_mappings(last_used_at DESC NULLS LAST);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_precomputed_mappings_modtime 
  BEFORE UPDATE ON icf_iso_precomputed_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 사용 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_precomputed_mapping_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 사용 횟수 증가
  NEW.usage_count := COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_used_at := NOW();
  
  -- 성공률은 realtime_learning_stats에서 가져와서 업데이트 (선택적)
  -- 여기서는 사용 횟수만 업데이트
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용 통계 업데이트 트리거 (조회 시 자동 업데이트)
CREATE TRIGGER update_precomputed_mapping_stats_trigger
  BEFORE UPDATE OF last_used_at ON icf_iso_precomputed_mappings
  FOR EACH ROW
  WHEN (NEW.last_used_at IS DISTINCT FROM OLD.last_used_at)
  EXECUTE FUNCTION update_precomputed_mapping_stats();

-- =========================================================
-- End of Migration
-- =========================================================
