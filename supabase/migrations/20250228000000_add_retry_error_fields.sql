-- 장애/차단/재시도 필드 추가
-- 목적: 외부 API 호출, 알림 전송 등 실패 시 재시도 및 에러 추적을 위한 필드 추가
-- 참고: crawl_requests 테이블에는 이미 이러한 필드가 있음

-- =========================================================
-- 1. notifications 테이블에 재시도/에러 필드 추가
-- =========================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS error_details JSONB,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'blocked'));

COMMENT ON COLUMN notifications.attempt_count IS '알림 전송 시도 횟수';
COMMENT ON COLUMN notifications.max_attempts IS '최대 재시도 횟수 (기본값: 3)';
COMMENT ON COLUMN notifications.next_retry_at IS '다음 재시도 시각 (NULL이면 재시도 안 함)';
COMMENT ON COLUMN notifications.error_code IS '에러 코드 (예: RATE_LIMIT, NETWORK_ERROR, INVALID_USER)';
COMMENT ON COLUMN notifications.error_message IS '에러 메시지';
COMMENT ON COLUMN notifications.error_details IS '상세 에러 정보 (JSONB)';
COMMENT ON COLUMN notifications.delivery_status IS '전송 상태: pending(대기), sent(전송됨), failed(실패), blocked(차단됨)';

-- 재시도 대기 중인 알림 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_next_retry 
ON notifications(next_retry_at) 
WHERE next_retry_at IS NOT NULL AND delivery_status = 'failed';

CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status 
ON notifications(delivery_status, created_at DESC);

-- =========================================================
-- 2. conversion_events 테이블에 재시도/에러 필드 추가
-- =========================================================

ALTER TABLE conversion_events
ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS error_details JSONB,
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'blocked'));

COMMENT ON COLUMN conversion_events.attempt_count IS '이벤트 처리 시도 횟수 (외부 API 호출 등)';
COMMENT ON COLUMN conversion_events.max_attempts IS '최대 재시도 횟수 (기본값: 3)';
COMMENT ON COLUMN conversion_events.next_retry_at IS '다음 재시도 시각 (NULL이면 재시도 안 함)';
COMMENT ON COLUMN conversion_events.error_code IS '에러 코드 (예: API_ERROR, NETWORK_ERROR, RATE_LIMIT)';
COMMENT ON COLUMN conversion_events.error_message IS '에러 메시지';
COMMENT ON COLUMN conversion_events.error_details IS '상세 에러 정보 (JSONB)';
COMMENT ON COLUMN conversion_events.processing_status IS '처리 상태: pending(대기), processing(처리중), completed(완료), failed(실패), blocked(차단됨)';

-- 재시도 대기 중인 이벤트 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_conversion_events_next_retry 
ON conversion_events(next_retry_at) 
WHERE next_retry_at IS NOT NULL AND processing_status = 'failed';

CREATE INDEX IF NOT EXISTS idx_conversion_events_processing_status 
ON conversion_events(processing_status, created_at DESC);

-- =========================================================
-- 3. recommendations 테이블에 재시도/에러 필드 추가 (선택적)
-- =========================================================
-- 추천 생성 실패 시 재시도를 위한 필드

ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS generation_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS generation_max_attempts INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS generation_next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS generation_error_code TEXT,
ADD COLUMN IF NOT EXISTS generation_error_message TEXT,
ADD COLUMN IF NOT EXISTS generation_error_details JSONB;

COMMENT ON COLUMN recommendations.generation_attempt_count IS '추천 생성 시도 횟수';
COMMENT ON COLUMN recommendations.generation_max_attempts IS '최대 재시도 횟수 (기본값: 3)';
COMMENT ON COLUMN recommendations.generation_next_retry_at IS '다음 재시도 시각 (NULL이면 재시도 안 함)';
COMMENT ON COLUMN recommendations.generation_error_code IS '에러 코드';
COMMENT ON COLUMN recommendations.generation_error_message IS '에러 메시지';
COMMENT ON COLUMN recommendations.generation_error_details IS '상세 에러 정보 (JSONB)';

-- 재시도 대기 중인 추천 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_recommendations_generation_next_retry 
ON recommendations(generation_next_retry_at) 
WHERE generation_next_retry_at IS NOT NULL;

-- =========================================================
-- 4. 재시도 로직을 위한 헬퍼 함수
-- =========================================================

-- 재시도 시각 계산 함수 (지수 백오프)
CREATE OR REPLACE FUNCTION calculate_next_retry_at(
  attempt_count INTEGER,
  base_delay_minutes INTEGER DEFAULT 5
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  delay_minutes INTEGER;
BEGIN
  -- 지수 백오프: 5분, 10분, 20분, 40분...
  delay_minutes := base_delay_minutes * POWER(2, attempt_count);
  
  -- 최대 24시간으로 제한
  IF delay_minutes > 1440 THEN
    delay_minutes := 1440;
  END IF;
  
  RETURN NOW() + (delay_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_retry_at IS '재시도 시각 계산 (지수 백오프 알고리즘)';

-- 재시도 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_retry(
  attempt_count INTEGER,
  max_attempts INTEGER,
  next_retry_at TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
  -- 최대 시도 횟수 초과 시 재시도 불가
  IF attempt_count >= max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- next_retry_at이 NULL이면 재시도 불가
  IF next_retry_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 아직 재시도 시각이 되지 않았으면 재시도 불가
  IF next_retry_at > NOW() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_retry IS '재시도 가능 여부 확인 (시도 횟수, 최대 시도 횟수, 다음 재시도 시각 기준)';

-- =========================================================
-- 5. 재시도 대기 중인 레코드 조회 뷰
-- =========================================================

CREATE OR REPLACE VIEW v_retry_queue AS
SELECT 
  'notification' AS table_name,
  id::TEXT AS record_id,
  next_retry_at,
  attempt_count,
  max_attempts,
  error_code,
  error_message
FROM notifications
WHERE next_retry_at IS NOT NULL 
  AND next_retry_at <= NOW()
  AND attempt_count < max_attempts
  AND delivery_status = 'failed'

UNION ALL

SELECT 
  'conversion_event' AS table_name,
  id::TEXT AS record_id,
  next_retry_at,
  attempt_count,
  max_attempts,
  error_code,
  error_message
FROM conversion_events
WHERE next_retry_at IS NOT NULL 
  AND next_retry_at <= NOW()
  AND attempt_count < max_attempts
  AND processing_status = 'failed'

UNION ALL

SELECT 
  'recommendation' AS table_name,
  id::TEXT AS record_id,
  generation_next_retry_at AS next_retry_at,
  generation_attempt_count AS attempt_count,
  generation_max_attempts AS max_attempts,
  generation_error_code AS error_code,
  generation_error_message AS error_message
FROM recommendations
WHERE generation_next_retry_at IS NOT NULL 
  AND generation_next_retry_at <= NOW()
  AND generation_attempt_count < generation_max_attempts;

COMMENT ON VIEW v_retry_queue IS '재시도 대기 중인 모든 레코드 조회 (notifications, conversion_events, recommendations)';

