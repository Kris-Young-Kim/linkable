-- 제품 임베딩 컬럼 추가 (사전 계산된 벡터 저장)
-- Gemini text-embedding-004 모델은 768차원 벡터 생성

-- 1. products 테이블에 embedding 컬럼 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 2. 임베딩 검색을 위한 HNSW 인덱스 생성 (코사인 유사도용)
CREATE INDEX IF NOT EXISTS idx_products_embedding_cosine
ON products
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. 임베딩 생성 상태 추적 컬럼
ALTER TABLE products
ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- 4. 임베딩이 있는 제품만 조회하는 함수
CREATE OR REPLACE FUNCTION search_products_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_iso_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name varchar,
  description text,
  category varchar,
  manufacturer varchar,
  iso_code text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.manufacturer,
    ic.code as iso_code,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM products p
  LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE p.embedding IS NOT NULL
    AND p.is_active = true
    AND (filter_iso_code IS NULL OR ic.code = filter_iso_code)
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. 특정 ISO 코드의 제품들과 쿼리 임베딩 간 유사도 계산 함수
CREATE OR REPLACE FUNCTION get_products_with_similarity(
  query_embedding vector(768),
  target_iso_codes text[],
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name varchar,
  description text,
  category varchar,
  manufacturer varchar,
  iso_code text,
  price numeric,
  image_url text,
  purchase_link text,
  rating numeric,
  review_count int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.manufacturer,
    ic.code as iso_code,
    p.price,
    p.image_url,
    p.purchase_link,
    p.rating,
    p.review_count,
    CASE
      WHEN p.embedding IS NOT NULL THEN 1 - (p.embedding <=> query_embedding)
      ELSE 0.0
    END as similarity
  FROM products p
  LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE p.is_active = true
    AND ic.code = ANY(target_iso_codes)
  ORDER BY
    CASE WHEN p.embedding IS NOT NULL THEN p.embedding <=> query_embedding ELSE 999 END
  LIMIT result_limit;
END;
$$;

COMMENT ON COLUMN products.embedding IS '제품 설명의 사전 계산된 벡터 임베딩 (Gemini text-embedding-004, 768차원)';
COMMENT ON COLUMN products.embedding_updated_at IS '임베딩이 마지막으로 업데이트된 시각';
