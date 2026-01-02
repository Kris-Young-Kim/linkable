-- =========================================================
-- [LinkAble] 크롤링 데이터 관리 테이블 생성
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-02-26
-- =========================================================
-- 
-- 목적: 크롤링 데이터의 3단계 정규화 계층 구축
-- 
-- 계층 구조:
-- 1. Raw(원문 보관): `raw_documents` - 크롤링 원문 저장
-- 2. Listing(원천 상품): `product_listings` - 소스별 상품 (source_id + external_id 유니크)
-- 3. Canonical(정제 상품): `products` - 서비스 표준 상품
-- 
-- 핵심 원칙:
-- - 중복 방지: `product_listings`에 `source_id + external_id` UNIQUE 제약조건
-- - 원문 저장: 하이브리드 방식 (작은 원문은 DB, 큰 원문은 스토리지 키 참조)
-- =========================================================

-- =========================================================
-- [1] 소스/채널 정의 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS crawl_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code TEXT NOT NULL UNIQUE, -- 'smartstore', 'selfmall' 등
    display_name TEXT NOT NULL, -- 표시명
    base_url TEXT, -- 기본 URL
    rate_limit_per_minute INTEGER DEFAULT 60, -- 분당 요청 제한
    user_agent TEXT, -- 크롤링 시 사용할 User-Agent
    headers JSONB DEFAULT '{}'::jsonb, -- 추가 HTTP 헤더
    parser_config JSONB DEFAULT '{}'::jsonb, -- 파서 설정
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE crawl_sources IS '크롤링 소스/채널 정의 (스마트스토어 등)';
COMMENT ON COLUMN crawl_sources.source_code IS '소스 코드 (유니크, 예: smartstore)';
COMMENT ON COLUMN crawl_sources.rate_limit_per_minute IS '분당 요청 제한 수';
COMMENT ON COLUMN crawl_sources.parser_config IS '파서 설정 (JSON 형식)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_crawl_sources_active 
ON crawl_sources(is_active) WHERE is_active = true;

-- =========================================================
-- [2] 크롤링 Job(배치 단위) 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES crawl_sources(id) ON DELETE RESTRICT,
    job_type TEXT NOT NULL, -- 'search', 'detail', 'price_refresh', 'full_crawl'
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'succeeded', 'failed', 'cancelled'
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    total_targets INTEGER NOT NULL DEFAULT 0, -- 총 대상 수
    success_count INTEGER NOT NULL DEFAULT 0, -- 성공 수
    fail_count INTEGER NOT NULL DEFAULT 0, -- 실패 수
    error_summary TEXT, -- 에러 요약
    metadata JSONB DEFAULT '{}'::jsonb, -- 추가 메타데이터
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT crawl_jobs_status_check CHECK (status IN (
        'queued', 'running', 'succeeded', 'failed', 'cancelled'
    ))
);

