-- =========================================================
-- [LinkAble] 실시간 학습 시스템 구축
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-21
-- =========================================================
-- 
-- 목적: 사용자 피드백을 실시간으로 매칭 점수에 반영하고,
--       클릭률이 높은 매칭 조합의 가중치를 자동으로 증가시킵니다.
-- 

-- =========================================================
-- [1] 실시간 학습 설정 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS realtime_learning_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- 설정 이름
    description TEXT, -- 설정 설명
    
    -- 학습 파라미터
    learning_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1 CHECK (learning_rate > 0 AND learning_rate <= 1), -- 학습률 (0-1)
    min_sample_count INTEGER NOT NULL DEFAULT 5, -- 최소 샘플 수 (신뢰도 기준)
    decay_factor DECIMAL(5, 4) DEFAULT 0.95, -- 시간 감쇠 계수 (오래된 데이터 영향 감소)
    max_weight_boost DECIMAL(3, 2) DEFAULT 1.5, -- 최대 가중치 증가율 (50%까지)
    min_weight_penalty DECIMAL(3, 2) DEFAULT 0.7, -- 최소 가중치 감소율 (30%까지)
    
    -- 클릭률 기반 가중치 조정
    click_rate_threshold DECIMAL(5, 4) DEFAULT 0.15, -- 클릭률 임계값 (15% 이상이면 보너스)
    click_rate_boost_factor DECIMAL(5, 4) DEFAULT 0.05, -- 클릭률당 가중치 증가율
    purchase_rate_boost_factor DECIMAL(5, 4) DEFAULT 0.10, -- 구매 전환율당 가중치 증가율
    
    -- 활성화 설정
    is_active BOOLEAN DEFAULT FALSE, -- 활성화 여부
    is_default BOOLEAN DEFAULT FALSE, -- 기본 설정 여부
    
    -- 메타데이터
    created_by TEXT, -- 생성자 (Clerk user ID)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE realtime_learning_configs IS '실시간 학습 시스템 설정';
COMMENT ON COLUMN realtime_learning_configs.learning_rate IS '학습률 (0-1, 높을수록 빠른 학습)';
COMMENT ON COLUMN realtime_learning_configs.min_sample_count IS '최소 샘플 수 (신뢰도 기준)';
COMMENT ON COLUMN realtime_learning_configs.decay_factor IS '시간 감쇠 계수 (오래된 데이터 영향 감소)';

-- =========================================================
-- [2] 실시간 학습 통계 캐시 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS realtime_learning_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ICF-ISO 조합 식별자
    icf_codes TEXT[] NOT NULL, -- ICF 코드 배열 (정렬된 상태)
    icf_codes_key TEXT NOT NULL, -- 정렬된 ICF 코드를 쉼표로 연결한 키
    iso_code VARCHAR(50) NOT NULL,
    
    -- 실시간 통계 (최근 데이터 우선)
    total_impressions INTEGER DEFAULT 0, -- 총 노출 수
    total_clicks INTEGER DEFAULT 0, -- 총 클릭 수
    total_purchases INTEGER DEFAULT 0, -- 총 구매 수
    total_feedback_ratings INTEGER DEFAULT 0, -- 총 피드백 수
    sum_feedback_ratings INTEGER DEFAULT 0, -- 피드백 점수 합계
    
    -- 계산된 지표
    click_rate DECIMAL(5, 4) DEFAULT 0.0, -- 클릭률
    purchase_rate DECIMAL(5, 4) DEFAULT 0.0, -- 구매 전환율
    avg_feedback_rating DECIMAL(3, 2) DEFAULT 0.0, -- 평균 피드백 점수
    
    -- 가중치 조정
    weight_adjustment DECIMAL(5, 4) DEFAULT 1.0, -- 현재 가중치 조정 계수
    last_adjustment_at TIMESTAMP WITH TIME ZONE, -- 마지막 가중치 조정 시각
    
    -- 메타데이터
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT realtime_learning_stats_unique UNIQUE (icf_codes_key, iso_code)
);

COMMENT ON TABLE realtime_learning_stats IS '실시간 학습 통계 캐시 (ICF-ISO 조합별)';
COMMENT ON COLUMN realtime_learning_stats.weight_adjustment IS '현재 가중치 조정 계수 (1.0 = 기본, >1.0 = 증가, <1.0 = 감소)';

-- =========================================================
-- [3] 실시간 학습 이벤트 로그 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS realtime_learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 이벤트 정보
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'impression', -- 노출
        'click', -- 클릭
        'purchase', -- 구매
        'feedback' -- 피드백
    )),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
    
    -- 조합 정보
    icf_codes TEXT[] NOT NULL,
    icf_codes_key TEXT NOT NULL,
    iso_code VARCHAR(50) NOT NULL,
    
    -- 이벤트 데이터
    feedback_rating INTEGER CHECK (feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5)),
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE realtime_learning_events IS '실시간 학습 이벤트 로그 (모든 사용자 행동 기록)';

