-- =========================================================
-- [LinkAble] MVP Database Schema Setup Script
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- =========================================================

-- [1] RESET: 기존 테이블 및 함수 완전 초기화 (개발용)
-- CASCADE 옵션으로 의존성이 있는 하위 테이블까지 한 번에 삭제합니다.
DROP TABLE IF EXISTS ippa_evaluations CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;


-- [2] UTILITY: 자동화 기능을 위한 함수 생성
-- 레코드가 수정(UPDATE)될 때 updated_at 필드를 현재 시간으로 자동 갱신합니다.
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- [3] TABLES: 테이블 스키마 정의

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    -- User 삭제 시 상담 내역도 함께 삭제 (Strict Cascade)
    CONSTRAINT fk_consultations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT consultations_status_check CHECK (status IN ('in_progress', 'completed', 'archived'))
);
COMMENT ON TABLE consultations IS '사용자 상담 세션 헤더';


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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_recommendation_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
COMMENT ON TABLE recommendations IS '상담 결과에 따른 상품 추천 목록 (다대다 연결)';


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


-- [4] INDEXES: 성능 최적화
-- Foreign Key Join 성능 향상
CREATE INDEX idx_consultations_user_id ON consultations(user_id);
CREATE INDEX idx_chat_messages_consultation_id ON chat_messages(consultation_id);
CREATE INDEX idx_recommendations_consultation_id ON recommendations(consultation_id);
CREATE INDEX idx_recommendations_product_id ON recommendations(product_id);
CREATE INDEX idx_ippa_user_id ON ippa_evaluations(user_id);
CREATE INDEX idx_ippa_product_id ON ippa_evaluations(product_id);

-- 검색 필터링 최적화
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_iso_code ON products(iso_code);
CREATE INDEX idx_products_category ON products(category);


-- [5] TRIGGERS: 자동화 적용
-- updated_at 컬럼을 가진 테이블에 트리거 부착
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultations_modtime BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ippa_modtime BEFORE UPDATE ON ippa_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- End of Script