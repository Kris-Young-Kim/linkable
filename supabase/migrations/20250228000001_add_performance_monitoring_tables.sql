-- =========================================================
-- [LinkAble] 성능 모니터링 테이블 생성
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-02-28
-- =========================================================
-- 
-- 목적: Core Web Vitals 및 API 성능 지표를 추적하고 저장
-- 
-- 기능:
-- 1. Web Vitals 지표 저장 (LCP, FID, CLS, FCP, TTFB, INP)
-- 2. API 성능 로그 저장 (응답 시간, 에러율 등)
-- 3. 성능 대시보드를 위한 집계 뷰 생성
-- =========================================================

-- =========================================================
-- [1] Web Vitals 성능 로그 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS performance_web_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- 지표 정보
    metric_name VARCHAR(50) NOT NULL CHECK (metric_name IN (
        'LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'
    )),
    metric_value DECIMAL(10, 2) NOT NULL, -- 지표 값 (밀리초 또는 점수)
    metric_rating VARCHAR(20) NOT NULL CHECK (metric_rating IN (
        'good', 'needs-improvement', 'poor'
    )),
    
    -- 페이지 정보
    page_path TEXT NOT NULL, -- 페이지 경로 (예: /chat, /recommendations/123)
    page_url TEXT, -- 전체 URL
    
    -- 환경 정보
    user_agent TEXT,
    connection_type VARCHAR(50), -- 네트워크 연결 타입 (예: 4g, 3g, slow-2g)
    device_memory INTEGER, -- 디바이스 메모리 (GB)
    hardware_concurrency INTEGER, -- CPU 코어 수
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON performance_web_vitals(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON performance_web_vitals(created_at);
CREATE INDEX IF NOT EXISTS idx_web_vitals_page_path ON performance_web_vitals(page_path);
CREATE INDEX IF NOT EXISTS idx_web_vitals_user_id ON performance_web_vitals(user_id);
CREATE INDEX IF NOT EXISTS idx_web_vitals_rating ON performance_web_vitals(metric_rating);

COMMENT ON TABLE performance_web_vitals IS 'Core Web Vitals 성능 지표 로그';
COMMENT ON COLUMN performance_web_vitals.metric_name IS '지표 이름 (LCP, FID, CLS, FCP, TTFB, INP)';
COMMENT ON COLUMN performance_web_vitals.metric_value IS '지표 값 (밀리초 또는 점수)';
COMMENT ON COLUMN performance_web_vitals.metric_rating IS '지표 평가 (good, needs-improvement, poor)';

-- =========================================================
-- [2] API 성능 로그 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS performance_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- API 정보
    endpoint TEXT NOT NULL, -- API 엔드포인트 (예: /api/chat, /api/products)
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    status_code INTEGER NOT NULL, -- HTTP 상태 코드
    
    -- 성능 지표
    response_time_ms INTEGER NOT NULL, -- 응답 시간 (밀리초)
    request_size_bytes INTEGER, -- 요청 크기 (바이트)
    response_size_bytes INTEGER, -- 응답 크기 (바이트)
    
    -- 에러 정보
    error_message TEXT, -- 에러 메시지 (있는 경우)
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON performance_api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON performance_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON performance_api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON performance_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_method ON performance_api_logs(method);

COMMENT ON TABLE performance_api_logs IS 'API 성능 로그 (응답 시간, 에러율 등)';
COMMENT ON COLUMN performance_api_logs.endpoint IS 'API 엔드포인트 경로';
COMMENT ON COLUMN performance_api_logs.response_time_ms IS '응답 시간 (밀리초)';
COMMENT ON COLUMN performance_api_logs.status_code IS 'HTTP 상태 코드';

-- =========================================================
-- [3] Web Vitals 집계 뷰 (일별 통계)
-- =========================================================

CREATE OR REPLACE VIEW view_web_vitals_daily_stats AS
SELECT
    DATE(created_at) AS date,
    metric_name,
    COUNT(*) AS total_measurements,
    AVG(metric_value) AS avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) AS median_value,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) AS p99_value,
    MIN(metric_value) AS min_value,
    MAX(metric_value) AS max_value,
    COUNT(*) FILTER (WHERE metric_rating = 'good') AS good_count,
    COUNT(*) FILTER (WHERE metric_rating = 'needs-improvement') AS needs_improvement_count,
    COUNT(*) FILTER (WHERE metric_rating = 'poor') AS poor_count,
    ROUND(
        COUNT(*) FILTER (WHERE metric_rating = 'good')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) AS good_percentage
FROM performance_web_vitals
GROUP BY DATE(created_at), metric_name
ORDER BY date DESC, metric_name;

COMMENT ON VIEW view_web_vitals_daily_stats IS 'Web Vitals 일별 집계 통계';

-- =========================================================
-- [4] API 성능 집계 뷰 (일별 통계)
-- =========================================================

CREATE OR REPLACE VIEW view_api_performance_daily_stats AS
SELECT
    DATE(created_at) AS date,
    endpoint,
    method,
    COUNT(*) AS total_requests,
    AVG(response_time_ms) AS avg_response_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) AS median_response_time_ms,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY response_time_ms) AS p75_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_response_time_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99_response_time_ms,
    MIN(response_time_ms) AS min_response_time_ms,
    MAX(response_time_ms) AS max_response_time_ms,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) AS success_count,
    COUNT(*) FILTER (WHERE status_code >= 400) AS error_count,
    ROUND(
        COUNT(*) FILTER (WHERE status_code >= 400)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) AS error_rate_percentage,
    AVG(request_size_bytes) AS avg_request_size_bytes,
    AVG(response_size_bytes) AS avg_response_size_bytes
FROM performance_api_logs
GROUP BY DATE(created_at), endpoint, method
ORDER BY date DESC, endpoint, method;

COMMENT ON VIEW view_api_performance_daily_stats IS 'API 성능 일별 집계 통계';

-- =========================================================
-- [5] 페이지별 Web Vitals 집계 뷰
-- =========================================================

CREATE OR REPLACE VIEW view_web_vitals_by_page AS
SELECT
    page_path,
    metric_name,
    COUNT(*) AS total_measurements,
    AVG(metric_value) AS avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) AS median_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95_value,
    COUNT(*) FILTER (WHERE metric_rating = 'good') AS good_count,
    COUNT(*) FILTER (WHERE metric_rating = 'needs-improvement') AS needs_improvement_count,
    COUNT(*) FILTER (WHERE metric_rating = 'poor') AS poor_count,
    ROUND(
        COUNT(*) FILTER (WHERE metric_rating = 'good')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) AS good_percentage,
    MAX(created_at) AS last_measured_at
FROM performance_web_vitals
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY page_path, metric_name
ORDER BY page_path, metric_name;

COMMENT ON VIEW view_web_vitals_by_page IS '페이지별 Web Vitals 집계 (최근 30일)';
