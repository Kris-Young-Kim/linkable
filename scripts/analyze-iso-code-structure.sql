-- =========================================================
-- ISO 9999:2022 구조 분석 쿼리
-- 대분류(Class), 중분류(Subclass), 소분류(Division) 적용 여부 확인
-- =========================================================

-- 1. iso_codes 테이블 구조 확인
SELECT 
    '=== iso_codes 테이블 구조 ===' as section,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'iso_codes'
ORDER BY ordinal_position;

-- 2. iso_codes 테이블의 level 분포 확인
SELECT 
    '=== Level 분포 ===' as section,
    level,
    COUNT(*) as count,
    CASE level
        WHEN 1 THEN '대분류 (Class)'
        WHEN 2 THEN '중분류 (Subclass)'
        WHEN 3 THEN '소분류 (Division)'
        ELSE '기타'
    END as level_name
FROM iso_codes
GROUP BY level
ORDER BY level;

-- 3. ISO 코드 형식 분석 (Class, Subclass, Division)
-- Class: 2자리 (예: 12, 15, 18)
-- Subclass: 4자리 (예: 1202, 1509, 1830) 또는 공백 포함 "12 02", "15 09", "18 30"
-- Division: 6자리 (예: 120201, 150901) 또는 공백 포함 "12 02 01", "15 09 01"

SELECT 
    '=== ISO 코드 형식 분석 ===' as section,
    code,
    CASE 
        -- 공백 제거 후 길이로 판단
        WHEN LENGTH(REPLACE(code, ' ', '')) = 2 THEN 'Class (대분류)'
        WHEN LENGTH(REPLACE(code, ' ', '')) = 4 THEN 'Subclass (중분류)'
        WHEN LENGTH(REPLACE(code, ' ', '')) = 6 THEN 'Division (소분류)'
        ELSE '비표준 형식'
    END as code_type,
    LENGTH(REPLACE(code, ' ', '')) as code_length,
    level,
    name,
    parent_code
FROM iso_codes
ORDER BY code
LIMIT 50;

-- 4. Level과 실제 코드 형식 일치 여부 확인
SELECT 
    '=== Level과 코드 형식 일치 여부 ===' as section,
    level,
    actual_code_type,
    COUNT(*) as count,
    CASE 
        WHEN (level = 1 AND actual_code_type = 'Class') OR
             (level = 2 AND actual_code_type = 'Subclass') OR
             (level = 3 AND actual_code_type = 'Division') THEN '일치'
        ELSE '불일치'
    END as match_status
FROM (
    SELECT 
        level,
        CASE 
            WHEN LENGTH(REPLACE(code, ' ', '')) = 2 THEN 'Class'
            WHEN LENGTH(REPLACE(code, ' ', '')) = 4 THEN 'Subclass'
            WHEN LENGTH(REPLACE(code, ' ', '')) = 6 THEN 'Division'
            ELSE '비표준'
        END as actual_code_type
    FROM iso_codes
) sub
GROUP BY 
    level, 
    actual_code_type,
    CASE 
        WHEN (level = 1 AND actual_code_type = 'Class') OR
             (level = 2 AND actual_code_type = 'Subclass') OR
             (level = 3 AND actual_code_type = 'Division') THEN '일치'
        ELSE '불일치'
    END
ORDER BY level, actual_code_type;

-- 5. 계층 구조 확인 (parent_code 관계)
SELECT 
    '=== 계층 구조 확인 ===' as section,
    parent.code as parent_code,
    parent.level as parent_level,
    parent.name as parent_name,
    COUNT(child.code) as child_count
FROM iso_codes parent
LEFT JOIN iso_codes child ON child.parent_code = parent.code
GROUP BY parent.code, parent.level, parent.name
HAVING COUNT(child.code) > 0
ORDER BY parent.level, parent.code
LIMIT 30;

-- 6. Level 1 (대분류) 코드 목록
SELECT 
    '=== Level 1 (대분류) 코드 ===' as section,
    code,
    name,
    description,
    (SELECT COUNT(*) FROM iso_codes WHERE parent_code = ic.code) as child_count
FROM iso_codes ic
WHERE level = 1
ORDER BY code;

-- 7. Level 2 (중분류) 코드 샘플
SELECT 
    '=== Level 2 (중분류) 코드 샘플 ===' as section,
    code,
    name,
    parent_code,
    (SELECT name FROM iso_codes WHERE code = ic.parent_code) as parent_name,
    (SELECT COUNT(*) FROM iso_codes WHERE parent_code = ic.code) as child_count
