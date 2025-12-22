-- =========================================================
-- [LinkAble] CTA 최적화 A/B 테스트 시스템
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-21
-- =========================================================
-- 
-- 목적: CTA 버튼의 위치, 텍스트, 색상, 크기를 A/B 테스트하여
--       클릭률을 30-50% 향상시킵니다.
-- 

-- =========================================================
-- [1] CTA A/B 테스트 설정 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS cta_ab_test_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    
    -- 테스트 활성화
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- 트래픽 분배
    traffic_percentage INTEGER DEFAULT 100 CHECK (traffic_percentage BETWEEN 0 AND 100),
    
    -- 테스트 기간
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- 메타데이터
    created_by TEXT, -- Clerk user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE cta_ab_test_configs IS 'CTA A/B 테스트 설정';
COMMENT ON COLUMN cta_ab_test_configs.traffic_percentage IS '테스트에 참여할 트래픽 비율 (0-100%)';

-- =========================================================
-- [2] CTA 변형 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS cta_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_config_id UUID NOT NULL REFERENCES cta_ab_test_configs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- 변형 이름 (예: "기본", "상단 위치", "긴급 텍스트")
    description TEXT,
    
    -- 버튼 위치 (recommendation_card 내)
    position VARCHAR(50) DEFAULT 'bottom' CHECK (position IN ('top', 'middle', 'bottom', 'sticky')),
    
    -- 버튼 텍스트
    primary_button_text VARCHAR(100) DEFAULT '더 알아보기',
    secondary_button_text VARCHAR(100) DEFAULT '구매하기',
    tertiary_button_text VARCHAR(100), -- 세 번째 버튼 (선택적)
    
    -- 버튼 스타일
    primary_button_variant VARCHAR(50) DEFAULT 'default' CHECK (primary_button_variant IN (
        'default', 'destructive', 'outline', 'secondary', 'ghost', 'link'
    )),
    secondary_button_variant VARCHAR(50) DEFAULT 'outline',
    primary_button_size VARCHAR(50) DEFAULT 'lg' CHECK (primary_button_size IN ('sm', 'md', 'lg', 'xl')),
    secondary_button_size VARCHAR(50) DEFAULT 'lg',
    
    -- 버튼 색상 (Tailwind CSS 클래스)
    primary_button_color VARCHAR(100), -- 예: "bg-blue-600", "bg-green-500"
    secondary_button_color VARCHAR(100),
    
    -- 버튼 아이콘
    primary_button_icon VARCHAR(50), -- 예: "ExternalLink", "ShoppingCart"
    secondary_button_icon VARCHAR(50),
    
    -- 추가 옵션
    show_price_highlight BOOLEAN DEFAULT TRUE, -- 가격 강조 표시
    show_urgency_text BOOLEAN DEFAULT FALSE, -- 긴급성 텍스트 표시
    urgency_text VARCHAR(100), -- 예: "지금 구매하면 10% 할인"
    
    -- 트래픽 분배
    traffic_percentage INTEGER DEFAULT 50 CHECK (traffic_percentage BETWEEN 0 AND 100),
    
    -- 메타데이터
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT unique_variant_name_per_test UNIQUE (test_config_id, name)
);

COMMENT ON TABLE cta_variants IS 'CTA 변형 (A/B 테스트용)';
COMMENT ON COLUMN cta_variants.position IS '버튼 위치: top(상단), middle(중간), bottom(하단), sticky(고정)';
COMMENT ON COLUMN cta_variants.traffic_percentage IS '이 변형에 할당될 트래픽 비율 (0-100%)';

-- =========================================================
-- [3] CTA A/B 테스트 할당 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS cta_ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_config_id UUID NOT NULL REFERENCES cta_ab_test_configs(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES cta_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    
    -- 할당 정보
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assignment_method VARCHAR(50) DEFAULT 'hash' CHECK (assignment_method IN ('hash', 'random', 'manual')),
    
    -- 제약조건
    CONSTRAINT unique_user_test_assignment UNIQUE (test_config_id, user_id, consultation_id)
);

COMMENT ON TABLE cta_ab_test_assignments IS '사용자별 CTA 변형 할당 (일관성 유지)';
COMMENT ON COLUMN cta_ab_test_assignments.assignment_method IS '할당 방법: hash(해시 기반), random(랜덤), manual(수동)';

