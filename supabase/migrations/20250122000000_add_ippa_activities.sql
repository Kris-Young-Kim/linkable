-- K-IPPA 활동별 평가를 위한 스키마 확장
-- consultations 테이블에 활동별 점수 저장 필드 추가
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS ippa_activities JSONB DEFAULT NULL;

COMMENT ON COLUMN consultations.ippa_activities IS 'K-IPPA 상담 단계에서 선택한 ICF 활동 및 점수 (기초선)';

-- ippa_evaluations 테이블에 활동별 사후 점수 저장 필드 추가
ALTER TABLE ippa_evaluations 
ADD COLUMN IF NOT EXISTS activity_scores JSONB DEFAULT NULL;

COMMENT ON COLUMN ippa_evaluations.activity_scores IS 'K-IPPA 평가에서 각 ICF 활동별 사전/사후 점수 및 개선도';

-- 인덱스 추가 (JSONB 쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_consultations_ippa_activities ON consultations USING GIN (ippa_activities);
CREATE INDEX IF NOT EXISTS idx_ippa_evaluations_activity_scores ON ippa_evaluations USING GIN (activity_scores);

-- 예시 데이터 구조:
-- consultations.ippa_activities:
-- {
--   "activities": [
--     {
--       "icfCode": "d450",
--       "importance": 5,
--       "preDifficulty": 5,
--       "collectedAt": "2025-01-22T10:00:00Z"
--     }
--   ]
-- }
--
-- ippa_evaluations.activity_scores:
-- {
--   "activities": [
--     {
--       "icfCode": "d450",
--       "importance": 5,
--       "preDifficulty": 5,
--       "postDifficulty": 2,
--       "assistiveDevice": "이동형 리프트",
--       "improvement": 15
--     }
--   ],
--   "totalPreScore": 114,
--   "totalPostScore": 65,
--   "totalImprovement": 49,
--   "avgPreScore": 16.3,
--   "avgPostScore": 9.3,
--   "avgImprovement": 7.0
-- }

