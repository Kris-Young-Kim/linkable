-- 알림 테이블 생성
-- 목적: 인앱 알림 시스템을 위한 테이블

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'ippa_reminder', 'recommendation_ready', 'system', etc.
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link_url TEXT,
  metadata JSONB, -- 추가 메타데이터 (recommendation_id, product_id 등)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_type_check CHECK (type IN ('ippa_reminder', 'recommendation_ready', 'system', 'other'))
);

COMMENT ON TABLE notifications IS '사용자 인앱 알림';
COMMENT ON COLUMN notifications.type IS '알림 유형: ippa_reminder(K-IPPA 평가 요청), recommendation_ready(추천 준비), system(시스템), other(기타)';
COMMENT ON COLUMN notifications.metadata IS '추가 메타데이터 (JSONB): recommendation_id, product_id 등';

-- 인덱스 생성
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_notifications_modtime 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