-- =========================================================
-- [4] CTA 클릭 성능 로그 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS cta_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_config_id UUID REFERENCES cta_ab_test_configs(id) ON DELETE SET NULL,
    variant_id UUID NOT NULL REFERENCES cta_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
    
    -- 이벤트 정보
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'impression', -- 노출
        'primary_click', -- 주요 버튼 클릭
        'secondary_click', -- 보조 버튼 클릭
        'tertiary_click', -- 세 번째 버튼 클릭
        'purchase' -- 구매 완료
    )),
    
    -- 성능 지표
    time_to_click_ms INTEGER, -- 노출 후 클릭까지 시간 (밀리초)
    scroll_position DECIMAL(5, 2), -- 클릭 시 스크롤 위치 (0-100%)
    viewport_position VARCHAR(50), -- 뷰포트 내 위치 (top, middle, bottom)
    
    -- 메타데이터
    user_agent TEXT,
    screen_size VARCHAR(50), -- 예: "mobile", "tablet", "desktop"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE cta_performance_logs IS 'CTA 성능 로그 (노출, 클릭, 구매 추적)';

-- =========================================================
-- [5] CTA 변형 할당 함수
-- =========================================================

CREATE OR REPLACE FUNCTION assign_cta_variant(
    p_test_config_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_consultation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_assigned_variant_id UUID;
    v_test_config cta_ab_test_configs%ROWTYPE;
    v_variants cta_variants[];
    v_total_traffic INTEGER := 0;
    v_user_hash INTEGER;
    v_cumulative_percentage INTEGER := 0;
BEGIN
    -- 테스트 설정 조회
    SELECT * INTO v_test_config
    FROM cta_ab_test_configs
    WHERE id = p_test_config_id
    AND is_active = TRUE
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW());
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- 기존 할당 확인
    SELECT variant_id INTO v_assigned_variant_id
    FROM cta_ab_test_assignments
    WHERE test_config_id = p_test_config_id
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_consultation_id IS NULL OR consultation_id = p_consultation_id)
    LIMIT 1;
    
    IF v_assigned_variant_id IS NOT NULL THEN
        RETURN v_assigned_variant_id;
    END IF;
    
    -- 활성화된 변형 조회
    SELECT ARRAY_AGG(v.*) INTO v_variants
    FROM cta_variants v
    WHERE v.test_config_id = p_test_config_id
    AND v.is_active = TRUE
    ORDER BY v.display_order, v.created_at;
    
    IF v_variants IS NULL OR array_length(v_variants, 1) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- 총 트래픽 비율 계산
    SELECT SUM(traffic_percentage) INTO v_total_traffic
    FROM unnest(v_variants) AS v
    WHERE v.is_active = TRUE;
    
    IF v_total_traffic = 0 THEN
        RETURN NULL;
    END IF;
    
    -- 사용자 해시 생성 (일관된 할당)
    IF p_user_id IS NOT NULL THEN
        v_user_hash := abs(hashtext(p_user_id::TEXT)) % 100;
    ELSIF p_consultation_id IS NOT NULL THEN
        v_user_hash := abs(hashtext(p_consultation_id::TEXT)) % 100;
    ELSE
        v_user_hash := abs(hashtext(random()::TEXT)) % 100;
    END IF;
    
    -- 트래픽 비율에 따라 변형 할당
    FOR i IN 1..array_length(v_variants, 1) LOOP
        v_cumulative_percentage := v_cumulative_percentage + v_variants[i].traffic_percentage;
        
        IF v_user_hash < (v_cumulative_percentage * 100 / v_total_traffic) THEN
            v_assigned_variant_id := v_variants[i].id;
            EXIT;
        END IF;
    END LOOP;
    
    -- 기본값: 첫 번째 변형
    IF v_assigned_variant_id IS NULL THEN
        v_assigned_variant_id := v_variants[1].id;
    END IF;
    
    -- 할당 기록
    INSERT INTO cta_ab_test_assignments (
        test_config_id,
        variant_id,
        user_id,
        consultation_id,
        assignment_method
    ) VALUES (
        p_test_config_id,
        v_assigned_variant_id,
        p_user_id,
        p_consultation_id,
        CASE WHEN p_user_id IS NOT NULL OR p_consultation_id IS NOT NULL THEN 'hash' ELSE 'random' END
    )
    ON CONFLICT (test_config_id, user_id, consultation_id) DO UPDATE SET
        variant_id = EXCLUDED.variant_id,
        assigned_at = NOW();
    
    RETURN v_assigned_variant_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_cta_variant(UUID, UUID, UUID) IS 'CTA 변형 할당 (일관성 유지)';

-- =========================================================
-- [6] CTA 성능 집계 뷰
-- =========================================================

