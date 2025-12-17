-- =========================================================
-- [LinkAble] MVP Database DDL Script
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-11
-- =========================================================
-- 
-- 이 스크립트는 모든 마이그레이션을 통합한 완전한 DDL입니다.
-- 새로운 데이터베이스 인스턴스를 생성하거나 전체 스키마를 재구성할 때 사용합니다.
--
-- 주의: 이 스크립트는 기존 데이터를 삭제합니다.
-- 프로덕션 환경에서는 주의하여 사용하세요.
-- =========================================================

-- =========================================================
-- [1] 기존 객체 삭제 (CASCADE)
-- =========================================================

DROP VIEW IF EXISTS icf_code_expansion_priority CASCADE;
DROP VIEW IF EXISTS view_iso_code_stats CASCADE;
DROP VIEW IF EXISTS view_product_stats CASCADE;
DROP VIEW IF EXISTS view_user_analytics CASCADE;
DROP VIEW IF EXISTS view_daily_stats CASCADE;
DROP VIEW IF EXISTS view_platform_stats CASCADE;

DROP TABLE IF EXISTS icf_auto_expand_config CASCADE;
DROP TABLE IF EXISTS icf_code_expansions CASCADE;
DROP TABLE IF EXISTS icf_code_statistics CASCADE;
DROP TABLE IF EXISTS icf_code_usage_logs CASCADE;
DROP TABLE IF EXISTS conversion_events CASCADE;
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS user_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS consultation_feedback CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ippa_evaluations CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS calculate_period_stats CASCADE;
DROP FUNCTION IF EXISTS calculate_user_kpi CASCADE;
DROP FUNCTION IF EXISTS update_icf_code_statistics CASCADE;
DROP FUNCTION IF EXISTS update_user_points CASCADE;
DROP FUNCTION IF EXISTS update_coupons_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_consultation_feedback_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- =========================================================
-- [2] 유틸리티 함수 생성
-- =========================================================

-- updated_at 자동 업데이트 함수
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS '레코드 수정 시 updated_at 필드를 자동으로 갱신';

-- =========================================================
-- [3] 기본 테이블 생성
-- =========================================================

-- 1. Users (사용자)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'manager', 'admin'
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_role_check CHECK (role IN ('user', 'manager', 'admin'))
);

COMMENT ON TABLE users IS '사용자 정보 (Clerk Auth 연동)';
COMMENT ON COLUMN users.role IS '권한 구분: user(일반), manager(전문가), admin(관리자)';
COMMENT ON COLUMN users.points IS '사용자 포인트 (K-IPPA 평가, 추천 클릭 등으로 획득)';

-- 2. Products (보조기기 상품)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    iso_code VARCHAR(50) NOT NULL, -- ISO 9999 분류 코드
    manufacturer VARCHAR(100),
    description TEXT,
    image_url TEXT,
    purchase_link TEXT, -- 제휴 수익 링크
    price DECIMAL(10, 2),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE products IS '보조기기 마스터 데이터 (ISO 9999 기준)';

-- 3. Consultations (상담 세션)
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(200),
    status VARCHAR(50) DEFAULT 'in_progress',
    is_favorite BOOLEAN DEFAULT FALSE,
    disability_type TEXT,
    disability_severity TEXT,
    ippa_activities JSONB DEFAULT NULL, -- K-IPPA 상담 단계에서 선택한 ICF 활동 및 점수 (기초선)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_consultations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT consultations_status_check CHECK (status IN ('in_progress', 'completed', 'archived'))
);

COMMENT ON TABLE consultations IS '사용자 상담 세션 헤더';
COMMENT ON COLUMN consultations.is_favorite IS '사용자가 즐겨찾기로 표시한 상담인지 여부';
COMMENT ON COLUMN consultations.ippa_activities IS 'K-IPPA 상담 단계에서 선택한 ICF 활동 및 점수 (기초선)';

-- 4. Chat Messages (상담 로그)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    sender VARCHAR(20) NOT NULL, -- 'user', 'ai', 'system'
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_chat_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT chat_sender_check CHECK (sender IN ('user', 'ai', 'system'))
);

