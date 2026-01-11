-- =========================================================
-- [LinkAble] 잘못된 제품 ISO 코드 배정 수정
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-11
-- =========================================================
--
-- 문제: "12 03 03" (지팡이)에 휠체어, 커뮤니케이터 등 잘못된 제품들이 배정됨
-- 원인: Class 레벨 제품을 첫 번째 Division으로 무작정 배정한 스크립트
-- 해결: 제품 이름 기반으로 올바른 ISO 코드 재배정
-- =========================================================

-- =========================================================
-- [1] Materialized View 삭제 (잘못된 데이터 포함)
-- =========================================================

DROP MATERIALIZED VIEW IF EXISTS mv_icf_iso_product_matches CASCADE;

-- =========================================================
-- [2] 잘못 배정된 제품 식별 및 수정
-- =========================================================

-- 2-1. 휠체어 제품들을 올바른 ISO 코드로 재배정
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
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%' OR
    p.name ILIKE '%WHEELCHAIR%' OR
    p.name ILIKE '%Wheelchair%'
  )
  AND p.name NOT ILIKE '%지팡이%'
  AND p.name NOT ILIKE '%cane%'
  AND p.name NOT ILIKE '%stick%';

-- 2-2. 전동휠체어 제품들
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
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%전동휠체어%' OR
    p.name ILIKE '%전동%휠체어%' OR
    p.name ILIKE '%electric%wheelchair%' OR
    p.name ILIKE '%powered%wheelchair%' OR
    p.name ILIKE '%motorized%wheelchair%'
  );

-- 2-3. 휠체어 부품 (쿠션, 등받이 등) → 12 24 42 (물건을 고정하거나 운반하기 위해 휠체어에 부착된 장치)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 24 42'  -- 물건을 고정하거나 운반하기 위해 휠체어에 부착된 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%쿠션%' OR
    p.name ILIKE '%cushion%' OR
    p.name ILIKE '%등받이%' OR
    p.name ILIKE '%backrest%' OR
    p.name ILIKE '%컵홀더%' OR
    p.name ILIKE '%cup%holder%' OR
    p.name ILIKE '%헤드레스트%' OR
    p.name ILIKE '%headrest%'
  )
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  );

-- 2-4. 커뮤니케이터 제품들
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 21 09'  -- 대화 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%커뮤니케이터%' OR
    p.name ILIKE '%communicator%' OR
    p.name ILIKE '%의사소통%' OR
    p.name ILIKE '%communication%'
  );

-- 2-5. 보행기/워커 제품들
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 06 03'  -- 보행 프레임
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%보행기%' OR
    p.name ILIKE '%워커%' OR
    p.name ILIKE '%walker%' OR
    p.name ILIKE '%보행보조기%'
  );

-- 2-6. 목발 제품들
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 03 06'  -- 팔꿈치 목발
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%목발%' OR
    p.name ILIKE '%crutch%' OR
    p.name ILIKE '%크러치%'
  );

-- 2-7. 틸팅/리클라이닝 휠체어 → 12 22 03 (일수 핸드림 구동 휠체어) 또는 12 22 18 (미는 휠체어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 22 18'  -- 미는 휠체어 (틸팅/리클라이닝은 보조인이 미는 경우가 많음)
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%틸팅%' OR
    p.name ILIKE '%tilting%' OR
    p.name ILIKE '%리클라이닝%' OR
    p.name ILIKE '%reclining%' OR
    p.name ILIKE '%침대형%' OR
    p.name ILIKE '%bed%type%'
  )
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  );

-- 2-8. 샤워/수영장용 휠체어 → 12 22 18 (미는 휠체어) 또는 적절한 코드
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
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
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
  );

-- 2-9. 산악/스포츠용 휠체어 → 12 22 03 (일수 핸드림 구동 휠체어)
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
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND (
    p.name ILIKE '%산악%' OR
    p.name ILIKE '%mountain%' OR
    p.name ILIKE '%마라톤%' OR
    p.name ILIKE '%marathon%' OR
    p.name ILIKE '%스포츠%' OR
    p.name ILIKE '%sport%'
  )
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%'
  );

