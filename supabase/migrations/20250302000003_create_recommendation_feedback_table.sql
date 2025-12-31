-- =========================================================
-- [LinkAble] Create recommendation_feedback table
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-03-02
-- =========================================================
--
-- 추천 상품에 대한 사용자 피드백을 저장하는 테이블 생성
-- =========================================================

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_feedback_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- 한 추천당 하나의 피드백만 허용
  CONSTRAINT unique_feedback_per_recommendation UNIQUE (recommendation_id)
);

COMMENT ON TABLE recommendation_feedback IS '추천 상품에 대한 사용자 피드백';
COMMENT ON COLUMN recommendation_feedback.rating IS '만족도 평가 (1-5점)';
COMMENT ON COLUMN recommendation_feedback.comment IS '추가 의견 (선택사항)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation_id ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_created_at ON recommendation_feedback(created_at);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_recommendation_feedback_modtime 
  BEFORE UPDATE ON recommendation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- End of Migration
-- =========================================================