COMMENT ON TABLE chat_messages IS '상담 상세 대화 로그';

-- 5. Analysis Results (AI 분석 결과)
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    summary TEXT,
    icf_codes JSONB, -- {"b": [...], "d": [...], "e": [...]}
    identified_problems TEXT,
    env_factors TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_analysis_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    -- 상담 하나당 분석 결과는 하나만 존재 (1:1)
    CONSTRAINT analysis_consultation_unique UNIQUE (consultation_id)
);

COMMENT ON TABLE analysis_results IS 'AI가 분석한 ICF 코드 및 문제 정의 (JSONB 활용)';

-- 6. Recommendations (추천 매칭)
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    product_id UUID NOT NULL,
    match_reason TEXT, -- AI가 생성한 추천 사유
    rank INTEGER,
    is_clicked BOOLEAN DEFAULT FALSE,
    purchase_completed BOOLEAN DEFAULT FALSE,
    purchase_completed_at TIMESTAMP WITH TIME ZONE,
    purchase_amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_recommendation_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

COMMENT ON TABLE recommendations IS '상담 결과에 따른 상품 추천 목록 (다대다 연결)';
COMMENT ON COLUMN recommendations.purchase_completed IS '구매 완료 여부';
COMMENT ON COLUMN recommendations.purchase_completed_at IS '구매 완료 일시';
COMMENT ON COLUMN recommendations.purchase_amount IS '구매 금액';

-- 7. IPPA Evaluations (K-IPPA 효과성 평가)
CREATE TABLE ippa_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    recommendation_id UUID, -- 직접 구매 시 NULL 가능
    
    problem_description TEXT, -- 사용자가 정의한 문제
    score_importance INTEGER NOT NULL DEFAULT 3,
    score_difficulty_pre INTEGER NOT NULL,
    score_difficulty_post INTEGER NOT NULL,
    activity_scores JSONB DEFAULT NULL, -- K-IPPA 평가에서 각 ICF 활동별 사전/사후 점수 및 개선도
    
    -- [자동 계산] 효과성 점수 = (전 - 후) * 중요도
    effectiveness_score DECIMAL(5, 2) GENERATED ALWAYS AS 
        ((score_difficulty_pre - score_difficulty_post) * score_importance) STORED,
        
    feedback_comment TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_ippa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ippa_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ippa_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
    
    -- Score Range Checks (1~5)
    CONSTRAINT check_importance_range CHECK (score_importance BETWEEN 1 AND 5),
    CONSTRAINT check_pre_range CHECK (score_difficulty_pre BETWEEN 1 AND 5),
    CONSTRAINT check_post_range CHECK (score_difficulty_post BETWEEN 1 AND 5)
);

COMMENT ON TABLE ippa_evaluations IS 'K-IPPA 기반 사용성 및 효과성 검증 데이터';
COMMENT ON COLUMN ippa_evaluations.activity_scores IS 'K-IPPA 평가에서 각 ICF 활동별 사전/사후 점수 및 개선도';

-- =========================================================
-- [4] 추가 테이블 생성
-- =========================================================

-- 8. Notifications (알림)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    metadata JSONB
);

COMMENT ON TABLE notifications IS '앱 내 알림 및 리마인더';

-- 9. Consultation Feedback (상담 피드백)
CREATE TABLE consultation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    accuracy_rating INTEGER NOT NULL CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    feedback_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_feedback_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- 한 상담당 하나의 피드백만 허용
    CONSTRAINT unique_feedback_per_consultation UNIQUE (consultation_id)
);

COMMENT ON TABLE consultation_feedback IS '상담 종료 후 ICF 분석 정확도 피드백';
COMMENT ON COLUMN consultation_feedback.accuracy_rating IS 'ICF 분석 정확도 평가 (1-5점)';
COMMENT ON COLUMN consultation_feedback.feedback_comment IS '추가 의견 (선택사항)';

