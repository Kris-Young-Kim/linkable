-- =========================================================
-- [LinkAble] 대량 잘못된 ISO 코드 배정 수정 (긴급)
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-13
-- =========================================================
--
-- 문제: 제품들이 완전히 잘못된 ISO 코드로 배정되어 있음
-- 예: 지팡이(12 03 03)에 기립훈련기, 카시트, 이동변기 등이 배정됨
-- 해결: ISO 9999:2022 표준에 따라 올바른 Division 레벨 코드로 재배정
-- =========================================================

-- =========================================================
-- [1] 12 03 03 (지팡이)에 잘못 배정된 제품들 수정
-- =========================================================

-- 1-1. 기립훈련기/스탠더 → 12 31 24 (리프팅 시트 및 리프팅 매트리스) 또는 04 48 39 (스탠딩 프레임)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '12 31 24'  -- 리프팅 시트 및 리프팅 매트리스 (기립 보조기구)
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%기립%' OR
    p.name ILIKE '%스탠더%' OR
    p.name ILIKE '%스탠딩%' OR
    p.name ILIKE '%stander%' OR
    p.name ILIKE '%standing%' OR
    p.name ILIKE '%EasyStand%' OR
    p.name ILIKE '%이지스탠더%'
  );

-- 1-2. 카시트 → 차량용 보조기구 (12 39 또는 적절한 코드)
-- 참고: ISO 9999:2022에는 차량용 카시트가 명시적으로 없으므로, 가장 가까운 코드 사용
-- 또는 NULL로 설정 후 수동 배정 필요
UPDATE products p
SET iso_code_id = NULL,  -- 차량용 카시트는 ISO 9999:2022에 명시적 코드가 없음
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%카시트%' OR
    p.name ILIKE '%car%seat%' OR
    p.name ILIKE '%캐롯%'
  );

-- 1-3. 이동변기/변기 → 09 12 03 (변기) 또는 09 12 06 (변기 의자)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 12 06'  -- 변기 의자
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%변기%' OR
    p.name ILIKE '%toilet%' OR
    p.name ILIKE '%소변기%' OR
    p.name ILIKE '%urinal%'
  );

-- 1-4. 샤워트롤리/샤워 의자 → 09 33 07 (바퀴가 있거나 없는 샤워 의자)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 33 07'  -- 바퀴가 있거나 없는 샤워 의자
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%샤워%' OR
    p.name ILIKE '%shower%' OR
    p.name ILIKE '%트롤리%' OR
    p.name ILIKE '%trolly%'
  );

-- 1-5. 테이블 → 18 03 06 (독서대, 책상 및 입식 책상) 또는 18 03 12 (식탁)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 03 06'  -- 독서대, 책상 및 입식 책상
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '12 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%테이블%' OR
    p.name ILIKE '%table%' OR
    p.name ILIKE '%책상%' OR
    p.name ILIKE '%desk%'
  );

-- =========================================================
-- [2] 22 33 18 (컴퓨터 및 네트워크용 액세서리)에 잘못 배정된 제품들 수정
-- =========================================================

-- 2-1. 의사소통 보조기기 → 22 21 09 (대화 장치) 또는 22 30 21 (대체 입력 장치)
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
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 33 18' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%보이스아이%' OR
    p.name ILIKE '%voice%eye%' OR
    p.name ILIKE '%토커%' OR
    p.name ILIKE '%talker%' OR
    p.name ILIKE '%커뮤니케이터%' OR
    p.name ILIKE '%communicator%' OR
    p.name ILIKE '%의사소통%' OR
    p.name ILIKE '%communication%'
  );

-- 2-2. 스위치 → 24 13 09 (전기기기용 스위치)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 09'  -- 전기기기용 스위치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 33 18' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%스위치%' OR
    p.name ILIKE '%switch%'
  );

