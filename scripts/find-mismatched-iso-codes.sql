-- =========================================================
-- 불일치하는 ISO 코드 찾기
-- Level과 코드 형식이 일치하지 않는 레코드 확인
-- =========================================================

-- Level 1인데 Subclass 형식(4자리)인 코드 찾기
SELECT 
    '=== Level 1인데 Subclass 형식인 코드 (수정 필요) ===' as section,
    code,
    name,
    level,
    LENGTH(REPLACE(code, ' ', '')) as code_length,
    'Level 1이지만 4자리 코드 → Level 2로 수정 필요' as issue,
    parent_code
FROM iso_codes
WHERE level = 1 
  AND LENGTH(REPLACE(code, ' ', '')) = 4
ORDER BY code;

-- 모든 불일치 레코드 확인
SELECT 
    '=== 모든 불일치 레코드 ===' as section,
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
        WHEN level = 1 AND LENGTH(REPLACE(code, ' ', '')) = 4 THEN 'Level 1 → Level 2로 수정 필요'
        WHEN level = 1 AND LENGTH(REPLACE(code, ' ', '')) = 6 THEN 'Level 1 → Level 3로 수정 필요'
        WHEN level = 2 AND LENGTH(REPLACE(code, ' ', '')) = 2 THEN 'Level 2 → Level 1로 수정 필요'
        WHEN level = 2 AND LENGTH(REPLACE(code, ' ', '')) = 6 THEN 'Level 2 → Level 3로 수정 필요'
        WHEN level = 3 AND LENGTH(REPLACE(code, ' ', '')) = 2 THEN 'Level 3 → Level 1로 수정 필요'
        WHEN level = 3 AND LENGTH(REPLACE(code, ' ', '')) = 4 THEN 'Level 3 → Level 2로 수정 필요'
        ELSE '기타'
    END as fix_action,
    parent_code
FROM iso_codes
WHERE 
    (level = 1 AND LENGTH(REPLACE(code, ' ', '')) != 2) OR
    (level = 2 AND LENGTH(REPLACE(code, ' ', '')) != 4) OR
    (level = 3 AND LENGTH(REPLACE(code, ' ', '')) != 6)
ORDER BY level, code;
