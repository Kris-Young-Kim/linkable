-- =========================================================
-- [LinkAble] ICF 코드 정규화: JSONB 배열 → 별도 테이블 (1:N 관계)
-- Database: PostgreSQL (Supabase)
-- Version: 1.3
-- Generated: 2025-02-20
-- =========================================================
-- 
-- 목적: ICF 코드를 JSONB 배열에서 별도 테이블로 분리하여 정규화
-- 
-- 원칙: 배열 데이터는 사용하지 않고, 별도 테이블을 만들어 1:N 관계로 관리
-- 
-- 생성 테이블:
-- 1. icf_codes: ICF 코드 마스터
-- 2. consultation_icf_codes: 상담과 ICF 코드의 관계 (1:N)
-- 
-- 수정 테이블:
-- 1. analysis_results: icf_codes JSONB 컬럼 제거
-- =========================================================

-- =========================================================
-- [1] ICF 코드 마스터 테이블 생성
-- =========================================================

CREATE TABLE IF NOT EXISTS icf_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- ICF 코드 (예: "b210", "d550", "e115")
    category CHAR(1) NOT NULL CHECK (category IN ('b', 'd', 'e', 'p')), -- 카테고리: b(신체기능), d(활동), e(환경요소), p(참여)
    name VARCHAR(255), -- 코드명 (한글)
    name_en VARCHAR(255), -- 코드명 (영문)
    description TEXT, -- 상세 설명
    parent_code VARCHAR(50), -- 상위 코드 (계층 구조용)
    level INTEGER DEFAULT 1, -- 코드 레벨
    is_in_core_set BOOLEAN DEFAULT FALSE, -- Core Set 포함 여부
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_icf_codes_parent FOREIGN KEY (parent_code) REFERENCES icf_codes(code) ON DELETE SET NULL
);

COMMENT ON TABLE icf_codes IS 'ICF 코드 마스터 (정규화)';
COMMENT ON COLUMN icf_codes.code IS 'ICF 코드 (고유값, 소문자)';
COMMENT ON COLUMN icf_codes.category IS '카테고리: b(신체기능), d(활동), e(환경요소), p(참여)';
COMMENT ON COLUMN icf_codes.is_in_core_set IS 'ICF Core Set에 포함된 코드인지 여부';

-- =========================================================
-- [2] 상담-ICF 코드 관계 테이블 생성 (1:N)
-- =========================================================

CREATE TABLE IF NOT EXISTS consultation_icf_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    icf_code_id UUID NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'chat_analysis' CHECK (source IN (
        'chat_analysis',
        'keyword_inference',
        'semantic_match',
        'manual_input',
        'ippa_evaluation'
    )), -- ICF 코드 추출 소스
    confidence_score DECIMAL(3, 2) DEFAULT 1.0, -- 신뢰도 점수 (0.0 ~ 1.0)
    context JSONB, -- 추가 컨텍스트 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_consultation_icf_consultation FOREIGN KEY (consultation_id) 
        REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_consultation_icf_code FOREIGN KEY (icf_code_id) 
        REFERENCES icf_codes(id) ON DELETE CASCADE,
    -- 한 상담에 동일한 ICF 코드는 하나만 (소스가 다를 수 있으므로 UNIQUE 제약은 없음)
    CONSTRAINT unique_consultation_icf_code UNIQUE (consultation_id, icf_code_id, source)
);

COMMENT ON TABLE consultation_icf_codes IS '상담과 ICF 코드의 관계 (1:N)';
COMMENT ON COLUMN consultation_icf_codes.source IS 'ICF 코드 추출 소스';
COMMENT ON COLUMN consultation_icf_codes.confidence_score IS '신뢰도 점수 (0.0 ~ 1.0)';

-- =========================================================
-- [3] 기존 데이터 마이그레이션
-- =========================================================

-- Step 1: icf_code_statistics에서 ICF 코드 마스터 데이터 생성
INSERT INTO icf_codes (code, category, is_in_core_set, is_active)
SELECT DISTINCT
    icf_code as code,
    category::CHAR(1) as category,
    is_in_core_set,
    TRUE as is_active
FROM icf_code_statistics
WHERE icf_code IS NOT NULL
ON CONFLICT (code) DO UPDATE SET
    is_in_core_set = EXCLUDED.is_in_core_set,
    updated_at = NOW();

-- Step 2: icf_code_usage_logs에서 누락된 ICF 코드 추가
INSERT INTO icf_codes (code, category, is_in_core_set, is_active)
SELECT DISTINCT
    icf_code as code,
    category::CHAR(1) as category,
    is_in_core_set,
    TRUE as is_active
FROM icf_code_usage_logs
WHERE icf_code IS NOT NULL
  AND icf_code NOT IN (SELECT code FROM icf_codes)
