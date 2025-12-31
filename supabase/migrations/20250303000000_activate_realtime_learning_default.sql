-- =========================================================
-- [LinkAble] 실시간 학습 시스템 기본 설정 활성화
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-03-03
-- =========================================================
-- 
-- 목적: 실시간 학습 시스템의 기본 설정을 활성화합니다.
-- 

-- 테이블이 존재하는지 확인하고, 없으면 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'realtime_learning_configs') THEN
        -- 테이블 생성 (20250221000002_realtime_learning_system.sql에서 가져옴)
        CREATE TABLE IF NOT EXISTS realtime_learning_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            
            -- 학습 파라미터
            learning_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1 CHECK (learning_rate > 0 AND learning_rate <= 1),
            min_sample_count INTEGER NOT NULL DEFAULT 5,
            decay_factor DECIMAL(5, 4) DEFAULT 0.95,
            max_weight_boost DECIMAL(3, 2) DEFAULT 1.5,
            min_weight_penalty DECIMAL(3, 2) DEFAULT 0.7,
            
            -- 클릭률 기반 가중치 조정
            click_rate_threshold DECIMAL(5, 4) DEFAULT 0.15,
            click_rate_boost_factor DECIMAL(5, 4) DEFAULT 0.05,
            purchase_rate_boost_factor DECIMAL(5, 4) DEFAULT 0.10,
            
            -- 활성화 설정
            is_active BOOLEAN DEFAULT FALSE,
            is_default BOOLEAN DEFAULT FALSE,
            
            -- 메타데이터
            created_by TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        COMMENT ON TABLE realtime_learning_configs IS '실시간 학습 시스템 설정';
        COMMENT ON COLUMN realtime_learning_configs.learning_rate IS '학습률 (0-1, 높을수록 빠른 학습)';
        COMMENT ON COLUMN realtime_learning_configs.min_sample_count IS '최소 샘플 수 (신뢰도 기준)';
        COMMENT ON COLUMN realtime_learning_configs.decay_factor IS '시간 감쇠 계수 (오래된 데이터 영향 감소)';
    END IF;
END $$;

-- 기본 설정이 없으면 생성하고 활성화
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
)
SELECT 
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
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM realtime_learning_configs WHERE name = 'default'
);

-- 기존 활성화된 설정이 있으면 비활성화 (기본 설정만 활성화)
UPDATE realtime_learning_configs
SET is_active = false
WHERE name != 'default' AND is_active = true;

COMMENT ON TABLE realtime_learning_configs IS '실시간 학습 시스템 설정 (기본 설정 활성화됨)';
