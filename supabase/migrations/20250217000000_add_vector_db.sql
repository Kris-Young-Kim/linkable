-- 벡터 DB 구축을 위한 마이그레이션
-- Supabase pgvector 확장 및 ICF-ISO 매핑 임베딩 저장 테이블

-- 1. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ICF-ISO 매핑 임베딩 저장 테이블
CREATE TABLE IF NOT EXISTS icf_iso_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ICF 코드 정보
  icf_codes TEXT[] NOT NULL, -- ICF 코드 배열
  icf_codes_text TEXT NOT NULL, -- ICF 코드 설명 텍스트 (검색용)
  
  -- ISO 코드 정보
  iso_code VARCHAR(50) NOT NULL,
  iso_label TEXT NOT NULL,
  iso_description TEXT,
  
  -- 벡터 임베딩 (768차원, text-embedding-004 사용)
  embedding vector(768) NOT NULL,
  
  -- 메타데이터
  base_score DECIMAL(3, 2) DEFAULT 0.8, -- 기본 매칭 점수
  usage_count INTEGER DEFAULT 0, -- 사용 횟수
  success_rate DECIMAL(5, 4) DEFAULT 0.0, -- 성공률 (클릭/구매 전환율)
  
  -- 통계 정보
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- 제약 조건
  CONSTRAINT icf_iso_embeddings_unique UNIQUE (icf_codes, iso_code)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_icf_iso_embeddings_iso_code ON icf_iso_embeddings(iso_code);
CREATE INDEX IF NOT EXISTS idx_icf_iso_embeddings_icf_codes ON icf_iso_embeddings USING GIN(icf_codes);
CREATE INDEX IF NOT EXISTS idx_icf_iso_embeddings_usage_count ON icf_iso_embeddings(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_icf_iso_embeddings_success_rate ON icf_iso_embeddings(success_rate DESC);

-- 벡터 유사도 검색을 위한 HNSW 인덱스 (고성능 근사 최근접 이웃 검색)
CREATE INDEX IF NOT EXISTS idx_icf_iso_embeddings_vector 
ON icf_iso_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. 임베딩 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_icf_iso_embedding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_icf_iso_embedding_updated_at
BEFORE UPDATE ON icf_iso_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_icf_iso_embedding_updated_at();

-- 4. 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION search_similar_icf_iso_mappings(
  query_embedding vector(768),
  similarity_threshold DECIMAL DEFAULT 0.7,
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
  success_rate DECIMAL(5, 4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.icf_codes,
    e.iso_code,
    e.iso_label,
    e.iso_description,
    -- 코사인 유사도 계산 (1 - distance = similarity)
    (1 - (e.embedding <=> query_embedding))::DECIMAL AS similarity,
    e.base_score,
    e.usage_count,
    e.success_rate
  FROM icf_iso_embeddings e
  WHERE (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY e.embedding <=> query_embedding -- 거리 순으로 정렬 (가까울수록 유사)
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 5. 사용 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_icf_iso_embedding_stats(
  p_icf_codes TEXT[],
  p_iso_code VARCHAR(50),
  p_success BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  UPDATE icf_iso_embeddings
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    success_rate = CASE
      WHEN usage_count = 0 THEN
        CASE WHEN p_success THEN 1.0 ELSE 0.0 END
      ELSE
        (success_rate * usage_count + CASE WHEN p_success THEN 1.0 ELSE 0.0 END) / (usage_count + 1)
    END
  WHERE
    icf_codes = p_icf_codes
    AND iso_code = p_iso_code;
END;
$$ LANGUAGE plpgsql;

-- 코멘트
COMMENT ON TABLE icf_iso_embeddings IS 'ICF-ISO 매핑 벡터 임베딩 저장 테이블';
COMMENT ON COLUMN icf_iso_embeddings.embedding IS '768차원 벡터 임베딩 (text-embedding-004)';
COMMENT ON COLUMN icf_iso_embeddings.icf_codes_text IS 'ICF 코드 설명 텍스트 (검색 및 디버깅용)';
COMMENT ON FUNCTION search_similar_icf_iso_mappings IS '벡터 유사도 기반 ICF-ISO 매핑 검색 함수';
COMMENT ON FUNCTION update_icf_iso_embedding_stats IS '임베딩 사용 통계 업데이트 함수';