ON CONFLICT (code) DO NOTHING;

-- Step 3: analysis_results의 JSONB 데이터를 consultation_icf_codes로 마이그레이션
-- 주의: analysis_results.icf_codes 컬럼이 존재하는 경우에만 실행
DO $$
DECLARE
    analysis_record RECORD;
    icf_code_record RECORD;
    code_value TEXT;
    category_value CHAR(1);
    icf_code_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- icf_codes 컬럼 존재 여부 확인
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analysis_results' 
        AND column_name = 'icf_codes'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'analysis_results.icf_codes 컬럼이 존재하지 않습니다. 마이그레이션을 건너뜁니다.';
        RETURN;
    END IF;
    
    FOR analysis_record IN 
        SELECT consultation_id, icf_codes 
        FROM analysis_results 
        WHERE icf_codes IS NOT NULL
    LOOP
        -- b 카테고리 코드 처리
        IF analysis_record.icf_codes->'b' IS NOT NULL THEN
            FOR code_value IN SELECT jsonb_array_elements_text(analysis_record.icf_codes->'b')
            LOOP
                -- ICF 코드 마스터에서 ID 조회 또는 생성
                SELECT id INTO icf_code_uuid
                FROM icf_codes
                WHERE code = LOWER(code_value);
                
                IF icf_code_uuid IS NULL THEN
                    INSERT INTO icf_codes (code, category, is_in_core_set, is_active)
                    VALUES (LOWER(code_value), 'b', FALSE, TRUE)
                    RETURNING id INTO icf_code_uuid;
                END IF;
                
                -- consultation_icf_codes에 관계 추가
                INSERT INTO consultation_icf_codes (consultation_id, icf_code_id, source)
                VALUES (analysis_record.consultation_id, icf_code_uuid, 'chat_analysis')
                ON CONFLICT (consultation_id, icf_code_id, source) DO NOTHING;
            END LOOP;
        END IF;
        
        -- d 카테고리 코드 처리
        IF analysis_record.icf_codes->'d' IS NOT NULL THEN
            FOR code_value IN SELECT jsonb_array_elements_text(analysis_record.icf_codes->'d')
            LOOP
                SELECT id INTO icf_code_uuid
                FROM icf_codes
                WHERE code = LOWER(code_value);
                
                IF icf_code_uuid IS NULL THEN
                    INSERT INTO icf_codes (code, category, is_in_core_set, is_active)
                    VALUES (LOWER(code_value), 'd', FALSE, TRUE)
                    RETURNING id INTO icf_code_uuid;
                END IF;
                
                INSERT INTO consultation_icf_codes (consultation_id, icf_code_id, source)
                VALUES (analysis_record.consultation_id, icf_code_uuid, 'chat_analysis')
                ON CONFLICT (consultation_id, icf_code_id, source) DO NOTHING;
            END LOOP;
        END IF;
        
        -- e 카테고리 코드 처리
        IF analysis_record.icf_codes->'e' IS NOT NULL THEN
            FOR code_value IN SELECT jsonb_array_elements_text(analysis_record.icf_codes->'e')
            LOOP
                SELECT id INTO icf_code_uuid
                FROM icf_codes
                WHERE code = LOWER(code_value);
                
                IF icf_code_uuid IS NULL THEN
                    INSERT INTO icf_codes (code, category, is_in_core_set, is_active)
                    VALUES (LOWER(code_value), 'e', FALSE, TRUE)
                    RETURNING id INTO icf_code_uuid;
                END IF;
                
                INSERT INTO consultation_icf_codes (consultation_id, icf_code_id, source)
                VALUES (analysis_record.consultation_id, icf_code_uuid, 'chat_analysis')
                ON CONFLICT (consultation_id, icf_code_id, source) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- =========================================================
-- [4] analysis_results 테이블 수정
-- =========================================================

-- icf_codes JSONB 컬럼 제거 (하위 호환성을 위해 주석 처리, 필요시 활성화)
-- ALTER TABLE analysis_results DROP COLUMN IF EXISTS icf_codes;

-- 대신 deprecated 플래그 추가 (점진적 마이그레이션)
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS icf_codes_deprecated JSONB;

COMMENT ON COLUMN analysis_results.icf_codes_deprecated IS 'DEPRECATED: icf_codes JSONB 필드. consultation_icf_codes 테이블 사용 권장';

-- =========================================================
-- [5] 인덱스 생성
-- =========================================================