-- =========================================================
-- [2-10] 22 03 03 (광 필터)에 잘못 배정된 제품 수정
-- =========================================================

-- 2-10-1. 독서확대기 → 22 03 18 (이미지 확대 시스템)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 18'  -- 이미지 확대 시스템
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND (
    p.name ILIKE '%독서확대기%' OR
    p.name ILIKE '%확대기%' OR
    p.name ILIKE '%magnifier%' OR
    p.name ILIKE '%loupe%' OR
    p.name ILIKE '%clover%' OR
    p.name ILIKE '%compact%' OR
    p.name ILIKE '%explore%' OR
    p.name ILIKE '%ruby%' OR
    p.name ILIKE '%prodigi%' OR
    p.name ILIKE '%reveal%' OR
    p.name ILIKE '%토파즈%' OR
    p.name ILIKE '%topaz%' OR
    p.name ILIKE '%vario%' OR
    p.name ILIKE '%아이러뷰%' OR
    p.name ILIKE '%센스뷰%' OR
    p.name ILIKE '%다빈치%' OR
    p.name ILIKE '%트랜스포머%' OR
    p.name ILIKE '%매그니링크%'
  )
  AND p.name NOT ILIKE '%필터%'
  AND p.name NOT ILIKE '%filter%';

-- 2-10-2. 화면 낭독기/스크린 리더 → 22 03 21 (화면 확대 소프트웨어) 또는 22 13 18 (OCR 장비 및 소프트웨어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 21'  -- 화면 확대 소프트웨어 (화면 낭독기도 포함)
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND (
    p.name ILIKE '%JAWS%' OR
    p.name ILIKE '%NVDA%' OR
    p.name ILIKE '%VoiceOver%' OR
    p.name ILIKE '%Narrator%' OR
    p.name ILIKE '%센스리더%' OR
    p.name ILIKE '%화면%낭독%' OR
    p.name ILIKE '%screen%reader%' OR
    p.name ILIKE '%소리안%' OR
    p.name ILIKE '%OCR%' OR
    p.name ILIKE '%광학문자%' OR
    p.name ILIKE '%노바캠%'
  );

-- 2-10-3. 안경 → 22 03 06 (안경 및 콘택트렌즈)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 06'  -- 안경 및 콘택트렌즈
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND (
    p.name ILIKE '%안경%' OR
    p.name ILIKE '%glasses%' OR
    p.name ILIKE '%eyeglass%' OR
    p.name ILIKE '%렌즈%' OR
    p.name ILIKE '%lens%'
  )
  AND p.name NOT ILIKE '%확대%'
  AND p.name NOT ILIKE '%magnifier%';

-- 2-10-4. 확대경/확대용 렌즈 → 22 03 09 (확대경, 확대용 렌즈 및 렌즈 시스템)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 09'  -- 확대경, 확대용 렌즈 및 렌즈 시스템
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND (
    p.name ILIKE '%확대경%' OR
    p.name ILIKE '%확대용%렌즈%' OR
    p.name ILIKE '%안경식%확대기%'
  );

-- 2-10-5. 키보드/마우스/스위치 → 24 13 21 (컴퓨터 포인팅 장치)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 21'  -- 컴퓨터 포인팅 장치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND (
    p.name ILIKE '%키보드%' OR
    p.name ILIKE '%keyboard%' OR
    p.name ILIKE '%마우스%' OR
    p.name ILIKE '%mouse%' OR
    p.name ILIKE '%조이스틱%' OR
    p.name ILIKE '%joystick%' OR
    p.name ILIKE '%스위치%' OR
    p.name ILIKE '%switch%' OR
    p.name ILIKE '%트랙볼%' OR
    p.name ILIKE '%trackball%' OR
    p.name ILIKE '%비전보드%' OR
    p.name ILIKE '%visionboard%'
  );

