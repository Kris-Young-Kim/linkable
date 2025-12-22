-- =========================================================
-- [LinkAble] ICF 코드 확장 자동화 시스템
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-21
-- =========================================================
-- 
-- 목적: 자주 사용되는 ICF 코드를 자동으로 Core Set에 추가하고,
--       ISO 매핑 힌트를 자동 생성하여 새로운 케이스 대응 속도를 향상시킵니다.
-- 

-- =========================================================
-- [1] ICF 자동 확장 설정 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS icf_auto_expand_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    
    -- 자동 확장 기준
    min_usage_count INTEGER NOT NULL DEFAULT 10, -- 최소 사용 횟수
    min_unique_consultations INTEGER NOT NULL DEFAULT 5, -- 최소 고유 상담 수
    min_priority_score DECIMAL(10, 2) DEFAULT 50.0, -- 최소 우선순위 점수
    min_recent_usage_days INTEGER DEFAULT 30, -- 최근 사용 기간 (일)
    
    -- 자동 확장 동작
    auto_expand_enabled BOOLEAN DEFAULT FALSE, -- 자동 확장 활성화 여부
    require_admin_approval BOOLEAN DEFAULT TRUE, -- 관리자 승인 필요 여부
    batch_size INTEGER DEFAULT 10, -- 한 번에 확장할 최대 코드 수
    
    -- ISO 힌트 생성
    auto_generate_iso_hints BOOLEAN DEFAULT TRUE, -- ISO 힌트 자동 생성
    iso_hint_confidence_threshold DECIMAL(3, 2) DEFAULT 0.6, -- ISO 힌트 신뢰도 임계값
    
    -- 메타데이터
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_by TEXT, -- Clerk user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE icf_auto_expand_config IS 'ICF 코드 자동 확장 설정';
COMMENT ON COLUMN icf_auto_expand_config.min_usage_count IS '자동 확장을 위한 최소 사용 횟수';
COMMENT ON COLUMN icf_auto_expand_config.min_unique_consultations IS '자동 확장을 위한 최소 고유 상담 수';
COMMENT ON COLUMN icf_auto_expand_config.auto_expand_enabled IS '자동 확장 활성화 여부';

-- =========================================================
-- [2] ICF 자동 확장 후보 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS icf_auto_expand_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icf_code TEXT NOT NULL,
    category CHAR(1) NOT NULL CHECK (category IN ('b', 'd', 'e', 's', 'p')),
    
    -- 확장 기준 충족 여부
    usage_count INTEGER NOT NULL DEFAULT 0,
    unique_consultations INTEGER NOT NULL DEFAULT 0,
    priority_score DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    
    -- 자동 생성된 정보
    suggested_iso_hints TEXT[] DEFAULT '{}', -- 제안된 ISO 코드 힌트
    iso_hint_confidence DECIMAL(3, 2) DEFAULT 0.0, -- ISO 힌트 신뢰도
    
    -- 상태
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', -- 대기 중
        'approved', -- 승인됨
        'rejected', -- 거부됨
        'expanded' -- 확장 완료
    )),
    approved_by TEXT, -- Clerk user ID
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT unique_icf_candidate UNIQUE (icf_code, status) 
        DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE icf_auto_expand_candidates IS 'ICF 코드 자동 확장 후보 (통계 기반)';
COMMENT ON COLUMN icf_auto_expand_candidates.priority_score IS '확장 우선순위 점수 (높을수록 우선)';
COMMENT ON COLUMN icf_auto_expand_candidates.status IS '후보 상태 (pending, approved, rejected, expanded)';

-- =========================================================
-- [3] ICF 코드 확장 이벤트 테이블 (기존 테이블 확장)
-- =========================================================

-- 기존 icf_code_expansions 테이블이 있으면 컬럼 추가
DO $$
BEGIN
    -- 자동 확장 여부 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'icf_code_expansions' 
        AND column_name = 'is_auto_expanded'
    ) THEN
        ALTER TABLE icf_code_expansions 
        ADD COLUMN is_auto_expanded BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- 확장 전 통계 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'icf_code_expansions' 
        AND column_name = 'pre_expansion_stats'
    ) THEN
        ALTER TABLE icf_code_expansions 
        ADD COLUMN pre_expansion_stats JSONB;
    END IF;
END $$;

