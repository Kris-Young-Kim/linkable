-- =========================================================
-- [LinkAble] 잘못된 휠체어 제품 ISO 코드 배정 수정 (긴급)
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-13
-- =========================================================
--
-- 문제: 수동 휠체어를 추천했는데 전동 휠체어, 워커 등 다른 제품이 나옴
-- 원인: 제품 이름에 "휠체어"가 포함되어 있지만 iso_code_id가 잘못된 ISO 코드를 가리킴
-- 해결: 제품 이름 기반으로 올바른 수동 휠체어 Division 코드로 재배정
-- =========================================================

-- =========================================================
-- [1] 잘못 배정된 휠체어 제품들을 수동 휠체어 Division으로 재배정
-- =========================================================

-- 1-1. 일반 수동 휠체어 → 12 22 03 (일수 핸드림 구동 휠체어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 22 03'  -- 일수 핸드림 구동 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.is_active = true
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  )
  AND p.name NOT ILIKE '%전동%'
  AND p.name NOT ILIKE '%electric%'
  AND p.name NOT ILIKE '%power%'
  AND p.name NOT ILIKE '%모터%'
  AND p.name NOT ILIKE '%motor%'
  AND p.name NOT ILIKE '%배터리%'
  AND p.name NOT ILIKE '%battery%'
  AND (
    -- 현재 잘못된 ISO 코드를 가리키고 있는 경우
    p.iso_code_id IS NULL OR
    p.iso_code_id NOT IN (
      SELECT id FROM iso_codes 
      WHERE code LIKE '12 22%' 
        AND level = 3 
        AND is_active = true
    )
  );

-- 1-2. 마라톤/스포츠용 휠체어 → 12 22 03 (일수 핸드림 구동 휠체어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 22 03'  -- 일수 핸드림 구동 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.is_active = true
  AND (
    p.name ILIKE '%마라톤%' OR
    p.name ILIKE '%marathon%' OR
    p.name ILIKE '%스포츠%' OR
    p.name ILIKE '%sport%' OR
    p.name ILIKE '%해변%' OR
    p.name ILIKE '%beach%' OR
    p.name ILIKE '%히포캄프%' OR
    p.name ILIKE '%hippocampe%'
  )
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  )
  AND p.name NOT ILIKE '%전동%'
  AND p.name NOT ILIKE '%electric%'
  AND p.name NOT ILIKE '%power%';

-- 1-3. 샤워/수영장용 휠체어 → 12 22 18 (미는 휠체어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 22 18'  -- 미는 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.is_active = true
  AND (
    p.name ILIKE '%샤워%' OR
    p.name ILIKE '%shower%' OR
    p.name ILIKE '%수영장%' OR
    p.name ILIKE '%pool%' OR
    p.name ILIKE '%입수%'
  )
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  )
  AND p.name NOT ILIKE '%전동%'
  AND p.name NOT ILIKE '%electric%'
  AND p.name NOT ILIKE '%power%';

-- 1-4. 접이식 휠체어 경사로 → 18 30 03 (승강기) 또는 18 30 06 (경사로)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 30 06'  -- 경사로
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.is_active = true
  AND (
    p.name ILIKE '%경사로%' OR
    p.name ILIKE '%ramp%' OR
    p.name ILIKE '%램프%'
  )
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  );

-- =========================================================
-- [2] 전동 휠체어 제품 확인 및 수정
-- =========================================================

-- 2-1. 전동 휠체어 → 12 23 03 (수동 직접 조향 전동 휠체어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 23 03'  -- 수동 직접 조향 전동 휠체어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.is_active = true
  AND (
    p.name ILIKE '%전동%휠체어%' OR
    p.name ILIKE '%전동휠체어%' OR
    p.name ILIKE '%electric%wheelchair%' OR
    p.name ILIKE '%powered%wheelchair%' OR
    p.name ILIKE '%motorized%wheelchair%' OR
    (p.name ILIKE '%휠체어%' AND (
      p.name ILIKE '%전동%' OR
      p.name ILIKE '%electric%' OR
      p.name ILIKE '%power%' OR
      p.name ILIKE '%모터%' OR
      p.name ILIKE '%motor%' OR
      p.name ILIKE '%배터리%' OR
      p.name ILIKE '%battery%'
    ))
  )
  AND (
    -- 현재 잘못된 ISO 코드를 가리키고 있는 경우
    p.iso_code_id IS NULL OR
    p.iso_code_id NOT IN (
      SELECT id FROM iso_codes 
      WHERE code LIKE '12 23%' 
        AND level = 3 
        AND is_active = true
    )
  );

-- =========================================================
-- [3] 검증: 수정 후 상태 확인
-- =========================================================

-- 3-1. 수동 휠체어 Division 코드별 제품 수 확인
SELECT 
  ic.code,
  ic.name,
  ic.level,
  COUNT(p.id) as product_count
FROM iso_codes ic
LEFT JOIN products p ON p.iso_code_id = ic.id AND p.is_active = true
WHERE ic.code LIKE '12 22%'
  AND ic.level = 3
  AND ic.is_active = true
GROUP BY ic.id, ic.code, ic.name, ic.level
ORDER BY ic.code;

-- 3-2. 여전히 잘못 배정된 휠체어 제품 확인
SELECT 
  p.id,
  p.name,
  p.iso_code_id,
  ic.code as iso_code,
  ic.name as iso_name,
  ic.level as iso_level
FROM products p
LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
WHERE p.is_active = true
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  )
  AND (
    ic.code IS NULL OR
    ic.code NOT LIKE '12 22%' AND ic.code NOT LIKE '12 23%' OR
    ic.level != 3
  )
ORDER BY p.name
LIMIT 50;

-- =========================================================
-- [4] 완료 메시지
-- =========================================================

DO $$
DECLARE
  v_manual_wheelchair_count INTEGER;
  v_electric_wheelchair_count INTEGER;
  v_wrong_assignment_count INTEGER;
BEGIN
  -- 수동 휠체어 제품 수
  SELECT COUNT(*) INTO v_manual_wheelchair_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code LIKE '12 22%'
    AND ic.level = 3
    AND p.is_active = true;
  
  -- 전동 휠체어 제품 수
  SELECT COUNT(*) INTO v_electric_wheelchair_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code LIKE '12 23%'
    AND ic.level = 3
    AND p.is_active = true;
  
  -- 여전히 잘못 배정된 제품 수
  SELECT COUNT(*) INTO v_wrong_assignment_count
  FROM products p
  LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE p.is_active = true
    AND (
      p.name ILIKE '%휠체어%' OR
      p.name ILIKE '%wheelchair%'
    )
    AND (
      ic.code IS NULL OR
      (ic.code NOT LIKE '12 22%' AND ic.code NOT LIKE '12 23%') OR
      ic.level != 3
    );
  
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '휠체어 제품 ISO 코드 배정 수정 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '수동 휠체어 (12 22 Division) 제품 수: %', v_manual_wheelchair_count;
  RAISE NOTICE '전동 휠체어 (12 23 Division) 제품 수: %', v_electric_wheelchair_count;
  RAISE NOTICE '여전히 잘못 배정된 제품 수: %', v_wrong_assignment_count;
  IF v_wrong_assignment_count > 0 THEN
    RAISE WARNING '⚠️  아직 잘못 배정된 제품이 있습니다. 수동 검토가 필요합니다.';
  END IF;
  RAISE NOTICE '=========================================================';
END $$;
