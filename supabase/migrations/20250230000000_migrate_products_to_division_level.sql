-- =========================================================
-- [LinkAble] 제품 ISO 코드를 Division 레벨로 마이그레이션
-- Database: PostgreSQL (Supabase)
-- Created: 2025-02-30
-- =========================================================
--
-- 목적: ISO 9999:2022 표준에 따라 모든 제품을 Division 레벨(6자리)로 변환
-- 
-- 변환 규칙:
-- 1. Class 레벨(2자리) 제품 → 해당 Class의 첫 번째 Division으로 변환
-- 2. Subclass 레벨(4자리) 제품 → 해당 Subclass의 첫 번째 Division으로 변환
-- 3. Division 레벨(6자리) 제품 → 그대로 유지
-- =========================================================

-- =========================================================
-- [1] 임시 테이블 생성: 변환 매핑 저장
-- =========================================================

CREATE TEMP TABLE IF NOT EXISTS iso_code_migration_map (
    old_code VARCHAR(50) NOT NULL,
    new_code VARCHAR(50) NOT NULL,
    migration_type VARCHAR(20) NOT NULL, -- 'class_to_division', 'subclass_to_division', 'unchanged'
    product_count INTEGER DEFAULT 0,
    PRIMARY KEY (old_code)
);

-- =========================================================
-- [2] Subclass 레벨 제품 → Division 레벨로 변환
-- =========================================================

-- Subclass의 첫 번째 Division 코드 찾기
INSERT INTO iso_code_migration_map (old_code, new_code, migration_type, product_count)
SELECT DISTINCT
    p.iso_code as old_code,
    COALESCE(
        -- 해당 Subclass의 첫 번째 Division 찾기
        (SELECT ic_division.code 
         FROM iso_codes ic_division 
         WHERE ic_division.parent_code = p.iso_code 
           AND ic_division.level = 3 
           AND ic_division.is_active = TRUE
         ORDER BY ic_division.code 
         LIMIT 1),
        -- Division이 없으면 Subclass 코드 앞에 "01" 추가 (임시 Division 생성)
        CASE 
            WHEN p.iso_code LIKE '% %' THEN 
                p.iso_code || ' 01'
            ELSE 
                SUBSTRING(p.iso_code, 1, 2) || ' ' || SUBSTRING(p.iso_code, 3, 2) || ' 01'
        END
    ) as new_code,
    'subclass_to_division' as migration_type,
    COUNT(*) as product_count
FROM products p
WHERE p.iso_code IS NOT NULL
  AND LENGTH(REPLACE(p.iso_code, ' ', '')) = 4
  AND NOT EXISTS (
      SELECT 1 FROM iso_code_migration_map WHERE old_code = p.iso_code
  )
GROUP BY p.iso_code
ON CONFLICT (old_code) DO NOTHING;

-- =========================================================
-- [3] Class 레벨 제품 → Division 레벨로 변환
-- =========================================================

-- Class의 첫 번째 Division 코드 찾기 (Subclass → Division 경로)
INSERT INTO iso_code_migration_map (old_code, new_code, migration_type, product_count)
SELECT DISTINCT
    p.iso_code as old_code,
    COALESCE(
        -- 해당 Class의 첫 번째 Subclass의 첫 번째 Division 찾기
        (SELECT ic_division.code 
         FROM iso_codes ic_subclass
         JOIN iso_codes ic_division ON ic_division.parent_code = ic_subclass.code
         WHERE ic_subclass.parent_code = p.iso_code 
           AND ic_subclass.level = 2
           AND ic_division.level = 3
           AND ic_subclass.is_active = TRUE
           AND ic_division.is_active = TRUE
         ORDER BY ic_subclass.code, ic_division.code
         LIMIT 1),
        -- Division이 없으면 Class 코드에 "01 01" 추가 (임시 Division 생성)
        CASE 
            WHEN p.iso_code LIKE '% %' THEN 
                p.iso_code || ' 01 01'
            ELSE 
                p.iso_code || ' 01 01'
        END
    ) as new_code,
    'class_to_division' as migration_type,
    COUNT(*) as product_count