-- 10. Coupons (쿠폰 마스터)
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE coupons IS '쿠폰 마스터 데이터';
COMMENT ON COLUMN coupons.discount_type IS '할인 유형: percentage(%), fixed(고정금액), free_shipping(무료배송)';
COMMENT ON COLUMN coupons.discount_value IS '할인 값 (percentage면 %, fixed면 원)';

-- 11. User Coupons (사용자 쿠폰 보유)
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    coupon_id UUID NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user_coupon_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_coupon_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_coupon UNIQUE (user_id, coupon_id)
);

COMMENT ON TABLE user_coupons IS '사용자가 보유한 쿠폰';
COMMENT ON COLUMN user_coupons.used_at IS '쿠폰 사용 시각 (NULL이면 미사용)';

-- 12. Point Transactions (포인트 거래 이력)
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'earned_ippa_evaluation',
        'earned_recommendation_click',
        'earned_consultation_complete',
        'earned_feedback_submit',
        'redeemed_coupon',
        'admin_adjustment'
    )),
    description TEXT,
    reference_id UUID, -- 관련 ID (recommendation_id, ippa_evaluation_id 등)
    reference_type VARCHAR(50), -- 'recommendation', 'ippa_evaluation', 'consultation' 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_point_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE point_transactions IS '포인트 거래 이력';
COMMENT ON COLUMN point_transactions.transaction_type IS '거래 유형: earned(획득), redeemed(사용)';
COMMENT ON COLUMN point_transactions.reference_id IS '관련 엔티티 ID (선택적)';

-- 13. Conversion Events (전환 이벤트 로깅)
CREATE TABLE conversion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'recommendation_click',
        'purchase_link_click',
        'support_program_click',
        'expert_inquiry_click',
        'ippa_evaluation_submit',
        'consultation_feedback_submit',
        'coupon_redeemed',
        'purchase_completed'
    )),
    source VARCHAR(50), -- 'primary', 'secondary', 'support', 'expert' 등
    recommendation_id UUID,
    product_id UUID,
    consultation_id UUID,
    purchase_amount DECIMAL(10, 2),
    commission_amount DECIMAL(10, 2),
    purchase_date TIMESTAMP WITH TIME ZONE,
    tracking_source VARCHAR(50), -- 'coupang_api', 'postback', 'meta_pixel'
    metadata JSONB, -- 추가 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_conversion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversion_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversion_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversion_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL
);

COMMENT ON TABLE conversion_events IS '전환 이벤트 로깅 (Analytics 대시보드 연동용)';
COMMENT ON COLUMN conversion_events.metadata IS '추가 메타데이터 (JSON 형식)';
COMMENT ON COLUMN conversion_events.purchase_amount IS '구매 금액';
COMMENT ON COLUMN conversion_events.commission_amount IS '수수료 금액';
COMMENT ON COLUMN conversion_events.purchase_date IS '구매 완료 일시';
COMMENT ON COLUMN conversion_events.tracking_source IS '추적 소스 (coupang_api, postback, meta_pixel)';

-- 14. ICF Code Usage Logs (ICF 코드 사용 로그)
CREATE TABLE icf_code_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icf_code TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
    is_in_core_set BOOLEAN NOT NULL DEFAULT false,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('chat_analysis', 'keyword_inference', 'semantic_match', 'manual_input')),
    context JSONB, -- 추가 컨텍스트 정보 (예: 사용된 키워드, 매칭된 ISO 코드 등)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE icf_code_usage_logs IS 'ICF 코드 사용 로그 - 모든 ICF 코드 사용 이벤트를 기록';

-- 15. ICF Code Statistics (ICF 코드 통계)
CREATE TABLE icf_code_statistics (
    icf_code TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
    is_in_core_set BOOLEAN NOT NULL DEFAULT false,
    total_usage_count INTEGER NOT NULL DEFAULT 0,
    unique_consultations INTEGER NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    usage_by_source JSONB DEFAULT '{}'::jsonb, -- source별 사용 횟수
    associated_iso_codes TEXT[] DEFAULT '{}', -- 함께 사용된 ISO 코드 목록
    associated_keywords TEXT[] DEFAULT '{}', -- 함께 사용된 키워드 목록
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE icf_code_statistics IS 'ICF 코드 통계 - 코드별 집계된 사용 통계';

-- 16. ICF Code Expansions (ICF 코드 확장 이벤트 기록)
CREATE TABLE icf_code_expansions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icf_code TEXT NOT NULL,
    expanded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expanded_by TEXT, -- Clerk user ID
    iso_hints TEXT[] DEFAULT '{}',
    notes TEXT
);

