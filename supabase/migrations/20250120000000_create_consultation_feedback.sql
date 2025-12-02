-- 상담 피드백 테이블 생성
-- ICF 분석 정확도 평가를 저장합니다.

CREATE TABLE IF NOT EXISTS consultation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  accuracy_rating INTEGER NOT NULL CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  feedback_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_feedback_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- 한 상담당 하나의 피드백만 허용
  CONSTRAINT unique_feedback_per_consultation UNIQUE (consultation_id)
);

COMMENT ON TABLE consultation_feedback IS '상담 종료 후 ICF 분석 정확도 피드백';
COMMENT ON COLUMN consultation_feedback.accuracy_rating IS 'ICF 분석 정확도 평가 (1-5점)';
COMMENT ON COLUMN consultation_feedback.feedback_comment IS '추가 의견 (선택사항)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_feedback_consultation_id ON consultation_feedback(consultation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON consultation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON consultation_feedback(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_consultation_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consultation_feedback_updated_at
  BEFORE UPDATE ON consultation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_consultation_feedback_updated_at();

