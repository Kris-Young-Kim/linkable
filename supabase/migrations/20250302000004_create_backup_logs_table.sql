-- =========================================================
-- [LinkAble] Create backup_logs table
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-02
-- =========================================================
--
-- 데이터베이스 백업 이력을 저장하는 테이블 생성
-- =========================================================

CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'manual'
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  verification_results JSONB, -- 테이블별 검증 결과
  total_rows INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT backup_logs_type_check CHECK (backup_type IN ('daily', 'weekly', 'manual'))
);

COMMENT ON TABLE backup_logs IS '데이터베이스 백업 이력';
COMMENT ON COLUMN backup_logs.backup_type IS '백업 유형: daily(일일), weekly(주간), manual(수동)';
COMMENT ON COLUMN backup_logs.status IS '백업 상태: success(성공), warning(경고), error(오류)';
COMMENT ON COLUMN backup_logs.verification_results IS '테이블별 검증 결과 (JSONB)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);

-- =========================================================
-- End of Migration
-- =========================================================
