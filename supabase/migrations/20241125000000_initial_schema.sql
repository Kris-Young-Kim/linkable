-- =========================================================
-- [LinkAble] Initial Database Schema Migration
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2024-11-25
-- =========================================================
-- 
-- 이 마이그레이션은 LinkAble 프로젝트의 초기 스키마를 생성합니다.
-- 기본 테이블들(users, consultations, products 등)을 포함합니다.
-- 
-- 주의: 이 파일은 프로젝트의 가장 초기 마이그레이션입니다.
-- 이후 마이그레이션들은 이 스키마를 기반으로 합니다.
-- =========================================================

-- =========================================================
-- [1] UTILITY: 자동화 기능을 위한 함수 생성
-- =========================================================

-- 레코드가 수정(UPDATE)될 때 updated_at 필드를 현재 시간으로 자동 갱신합니다.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS '레코드 수정 시 updated_at 필드를 자동으로 갱신';

-- chat_messages의 sequence_number를 자동으로 할당하는 함수
CREATE OR REPLACE FUNCTION assign_chat_message_sequence()
RETURNS TRIGGER AS $$
BEGIN
    -- consultation_id별로 다음 sequence_number 계산
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM chat_messages
    WHERE consultation_id = NEW.consultation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_chat_message_sequence() IS 'chat_messages 삽입 시 상담별 순차 번호 자동 할당';

-- =========================================================
-- [2] TABLES: 기본 테이블 스키마 정의
-- =========================================================

-- 1. Users (사용자)
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS products (
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
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(200),
    status VARCHAR(50) DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    -- User 삭제 시 상담 내역도 함께 삭제 (Strict Cascade)
    CONSTRAINT fk_consultations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT consultations_status_check CHECK (status IN ('in_progress', 'completed', 'archived'))
);

COMMENT ON TABLE consultations IS '사용자 상담 세션 헤더';

-- 4. Chat Messages (상담 로그)
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY, -- 순차적 ID로 데이터 관리 용이
    consultation_id UUID NOT NULL,
    sequence_number INTEGER NOT NULL, -- 상담 내 메시지 순서 (1부터 시작)
    sender VARCHAR(20) NOT NULL, -- 'user', 'ai', 'system'
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_chat_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT chat_sender_check CHECK (sender IN ('user', 'ai', 'system')),
    -- 상담별 메시지 순서는 유일해야 함
    CONSTRAINT chat_messages_consultation_sequence_unique UNIQUE (consultation_id, sequence_number),
    -- 순서는 양수여야 함
    CONSTRAINT chat_sequence_positive CHECK (sequence_number > 0)
);

COMMENT ON TABLE chat_messages IS '상담 상세 대화 로그 (정규화된 ID 구조)';
COMMENT ON COLUMN chat_messages.id IS '순차적 메시지 ID (BIGSERIAL)';
COMMENT ON COLUMN chat_messages.sequence_number IS '상담 내 메시지 순서 (1부터 시작, 상담별로 유일)';

-- 5. Analysis Results (AI 분석 결과)
CREATE TABLE IF NOT EXISTS analysis_results (
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
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    product_id UUID NOT NULL,
    match_reason TEXT, -- AI가 생성한 추천 사유
    rank INTEGER,
    is_clicked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_recommendation_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

COMMENT ON TABLE recommendations IS '상담 결과에 따른 상품 추천 목록 (다대다 연결)';

-- 7. IPPA Evaluations (K-IPPA 효과성 평가)
CREATE TABLE IF NOT EXISTS ippa_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    recommendation_id UUID, -- 직접 구매 시 NULL 가능
    
    problem_description TEXT, -- 사용자가 정의한 문제
    score_importance INTEGER NOT NULL DEFAULT 3,
    score_difficulty_pre INTEGER NOT NULL,
    score_difficulty_post INTEGER NOT NULL,
    
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

-- =========================================================
-- [3] INDEXES: 성능 최적화
-- =========================================================

-- Foreign Key Join 성능 향상
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_id ON chat_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_sequence ON chat_messages(consultation_id, sequence_number); -- 상담별 순서 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at); -- 시간순 조회 최적화
CREATE INDEX IF NOT EXISTS idx_recommendations_consultation_id ON recommendations(consultation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_product_id ON recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_ippa_user_id ON ippa_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_ippa_product_id ON ippa_evaluations(product_id);

-- 검색 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_iso_code ON products(iso_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- =========================================================
-- [4] TRIGGERS: 자동화 적용
-- =========================================================

-- updated_at 컬럼을 가진 테이블에 트리거 부착
DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_modtime ON products;
CREATE TRIGGER update_products_modtime 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_modtime ON consultations;
CREATE TRIGGER update_consultations_modtime 
    BEFORE UPDATE ON consultations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ippa_modtime ON ippa_evaluations;
CREATE TRIGGER update_ippa_modtime 
    BEFORE UPDATE ON ippa_evaluations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- chat_messages의 sequence_number 자동 할당 트리거
DROP TRIGGER IF EXISTS assign_chat_sequence ON chat_messages;
CREATE TRIGGER assign_chat_sequence
    BEFORE INSERT ON chat_messages
    FOR EACH ROW
    WHEN (NEW.sequence_number IS NULL)
    EXECUTE FUNCTION assign_chat_message_sequence();

-- =========================================================
-- End of Initial Schema Migration
-- =========================================================