-- 2-10-6. 모니터/디스플레이 → 22 03 18 (이미지 확대 시스템) 또는 22 33 18 (컴퓨터 및 네트워크용 액세서리)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 18'  -- 이미지 확대 시스템 (확대 모니터 포함)
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND (
    p.name ILIKE '%모니터%' OR
    p.name ILIKE '%monitor%' OR
    p.name ILIKE '%LEDTV%' OR
    p.name ILIKE '%터치%모니터%' OR
    p.name ILIKE '%touch%monitor%'
  )
  AND (
    p.name ILIKE '%확대%' OR
    p.name ILIKE '%magnify%'
  );

-- =========================================================
-- [3] 검증: 잘못 배정된 제품이 남아있는지 확인
-- =========================================================

-- 3-1. 12 03 03에 남아있는 제품 중 지팡이가 아닌 제품 확인
SELECT 
  p.id,
  p.name,
  p.iso_code_id,
  ic.code as iso_code,
  ic.name as iso_name
FROM products p
JOIN iso_codes ic ON p.iso_code_id = ic.id
WHERE ic.code = '12 03 03'
  AND p.is_active = true
  AND (
    p.name ILIKE '%휠체어%' OR
    p.name ILIKE '%wheelchair%' OR
    p.name ILIKE '%커뮤니케이터%' OR
    p.name ILIKE '%communicator%' OR
    p.name ILIKE '%쿠션%' OR
    p.name ILIKE '%cushion%' OR
    p.name ILIKE '%보행기%' OR
    p.name ILIKE '%walker%' OR
    p.name ILIKE '%목발%' OR
    p.name ILIKE '%crutch%'
  )
ORDER BY p.name
LIMIT 50;

-- 3-2. 22 03 03에 남아있는 제품 중 광 필터가 아닌 제품 확인
SELECT 
  p.id,
  p.name,
  p.iso_code_id,
  ic.code as iso_code,
  ic.name as iso_name
FROM products p
JOIN iso_codes ic ON p.iso_code_id = ic.id
WHERE ic.code = '22 03 03'
  AND p.is_active = true
  AND (
    p.name ILIKE '%독서확대기%' OR
    p.name ILIKE '%확대기%' OR
    p.name ILIKE '%화면%낭독%' OR
    p.name ILIKE '%screen%reader%' OR
    p.name ILIKE '%키보드%' OR
    p.name ILIKE '%마우스%' OR
    p.name ILIKE '%모니터%' OR
    p.name ILIKE '%안경%' OR
    p.name ILIKE '%스위치%' OR
    p.name ILIKE '%JAWS%' OR
    p.name ILIKE '%NVDA%' OR
    p.name ILIKE '%센스리더%' OR
    p.name ILIKE '%clover%' OR
    p.name ILIKE '%compact%' OR
    p.name ILIKE '%ruby%' OR
    p.name ILIKE '%prodigi%'
  )
ORDER BY p.name
LIMIT 50;

-- =========================================================
-- [4] ISO 코드별 제품 분포 재확인
-- =========================================================

SELECT 
  ic.code,
  ic.name,
  ic.level,
  COUNT(p.id) as product_count
FROM products p
JOIN iso_codes ic ON p.iso_code_id = ic.id
WHERE p.is_active = true
  AND ic.level = 3
GROUP BY ic.code, ic.name, ic.level
ORDER BY product_count DESC
LIMIT 20;

-- =========================================================
-- [5] Materialized View 재생성 (수정된 데이터 기반)
-- =========================================================

CREATE MATERIALIZED VIEW mv_icf_iso_product_matches AS
SELECT
  m.id as mapping_id,
  m.icf_codes,
  m.iso_code,
  m.iso_code_id,  -- 매핑의 ISO 코드 ID (기존 호환성 유지)
  ic.name as iso_label,
  m.base_score,
  m.label as mapping_label,
  m.description as mapping_description,
  p.id as product_id,
  p.name as product_name,
  p.manufacturer,
  p.description as product_description,
  p.image_url,
  p.purchase_link,
  p.price,
  p.category,
  p.is_active as product_active,
  p.created_at as product_created_at