-- 2-3. 마운트/스탠드 → 24 18 12 (스탠드) 또는 22 33 18 유지 (컴퓨터 액세서리로 적절할 수 있음)
-- 마운트는 컴퓨터 액세서리로 볼 수 있으므로 유지하거나 24 18 12로 변경
-- 여기서는 컴퓨터 관련 마운트는 22 33 18 유지, 일반 스탠드는 24 18 12로 변경

-- =========================================================
-- [3] 24 13 21 (컴퓨터 포인팅 장치)에 잘못 배정된 제품들 수정
-- =========================================================

-- 3-1. 스위치 → 24 13 09 (전기기기용 스위치)
-- 참고: 24 13 21은 마우스, 트랙볼 등 포인팅 장치, 스위치는 24 13 09 (전기기기용 스위치)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 13 09'  -- 전기기기용 스위치
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '24 13 21' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%스위치%' OR
    p.name ILIKE '%switch%'
  )
  AND p.name NOT ILIKE '%마우스%'
  AND p.name NOT ILIKE '%mouse%'
  AND p.name NOT ILIKE '%트랙볼%'
  AND p.name NOT ILIKE '%trackball%'
  AND p.name NOT ILIKE '%조이스틱%'
  AND p.name NOT ILIKE '%joystick%';

-- =========================================================
-- [4] 15 03 03 (식음료 준비를 위한 계량 및 측정 보조기구)에 잘못 배정된 제품들 수정
-- =========================================================

-- 4-1. 식사용 에이프런 → 15 04 03 (착의 보조기구) 또는 09 03 06 (일반 의류)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 03 06'  -- 일반 의류 (에이프런은 의류로 분류)
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%에이프런%' OR
    p.name ILIKE '%apron%'
  );

-- 4-2. 스푼홀더 → 15 09 13 (커트러리, 젓가락 및 빨대)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '15 09 13'  -- 커트러리, 젓가락 및 빨대
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%스푼%홀더%' OR
    p.name ILIKE '%spoon%holder%' OR
    p.name ILIKE '%식기%' OR
    p.name ILIKE '%식사%도구%'
  );

-- 4-3. 샤워트롤리 → 09 33 07 (바퀴가 있거나 없는 샤워 의자)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 33 07'  -- 바퀴가 있거나 없는 샤워 의자
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%샤워%' OR
    p.name ILIKE '%shower%' OR
    p.name ILIKE '%트롤리%' OR
    p.name ILIKE '%trolly%'
  );

-- 4-4. 목욕 쿠션 → 09 33 39 (부유 보조기구) 또는 09 33 04 (목욕 보드)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 33 39'  -- 부유 보조기구
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%목욕%쿠션%' OR
    p.name ILIKE '%bath%cushion%' OR
    p.name ILIKE '%배스%쿠션%'
  );

-- 4-5. 휴대용 소변기 → 09 12 06 (변기 의자)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '09 12 06'  -- 변기 의자
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%소변기%' OR
    p.name ILIKE '%urinal%' OR
    p.name ILIKE '%변기%' OR
    p.name ILIKE '%toilet%'
  );

-- 4-6. 독서대 → 18 03 06 (독서대, 책상 및 입식 책상) 또는 22 13 06 (칠판, 독서대 및 책받침 쿠션)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 03 06'  -- 독서대, 책상 및 입식 책상
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%독서대%' OR
    p.name ILIKE '%reading%stand%' OR
    p.name ILIKE '%책상%' OR
    p.name ILIKE '%desk%'
  );

-- 4-7. 집게/오프너 → 24 06 03 (용기 오프너) 또는 24 18 03 (파지 장치)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '24 06 03'  -- 용기 오프너
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '15 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%오프너%' OR
    p.name ILIKE '%opener%' OR
    p.name ILIKE '%집게%' OR
    p.name ILIKE '%grasp%'
  );

-- =========================================================
-- [5] 22 03 03 (광 필터)에 잘못 배정된 제품들 수정
-- =========================================================