CREATE OR REPLACE VIEW view_cta_ab_test_performance AS
SELECT 
    t.id as test_config_id,
    t.name as test_name,
    v.id as variant_id,
    v.name as variant_name,
    COUNT(DISTINCT CASE WHEN pl.event_type = 'impression' THEN pl.user_id END) as unique_impressions,
    COUNT(CASE WHEN pl.event_type = 'impression' THEN 1 END) as total_impressions,
    COUNT(CASE WHEN pl.event_type = 'primary_click' THEN 1 END) as primary_clicks,
    COUNT(CASE WHEN pl.event_type = 'secondary_click' THEN 1 END) as secondary_clicks,
    COUNT(CASE WHEN pl.event_type = 'tertiary_click' THEN 1 END) as tertiary_clicks,
    COUNT(CASE WHEN pl.event_type = 'purchase' THEN 1 END) as purchases,
    -- 클릭률 계산
    CASE 
        WHEN COUNT(CASE WHEN pl.event_type = 'impression' THEN 1 END) > 0
        THEN (COUNT(CASE WHEN pl.event_type IN ('primary_click', 'secondary_click', 'tertiary_click') THEN 1 END)::DECIMAL / 
              COUNT(CASE WHEN pl.event_type = 'impression' THEN 1 END)::DECIMAL) * 100
        ELSE 0
    END as click_through_rate,
    -- 구매 전환율 계산
    CASE 
        WHEN COUNT(CASE WHEN pl.event_type IN ('primary_click', 'secondary_click', 'tertiary_click') THEN 1 END) > 0
        THEN (COUNT(CASE WHEN pl.event_type = 'purchase' THEN 1 END)::DECIMAL / 
              COUNT(CASE WHEN pl.event_type IN ('primary_click', 'secondary_click', 'tertiary_click') THEN 1 END)::DECIMAL) * 100
        ELSE 0
    END as purchase_conversion_rate,
    -- 평균 클릭 시간
    AVG(pl.time_to_click_ms) FILTER (WHERE pl.time_to_click_ms IS NOT NULL) as avg_time_to_click_ms,
    -- 평균 스크롤 위치
    AVG(pl.scroll_position) FILTER (WHERE pl.scroll_position IS NOT NULL) as avg_scroll_position
FROM cta_ab_test_configs t
JOIN cta_variants v ON v.test_config_id = t.id
LEFT JOIN cta_performance_logs pl ON pl.variant_id = v.id
WHERE t.is_active = TRUE
GROUP BY t.id, t.name, v.id, v.name;

COMMENT ON VIEW view_cta_ab_test_performance IS 'CTA A/B 테스트 성능 집계 (클릭률, 전환율 등)';

-- =========================================================
-- [7] 인덱스 생성
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_cta_variants_test_config ON cta_variants(test_config_id);
CREATE INDEX IF NOT EXISTS idx_cta_variants_active ON cta_variants(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cta_ab_test_assignments_test ON cta_ab_test_assignments(test_config_id);
CREATE INDEX IF NOT EXISTS idx_cta_ab_test_assignments_user ON cta_ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_cta_ab_test_assignments_consultation ON cta_ab_test_assignments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_cta_performance_logs_variant ON cta_performance_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_cta_performance_logs_event ON cta_performance_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_cta_performance_logs_created ON cta_performance_logs(created_at DESC);

-- =========================================================
-- [8] updated_at 자동 업데이트 함수 (없는 경우 생성)
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- [9] 트리거 생성
-- =========================================================

CREATE TRIGGER update_cta_ab_test_config_modtime 
  BEFORE UPDATE ON cta_ab_test_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cta_variants_modtime 
  BEFORE UPDATE ON cta_variants 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [10] 기본 테스트 설정 삽입
-- =========================================================

INSERT INTO cta_ab_test_configs (
    name,
    description,
    is_active,
    is_default,
    traffic_percentage
) VALUES (
    'default',
    '기본 CTA A/B 테스트 설정',
    FALSE, -- 기본적으로 비활성화
    TRUE,
    100
) ON CONFLICT (name) DO UPDATE SET
    updated_at = NOW();

-- =========================================================
-- [11] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'CTA 최적화 A/B 테스트 시스템 구축 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - cta_ab_test_configs: A/B 테스트 설정';
  RAISE NOTICE '  - cta_variants: CTA 변형';
  RAISE NOTICE '  - cta_ab_test_assignments: 사용자별 변형 할당';
  RAISE NOTICE '  - cta_performance_logs: 성능 로그';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - assign_cta_variant: 변형 할당';
  RAISE NOTICE '생성된 뷰:';
  RAISE NOTICE '  - view_cta_ab_test_performance: 성능 집계';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '테스트 가능한 변형:';
  RAISE NOTICE '  - 버튼 위치: top, middle, bottom, sticky';
  RAISE NOTICE '  - 버튼 텍스트: 커스터마이징 가능';
  RAISE NOTICE '  - 버튼 색상/크기: Tailwind CSS 클래스 사용';
  RAISE NOTICE '=========================================================';
END $$;