COMMENT ON TABLE crawl_jobs IS '크롤링 작업 배치 단위 추적';
COMMENT ON COLUMN crawl_jobs.job_type IS '작업 유형: search(검색), detail(상세), price_refresh(가격 갱신), full_crawl(전체 크롤링)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source_status 
ON crawl_jobs(source_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status 
ON crawl_jobs(status, created_at DESC);

-- =========================================================
-- [3] 크롤링 Request(페이지 단위) 테이블 - 파티션 적용
-- =========================================================

CREATE TABLE IF NOT EXISTS crawl_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'succeeded', 'failed'
    http_status INTEGER, -- HTTP 상태 코드
    response_time_ms INTEGER, -- 응답 시간 (밀리초)
    attempt_count INTEGER NOT NULL DEFAULT 0, -- 시도 횟수
    max_attempts INTEGER NOT NULL DEFAULT 3, -- 최대 시도 횟수
    next_retry_at TIMESTAMPTZ, -- 다음 재시도 시각
    error_code TEXT, -- 에러 코드
    error_message TEXT, -- 에러 메시지
    error_details JSONB, -- 상세 에러 정보
    fetched_at TIMESTAMPTZ, -- 실제 크롤링 완료 시각
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT crawl_requests_status_check CHECK (status IN (
        'queued', 'running', 'succeeded', 'failed'
    )),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE crawl_requests IS '크롤링 요청 단위 추적 (페이지 단위, 파티션 적용)';
COMMENT ON COLUMN crawl_requests.attempt_count IS '현재 시도 횟수';
COMMENT ON COLUMN crawl_requests.next_retry_at IS '다음 재시도 시각 (NULL이면 재시도 안 함)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_crawl_requests_job_status 
ON crawl_requests(job_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_next_retry 
ON crawl_requests(next_retry_at) 
WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_requests_status 
ON crawl_requests(status, created_at DESC);

-- 초기 파티션 생성 (현재 월 + 향후 3개월)
SELECT create_monthly_partition('crawl_requests', 'created_at', 3);

-- =========================================================
-- [4] 원문(Raw) 저장 테이블 - 하이브리드 방식 (DB + 스토리지)
-- =========================================================

CREATE TABLE IF NOT EXISTS raw_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES crawl_requests(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'text/html', 'application/json' 등
    content_text TEXT, -- 작은 원문은 DB에 직접 저장 (10KB 이하 권장)
    storage_key TEXT, -- 큰 원문은 스토리지 키 참조 (예: 's3://bucket/key' 또는 Supabase Storage 경로)
    storage_provider TEXT DEFAULT 'supabase', -- 'supabase', 's3', 'local' 등
    content_hash TEXT NOT NULL, -- 변경 감지/중복 제거용 해시 (SHA256)
    content_size_bytes INTEGER, -- 원문 크기 (바이트)
    is_compressed BOOLEAN DEFAULT false, -- 압축 여부
    compression_type TEXT, -- 'gzip', 'brotli' 등
    metadata JSONB DEFAULT '{}'::jsonb, -- 추가 메타데이터
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- content_text와 storage_key 중 하나는 반드시 있어야 함
    CONSTRAINT raw_documents_content_check CHECK (
        (content_text IS NOT NULL) OR (storage_key IS NOT NULL)
    ),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE raw_documents IS '크롤링 원문 저장 (하이브리드 방식: 작은 원문은 DB, 큰 원문은 스토리지)';
COMMENT ON COLUMN raw_documents.content_text IS '작은 원문 직접 저장 (10KB 이하 권장)';
COMMENT ON COLUMN raw_documents.storage_key IS '큰 원문 스토리지 키 참조 (Supabase Storage 또는 S3)';
COMMENT ON COLUMN raw_documents.content_hash IS '원문 해시 (SHA256, 중복 제거용)';
COMMENT ON COLUMN raw_documents.content_size_bytes IS '원문 크기 (바이트)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_raw_documents_request 
ON raw_documents(request_id);

CREATE INDEX IF NOT EXISTS idx_raw_documents_hash 
ON raw_documents(content_hash);

CREATE INDEX IF NOT EXISTS idx_raw_documents_storage_key 
ON raw_documents(storage_key) 
WHERE storage_key IS NOT NULL;

-- 초기 파티션 생성
SELECT create_monthly_partition('raw_documents', 'created_at', 3);

-- =========================================================
-- [5] 원천 상품 Listing 테이블 - 중복 방지 키 설정
-- =========================================================

CREATE TABLE IF NOT EXISTS product_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES crawl_sources(id) ON DELETE RESTRICT,
    external_id TEXT NOT NULL, -- 소스 상품 ID (소스별 고유 ID)
    product_url TEXT NOT NULL,
    title TEXT,
    brand TEXT,
    seller_name TEXT,
    currency TEXT NOT NULL DEFAULT 'KRW',
    current_price NUMERIC(12, 2), -- 현재 가격 (스냅샷 테이블과 별도로 최신값 유지)
    current_stock_status TEXT, -- 'in_stock', 'out_of_stock', 'unknown'
    image_urls TEXT[], -- 이미지 URL 배열
    description TEXT, -- 상품 설명
    specifications JSONB DEFAULT '{}'::jsonb, -- 상세 스펙
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_crawled_at TIMESTAMPTZ, -- 마지막 크롤링 시각
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 핵심: 중복 방지 키 (source_id + external_id 조합은 유일해야 함)
    CONSTRAINT product_listings_source_external_unique UNIQUE (source_id, external_id)
);

COMMENT ON TABLE product_listings IS '원천 상품 (소스별 상품, source_id + external_id 유니크)';
COMMENT ON COLUMN product_listings.external_id IS '소스별 상품 ID (소스 내에서 고유)';
COMMENT ON COLUMN product_listings.source_id IS '크롤링 소스 ID';
COMMENT ON CONSTRAINT product_listings_source_external_unique ON product_listings IS 
    '중복 방지: 같은 소스에서 같은 external_id는 하나만 존재';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_product_listings_source_active 
ON product_listings(source_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_listings_updated 
ON product_listings(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_listings_external_id 
ON product_listings(external_id);

-- =========================================================
-- [6] Listing 가격/재고 스냅샷 테이블 - 파티션 적용
-- =========================================================

CREATE TABLE IF NOT EXISTS listing_price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    price NUMERIC(12, 2),
    shipping_fee NUMERIC(12, 2),
    stock_status TEXT, -- 'in_stock', 'out_of_stock', 'unknown'
    stock_quantity INTEGER, -- 재고 수량 (있는 경우)
    discount_rate NUMERIC(5, 2), -- 할인율 (%)
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT listing_price_snapshots_stock_status_check CHECK (
        stock_status IN ('in_stock', 'out_of_stock', 'unknown')
    ),
    PRIMARY KEY (id, captured_at)
) PARTITION BY RANGE (captured_at);

COMMENT ON TABLE listing_price_snapshots IS '가격/재고 변동 스냅샷 (시간축 추적, 파티션 적용)';
COMMENT ON COLUMN listing_price_snapshots.captured_at IS '스냅샷 캡처 시각';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_listing_price_listing_time 
ON listing_price_snapshots(listing_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_price_captured 
ON listing_price_snapshots(captured_at DESC);

-- 중복 방지: 동일 listing_id와 captured_at(초 단위) 조합은 하나만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_price_unique_snapshot 
ON listing_price_snapshots(listing_id, DATE_TRUNC('second', captured_at));

-- 초기 파티션 생성
SELECT create_monthly_partition('listing_price_snapshots', 'captured_at', 3);

-- =========================================================
-- [7] 정제 상품 ↔ Listing 매핑 테이블
-- =========================================================

CREATE TABLE IF NOT EXISTS product_listing_map (
    listing_id UUID PRIMARY KEY REFERENCES product_listings(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    match_confidence DECIMAL(3, 2) DEFAULT 1.0, -- 매칭 신뢰도 (0.0-1.0)
    match_method TEXT, -- 'exact', 'fuzzy', 'manual', 'ml' 등
    matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    matched_by TEXT, -- 매칭한 사용자/시스템 (Clerk user ID 또는 'system')
    
    CONSTRAINT product_listing_map_confidence_check CHECK (
        match_confidence >= 0.0 AND match_confidence <= 1.0
    )
);

COMMENT ON TABLE product_listing_map IS '정제 상품 ↔ 원천 상품 매핑 (N:1 관계)';
COMMENT ON COLUMN product_listing_map.match_confidence IS '매칭 신뢰도 (1.0 = 완벽 매칭)';
COMMENT ON COLUMN product_listing_map.match_method IS '매칭 방법: exact(정확), fuzzy(유사), manual(수동), ml(머신러닝)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_product_listing_map_product 
ON product_listing_map(product_id);

CREATE INDEX IF NOT EXISTS idx_product_listing_map_confidence 
ON product_listing_map(match_confidence DESC);

-- =========================================================
-- [8] 원문 저장 전략 결정 함수
-- =========================================================

-- 원문 크기에 따라 DB 저장 또는 스토리지 저장 결정하는 함수
CREATE OR REPLACE FUNCTION decide_raw_storage(
    p_content_text TEXT,
    p_max_db_size_bytes INTEGER DEFAULT 10240 -- 기본값: 10KB
)
RETURNS TABLE(
    should_use_storage BOOLEAN,
    content_size_bytes INTEGER,
    recommendation TEXT
) AS $$
DECLARE
    v_content_size INTEGER;
BEGIN
    -- 텍스트 크기 계산 (UTF-8 기준, 대략적)
    v_content_size := LENGTH(p_content_text);
    
    -- 크기에 따라 저장 전략 결정
    IF v_content_size > p_max_db_size_bytes THEN
        RETURN QUERY SELECT 
            true AS should_use_storage,
            v_content_size AS content_size_bytes,
            'Use external storage (Supabase Storage or S3)' AS recommendation;
    ELSE
        RETURN QUERY SELECT 
            false AS should_use_storage,
            v_content_size AS content_size_bytes,
            'Store directly in database' AS recommendation;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decide_raw_storage IS '원문 크기에 따라 DB 저장 또는 스토리지 저장 결정';

-- =========================================================
-- [9] 원문 해시 생성 함수 (중복 제거용)
-- =========================================================

CREATE OR REPLACE FUNCTION generate_content_hash(p_content TEXT)
RETURNS TEXT AS $$
BEGIN
    -- SHA256 해시 생성 (PostgreSQL의 pgcrypto 확장 사용)
    RETURN encode(digest(p_content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_content_hash IS '원문 내용의 SHA256 해시 생성 (중복 제거용)';

-- =========================================================
-- [10] 트리거: updated_at 자동 업데이트
-- =========================================================

CREATE TRIGGER update_crawl_sources_modtime 
    BEFORE UPDATE ON crawl_sources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crawl_jobs_modtime 
    BEFORE UPDATE ON crawl_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_listings_modtime 
    BEFORE UPDATE ON product_listings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- [11] 초기 데이터: 기본 크롤링 소스
-- =========================================================

INSERT INTO crawl_sources (source_code, display_name, base_url, is_active)
VALUES 
    ('smartstore', '스마트스토어', 'https://smartstore.naver.com', true),
    ('selfmall', '자사몰', NULL, false) -- 향후 추가 예정
ON CONFLICT (source_code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- =========================================================
-- [12] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '크롤링 데이터 관리 테이블 생성 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - crawl_sources: 소스/채널 정의';
  RAISE NOTICE '  - crawl_jobs: 크롤링 작업 배치';
  RAISE NOTICE '  - crawl_requests: 크롤링 요청 (파티션 적용)';
  RAISE NOTICE '  - raw_documents: 원문 저장 (하이브리드 방식, 파티션 적용)';
  RAISE NOTICE '  - product_listings: 원천 상품 (source_id + external_id 유니크)';
  RAISE NOTICE '  - listing_price_snapshots: 가격/재고 스냅샷 (파티션 적용)';
  RAISE NOTICE '  - product_listing_map: 정제 상품 ↔ 원천 상품 매핑';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '핵심 설정:';
  RAISE NOTICE '  ✅ 중복 방지: product_listings (source_id, external_id) UNIQUE';
  RAISE NOTICE '  ✅ 원문 저장: 하이브리드 방식 (작은 원문 DB, 큰 원문 스토리지)';
  RAISE NOTICE '  ✅ 파티션: crawl_requests, raw_documents, listing_price_snapshots';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '유틸리티 함수:';
  RAISE NOTICE '  - decide_raw_storage(): 원문 저장 전략 결정';
  RAISE NOTICE '  - generate_content_hash(): 원문 해시 생성';
  RAISE NOTICE '=========================================================';
END $$;