-- ICF Codes
CREATE INDEX IF NOT EXISTS idx_icf_codes_code ON icf_codes(code);
CREATE INDEX IF NOT EXISTS idx_icf_codes_category ON icf_codes(category);
CREATE INDEX IF NOT EXISTS idx_icf_codes_core_set ON icf_codes(is_in_core_set) WHERE is_in_core_set = TRUE;
CREATE INDEX IF NOT EXISTS idx_icf_codes_parent ON icf_codes(parent_code);
CREATE INDEX IF NOT EXISTS idx_icf_codes_active ON icf_codes(is_active) WHERE is_active = TRUE;

-- Consultation ICF Codes
CREATE INDEX IF NOT EXISTS idx_consultation_icf_consultation ON consultation_icf_codes(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_icf_code ON consultation_icf_codes(icf_code_id);
CREATE INDEX IF NOT EXISTS idx_consultation_icf_source ON consultation_icf_codes(source);
CREATE INDEX IF NOT EXISTS idx_consultation_icf_created ON consultation_icf_codes(created_at);

-- =========================================================
-- [6] 트리거 생성
-- =========================================================

CREATE TRIGGER update_icf_codes_modtime 
  BEFORE UPDATE ON icf_codes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [7] 뷰 생성 (하위 호환성)
-- =========================================================

-- 상담별 ICF 코드를 JSONB 형태로 조회하는 뷰 (기존 코드 호환성)
CREATE OR REPLACE VIEW view_consultation_icf_codes_jsonb AS
SELECT 
    c.id as consultation_id,
    jsonb_build_object(
        'b', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'b'),
            '[]'::jsonb
        ),
        'd', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'd'),
            '[]'::jsonb
        ),
        'e', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'e'),
            '[]'::jsonb
        ),
        'p', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'p'),
            '[]'::jsonb
        )
    ) as icf_codes
FROM consultations c
LEFT JOIN consultation_icf_codes cic ON cic.consultation_id = c.id
LEFT JOIN icf_codes ic ON cic.icf_code_id = ic.id
GROUP BY c.id;

COMMENT ON VIEW view_consultation_icf_codes_jsonb IS '상담별 ICF 코드를 JSONB 형태로 조회 (하위 호환성)';

-- 상담별 ICF 코드 상세 조회 뷰
CREATE OR REPLACE VIEW view_consultation_icf_codes_detail AS
SELECT 
    c.id as consultation_id,
    cic.id as relation_id,
    ic.id as icf_code_id,
    ic.code as icf_code,
    ic.category,
    ic.name as icf_code_name,
    ic.name_en as icf_code_name_en,
    ic.description,
    ic.is_in_core_set,
    cic.source,
    cic.confidence_score,
    cic.context,
    cic.created_at
FROM consultations c
INNER JOIN consultation_icf_codes cic ON cic.consultation_id = c.id
INNER JOIN icf_codes ic ON cic.icf_code_id = ic.id
ORDER BY c.id, ic.category, ic.code;

COMMENT ON VIEW view_consultation_icf_codes_detail IS '상담별 ICF 코드 상세 조회 (정규화된 구조)';

-- =========================================================
-- [8] 함수 생성 (ICF 코드 조회 헬퍼)
-- =========================================================

-- 상담의 ICF 코드를 배열로 반환하는 함수
CREATE OR REPLACE FUNCTION get_consultation_icf_codes(p_consultation_id UUID)
RETURNS TABLE (
    code TEXT,
    category CHAR(1),
    name VARCHAR(255),
    source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.code::TEXT,
        ic.category,
        ic.name,
        cic.source
    FROM consultation_icf_codes cic
    INNER JOIN icf_codes ic ON cic.icf_code_id = ic.id
    WHERE cic.consultation_id = p_consultation_id
    ORDER BY ic.category, ic.code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_consultation_icf_codes(UUID) IS '상담의 ICF 코드를 배열로 반환 (카테고리별 정렬)';

-- =========================================================
-- [9] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'ICF 코드 정규화 마이그레이션 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - icf_codes: ICF 코드 마스터';
  RAISE NOTICE '  - consultation_icf_codes: 상담-ICF 코드 관계 (1:N)';
  RAISE NOTICE '수정된 테이블:';
  RAISE NOTICE '  - analysis_results: icf_codes_deprecated 컬럼 추가';
  RAISE NOTICE '생성된 뷰:';
  RAISE NOTICE '  - view_consultation_icf_codes_jsonb: 하위 호환성 뷰';
  RAISE NOTICE '  - view_consultation_icf_codes_detail: 상세 조회 뷰';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - get_consultation_icf_codes(): ICF 코드 조회 헬퍼';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '주의: analysis_results.icf_codes JSONB 컬럼은 유지됩니다.';
  RAISE NOTICE '      점진적 마이그레이션을 위해 icf_codes_deprecated로 이름 변경 권장.';
  RAISE NOTICE '=========================================================';
END $$;