-- =========================================================
-- [4] 실시간 통계 업데이트 함수
-- =========================================================

CREATE OR REPLACE FUNCTION update_realtime_learning_stats(
    p_icf_codes TEXT[],
    p_iso_code VARCHAR(50),
    p_event_type VARCHAR(50),
    p_feedback_rating INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_icf_key TEXT;
    v_config realtime_learning_configs%ROWTYPE;
    v_stats realtime_learning_stats%ROWTYPE;
    v_new_click_rate DECIMAL(5, 4);
    v_new_purchase_rate DECIMAL(5, 4);
    v_new_avg_feedback DECIMAL(3, 2);
    v_weight_adjustment DECIMAL(5, 4);
BEGIN
    -- ICF 코드 키 생성 (정렬)
    v_icf_key := array_to_string(ARRAY(SELECT unnest(p_icf_codes) ORDER BY 1), ',');
    
    -- 활성화된 학습 설정 조회
    SELECT * INTO v_config
    FROM realtime_learning_configs
    WHERE is_active = TRUE
    LIMIT 1;
    
    -- 설정이 없으면 기본값 사용
    IF v_config IS NULL THEN
        v_config.learning_rate := 0.1;
        v_config.min_sample_count := 5;
        v_config.click_rate_threshold := 0.15;
        v_config.click_rate_boost_factor := 0.05;
        v_config.purchase_rate_boost_factor := 0.10;
        v_config.max_weight_boost := 1.5;
        v_config.min_weight_penalty := 0.7;
    END IF;
    
    -- 기존 통계 조회 또는 생성
    SELECT * INTO v_stats
    FROM realtime_learning_stats
    WHERE icf_codes_key = v_icf_key AND iso_code = p_iso_code;
    
    IF v_stats IS NULL THEN
        -- 새 통계 생성
        INSERT INTO realtime_learning_stats (
            icf_codes,
            icf_codes_key,
            iso_code,
            weight_adjustment
        ) VALUES (
            p_icf_codes,
            v_icf_key,
            p_iso_code,
            1.0
        ) RETURNING * INTO v_stats;
    END IF;
    
    -- 이벤트 타입에 따라 통계 업데이트
    CASE p_event_type
        WHEN 'impression' THEN
            v_stats.total_impressions := v_stats.total_impressions + 1;
        WHEN 'click' THEN
            v_stats.total_clicks := v_stats.total_clicks + 1;
            v_stats.total_impressions := v_stats.total_impressions + 1; -- 클릭 시 노출도 카운트
        WHEN 'purchase' THEN
            v_stats.total_purchases := v_stats.total_purchases + 1;
        WHEN 'feedback' THEN
            IF p_feedback_rating IS NOT NULL THEN
                v_stats.total_feedback_ratings := v_stats.total_feedback_ratings + 1;
                v_stats.sum_feedback_ratings := v_stats.sum_feedback_ratings + p_feedback_rating;
            END IF;
    END CASE;
    
    -- 지표 재계산
    v_new_click_rate := CASE 
        WHEN v_stats.total_impressions > 0 
        THEN v_stats.total_clicks::DECIMAL / v_stats.total_impressions::DECIMAL 
        ELSE 0.0 
    END;
    
    v_new_purchase_rate := CASE 
        WHEN v_stats.total_clicks > 0 
        THEN v_stats.total_purchases::DECIMAL / v_stats.total_clicks::DECIMAL 
        ELSE 0.0 
    END;
    
    v_new_avg_feedback := CASE 
        WHEN v_stats.total_feedback_ratings > 0 
        THEN v_stats.sum_feedback_ratings::DECIMAL / v_stats.total_feedback_ratings::DECIMAL 
        ELSE 0.0 
    END;
    
    -- 가중치 조정 계산 (최소 샘플 수 이상일 때만)
    IF v_stats.total_impressions >= v_config.min_sample_count THEN
        v_weight_adjustment := 1.0;
        
        -- 클릭률 기반 보너스
        IF v_new_click_rate > v_config.click_rate_threshold THEN
            v_weight_adjustment := v_weight_adjustment + 
                (v_new_click_rate - v_config.click_rate_threshold) * v_config.click_rate_boost_factor * 10;
        END IF;
        
        -- 구매 전환율 기반 보너스
        IF v_new_purchase_rate > 0.05 THEN -- 5% 이상
            v_weight_adjustment := v_weight_adjustment + 
                v_new_purchase_rate * v_config.purchase_rate_boost_factor * 10;
        END IF;
        
        -- 피드백 점수 기반 보정
        IF v_new_avg_feedback > 0 THEN
            IF v_new_avg_feedback >= 4.0 THEN -- 4점 이상 (긍정적)
                v_weight_adjustment := v_weight_adjustment + 0.1;
            ELSIF v_new_avg_feedback <= 2.0 THEN -- 2점 이하 (부정적)
                v_weight_adjustment := v_weight_adjustment - 0.15;
            END IF;
        END IF;
        
        -- 범위 제한
        v_weight_adjustment := GREATEST(
            v_config.min_weight_penalty,
            LEAST(v_config.max_weight_boost, v_weight_adjustment)
        );
    ELSE
        -- 샘플 수 부족 시 기본값 유지
        v_weight_adjustment := 1.0;
    END IF;
    
    -- 통계 업데이트
    UPDATE realtime_learning_stats
    SET
        total_impressions = v_stats.total_impressions,
        total_clicks = v_stats.total_clicks,
        total_purchases = v_stats.total_purchases,
        total_feedback_ratings = v_stats.total_feedback_ratings,
        sum_feedback_ratings = v_stats.sum_feedback_ratings,
        click_rate = v_new_click_rate,
        purchase_rate = v_new_purchase_rate,
        avg_feedback_rating = v_new_avg_feedback,
        weight_adjustment = v_weight_adjustment,
        last_adjustment_at = CASE 
            WHEN v_weight_adjustment != v_stats.weight_adjustment THEN NOW() 
            ELSE v_stats.last_adjustment_at 
        END,
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE id = v_stats.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_realtime_learning_stats IS '실시간 학습 통계 업데이트 함수 (이벤트 발생 시 호출)';

-- =========================================================
-- [5] 실시간 가중치 조정 조회 함수
-- =========================================================

CREATE OR REPLACE FUNCTION get_realtime_weight_adjustment(
    p_icf_codes TEXT[],
    p_iso_code VARCHAR(50)
)
RETURNS DECIMAL(5, 4) AS $$
DECLARE
    v_icf_key TEXT;
    v_adjustment DECIMAL(5, 4);
BEGIN
    -- ICF 코드 키 생성 (정렬)
    v_icf_key := array_to_string(ARRAY(SELECT unnest(p_icf_codes) ORDER BY 1), ',');
    
    -- 가중치 조정 계수 조회
    SELECT weight_adjustment INTO v_adjustment
    FROM realtime_learning_stats
    WHERE icf_codes_key = v_icf_key AND iso_code = p_iso_code;
    
    -- 없으면 기본값 반환
    RETURN COALESCE(v_adjustment, 1.0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_realtime_weight_adjustment IS 'ICF-ISO 조합의 실시간 가중치 조정 계수 조회';

-- =========================================================
-- [6] 인덱스 생성
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_realtime_learning_stats_key ON realtime_learning_stats(icf_codes_key, iso_code);
CREATE INDEX IF NOT EXISTS idx_realtime_learning_stats_adjustment ON realtime_learning_stats(weight_adjustment DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_learning_stats_last_seen ON realtime_learning_stats(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_key ON realtime_learning_events(icf_codes_key, iso_code);
CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_created ON realtime_learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_type ON realtime_learning_events(event_type);

-- =========================================================
-- [7] 트리거 생성
-- =========================================================

CREATE TRIGGER update_realtime_learning_configs_modtime 
  BEFORE UPDATE ON realtime_learning_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_realtime_learning_stats_modtime 
  BEFORE UPDATE ON realtime_learning_stats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [8] 기본 설정 삽입
-- =========================================================

INSERT INTO realtime_learning_configs (
    name,
    description,
    learning_rate,
    min_sample_count,
    decay_factor,
    max_weight_boost,
    min_weight_penalty,
    click_rate_threshold,
    click_rate_boost_factor,
    purchase_rate_boost_factor,
    is_active,
    is_default
) VALUES (
    'default',
    '기본 실시간 학습 설정',
    0.1,
    5,
    0.95,
    1.5,
    0.7,
    0.15,
    0.05,
    0.10,
    TRUE,
    TRUE
) ON CONFLICT (name) DO UPDATE SET
    learning_rate = EXCLUDED.learning_rate,
    updated_at = NOW();

-- =========================================================
-- [9] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '실시간 학습 시스템 구축 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - realtime_learning_configs: 학습 설정 관리';
  RAISE NOTICE '  - realtime_learning_stats: 실시간 통계 캐시';
  RAISE NOTICE '  - realtime_learning_events: 학습 이벤트 로그';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - update_realtime_learning_stats: 통계 업데이트';
  RAISE NOTICE '  - get_realtime_weight_adjustment: 가중치 조정 조회';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '기본 설정이 생성되었습니다:';
  RAISE NOTICE '  - 학습률: 0.1';
  RAISE NOTICE '  - 최소 샘플 수: 5';
  RAISE NOTICE '  - 클릭률 임계값: 15%%';
  RAISE NOTICE '=========================================================';
END $$;