COMMENT ON TABLE icf_code_expansions IS 'ICF 코드 확장 이벤트 기록';

-- 17. ICF Auto Expand Config (자동 확장 설정)
CREATE TABLE icf_auto_expand_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN NOT NULL DEFAULT false,
    threshold NUMERIC(5, 2) NOT NULL DEFAULT 20.0,
    last_run_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT -- Clerk user ID
);

COMMENT ON TABLE icf_auto_expand_config IS '자동 확장 설정';

-- 초기 설정 삽입
INSERT INTO icf_auto_expand_config (enabled, threshold)
VALUES (false, 20.0)
ON CONFLICT DO NOTHING;

-- =========================================================
-- [5] 인덱스 생성
-- =========================================================

-- Users
CREATE INDEX idx_users_email ON users(email);

-- Products
CREATE INDEX idx_products_iso_code ON products(iso_code);
CREATE INDEX idx_products_category ON products(category);

-- Consultations
CREATE INDEX idx_consultations_user_id ON consultations(user_id);
CREATE INDEX idx_consultations_created_at ON consultations(created_at);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_is_favorite ON consultations(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_consultations_ippa_activities ON consultations USING GIN (ippa_activities);

-- Chat Messages
CREATE INDEX idx_chat_messages_consultation_id ON chat_messages(consultation_id);

-- Recommendations
CREATE INDEX idx_recommendations_consultation_id ON recommendations(consultation_id);
CREATE INDEX idx_recommendations_product_id ON recommendations(product_id);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at);
CREATE INDEX idx_recommendations_is_clicked ON recommendations(is_clicked);
CREATE INDEX idx_recommendations_purchase_completed ON recommendations(purchase_completed, purchase_completed_at);

-- IPPA Evaluations
CREATE INDEX idx_ippa_user_id ON ippa_evaluations(user_id);
CREATE INDEX idx_ippa_product_id ON ippa_evaluations(product_id);
CREATE INDEX idx_ippa_evaluations_evaluated_at ON ippa_evaluations(evaluated_at);
CREATE INDEX idx_ippa_evaluations_recommendation_id ON ippa_evaluations(recommendation_id);
CREATE INDEX idx_ippa_evaluations_activity_scores ON ippa_evaluations USING GIN (activity_scores);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Consultation Feedback
CREATE INDEX idx_feedback_consultation_id ON consultation_feedback(consultation_id);
CREATE INDEX idx_feedback_user_id ON consultation_feedback(user_id);
CREATE INDEX idx_feedback_created_at ON consultation_feedback(created_at);

-- User Coupons
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_expires_at ON user_coupons(expires_at);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at);

-- Point Transactions
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX idx_point_transactions_reference ON point_transactions(reference_type, reference_id);

-- Conversion Events
CREATE INDEX idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX idx_conversion_events_recommendation_id ON conversion_events(recommendation_id);
CREATE INDEX idx_conversion_events_purchase_completed ON conversion_events(event_type, purchase_date) WHERE event_type = 'purchase_completed';
CREATE INDEX idx_conversion_events_tracking_source ON conversion_events(tracking_source, purchase_date);

-- ICF Code Usage Logs
CREATE INDEX idx_icf_code_usage_logs_code ON icf_code_usage_logs(icf_code);
CREATE INDEX idx_icf_code_usage_logs_category ON icf_code_usage_logs(category);
CREATE INDEX idx_icf_code_usage_logs_core_set ON icf_code_usage_logs(is_in_core_set);
CREATE INDEX idx_icf_code_usage_logs_created_at ON icf_code_usage_logs(created_at);
CREATE INDEX idx_icf_code_usage_logs_consultation ON icf_code_usage_logs(consultation_id);

