-- K-IPPA 참여율 계산 로직 수정
-- recommendation_id가 있고 해당 추천이 클릭된 평가만 카운트하도록 수정

CREATE OR REPLACE VIEW view_platform_stats AS
SELECT 
  -- 추천 통계
  (SELECT COUNT(*) FROM recommendations) as total_recommendations,
  (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations) > 0 
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) / 
      (SELECT COUNT(*)::numeric FROM recommendations) * 100, 
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA 평가 통계
  (SELECT COUNT(*) FROM ippa_evaluations) as total_ippa_evaluations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) > 0
    THEN ROUND(
      -- recommendation_id가 있고 해당 추천이 클릭된 평가만 카운트
      (SELECT COUNT(*)::numeric 
       FROM ippa_evaluations i
       INNER JOIN recommendations r ON i.recommendation_id = r.id
       WHERE r.is_clicked = true 
         AND i.recommendation_id IS NOT NULL) / 
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- 상담 통계
  (SELECT COUNT(*) FROM consultations) as total_consultations,
  (SELECT COUNT(*) FROM consultations WHERE status = 'completed') as completed_consultations,
  CASE 
    WHEN (SELECT COUNT(*) FROM consultations) > 0
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM consultations WHERE status = 'completed') / 
      (SELECT COUNT(*)::numeric FROM consultations) * 100,
      2
    )
    ELSE 0
  END as consultation_completion_rate,
  
  -- 평균 효과성 점수
  CASE 
    WHEN (SELECT COUNT(*) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL) > 0
    THEN ROUND(
      (SELECT AVG(effectiveness_score) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL),
      2
    )
    ELSE 0
  END as average_effectiveness_score,
  
  -- 최근 30일 활동
  (SELECT COUNT(*) FROM recommendations WHERE created_at >= NOW() - INTERVAL '30 days') as recent_recommendations,
  (SELECT COUNT(*) FROM ippa_evaluations WHERE evaluated_at >= NOW() - INTERVAL '30 days') as recent_ippa_evaluations,
  
  -- 업데이트 시간
  NOW() as last_updated;

COMMENT ON VIEW view_platform_stats IS '전체 플랫폼 통계를 실시간으로 집계하는 View (K-IPPA 참여율 계산 로직 수정)';