FROM products p
WHERE p.iso_code IS NOT NULL
  AND LENGTH(REPLACE(p.iso_code, ' ', '')) = 2
  AND NOT EXISTS (
      SELECT 1 FROM iso_code_migration_map WHERE old_code = p.iso_code
  )
GROUP BY p.iso_code
ON CONFLICT (old_code) DO NOTHING;

-- =========================================================
-- [4] Division 레벨 제품은 그대로 유지
-- =========================================================

INSERT INTO iso_code_migration_map (old_code, new_code, migration_type, product_count)
SELECT DISTINCT
    p.iso_code as old_code,
    p.iso_code as new_code,
    'unchanged' as migration_type,
    COUNT(*) as product_count
FROM products p
WHERE p.iso_code IS NOT NULL
  AND LENGTH(REPLACE(p.iso_code, ' ', '')) = 6
  AND NOT EXISTS (
      SELECT 1 FROM iso_code_migration_map WHERE old_code = p.iso_code
  )
GROUP BY p.iso_code
ON CONFLICT (old_code) DO NOTHING;

-- =========================================================
-- [5] 마이그레이션 매핑 확인 (검증용)
-- =========================================================

-- 변환 통계 확인
SELECT 
    '=== 마이그레이션 통계 ===' as section,
    migration_type,
    COUNT(*) as code_count,
    SUM(product_count) as total_products
FROM iso_code_migration_map
GROUP BY migration_type
ORDER BY migration_type;

-- 변환 매핑 샘플 확인
SELECT 
    '=== 변환 매핑 샘플 ===' as section,
    old_code,
    new_code,
    migration_type,
    product_count
FROM iso_code_migration_map
ORDER BY product_count DESC
LIMIT 20;

-- =========================================================
-- [6] products 테이블 업데이트 (실제 변환 수행)
-- =========================================================

-- Subclass → Division 변환
UPDATE products p
SET iso_code = m.new_code,
    updated_at = NOW()
FROM iso_code_migration_map m
WHERE p.iso_code = m.old_code
  AND m.migration_type = 'subclass_to_division';

-- Class → Division 변환
UPDATE products p
SET iso_code = m.new_code,
    updated_at = NOW()
FROM iso_code_migration_map m
WHERE p.iso_code = m.old_code
  AND m.migration_type = 'class_to_division';

-- =========================================================
-- [7] 변환 결과 검증
-- =========================================================

-- 변환 후 ISO 코드 레벨 분포 확인
SELECT 
    '=== 변환 후 ISO 코드 레벨 분포 ===' as section,
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류) - ⚠️ 변환 실패'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류) - ⚠️ 변환 실패'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류) - ✅ 올바름'
        ELSE '비표준 형식 - ⚠️ 오류'
    END as code_level,
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE iso_code IS NOT NULL), 2) as percentage
FROM products
WHERE iso_code IS NOT NULL
GROUP BY 
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류) - ⚠️ 변환 실패'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류) - ⚠️ 변환 실패'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류) - ✅ 올바름'
        ELSE '비표준 형식 - ⚠️ 오류'
    END
ORDER BY product_count DESC;

-- 변환 실패한 제품 확인 (있는 경우)
SELECT 
    '=== 변환 실패한 제품 (있는 경우) ===' as section,
    id,
    name,
    iso_code,
    manufacturer
FROM products
WHERE iso_code IS NOT NULL
  AND LENGTH(REPLACE(iso_code, ' ', '')) NOT IN (6)
ORDER BY iso_code
LIMIT 50;

-- =========================================================
-- [8] 임시 테이블 정리
-- =========================================================

DROP TABLE IF EXISTS iso_code_migration_map;

-- =========================================================
-- 완료 메시지
-- =========================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 제품 ISO 코드 Division 레벨 마이그레이션 완료';
    RAISE NOTICE '📊 변환 결과는 위의 검증 쿼리 결과를 확인하세요.';
END $$;
