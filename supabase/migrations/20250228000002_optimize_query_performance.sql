-- =========================================================
-- [LinkAble] 쿼리 성능 최적화 인덱스 추가
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-02-28
-- =========================================================
-- 
-- 목적: 자주 사용되는 쿼리 패턴에 대한 성능 최적화
-- 
-- 최적화 대상:
-- 1. 날짜 범위 조회 쿼리 (created_at 기반 필터링)
-- 2. 복합 조건 조회 (여러 컬럼 조합)
-- 3. 집계 쿼리 (GROUP BY, ORDER BY)
-- 4. JOIN 쿼리 최적화
-- =========================================================

-- =========================================================
-- [1] Consultations 테이블 최적화
-- =========================================================

-- 날짜 범위 + 상태 조회 최적화
CREATE INDEX IF NOT EXISTS idx_consultations_created_status 
ON consultations(created_at DESC, status) 
WHERE status IN ('active', 'completed');

-- 사용자별 최근 상담 조회 최적화
CREATE INDEX IF NOT EXISTS idx_consultations_user_created 
ON consultations(user_id, created_at DESC);

-- =========================================================
-- [2] Recommendations 테이블 최적화
-- =========================================================

-- 상담별 추천 조회 최적화
CREATE INDEX IF NOT EXISTS idx_recommendations_consultation_created 
ON recommendations(consultation_id, created_at DESC);

-- 클릭 여부 + 날짜 조회 최적화
CREATE INDEX IF NOT EXISTS idx_recommendations_clicked_created 
ON recommendations(is_clicked, created_at DESC) 
WHERE is_clicked = TRUE;

-- 구매 완료 추적 최적화
CREATE INDEX IF NOT EXISTS idx_recommendations_purchase_created 
ON recommendations(purchase_completed, purchase_completed_at DESC) 
WHERE purchase_completed = TRUE;

-- =========================================================
-- [3] IPPA Evaluations 테이블 최적화
-- =========================================================

-- 사용자별 평가 조회 최적화
CREATE INDEX IF NOT EXISTS idx_ippa_user_evaluated 
ON ippa_evaluations(user_id, evaluated_at DESC);

-- 추천별 평가 조회 최적화
CREATE INDEX IF NOT EXISTS idx_ippa_recommendation_evaluated 
ON ippa_evaluations(recommendation_id, evaluated_at DESC);

-- 상품별 평가 집계 최적화
CREATE INDEX IF NOT EXISTS idx_ippa_product_evaluated 
ON ippa_evaluations(product_id, evaluated_at DESC);

-- =========================================================
-- [4] Chat Messages 테이블 최적화
-- =========================================================

-- 상담별 메시지 순서 조회 최적화 (이미 존재하지만 확인)
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_sequence 
ON chat_messages(consultation_id, sequence_number);

-- 상담별 최신 메시지 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_created 
ON chat_messages(consultation_id, created_at DESC);

-- =========================================================
-- [5] Analysis Results 테이블 최적화
-- =========================================================

-- 상담별 분석 결과 조회 최적화
CREATE INDEX IF NOT EXISTS idx_analysis_results_consultation_created 
ON analysis_results(consultation_id, created_at DESC);

-- =========================================================
-- [6] Products 테이블 최적화
-- =========================================================

-- ISO 코드 + 활성 상태 조회 최적화
CREATE INDEX IF NOT EXISTS idx_products_iso_active 
ON products(iso_code, is_active) 
WHERE is_active = TRUE;

-- 카테고리 + 활성 상태 조회 최적화
CREATE INDEX IF NOT EXISTS idx_products_category_active 
ON products(category, is_active) 
WHERE is_active = TRUE;

-- 제조사 + 활성 상태 조회 최적화
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_active 
ON products(manufacturer, is_active) 
WHERE is_active = TRUE;

-- =========================================================
-- [7] Consultation ICF Codes 테이블 최적화
-- =========================================================

-- 상담별 ICF 코드 조회 최적화 (이미 존재하지만 확인)
CREATE INDEX IF NOT EXISTS idx_consultation_icf_consultation 
ON consultation_icf_codes(consultation_id);

-- ICF 코드별 사용 통계 조회 최적화
CREATE INDEX IF NOT EXISTS idx_consultation_icf_code_created 
ON consultation_icf_codes(icf_code_id, created_at DESC);

-- =========================================================
-- [8] Performance Logs 테이블 최적화
-- =========================================================

-- Web Vitals: 날짜 + 지표명 조회 최적화
CREATE INDEX IF NOT EXISTS idx_web_vitals_date_metric 
ON performance_web_vitals(created_at DESC, metric_name);

-- Web Vitals: 페이지별 통계 조회 최적화
CREATE INDEX IF NOT EXISTS idx_web_vitals_page_metric 
ON performance_web_vitals(page_path, metric_name, created_at DESC);

-- API Logs: 엔드포인트별 통계 조회 최적화
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_created 
ON performance_api_logs(endpoint, method, created_at DESC);

-- API Logs: 상태 코드별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_api_logs_status_created 
ON performance_api_logs(status_code, created_at DESC) 
WHERE status_code >= 400;

-- =========================================================
-- [9] Matching Performance Logs 최적화
-- =========================================================

-- 가중치 설정별 성능 조회 최적화 (이미 존재하지만 확인)
CREATE INDEX IF NOT EXISTS idx_matching_performance_config_created 
ON matching_performance_logs(weight_config_name, created_at DESC);

-- =========================================================
-- [10] Materialized View를 위한 인덱스 (향후 사용)
-- =========================================================

-- 일별 집계 쿼리 최적화를 위한 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_consultations_daily_stats 
ON consultations(DATE(created_at), status);

-- =========================================================
-- [11] 통계 쿼리 최적화 (복합 인덱스)
-- =========================================================

-- 추천 클릭률 통계 조회 최적화
CREATE INDEX IF NOT EXISTS idx_recommendations_stats 
ON recommendations(consultation_id, is_clicked, created_at DESC);

-- 평가 완료율 통계 조회 최적화
CREATE INDEX IF NOT EXISTS idx_ippa_stats 
ON ippa_evaluations(user_id, recommendation_id, evaluated_at DESC);

-- =========================================================
-- [12] 분석 및 모니터링
-- =========================================================

-- 인덱스 사용 통계 확인 쿼리 (참고용)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- 느린 쿼리 확인 (pg_stat_statements 확장 필요)
-- SELECT query, calls, total_time, mean_time, max_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 20;

COMMENT ON INDEX idx_consultations_created_status IS '날짜 범위 + 상태 조회 최적화';
COMMENT ON INDEX idx_recommendations_consultation_created IS '상담별 추천 조회 최적화';
COMMENT ON INDEX idx_ippa_user_evaluated IS '사용자별 평가 조회 최적화';
COMMENT ON INDEX idx_web_vitals_date_metric IS 'Web Vitals 날짜 + 지표명 조회 최적화';
COMMENT ON INDEX idx_api_logs_endpoint_created IS 'API 로그 엔드포인트별 통계 조회 최적화';
