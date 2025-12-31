-- =========================================================
-- [LinkAble] Add ippa_reminder_7days notification type
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-02
-- =========================================================
--
-- notifications 테이블의 type 컬럼에 ippa_reminder_7days 타입 추가
-- =========================================================

-- 기존 제약조건 확인 및 업데이트 (필요시)
-- notifications 테이블의 type 컬럼에 대한 CHECK 제약조건이 있다면 업데이트
DO $$
BEGIN
  -- 기존 제약조건이 있는지 확인
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_type_check'
    AND table_name = 'notifications'
  ) THEN
    -- 기존 제약조건 삭제
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  END IF;
END $$;

-- 새로운 제약조건 추가 (ippa_reminder_7days 포함)
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('ippa_reminder', 'ippa_reminder_7days', 'recommendation_ready', 'system', 'other'));

COMMENT ON COLUMN notifications.type IS '알림 유형: ippa_reminder(K-IPPA 평가 요청 14일), ippa_reminder_7days(K-IPPA 평가 요청 7일), recommendation_ready(추천 준비), system(시스템), other(기타)';

-- =========================================================
-- End of Migration
-- =========================================================
