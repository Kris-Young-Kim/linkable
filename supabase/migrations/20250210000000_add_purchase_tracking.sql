-- 구매 완료 추적을 위한 스키마 업데이트

-- 1. conversion_events 테이블에 purchase_completed 이벤트 타입 추가
ALTER TABLE conversion_events 
DROP CONSTRAINT IF EXISTS conversion_events_event_type_check;

ALTER TABLE conversion_events 
ADD CONSTRAINT conversion_events_event_type_check 
CHECK (event_type IN (
  'recommendation_click',
  'purchase_link_click',
  'support_program_click',
  'expert_inquiry_click',
  'ippa_evaluation_submit',
  'consultation_feedback_submit',
  'coupon_redeemed',
  'purchase_completed'  -- 구매 완료 이벤트 추가
));

-- 2. 구매 완료 정보를 저장할 필드 추가 (metadata에 저장하지만 별도 필드도 추가)
ALTER TABLE conversion_events 
ADD COLUMN IF NOT EXISTS purchase_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_source VARCHAR(50); -- 'postback', 'meta_pixel'

COMMENT ON COLUMN conversion_events.purchase_amount IS '구매 금액';
COMMENT ON COLUMN conversion_events.commission_amount IS '수수료 금액';
COMMENT ON COLUMN conversion_events.purchase_date IS '구매 완료 일시';
COMMENT ON COLUMN conversion_events.tracking_source IS '추적 소스 (postback, meta_pixel)';

-- 3. 인덱스 추가 (구매 완료 이벤트 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_conversion_events_purchase_completed 
ON conversion_events(event_type, purchase_date) 
WHERE event_type = 'purchase_completed';

CREATE INDEX IF NOT EXISTS idx_conversion_events_tracking_source 
ON conversion_events(tracking_source, purchase_date);

-- 4. recommendations 테이블에 구매 완료 상태 추가 (선택적)
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS purchase_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS purchase_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS purchase_amount DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_recommendations_purchase_completed 
ON recommendations(purchase_completed, purchase_completed_at);

COMMENT ON COLUMN recommendations.purchase_completed IS '구매 완료 여부';
COMMENT ON COLUMN recommendations.purchase_completed_at IS '구매 완료 일시';
COMMENT ON COLUMN recommendations.purchase_amount IS '구매 금액';