COMMENT ON COLUMN icf_code_expansions.is_auto_expanded IS '자동 확장 여부';
COMMENT ON COLUMN icf_code_expansions.pre_expansion_stats IS '확장 전 통계 정보 (JSON)';

-- =========================================================
-- [4] 자동 확장 후보 생성 함수
-- =========================================================

CREATE OR REPLACE FUNCTION generate_icf_expansion_candidates(
    p_config_id UUID DEFAULT NULL
)
RETURNS TABLE (
    icf_code TEXT,
    category CHAR(1),
    usage_count INTEGER,
    unique_consultations INTEGER,
    priority_score DECIMAL(10, 2),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    suggested_iso_hints TEXT[],
    iso_hint_confidence DECIMAL(3, 2)
) AS $$
DECLARE
    v_config icf_auto_expand_config%ROWTYPE;
    v_min_usage_count INTEGER;
    v_min_unique_consultations INTEGER;
    v_min_priority_score DECIMAL(10, 2);
    v_min_recent_days INTEGER;
    v_auto_generate_hints BOOLEAN;
BEGIN
    -- 설정 로드
    IF p_config_id IS NOT NULL THEN
        SELECT * INTO v_config
        FROM icf_auto_expand_config
        WHERE id = p_config_id AND is_active = TRUE;
    ELSE
        SELECT * INTO v_config
        FROM icf_auto_expand_config
        WHERE is_active = TRUE AND is_default = TRUE
        LIMIT 1;
    END IF;
    
    -- 설정이 없으면 기본값 사용
    IF v_config IS NULL THEN
        v_min_usage_count := 10;
        v_min_unique_consultations := 5;
        v_min_priority_score := 50.0;
        v_min_recent_days := 30;
        v_auto_generate_hints := TRUE;
    ELSE
        v_min_usage_count := v_config.min_usage_count;
        v_min_unique_consultations := v_config.min_unique_consultations;
        v_min_priority_score := v_config.min_priority_score;
        v_min_recent_days := v_config.min_recent_usage_days;
        v_auto_generate_hints := v_config.auto_generate_iso_hints;
    END IF;
    
    -- 확장 후보 생성
    RETURN QUERY
    SELECT 
        s.icf_code,
        s.category::CHAR(1),
        s.total_usage_count,
        s.unique_consultations,
        -- 우선순위 점수 계산
        (
            s.total_usage_count * 1.0 +
            s.unique_consultations * 2.0 +
            CASE 
                WHEN s.last_seen_at > NOW() - (v_min_recent_days || ' days')::INTERVAL THEN 10.0
                WHEN s.last_seen_at > NOW() - INTERVAL '90 days' THEN 5.0
                ELSE 0.0
            END +
            -- 다양한 소스에서 사용된 경우 보너스
            CASE 
                WHEN jsonb_object_keys(s.usage_by_source) IS NOT NULL 
                THEN (SELECT COUNT(*) FROM jsonb_object_keys(s.usage_by_source)) * 3.0
                ELSE 0.0
            END
        )::DECIMAL(10, 2) AS priority_score,
        s.last_seen_at,
        -- ISO 힌트 자동 생성 (연관된 ISO 코드 중 빈도가 높은 것)
        CASE 
            WHEN v_auto_generate_hints AND array_length(s.associated_iso_codes, 1) > 0
            THEN s.associated_iso_codes[1:5] -- 상위 5개
            ELSE ARRAY[]::TEXT[]
        END AS suggested_iso_hints,
        -- ISO 힌트 신뢰도 (연관된 ISO 코드가 많을수록 높음)
        CASE 
            WHEN array_length(s.associated_iso_codes, 1) >= 3 THEN 0.8
            WHEN array_length(s.associated_iso_codes, 1) >= 2 THEN 0.6
            WHEN array_length(s.associated_iso_codes, 1) >= 1 THEN 0.4
            ELSE 0.0
        END::DECIMAL(3, 2) AS iso_hint_confidence
    FROM icf_code_statistics s
    LEFT JOIN icf_codes ic ON s.icf_code = ic.code
    WHERE 
        -- Core Set에 없는 코드만
        (ic.is_in_core_set = FALSE OR ic.is_in_core_set IS NULL)
        -- 최소 기준 충족
        AND s.total_usage_count >= v_min_usage_count
        AND s.unique_consultations >= v_min_unique_consultations
        -- 최근 사용 이력
        AND s.last_seen_at > NOW() - (v_min_recent_days || ' days')::INTERVAL
        -- 이미 확장되지 않은 코드
        AND NOT EXISTS (
            SELECT 1 FROM icf_code_expansions e
            WHERE e.icf_code = s.icf_code
        )
        -- 이미 후보로 등록되지 않은 코드
        AND NOT EXISTS (
            SELECT 1 FROM icf_auto_expand_candidates c
            WHERE c.icf_code = s.icf_code
            AND c.status IN ('approved', 'expanded')
        )
    ORDER BY priority_score DESC
    LIMIT 100; -- 최대 100개 후보
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_icf_expansion_candidates(UUID) IS 'ICF 코드 확장 후보 자동 생성 (통계 기반)';

