-- RAG용 지식 문서 청크 저장 테이블
-- Phase 4.8: RAG/GraphRAG 기반 매칭 고도화

-- 1. icf_iso_rag_documents 테이블 생성
CREATE TABLE IF NOT EXISTS icf_iso_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 청크 내용
  content TEXT NOT NULL,
  
  -- 벡터 임베딩 (Gemini text-embedding-004: 768차원)
  embedding vector(768) NOT NULL,
  
  -- 메타데이터 (RAG 검색 필터링용)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- metadata 구조: { source, icf_codes, iso_codes, doc_type }
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_icf_iso_rag_documents_metadata 
  ON icf_iso_rag_documents USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_icf_iso_rag_documents_source 
  ON icf_iso_rag_documents ((metadata->>'source'));

CREATE INDEX IF NOT EXISTS idx_icf_iso_rag_documents_created_at 
  ON icf_iso_rag_documents(created_at DESC);

-- 3. 벡터 유사도 검색 HNSW 인덱스 (코사인 유사도)
CREATE INDEX IF NOT EXISTS idx_icf_iso_rag_documents_embedding 
  ON icf_iso_rag_documents 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. RAG 문서 벡터 검색 함수
CREATE OR REPLACE FUNCTION search_rag_documents(
  query_embedding vector(768),
  similarity_threshold DECIMAL DEFAULT 0.6,
  max_results INTEGER DEFAULT 10,
  filter_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::DECIMAL AS similarity
  FROM icf_iso_rag_documents d
  WHERE (1 - (d.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_source IS NULL OR (d.metadata->>'source') = filter_source)
  ORDER BY d.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE icf_iso_rag_documents IS 'RAG용 ICF-ISO 지식 문서 청크 (벡터 임베딩 포함)';
COMMENT ON COLUMN icf_iso_rag_documents.content IS '청크 원문 텍스트';
COMMENT ON COLUMN icf_iso_rag_documents.metadata IS 'JSONB: source(파일경로), icf_codes[], iso_codes[], doc_type';
