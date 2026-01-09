-- =========================================================
-- [LinkAble] ISO 9999:2022 구조에 맞게 level 자동 설정
-- Database: PostgreSQL (Supabase)
-- Created: 2025-01-30
-- =========================================================
--
-- 목적: ISO 9999:2022 구조에 맞게 대분류(Class), 중분류(Subclass), 소분류(Division)를
--       자동으로 구분하여 level 컬럼을 올바르게 설정
--
-- ISO 9999:2022 구조:
-- - Class (대분류): 2자리 숫자 (예: 12, 15, 18)
-- - Subclass (중분류): 4자리 숫자 (예: 1202, 1509, 1830) 또는 공백 포함 "12 02", "15 09", "18 30"
-- - Division (소분류): 6자리 숫자 (예: 120201, 150901) 또는 공백 포함 "12 02 01", "15 09 01"
-- =========================================================

-- 1. ISO 코드의 실제 길이에 따라 level 자동 설정 (강제 수정)
-- Level과 코드 형식이 일치하지 않는 경우 강제로 수정
UPDATE iso_codes
SET level = CASE
    -- 공백 제거 후 길이가 2자리면 Class (대분류)
    WHEN LENGTH(REPLACE(code, ' ', '')) = 2 THEN 1
    -- 공백 제거 후 길이가 4자리면 Subclass (중분류)
    WHEN LENGTH(REPLACE(code, ' ', '')) = 4 THEN 2
    -- 공백 제거 후 길이가 6자리면 Division (소분류)
    WHEN LENGTH(REPLACE(code, ' ', '')) = 6 THEN 3
    -- 기타는 그대로 유지
    ELSE level
END
WHERE 
    -- Level과 코드 형식이 일치하지 않는 경우만 수정
    (level = 1 AND LENGTH(REPLACE(code, ' ', '')) != 2) OR
    (level = 2 AND LENGTH(REPLACE(code, ' ', '')) != 4) OR
    (level = 3 AND LENGTH(REPLACE(code, ' ', '')) != 6) OR
    -- Level이 NULL이거나 잘못된 경우
    (level IS NULL AND LENGTH(REPLACE(code, ' ', '')) IN (2, 4, 6));

-- 2. Level 1 (대분류) 코드의 parent_code를 NULL로 설정
UPDATE iso_codes
SET parent_code = NULL
WHERE level = 1 AND parent_code IS NOT NULL;

-- 3. Level 2 (중분류) 코드의 parent_code를 Class 코드로 설정
-- 예: "12 02"의 parent_code는 "12"가 되어야 함
UPDATE iso_codes ic2
SET parent_code = (
    SELECT ic1.code
    FROM iso_codes ic1
    WHERE ic1.level = 1
      AND SUBSTRING(REPLACE(ic2.code, ' ', ''), 1, 2) = REPLACE(ic1.code, ' ', '')
    LIMIT 1
)
WHERE ic2.level = 2
  AND (ic2.parent_code IS NULL OR ic2.parent_code != (
    SELECT ic1.code
    FROM iso_codes ic1
    WHERE ic1.level = 1
      AND SUBSTRING(REPLACE(ic2.code, ' ', ''), 1, 2) = REPLACE(ic1.code, ' ', '')
    LIMIT 1
  ));

-- 4. Level 3 (소분류) 코드의 parent_code를 Subclass 코드로 설정
-- 예: "12 02 01"의 parent_code는 "12 02"가 되어야 함
UPDATE iso_codes ic3
SET parent_code = (
    SELECT ic2.code
    FROM iso_codes ic2
    WHERE ic2.level = 2
      AND SUBSTRING(REPLACE(ic3.code, ' ', ''), 1, 4) = REPLACE(ic2.code, ' ', '')
    LIMIT 1
)
WHERE ic3.level = 3
  AND (ic3.parent_code IS NULL OR ic3.parent_code != (
    SELECT ic2.code
    FROM iso_codes ic2
    WHERE ic2.level = 2
      AND SUBSTRING(REPLACE(ic3.code, ' ', ''), 1, 4) = REPLACE(ic2.code, ' ', '')
    LIMIT 1
  ));

-- 5. Level 1 (대분류) 코드가 없으면 생성
-- 주요 Class 코드들
INSERT INTO iso_codes (code, name, description, level, parent_code, is_active)
SELECT 
    class_code,
    CASE class_code
        WHEN '04' THEN '생리적/심리적 기능 측정, 자극, 훈련용 보조기기'
        WHEN '06' THEN '보조기 및 의지'
        WHEN '09' THEN '자가관리 활동 및 참여용 보조기기'
        WHEN '12' THEN '개인 이동 및 교통 관련 활동 및 참여용 보조기기'
        WHEN '15' THEN '가정 활동 및 참여용 보조기기'
        WHEN '18' THEN '실내외 인공 환경에서 활동 지원용 가구, 고정물 및 기타 보조기기'
        WHEN '21' THEN '청각 및 의사소통 보조기기'
        WHEN '22' THEN '의사소통 및 정보 관리용 보조기기'
        WHEN '24' THEN '물체 및 장치 제어, 운반, 이동, 취급용 보조기기'
        WHEN '27' THEN '물리적 환경 요소 제어, 적응, 측정용 보조기기'
        WHEN '28' THEN '직업 활동 및 고용 참여용 보조기기'
        WHEN '30' THEN '여가 및 레크리에이션용 보조기기'
        ELSE '기타 보조기기'
    END as name,
    'ISO 9999:2022 Class (대분류)' as description,
    1 as level,
    NULL as parent_code,
    TRUE as is_active