-- =========================================================
-- [5] 자동 확장 실행 함수
-- =========================================================

CREATE OR REPLACE FUNCTION execute_icf_auto_expansion(
    p_config_id UUID DEFAULT NULL,
    p_batch_size INTEGER DEFAULT 10,
    p_require_approval BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    icf_code TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_config icf_auto_expand_config%ROWTYPE;
    v_candidate RECORD;
    v_expanded_count INTEGER := 0;
BEGIN
    -- 설정 로드
    IF p_config_id IS NOT NULL THEN
        SELECT * INTO v_config
        FROM icf_auto_expand_config
        WHERE id = p_config_id AND is_active = TRUE;
    ELSE
        SELECT * INTO v_config
        FROM icf_auto_expand_config
        WHERE is_active = TRUE AND is_default = TRUE
        LIMIT 1;
    END IF;
    
    IF v_config IS NULL THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'NO_CONFIG'::TEXT, '활성화된 설정이 없습니다.'::TEXT;
        RETURN;
    END IF;
    
    IF NOT v_config.auto_expand_enabled THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, 'DISABLED'::TEXT, '자동 확장이 비활성화되어 있습니다.'::TEXT;
        RETURN;
    END IF;
    
    -- 승인이 필요한 경우, 승인된 후보만 확장
    IF p_require_approval OR v_config.require_admin_approval THEN
        FOR v_candidate IN
            SELECT * FROM icf_auto_expand_candidates
            WHERE status = 'approved'
            ORDER BY priority_score DESC
            LIMIT p_batch_size
        LOOP
            -- ICF 코드를 Core Set에 추가
            UPDATE icf_codes
            SET is_in_core_set = TRUE,
                updated_at = NOW()
            WHERE code = v_candidate.icf_code;
            
            -- 확장 이벤트 기록
            INSERT INTO icf_code_expansions (
                icf_code,
                expanded_at,
                expanded_by,
                iso_hints,
                notes,
                is_auto_expanded,
                pre_expansion_stats
            ) VALUES (
                v_candidate.icf_code,
                NOW(),
                'system',
                v_candidate.suggested_iso_hints,
                '자동 확장: 사용 횟수 ' || v_candidate.usage_count || ', 고유 상담 ' || v_candidate.unique_consultations,
                TRUE,
                jsonb_build_object(
                    'usage_count', v_candidate.usage_count,
                    'unique_consultations', v_candidate.unique_consultations,
                    'priority_score', v_candidate.priority_score
                )
            );
            
            -- 후보 상태 업데이트
            UPDATE icf_auto_expand_candidates
            SET status = 'expanded',
                updated_at = NOW()
            WHERE id = v_candidate.id;
            
            -- 통계 업데이트
            UPDATE icf_code_statistics
            SET is_in_core_set = TRUE,
                updated_at = NOW()
            WHERE icf_code = v_candidate.icf_code;
            
            v_expanded_count := v_expanded_count + 1;
            
            RETURN QUERY SELECT 
                v_candidate.icf_code,
                'SUCCESS'::TEXT,
                '자동 확장 완료'::TEXT;
        END LOOP;
    ELSE
        -- 승인 불필요 시, 후보 생성 후 즉시 확장
        FOR v_candidate IN
            SELECT * FROM generate_icf_expansion_candidates(p_config_id)
            LIMIT p_batch_size
        LOOP
            -- 후보 등록
            INSERT INTO icf_auto_expand_candidates (
                icf_code,
                category,
                usage_count,
                unique_consultations,
                priority_score,
                last_seen_at,
                suggested_iso_hints,
                iso_hint_confidence,
                status
            ) VALUES (
                v_candidate.icf_code,
                v_candidate.category,
                v_candidate.usage_count,
                v_candidate.unique_consultations,
                v_candidate.priority_score,
                v_candidate.last_seen_at,
                v_candidate.suggested_iso_hints,
                v_candidate.iso_hint_confidence,
                'approved'
            )
            ON CONFLICT (icf_code, status) DO NOTHING;
            
            -- 즉시 확장
            UPDATE icf_codes
            SET is_in_core_set = TRUE,
                updated_at = NOW()
            WHERE code = v_candidate.icf_code;
            
            INSERT INTO icf_code_expansions (
                icf_code,
                expanded_at,
                expanded_by,
                iso_hints,
                notes,
                is_auto_expanded,
                pre_expansion_stats
            ) VALUES (
                v_candidate.icf_code,
                NOW(),
                'system',
                v_candidate.suggested_iso_hints,
                '자동 확장 (승인 불필요): 사용 횟수 ' || v_candidate.usage_count,
                TRUE,
                jsonb_build_object(
                    'usage_count', v_candidate.usage_count,
                    'unique_consultations', v_candidate.unique_consultations,
                    'priority_score', v_candidate.priority_score
                )
            );
            
            UPDATE icf_auto_expand_candidates
            SET status = 'expanded',
                updated_at = NOW()
            WHERE icf_code = v_candidate.icf_code;
            
            UPDATE icf_code_statistics
            SET is_in_core_set = TRUE,
                updated_at = NOW()
            WHERE icf_code = v_candidate.icf_code;
            
            v_expanded_count := v_expanded_count + 1;
            
            RETURN QUERY SELECT 
                v_candidate.icf_code,
                'SUCCESS'::TEXT,
                '자동 확장 완료 (승인 불필요)'::TEXT;
        END LOOP;
    END IF;
    
    IF v_expanded_count = 0 THEN
        RETURN QUERY SELECT 'INFO'::TEXT, 'NO_CANDIDATES'::TEXT, '확장할 후보가 없습니다.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION execute_icf_auto_expansion(UUID, INTEGER, BOOLEAN) IS 'ICF 코드 자동 확장 실행';

-- =========================================================
-- [6] 인덱스 생성
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_icf_auto_expand_candidates_code ON icf_auto_expand_candidates(icf_code);
CREATE INDEX IF NOT EXISTS idx_icf_auto_expand_candidates_status ON icf_auto_expand_candidates(status);
CREATE INDEX IF NOT EXISTS idx_icf_auto_expand_candidates_priority ON icf_auto_expand_candidates(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_icf_auto_expand_candidates_category ON icf_auto_expand_candidates(category);

-- =========================================================
-- [7] 트리거 생성
-- =========================================================

CREATE TRIGGER update_icf_auto_expand_config_modtime 
  BEFORE UPDATE ON icf_auto_expand_config 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_icf_auto_expand_candidates_modtime 
  BEFORE UPDATE ON icf_auto_expand_candidates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [8] 기본 설정 삽입
-- =========================================================

INSERT INTO icf_auto_expand_config (
    name,
    description,
    min_usage_count,
    min_unique_consultations,
    min_priority_score,
    min_recent_usage_days,
    auto_expand_enabled,
    require_admin_approval,
    batch_size,
    auto_generate_iso_hints,
    iso_hint_confidence_threshold,
    is_active,
    is_default
) VALUES (
    'default',
    '기본 ICF 코드 자동 확장 설정',
    10,
    5,
    50.0,
    30,
    FALSE, -- 기본적으로 비활성화 (안전)
    TRUE, -- 관리자 승인 필요
    10,
    TRUE,
    0.6,
    TRUE,
    TRUE
) ON CONFLICT (name) DO UPDATE SET
    updated_at = NOW();

-- =========================================================
-- [9] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'ICF 코드 확장 자동화 시스템 구축 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - icf_auto_expand_config: 자동 확장 설정';
  RAISE NOTICE '  - icf_auto_expand_candidates: 확장 후보';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - generate_icf_expansion_candidates: 후보 생성';
  RAISE NOTICE '  - execute_icf_auto_expansion: 자동 확장 실행';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '기본 설정이 생성되었습니다:';
  RAISE NOTICE '  - 최소 사용 횟수: 10';
  RAISE NOTICE '  - 최소 고유 상담 수: 5';
  RAISE NOTICE '  - 자동 확장: 비활성화 (기본)';
  RAISE NOTICE '  - 관리자 승인: 필요';
  RAISE NOTICE '=========================================================';
END $$;

