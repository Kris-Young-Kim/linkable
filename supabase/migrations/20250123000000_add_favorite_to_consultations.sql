-- 상담 즐겨찾기 기능 추가
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN consultations.is_favorite IS '사용자가 즐겨찾기로 표시한 상담인지 여부';

-- 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_consultations_is_favorite ON consultations (is_favorite) WHERE is_favorite = TRUE;