FROM icf_iso_mappings m
INNER JOIN iso_codes ic ON m.iso_code_id = ic.id
INNER JOIN products p ON p.iso_code_id = m.iso_code_id  -- 정확한 ISO 코드 매칭만
WHERE m.is_active = true
  AND ic.is_active = true
  AND p.is_active = true
  AND p.iso_code_id IS NOT NULL
  AND ic.level = 3;  -- Division 레벨만 포함

-- Materialized View 인덱스 재생성
CREATE INDEX idx_mv_icf_iso_product_icf 
ON mv_icf_iso_product_matches USING GIN(icf_codes);

CREATE INDEX idx_mv_icf_iso_product_iso 
ON mv_icf_iso_product_matches(iso_code_id);

CREATE INDEX idx_mv_icf_iso_product_active 
ON mv_icf_iso_product_matches(product_active, product_created_at DESC);

COMMENT ON MATERIALIZED VIEW mv_icf_iso_product_matches IS 
  'ICF-ISO-제품 매칭 결과를 사전 계산한 Materialized View (수정된 제품 배정 기반)';

-- =========================================================
-- 완료 메시지
-- =========================================================

DO $$
DECLARE
  v_wrong_12_03_03_count INTEGER;
  v_total_12_03_03 INTEGER;
  v_wrong_22_03_03_count INTEGER;
  v_total_22_03_03 INTEGER;
BEGIN
  -- 12 03 03 잘못 배정된 제품 수 확인
  SELECT COUNT(*) INTO v_wrong_12_03_03_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '12 03 03'
    AND p.is_active = true
    AND (
      p.name ILIKE '%휠체어%' OR
      p.name ILIKE '%wheelchair%' OR
      p.name ILIKE '%커뮤니케이터%' OR
      p.name ILIKE '%communicator%'
    );
  
  -- 12 03 03에 배정된 전체 제품 수
  SELECT COUNT(*) INTO v_total_12_03_03
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '12 03 03'
    AND p.is_active = true;
  
  -- 22 03 03 잘못 배정된 제품 수 확인 (광 필터가 아닌 제품)
  SELECT COUNT(*) INTO v_wrong_22_03_03_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '22 03 03'
    AND p.is_active = true
    AND (
      p.name ILIKE '%독서확대기%' OR
      p.name ILIKE '%확대기%' OR
      p.name ILIKE '%화면%낭독%' OR
      p.name ILIKE '%screen%reader%' OR
      p.name ILIKE '%키보드%' OR
      p.name ILIKE '%마우스%' OR
      p.name ILIKE '%모니터%' OR
      p.name ILIKE '%안경%' OR
      p.name ILIKE '%스위치%' OR
      p.name ILIKE '%JAWS%' OR
      p.name ILIKE '%NVDA%' OR
      p.name ILIKE '%센스리더%'
    );
  
  -- 22 03 03에 배정된 전체 제품 수
  SELECT COUNT(*) INTO v_total_22_03_03
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '22 03 03'
    AND p.is_active = true;
  
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '제품 ISO 코드 배정 수정 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '12 03 03 (지팡이)에 배정된 제품 수: %', v_total_12_03_03;
  RAISE NOTICE '12 03 03 (지팡이)에 잘못 배정된 제품 수 (수정 후): %', v_wrong_12_03_03_count;
  RAISE NOTICE '22 03 03 (광 필터)에 배정된 제품 수: %', v_total_22_03_03;
  RAISE NOTICE '22 03 03 (광 필터)에 잘못 배정된 제품 수 (수정 후): %', v_wrong_22_03_03_count;
  IF v_wrong_12_03_03_count > 0 OR v_wrong_22_03_03_count > 0 THEN
    RAISE WARNING '⚠️  아직 잘못 배정된 제품이 있습니다. 수동 검토가 필요합니다.';
  END IF;
  RAISE NOTICE '=========================================================';
END $$;