-- ICF Code Statistics
CREATE INDEX idx_icf_code_statistics_category ON icf_code_statistics(category);
CREATE INDEX idx_icf_code_statistics_core_set ON icf_code_statistics(is_in_core_set);
CREATE INDEX idx_icf_code_statistics_usage_count ON icf_code_statistics(total_usage_count DESC);
CREATE INDEX idx_icf_code_statistics_last_seen ON icf_code_statistics(last_seen_at DESC);

-- ICF Code Expansions
CREATE INDEX idx_icf_code_expansions_code ON icf_code_expansions(icf_code);
CREATE INDEX idx_icf_code_expansions_expanded_at ON icf_code_expansions(expanded_at DESC);

-- =========================================================
-- [6] 함수 생성
-- =========================================================

-- Consultation Feedback updated_at 업데이트 함수
CREATE OR REPLACE FUNCTION update_consultation_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_consultation_feedback_updated_at() IS 'consultation_feedback 테이블의 updated_at 자동 업데이트';

-- Coupons updated_at 업데이트 함수
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_coupons_updated_at() IS 'coupons 테이블의 updated_at 자동 업데이트';

-- 포인트 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET points = points + NEW.points
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_points() IS '포인트 거래 발생 시 users.points 자동 업데이트';

-- ICF 코드 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_icf_code_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO icf_code_statistics (
    icf_code,
    category,
    is_in_core_set,
    total_usage_count,
    unique_consultations,
    first_seen_at,
    last_seen_at,
    usage_by_source,
    updated_at
  )
  VALUES (
    NEW.icf_code,
    NEW.category,
    NEW.is_in_core_set,
    1,
    1,
    NEW.created_at,
    NEW.created_at,
    jsonb_build_object(NEW.source, 1),
    NOW()
  )
  ON CONFLICT (icf_code) DO UPDATE SET
    total_usage_count = icf_code_statistics.total_usage_count + 1,
    unique_consultations = CASE 
      WHEN NEW.consultation_id IS NOT NULL AND 
           NOT EXISTS (
             SELECT 1 FROM icf_code_usage_logs 
             WHERE icf_code = NEW.icf_code 
             AND consultation_id = NEW.consultation_id
             AND id != NEW.id
           )
      THEN icf_code_statistics.unique_consultations + 1
      ELSE icf_code_statistics.unique_consultations
    END,
    last_seen_at = GREATEST(icf_code_statistics.last_seen_at, NEW.created_at),
    first_seen_at = LEAST(icf_code_statistics.first_seen_at, NEW.created_at),
    usage_by_source = jsonb_set(
      COALESCE(icf_code_statistics.usage_by_source, '{}'::jsonb),
      ARRAY[NEW.source],
      to_jsonb(COALESCE((icf_code_statistics.usage_by_source->>NEW.source)::integer, 0) + 1)
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_icf_code_statistics() IS 'ICF 코드 사용 로그 삽입 시 통계 자동 업데이트';

-- 사용자별 KPI 계산 함수
CREATE OR REPLACE FUNCTION calculate_user_kpi(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  total_consultations BIGINT,
  completed_consultations BIGINT,
  total_recommendations BIGINT,
  clicked_recommendations BIGINT,
  click_through_rate NUMERIC,
  total_ippa_evaluations BIGINT,
  ippa_participation_rate NUMERIC,
  average_effectiveness_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    ua.total_consultations,
    ua.completed_consultations,
    ua.total_recommendations,
    ua.clicked_recommendations,
    CASE 
      WHEN ua.total_recommendations > 0
      THEN ROUND(
        ua.clicked_recommendations::numeric / ua.total_recommendations::numeric * 100,
        2
      )
      ELSE 0
    END as click_through_rate,
    ua.total_ippa_evaluations,
    ua.ippa_participation_rate,
    ua.average_effectiveness_score
  FROM view_user_analytics ua
  WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_kpi(UUID) IS '특정 사용자의 KPI를 계산하는 프로시저';

-- 기간별 통계 계산 함수
CREATE OR REPLACE FUNCTION calculate_period_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_recommendations BIGINT,
  clicked_recommendations BIGINT,
  click_through_rate NUMERIC,
  total_ippa_evaluations BIGINT,
  average_effectiveness_score NUMERIC,
  total_consultations BIGINT,
  completed_consultations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_start_date as period_start,
    p_end_date as period_end,
    COUNT(DISTINCT r.id) as total_recommendations,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
    CASE 
      WHEN COUNT(DISTINCT r.id) > 0
      THEN ROUND(
        COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
        COUNT(DISTINCT r.id)::numeric * 100,
        2
      )
      ELSE 0
    END as click_through_rate,
    COUNT(DISTINCT i.id) as total_ippa_evaluations,
    CASE 
      WHEN COUNT(DISTINCT i.id) > 0
      THEN ROUND(
        AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
        2
      )
      ELSE NULL
    END as average_effectiveness_score,
    COUNT(DISTINCT c.id) as total_consultations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_consultations
  FROM recommendations r
  LEFT JOIN consultations c ON c.id = r.consultation_id
  LEFT JOIN ippa_evaluations i ON i.recommendation_id = r.id
  WHERE r.created_at >= p_start_date AND r.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_period_stats(TIMESTAMPTZ, TIMESTAMPTZ) IS '특정 기간의 통계를 계산하는 프로시저';

-- =========================================================
-- [7] 트리거 생성
-- =========================================================

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_users_modtime 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_modtime 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_modtime 
  BEFORE UPDATE ON consultations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ippa_modtime 
  BEFORE UPDATE ON ippa_evaluations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_consultation_feedback_updated_at
  BEFORE UPDATE ON consultation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_consultation_feedback_updated_at();

CREATE TRIGGER trigger_update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_coupons_updated_at();

-- 포인트 자동 업데이트 트리거
CREATE TRIGGER trigger_update_user_points
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points();

-- ICF 코드 통계 자동 업데이트 트리거
CREATE TRIGGER trigger_update_icf_code_statistics
  AFTER INSERT ON icf_code_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_icf_code_statistics();

-- =========================================================
-- [8] 뷰 생성
-- =========================================================

-- 전체 플랫폼 통계 뷰
CREATE OR REPLACE VIEW view_platform_stats AS
SELECT 
  -- 추천 통계
  (SELECT COUNT(*) FROM recommendations) as total_recommendations,
  (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations) > 0 
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) / 
      (SELECT COUNT(*)::numeric FROM recommendations) * 100, 
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  (SELECT COUNT(*) FROM ippa_evaluations) as total_ippa_evaluations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) > 0
    THEN ROUND(
      -- recommendation_id가 있고 해당 추천이 클릭된 평가만 카운트
      (SELECT COUNT(*)::numeric 
       FROM ippa_evaluations i
       INNER JOIN recommendations r ON i.recommendation_id = r.id
       WHERE r.is_clicked = true 
         AND i.recommendation_id IS NOT NULL) / 
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- 상담 통계
  (SELECT COUNT(*) FROM consultations) as total_consultations,
  (SELECT COUNT(*) FROM consultations WHERE status = 'completed') as completed_consultations,
  CASE 
    WHEN (SELECT COUNT(*) FROM consultations) > 0
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM consultations WHERE status = 'completed') / 
      (SELECT COUNT(*)::numeric FROM consultations) * 100,
      2
    )
    ELSE 0
  END as consultation_completion_rate,
  
  -- 평균 효과성 점수
  CASE 
    WHEN (SELECT COUNT(*) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL) > 0
    THEN ROUND(
      (SELECT AVG(effectiveness_score) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL),
      2
    )
    ELSE 0
  END as average_effectiveness_score,
  
  -- 최근 30일 활동
  (SELECT COUNT(*) FROM recommendations WHERE created_at >= NOW() - INTERVAL '30 days') as recent_recommendations,
  (SELECT COUNT(*) FROM ippa_evaluations WHERE evaluated_at >= NOW() - INTERVAL '30 days') as recent_ippa_evaluations,
  
  -- 업데이트 시간
  NOW() as last_updated;