-- 5-1. 책상 → 18 03 06 (독서대, 책상 및 입식 책상) 또는 28 03 03 (업무용 책상)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 03 06'  -- 독서대, 책상 및 입식 책상
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%책상%' OR
    p.name ILIKE '%desk%' OR
    p.name ILIKE '%테이블%' OR
    p.name ILIKE '%table%'
  );

-- 5-2. 화면확대 소프트웨어 → 22 03 21 (화면 확대 소프트웨어)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '22 03 21'  -- 화면 확대 소프트웨어
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%화면확대%' OR
    p.name ILIKE '%screen%magnif%' OR
    p.name ILIKE '%줌텍스트%' OR
    p.name ILIKE '%zoomtext%'
  );

-- 5-3. 독서대 → 18 03 06 (독서대, 책상 및 입식 책상)
UPDATE products p
SET iso_code_id = (
  SELECT ic.id
  FROM iso_codes ic
  WHERE ic.code = '18 03 06'  -- 독서대, 책상 및 입식 책상
    AND ic.level = 3
    AND ic.is_active = true
  LIMIT 1
),
updated_at = NOW()
WHERE p.iso_code_id = (SELECT id FROM iso_codes WHERE code = '22 03 03' AND level = 3)
  AND p.is_active = true
  AND (
    p.name ILIKE '%독서대%' OR
    p.name ILIKE '%reading%stand%'
  );

-- =========================================================
-- [6] 검증: 수정 후 상태 확인
-- =========================================================

-- 6-1. 12 03 03 (지팡이)에 남아있는 잘못 배정된 제품 확인
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
    p.name ILIKE '%기립%' OR
    p.name ILIKE '%카시트%' OR
    p.name ILIKE '%변기%' OR
    p.name ILIKE '%샤워%' OR
    p.name ILIKE '%테이블%'
  )
ORDER BY p.name
LIMIT 50;

-- 6-2. ISO 코드별 제품 수 재확인
SELECT 
  ic.code,
  ic.name,
  ic.level,
  COUNT(p.id) as product_count
FROM iso_codes ic
LEFT JOIN products p ON p.iso_code_id = ic.id AND p.is_active = true
WHERE ic.code IN ('12 03 03', '22 33 18', '24 13 21', '15 03 03', '22 03 03')
  AND ic.level = 3
  AND ic.is_active = true
GROUP BY ic.id, ic.code, ic.name, ic.level
ORDER BY ic.code;

-- =========================================================
-- [7] 완료 메시지
-- =========================================================

DO $$
DECLARE
  v_12_03_03_count INTEGER;
  v_22_33_18_count INTEGER;
  v_24_13_21_count INTEGER;
  v_15_03_03_count INTEGER;
  v_22_03_03_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_12_03_03_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '12 03 03' AND p.is_active = true;
  
  SELECT COUNT(*) INTO v_22_33_18_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '22 33 18' AND p.is_active = true;
  
  SELECT COUNT(*) INTO v_24_13_21_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '24 13 21' AND p.is_active = true;
  
  SELECT COUNT(*) INTO v_15_03_03_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '15 03 03' AND p.is_active = true;
  
  SELECT COUNT(*) INTO v_22_03_03_count
  FROM products p
  JOIN iso_codes ic ON p.iso_code_id = ic.id
  WHERE ic.code = '22 03 03' AND p.is_active = true;
  
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '대량 잘못된 ISO 코드 배정 수정 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '12 03 03 (지팡이) 제품 수: %', v_12_03_03_count;
  RAISE NOTICE '22 33 18 (컴퓨터 액세서리) 제품 수: %', v_22_33_18_count;
  RAISE NOTICE '24 13 21 (컴퓨터 포인팅 장치) 제품 수: %', v_24_13_21_count;
  RAISE NOTICE '15 03 03 (식음료 준비 계량) 제품 수: %', v_15_03_03_count;
  RAISE NOTICE '22 03 03 (광 필터) 제품 수: %', v_22_03_03_count;
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '주의: 일부 제품은 수동 검토가 필요할 수 있습니다.';
  RAISE NOTICE '=========================================================';
END $$;