FROM iso_codes ic
WHERE level = 2
ORDER BY parent_code, code
LIMIT 30;

-- 8. Level 3 (소분류) 코드 샘플
SELECT 
    '=== Level 3 (소분류) 코드 샘플 ===' as section,
    code,
    name,
    parent_code,
    (SELECT name FROM iso_codes WHERE code = ic.parent_code) as parent_name
FROM iso_codes ic
WHERE level = 3
ORDER BY parent_code, code
LIMIT 30;

-- 9. products 테이블의 iso_code 형식 분석
SELECT 
    '=== products.iso_code 형식 분석 ===' as section,
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류)'
        ELSE '비표준 형식'
    END as code_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage
FROM products
GROUP BY 
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류)'
        ELSE '비표준 형식'
    END
ORDER BY count DESC;

-- 10. products.iso_code와 iso_codes.code 매칭 여부
SELECT 
    '=== products.iso_code 매칭 상태 ===' as section,
    CASE 
        WHEN p.iso_code IS NULL THEN 'NULL'
        WHEN ic.code IS NOT NULL THEN 'iso_codes 테이블에 존재'
        ELSE 'iso_codes 테이블에 없음'
    END as match_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage
FROM products p
LEFT JOIN iso_codes ic ON p.iso_code = ic.code
GROUP BY 
    CASE 
        WHEN p.iso_code IS NULL THEN 'NULL'
        WHEN ic.code IS NOT NULL THEN 'iso_codes 테이블에 존재'
        ELSE 'iso_codes 테이블에 없음'
    END
ORDER BY count DESC;

-- 11. 비표준 형식 ISO 코드 샘플 (불일치하는 모든 레코드)
SELECT 
    '=== 비표준 형식 ISO 코드 (모든 불일치 레코드) ===' as section,
    code,
    name,
    level,
    LENGTH(REPLACE(code, ' ', '')) as code_length,
    CASE 
        WHEN LENGTH(REPLACE(code, ' ', '')) = 2 THEN 'Class'
        WHEN LENGTH(REPLACE(code, ' ', '')) = 4 THEN 'Subclass'
        WHEN LENGTH(REPLACE(code, ' ', '')) = 6 THEN 'Division'
        ELSE '비표준'
    END as actual_code_type,
    CASE 
        WHEN level = 1 AND LENGTH(REPLACE(code, ' ', '')) != 2 THEN 'Level 1이지만 Class 형식 아님 → Level 2로 수정 필요'
        WHEN level = 2 AND LENGTH(REPLACE(code, ' ', '')) != 4 THEN 'Level 2이지만 Subclass 형식 아님'
        WHEN level = 3 AND LENGTH(REPLACE(code, ' ', '')) != 6 THEN 'Level 3이지만 Division 형식 아님'
        ELSE '기타'
    END as issue,
    parent_code
FROM iso_codes
WHERE 
    (level = 1 AND LENGTH(REPLACE(code, ' ', '')) != 2) OR
    (level = 2 AND LENGTH(REPLACE(code, ' ', '')) != 4) OR
    (level = 3 AND LENGTH(REPLACE(code, ' ', '')) != 6)
ORDER BY level, code;

-- 12. ISO 9999:2022 주요 Class별 통계
SELECT 
    '=== 주요 Class별 통계 ===' as section,
    SUBSTRING(REPLACE(code, ' ', ''), 1, 2) as class_code,
    CASE SUBSTRING(REPLACE(code, ' ', ''), 1, 2)
        WHEN '04' THEN '생리적/심리적 기능 측정, 자극, 훈련용'
        WHEN '06' THEN '보조기 및 의지'
        WHEN '09' THEN '자가관리 활동 및 참여용'
        WHEN '12' THEN '개인 이동 및 교통 관련'
        WHEN '15' THEN '가정 활동 및 참여용'
        WHEN '18' THEN '실내외 인공 환경 지원용'
        WHEN '22' THEN '의사소통 및 정보 관리용'
        WHEN '24' THEN '물체 및 장치 제어, 운반, 이동, 취급용'
        WHEN '30' THEN '여가 및 레크리에이션용'
        ELSE '기타'
    END as class_name,
    COUNT(*) as code_count,
    COUNT(DISTINCT parent_code) as has_parent_count
FROM iso_codes
WHERE level IN (2, 3)  -- 중분류와 소분류만
GROUP BY SUBSTRING(REPLACE(code, ' ', ''), 1, 2)
ORDER BY class_code;
