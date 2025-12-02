-- 포인트/쿠폰 인센티브 시스템 추가
-- 사용자 참여를 유도하기 위한 포인트 및 쿠폰 시스템

-- 1. 사용자 포인트 필드 추가 (이미 users 테이블에 points 필드가 있으면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'points'
  ) THEN
    ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
    COMMENT ON COLUMN users.points IS '사용자 포인트 (K-IPPA 평가, 추천 클릭 등으로 획득)';
  END IF;
END $$;

-- 2. 쿠폰 테이블 생성
CREATE TABLE IF NOT EXISTS coupons (
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

-- 3. 사용자 쿠폰 보유 테이블
CREATE TABLE IF NOT EXISTS user_coupons (
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

-- 4. 포인트 이력 테이블
CREATE TABLE IF NOT EXISTS point_transactions (
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

-- 5. 전환 이벤트 로깅 테이블 (Analytics 연동)
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'recommendation_click',
    'purchase_link_click',
    'support_program_click',
    'expert_inquiry_click',
    'ippa_evaluation_submit',
    'consultation_feedback_submit',
    'coupon_redeemed'
  )),
  source VARCHAR(50), -- 'primary', 'secondary', 'support', 'expert' 등
  recommendation_id UUID,
  product_id UUID,
  consultation_id UUID,
  metadata JSONB, -- 추가 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_conversion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_conversion_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL,
  CONSTRAINT fk_conversion_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_conversion_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL
);

COMMENT ON TABLE conversion_events IS '전환 이벤트 로깅 (Analytics 대시보드 연동용)';
COMMENT ON COLUMN conversion_events.metadata IS '추가 메타데이터 (JSON 형식)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_expires_at ON user_coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_coupons_used_at ON user_coupons(used_at);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_reference ON point_transactions(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_recommendation_id ON conversion_events(recommendation_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_coupons_updated_at();

-- 포인트 자동 업데이트 함수 (트랜잭션 발생 시 users.points 자동 업데이트)
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET points = points + NEW.points
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_points
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points();