COMMENT ON VIEW view_platform_stats IS '전체 플랫폼 통계를 실시간으로 집계하는 View (K-IPPA 참여율 계산 로직 수정)';

-- 일별 통계 뷰 (최근 30일)
CREATE OR REPLACE VIEW view_daily_stats AS
SELECT 
  DATE(created_at) as stat_date,
  COUNT(*) as recommendations_count,
  COUNT(*) FILTER (WHERE is_clicked = true) as clicked_count
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

COMMENT ON VIEW view_daily_stats IS '최근 30일 일별 추천 통계';

-- 사용자별 통계 뷰
CREATE OR REPLACE VIEW view_user_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  u.points,
  u.created_at as user_created_at,
  
  -- 상담 통계
  COUNT(DISTINCT c.id) as total_consultations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_consultations,
  
  -- 추천 통계
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  
  -- K-IPPA 평가 통계
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) > 0
    THEN ROUND(
      COUNT(DISTINCT i.id)::numeric / 
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- 평균 효과성 점수
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 최근 활동
  MAX(r.created_at) as last_recommendation_at,
  MAX(i.evaluated_at) as last_ippa_evaluation_at

FROM users u
LEFT JOIN consultations c ON c.user_id = u.id
LEFT JOIN recommendations r ON r.consultation_id = c.id
LEFT JOIN ippa_evaluations i ON i.user_id = u.id
GROUP BY u.id, u.email, u.name, u.role, u.points, u.created_at;

COMMENT ON VIEW view_user_analytics IS '사용자별 상세 통계를 집계하는 View';

-- 상품별 통계 뷰
CREATE OR REPLACE VIEW view_product_stats AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.iso_code,
  p.manufacturer,
  p.price,
  
  -- 추천 통계
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND(
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
      COUNT(DISTINCT r.id)::numeric * 100,
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 최근 활동
  MAX(r.created_at) as last_recommended_at

FROM products p
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.iso_code, p.manufacturer, p.price;

COMMENT ON VIEW view_product_stats IS '상품별 추천 및 평가 통계를 집계하는 View';

-- ISO 코드별 통계 뷰
CREATE OR REPLACE VIEW view_iso_code_stats AS
SELECT 
  p.iso_code,
  
  -- 추천 통계
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND(
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
      COUNT(DISTINCT r.id)::numeric * 100,
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 상품 수
  COUNT(DISTINCT p.id) as product_count

FROM products p
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.iso_code;

COMMENT ON VIEW view_iso_code_stats IS 'ISO 코드별 추천 및 평가 통계를 집계하는 View';

-- ICF 코드 확장 우선순위 뷰
CREATE OR REPLACE VIEW icf_code_expansion_priority AS
SELECT 
  s.icf_code,
  s.category,
  s.is_in_core_set,
  s.total_usage_count,
  s.unique_consultations,
  s.usage_by_source,
  s.first_seen_at,
  s.last_seen_at,
  -- 우선순위 점수 계산 (사용 빈도 + 고유 상담 수 + 최근성)
  (
    s.total_usage_count * 1.0 +
    s.unique_consultations * 2.0 +
    CASE 
      WHEN s.last_seen_at > NOW() - INTERVAL '7 days' THEN 5.0
      WHEN s.last_seen_at > NOW() - INTERVAL '30 days' THEN 2.0
      ELSE 0.0
    END
  ) AS priority_score
FROM icf_code_statistics s
WHERE s.is_in_core_set = false
ORDER BY priority_score DESC;

COMMENT ON VIEW icf_code_expansion_priority IS 'ICF 코드 확장 우선순위 - Core Set에 없는 코드의 확장 필요성 분석';

-- =========================================================
-- [9] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'LinkAble MVP Database DDL Script 실행 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 객체:';
  RAISE NOTICE '  - 테이블: 17개';
  RAISE NOTICE '  - 뷰: 6개';
  RAISE NOTICE '  - 함수: 7개';
  RAISE NOTICE '  - 트리거: 8개';
  RAISE NOTICE '  - 인덱스: 50개 이상';
  RAISE NOTICE '=========================================================';
END $$;

