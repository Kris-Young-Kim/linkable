-- =========================================================
-- products 테이블의 ISO 코드 레벨 분석
-- Division 레벨 전환 전 현재 상태 확인
-- =========================================================

-- 1. products 테이블의 ISO 코드 레벨 분포
SELECT 
    '=== products.iso_code 레벨 분포 ===' as section,
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류)'
        ELSE '비표준 형식'
    END as code_level,
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE iso_code IS NOT NULL), 2) as percentage
FROM products
WHERE iso_code IS NOT NULL
GROUP BY 
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류)'
        ELSE '비표준 형식'
    END
ORDER BY product_count DESC;

-- 2. Class 레벨 제품 목록 (변환 필요)
SELECT 
    '=== Class 레벨 제품 (변환 필요) ===' as section,
    id,
    name,
    iso_code,
    manufacturer,
    created_at
FROM products
WHERE iso_code IS NOT NULL
  AND LENGTH(REPLACE(iso_code, ' ', '')) = 2
ORDER BY iso_code, created_at
LIMIT 50;

-- 3. Subclass 레벨 제품 목록 (변환 필요)
SELECT 
    '=== Subclass 레벨 제품 (변환 필요) ===' as section,
    id,
    name,
    iso_code,
    manufacturer,
    created_at
FROM products
WHERE iso_code IS NOT NULL
  AND LENGTH(REPLACE(iso_code, ' ', '')) = 4
ORDER BY iso_code, created_at
LIMIT 50;

-- 4. Division 레벨 제품 목록 (이미 올바름)
SELECT 
    '=== Division 레벨 제품 (이미 올바름) ===' as section,
    COUNT(*) as count
FROM products
WHERE iso_code IS NOT NULL
  AND LENGTH(REPLACE(iso_code, ' ', '')) = 6;

-- 5. Subclass별 제품 수 및 가능한 Division 코드 확인
SELECT 
    '=== Subclass별 제품 수 및 Division 매핑 가능 여부 ===' as section,
    p.iso_code as subclass_code,
    COUNT(DISTINCT p.id) as product_count,
    COUNT(DISTINCT ic_division.code) as available_divisions,
    STRING_AGG(DISTINCT ic_division.code, ', ' ORDER BY ic_division.code) as division_codes
FROM products p
LEFT JOIN iso_codes ic_subclass ON ic_subclass.code = p.iso_code AND ic_subclass.level = 2
LEFT JOIN iso_codes ic_division ON ic_division.parent_code = p.iso_code AND ic_division.level = 3
WHERE p.iso_code IS NOT NULL
  AND LENGTH(REPLACE(p.iso_code, ' ', '')) = 4
GROUP BY p.iso_code
ORDER BY product_count DESC
LIMIT 20;

-- 6. Class별 제품 수 및 가능한 Division 코드 확인
SELECT 
    '=== Class별 제품 수 및 Division 매핑 가능 여부 ===' as section,
    p.iso_code as class_code,
    COUNT(DISTINCT p.id) as product_count,
    COUNT(DISTINCT ic_division.code) as available_divisions,
    STRING_AGG(DISTINCT ic_division.code, ', ' ORDER BY ic_division.code) as division_codes
FROM products p
LEFT JOIN iso_codes ic_class ON ic_class.code = p.iso_code AND ic_class.level = 1
LEFT JOIN iso_codes ic_subclass ON ic_subclass.parent_code = p.iso_code AND ic_subclass.level = 2
LEFT JOIN iso_codes ic_division ON ic_division.parent_code = ic_subclass.code AND ic_division.level = 3
WHERE p.iso_code IS NOT NULL
  AND LENGTH(REPLACE(p.iso_code, ' ', '')) = 2
GROUP BY p.iso_code
ORDER BY product_count DESC
LIMIT 20;
