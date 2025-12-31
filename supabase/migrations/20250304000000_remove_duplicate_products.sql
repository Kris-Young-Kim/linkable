-- 중복 상품 데이터 삭제
-- 같은 purchase_link를 가진 상품 중 가장 최신 것만 남기고 나머지 삭제

-- 1. 먼저 중복 데이터 확인 (로깅용)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT purchase_link
    FROM products
    WHERE purchase_link IS NOT NULL 
      AND purchase_link != ''
    GROUP BY purchase_link
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE '중복된 purchase_link를 가진 상품 그룹: %개', duplicate_count;
END $$;

-- 2. 중복 삭제: 같은 purchase_link를 가진 상품 중 가장 최신 것(id가 큰 것 또는 created_at이 최신인 것)만 남기고 나머지 삭제
-- recommendations 테이블과의 외래키 관계 때문에 CASCADE로 삭제
DELETE FROM products
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY purchase_link 
        ORDER BY created_at DESC NULLS LAST, id DESC
      ) as rn
    FROM products
    WHERE purchase_link IS NOT NULL 
      AND purchase_link != ''
  ) ranked
  WHERE rn > 1
);

-- 3. 같은 name과 purchase_link 조합이 중복인 경우도 처리 (purchase_link가 NULL인 경우 대비)
DELETE FROM products
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY name, purchase_link 
        ORDER BY created_at DESC NULLS LAST, id DESC
      ) as rn
    FROM products
    WHERE name IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 4. 결과 확인
DO $$
DECLARE
  total_products INTEGER;
  unique_links INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(DISTINCT purchase_link) INTO unique_links 
  FROM products 
  WHERE purchase_link IS NOT NULL AND purchase_link != '';
  
  RAISE NOTICE '삭제 후 총 상품 수: %개', total_products;
  RAISE NOTICE '고유한 purchase_link 수: %개', unique_links;
END $$;

-- 5. 인덱스 추가 (중복 방지 및 성능 향상)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_purchase_link 
ON products(purchase_link) 
WHERE purchase_link IS NOT NULL AND purchase_link != '';

COMMENT ON INDEX idx_products_unique_purchase_link IS 'purchase_link 중복 방지를 위한 유니크 인덱스';