FROM (
    SELECT DISTINCT SUBSTRING(REPLACE(code, ' ', ''), 1, 2) as class_code
    FROM iso_codes
    WHERE level = 2 OR level = 3
) sub
WHERE NOT EXISTS (
    SELECT 1 FROM iso_codes WHERE code = sub.class_code AND level = 1
)
ON CONFLICT (code) DO NOTHING;

-- 6. Level 2 (중분류) 코드가 없으면 생성 (Subclass)
-- Subclass 코드는 Class 코드를 parent로 가짐
INSERT INTO iso_codes (code, name, description, level, parent_code, is_active)
SELECT DISTINCT
    CASE 
        -- 공백이 있으면 그대로 사용
        WHEN code LIKE '% %' THEN code
        -- 공백이 없으면 4자리로 만들기 (예: "1202" -> "12 02")
        WHEN LENGTH(REPLACE(code, ' ', '')) = 4 THEN 
            SUBSTRING(REPLACE(code, ' ', ''), 1, 2) || ' ' || SUBSTRING(REPLACE(code, ' ', ''), 3, 2)
        ELSE code
    END as code,
    COALESCE(name, 'ISO 9999:2022 Subclass (중분류)') as name,
    COALESCE(description, 'ISO 9999:2022 Subclass (중분류)') as description,
    2 as level,
    SUBSTRING(REPLACE(code, ' ', ''), 1, 2) as parent_code,
    TRUE as is_active
FROM (
    SELECT DISTINCT
        code,
        name,
        description
    FROM iso_codes
    WHERE level = 3
      AND LENGTH(REPLACE(code, ' ', '')) = 6
) sub
WHERE NOT EXISTS (
    SELECT 1 FROM iso_codes 
    WHERE REPLACE(code, ' ', '') = REPLACE(sub.code, ' ', '')
      AND level = 2
)
ON CONFLICT (code) DO UPDATE
SET level = 2,
    parent_code = SUBSTRING(REPLACE(EXCLUDED.code, ' ', ''), 1, 2);

-- 7. 통계 확인용 뷰 생성
CREATE OR REPLACE VIEW view_iso_code_structure AS
SELECT 
    level,
    CASE level
        WHEN 1 THEN '대분류 (Class)'
        WHEN 2 THEN '중분류 (Subclass)'
        WHEN 3 THEN '소분류 (Division)'
        ELSE '기타'
    END as level_name,
    COUNT(*) as code_count,
    COUNT(DISTINCT parent_code) as unique_parents,
    STRING_AGG(DISTINCT SUBSTRING(REPLACE(code, ' ', ''), 1, 2), ', ' ORDER BY SUBSTRING(REPLACE(code, ' ', ''), 1, 2)) as class_codes
FROM iso_codes
WHERE is_active = TRUE
GROUP BY level
ORDER BY level;

COMMENT ON VIEW view_iso_code_structure IS 'ISO 9999:2022 구조 통계 뷰 (대분류/중분류/소분류별 집계)';

-- 8. 검증 쿼리: Level과 코드 형식 일치 여부 확인
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatch_count
    FROM iso_codes
    WHERE 
        (level = 1 AND LENGTH(REPLACE(code, ' ', '')) != 2) OR
        (level = 2 AND LENGTH(REPLACE(code, ' ', '')) != 4) OR
        (level = 3 AND LENGTH(REPLACE(code, ' ', '')) != 6);
    
    IF mismatch_count > 0 THEN
        RAISE WARNING 'Level과 코드 형식이 일치하지 않는 레코드가 %개 있습니다.', mismatch_count;
    ELSE
        RAISE NOTICE '모든 ISO 코드의 Level이 올바르게 설정되었습니다.';
    END IF;
END $$;

-- 9. 로그 출력
DO $$
DECLARE
    level1_count INTEGER;
    level2_count INTEGER;
    level3_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO level1_count FROM iso_codes WHERE level = 1;
    SELECT COUNT(*) INTO level2_count FROM iso_codes WHERE level = 2;
    SELECT COUNT(*) INTO level3_count FROM iso_codes WHERE level = 3;
    
    RAISE NOTICE '=== ISO 9999:2022 구조 설정 완료 ===';
    RAISE NOTICE 'Level 1 (대분류/Class): %개', level1_count;
    RAISE NOTICE 'Level 2 (중분류/Subclass): %개', level2_count;
    RAISE NOTICE 'Level 3 (소분류/Division): %개', level3_count;
    RAISE NOTICE '총 ISO 코드: %개', level1_count + level2_count + level3_count;
END $$;
