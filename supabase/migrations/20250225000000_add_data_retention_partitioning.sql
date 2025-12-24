-- =========================================================
-- [LinkAble] 데이터 폭증 테이블 파티션 및 보관 정책 설정
-- Database: PostgreSQL (Supabase)
-- Author: 링커 Team
-- Created: 2025-02-25
-- =========================================================
-- 
-- 목적: 데이터 폭증이 예상되는 테이블에 파티셔닝 및 보관 정책 적용
-- 
-- 대상 테이블:
-- 1. chat_messages - 상담 대화 로그
-- 2. conversion_events - 전환 이벤트 로그
-- 3. icf_code_usage_logs - ICF 코드 사용 로그
-- 4. point_transactions - 포인트 거래 로그
-- 5. notifications - 알림 로그
-- 6. realtime_learning_events - 실시간 학습 이벤트
-- 
-- 파티션 전략:
-- - 월별 RANGE 파티션 (created_at 기준)
-- - 보관 정책: 1년 이상 데이터는 아카이브 또는 삭제
-- - 자동 파티션 생성 함수
-- =========================================================

-- =========================================================
-- [1] 유틸리티 함수: 자동 파티션 생성
-- =========================================================

-- 월별 파티션을 자동으로 생성하는 함수
CREATE OR REPLACE FUNCTION create_monthly_partition(
    parent_table_name TEXT,
    partition_column TEXT DEFAULT 'created_at',
    months_ahead INTEGER DEFAULT 3
)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    current_month DATE;
    i INTEGER;
BEGIN
    -- 현재 월의 첫날부터 시작
    current_month := DATE_TRUNC('month', CURRENT_DATE);
    
    -- 지정된 개월 수만큼 미래 파티션 생성
    FOR i IN 0..months_ahead LOOP
        start_date := current_month + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        partition_name := parent_table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
        
        -- 파티션이 이미 존재하는지 확인
        IF NOT EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                parent_table_name,
                start_date,
                end_date
            );
            
            RAISE NOTICE 'Created partition: % for period: % to %', 
                partition_name, start_date, end_date;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_monthly_partition IS '월별 파티션 자동 생성 함수';

-- =========================================================
-- [2] 유틸리티 함수: 오래된 파티션 삭제
-- =========================================================

-- 지정된 기간 이전의 파티션을 삭제하는 함수
CREATE OR REPLACE FUNCTION drop_old_partitions(
    parent_table_name TEXT,
    retention_months INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
    dropped_count INTEGER := 0;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);
    
    -- 해당 테이블의 모든 파티션 조회
    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE parent_table_name || '_%'
          AND tablename ~ '^' || parent_table_name || '_\d{4}_\d{2}$'
    LOOP
        -- 파티션 이름에서 날짜 추출 (예: chat_messages_2024_01)
        DECLARE
            partition_date DATE;
            date_str TEXT;
        BEGIN
            date_str := substring(partition_record.tablename from '(\d{4}_\d{2})$');
            IF date_str IS NOT NULL THEN
                partition_date := TO_DATE(date_str, 'YYYY_MM');
                
                -- 보관 기간 이전 파티션 삭제
                IF partition_date < cutoff_date THEN
                    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition_record.tablename);
                    dropped_count := dropped_count + 1;
                    RAISE NOTICE 'Dropped old partition: % (date: %)', 
                        partition_record.tablename, partition_date;
                END IF;
            END IF;
        END;
    END LOOP;
    
    RETURN dropped_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION drop_old_partitions IS '보관 기간 이전 파티션 자동 삭제 함수';

-- =========================================================
-- [3] chat_messages 테이블 파티셔닝
-- =========================================================

-- 기존 테이블이 파티션이 아닌 경우, 파티션 테이블로 변환
DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    -- 테이블이 이미 파티션인지 확인
    SELECT EXISTS (
        SELECT 1 FROM pg_inherits 
        WHERE inhrelid = 'chat_messages'::regclass
    ) INTO is_partitioned;
    
    -- 파티션이 아니면 파티션 테이블로 변환
    IF NOT is_partitioned THEN
        -- 임시 테이블 생성 (기존 데이터 백업용)
        CREATE TABLE IF NOT EXISTS chat_messages_backup AS 
        SELECT * FROM chat_messages;
        
        -- 기존 테이블 삭제
        DROP TABLE IF EXISTS chat_messages CASCADE;
        
        -- 파티션 테이블로 재생성
        CREATE TABLE chat_messages (
            id BIGSERIAL,
            consultation_id UUID NOT NULL,
            sequence_number INTEGER NOT NULL,
            sender VARCHAR(20) NOT NULL,
            message_text TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            CONSTRAINT fk_chat_consultation FOREIGN KEY (consultation_id) 
                REFERENCES consultations(id) ON DELETE CASCADE,
            CONSTRAINT chat_sender_check CHECK (sender IN ('user', 'ai', 'system')),
            CONSTRAINT chat_messages_consultation_sequence_unique 
                UNIQUE (consultation_id, sequence_number),
            CONSTRAINT chat_sequence_positive CHECK (sequence_number > 0),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
        
        -- 백업 데이터 복원
        INSERT INTO chat_messages 
        SELECT * FROM chat_messages_backup;
        
        DROP TABLE chat_messages_backup;
        
        RAISE NOTICE 'Converted chat_messages to partitioned table';
    END IF;
END $$;

-- 인덱스 재생성 (파티션 키 포함)
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_id 
ON chat_messages(consultation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_sequence 
ON chat_messages(consultation_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
ON chat_messages(created_at);

-- 초기 파티션 생성 (현재 월 + 향후 3개월)
SELECT create_monthly_partition('chat_messages', 'created_at', 3);

COMMENT ON TABLE chat_messages IS '상담 상세 대화 로그 (월별 파티션, 1년 보관)';

-- =========================================================
-- [4] conversion_events 테이블 파티셔닝
-- =========================================================

DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_inherits 
        WHERE inhrelid = 'conversion_events'::regclass
    ) INTO is_partitioned;
    
    IF NOT is_partitioned THEN
        CREATE TABLE IF NOT EXISTS conversion_events_backup AS 
        SELECT * FROM conversion_events;
        
        DROP TABLE IF EXISTS conversion_events CASCADE;
        
        CREATE TABLE conversion_events (
            id UUID DEFAULT gen_random_uuid(),
            user_id UUID,
            event_type VARCHAR(50) NOT NULL,
            source VARCHAR(50),
            recommendation_id UUID,
            product_id UUID,
            consultation_id UUID,
            purchase_amount DECIMAL(10, 2),
            commission_amount DECIMAL(10, 2),
            purchase_date TIMESTAMP WITH TIME ZONE,
            tracking_source VARCHAR(50),
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            CONSTRAINT fk_conversion_user FOREIGN KEY (user_id) 
                REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT fk_conversion_recommendation FOREIGN KEY (recommendation_id) 
                REFERENCES recommendations(id) ON DELETE SET NULL,
            CONSTRAINT fk_conversion_product FOREIGN KEY (product_id) 
                REFERENCES products(id) ON DELETE SET NULL,
            CONSTRAINT fk_conversion_consultation FOREIGN KEY (consultation_id) 
                REFERENCES consultations(id) ON DELETE SET NULL,
            CONSTRAINT conversion_events_event_type_check CHECK (event_type IN (
                'recommendation_click', 'purchase_link_click', 'support_program_click',
                'expert_inquiry_click', 'ippa_evaluation_submit', 
                'consultation_feedback_submit', 'coupon_redeemed', 'purchase_completed'
            )),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
        
        INSERT INTO conversion_events 
        SELECT * FROM conversion_events_backup;
        
        DROP TABLE conversion_events_backup;
        
        RAISE NOTICE 'Converted conversion_events to partitioned table';
    END IF;
END $$;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id 
ON conversion_events(user_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_type 
ON conversion_events(event_type);

CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at 
ON conversion_events(created_at);

CREATE INDEX IF NOT EXISTS idx_conversion_events_recommendation_id 
ON conversion_events(recommendation_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_purchase_completed 
ON conversion_events(event_type, purchase_date) 
WHERE event_type = 'purchase_completed';

SELECT create_monthly_partition('conversion_events', 'created_at', 3);

COMMENT ON TABLE conversion_events IS '전환 이벤트 로깅 (월별 파티션, 1년 보관)';

-- =========================================================
-- [5] icf_code_usage_logs 테이블 파티셔닝
-- =========================================================

DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_inherits 
        WHERE inhrelid = 'icf_code_usage_logs'::regclass
    ) INTO is_partitioned;
    
    IF NOT is_partitioned THEN
        CREATE TABLE IF NOT EXISTS icf_code_usage_logs_backup AS 
        SELECT * FROM icf_code_usage_logs;
        
        DROP TABLE IF EXISTS icf_code_usage_logs CASCADE;
        
        CREATE TABLE icf_code_usage_logs (
            id UUID DEFAULT gen_random_uuid(),
            icf_code TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
            is_in_core_set BOOLEAN NOT NULL DEFAULT false,
            consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
            source TEXT NOT NULL CHECK (source IN (
                'chat_analysis', 'keyword_inference', 'semantic_match', 'manual_input'
            )),
            context JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
        
        INSERT INTO icf_code_usage_logs 
        SELECT * FROM icf_code_usage_logs_backup;
        
        DROP TABLE icf_code_usage_logs_backup;
        
        RAISE NOTICE 'Converted icf_code_usage_logs to partitioned table';
    END IF;
END $$;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_code 
ON icf_code_usage_logs(icf_code);

CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_category 
ON icf_code_usage_logs(category);

CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_core_set 
ON icf_code_usage_logs(is_in_core_set);

CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_created_at 
ON icf_code_usage_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_icf_code_usage_logs_consultation 
ON icf_code_usage_logs(consultation_id);

-- 트리거 재생성 (통계 업데이트)
DROP TRIGGER IF EXISTS trigger_update_icf_code_statistics ON icf_code_usage_logs;
CREATE TRIGGER trigger_update_icf_code_statistics
AFTER INSERT ON icf_code_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_icf_code_statistics();

SELECT create_monthly_partition('icf_code_usage_logs', 'created_at', 3);

COMMENT ON TABLE icf_code_usage_logs IS 'ICF 코드 사용 로그 (월별 파티션, 1년 보관)';

-- =========================================================
-- [6] point_transactions 테이블 파티셔닝
-- =========================================================

DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_inherits 
        WHERE inhrelid = 'point_transactions'::regclass
    ) INTO is_partitioned;
    
    IF NOT is_partitioned THEN
        CREATE TABLE IF NOT EXISTS point_transactions_backup AS 
        SELECT * FROM point_transactions;
        
        DROP TABLE IF EXISTS point_transactions CASCADE;
        
        CREATE TABLE point_transactions (
            id UUID DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            points INTEGER NOT NULL,
            transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
                'earned_ippa_evaluation', 'earned_recommendation_click',
                'earned_consultation_complete', 'earned_feedback_submit',
                'redeemed_coupon', 'admin_adjustment'
            )),
            description TEXT,
            reference_id UUID,
            reference_type VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            CONSTRAINT fk_point_transaction_user FOREIGN KEY (user_id) 
                REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
        
        INSERT INTO point_transactions 
        SELECT * FROM point_transactions_backup;
        
        DROP TABLE point_transactions_backup;
        
        RAISE NOTICE 'Converted point_transactions to partitioned table';
    END IF;
END $$;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id 
ON point_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_type 
ON point_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at 
ON point_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_point_transactions_reference 
ON point_transactions(reference_type, reference_id);

-- 트리거 재생성 (포인트 자동 업데이트)
DROP TRIGGER IF EXISTS trigger_update_user_points ON point_transactions;
CREATE TRIGGER trigger_update_user_points
AFTER INSERT ON point_transactions
FOR EACH ROW
EXECUTE FUNCTION update_user_points();

SELECT create_monthly_partition('point_transactions', 'created_at', 3);

COMMENT ON TABLE point_transactions IS '포인트 거래 이력 (월별 파티션, 1년 보관)';

-- =========================================================
-- [7] notifications 테이블 파티셔닝
-- =========================================================

DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_inherits 
        WHERE inhrelid = 'notifications'::regclass
    ) INTO is_partitioned;
    
    IF NOT is_partitioned THEN
        CREATE TABLE IF NOT EXISTS notifications_backup AS 
        SELECT * FROM notifications;
        
        DROP TABLE IF EXISTS notifications CASCADE;
        
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT,
            link_url TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now(),
            read_at TIMESTAMPTZ,
            metadata JSONB,
            
            CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) 
                REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
        
        INSERT INTO notifications 
        SELECT * FROM notifications_backup;
        
        DROP TABLE notifications_backup;
        
        RAISE NOTICE 'Converted notifications to partitioned table';
    END IF;
END $$;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at);

SELECT create_monthly_partition('notifications', 'created_at', 3);

COMMENT ON TABLE notifications IS '사용자 알림 (월별 파티션, 1년 보관)';

-- =========================================================
-- [8] realtime_learning_events 테이블 파티셔닝 (있는 경우)
-- =========================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    is_partitioned BOOLEAN;
BEGIN
    -- 테이블 존재 여부 확인
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'realtime_learning_events'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT 1 FROM pg_inherits 
            WHERE inhrelid = 'realtime_learning_events'::regclass
        ) INTO is_partitioned;
        
        IF NOT is_partitioned THEN
            CREATE TABLE IF NOT EXISTS realtime_learning_events_backup AS 
            SELECT * FROM realtime_learning_events;
            
            DROP TABLE IF EXISTS realtime_learning_events CASCADE;
            
            CREATE TABLE realtime_learning_events (
                id UUID DEFAULT gen_random_uuid(),
                event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
                    'impression', 'click', 'purchase', 'feedback'
                )),
                consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
                recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
                icf_codes TEXT[] NOT NULL,
                icf_codes_key TEXT NOT NULL,
                iso_code VARCHAR(50) NOT NULL,
                feedback_rating INTEGER CHECK (
                    feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5)
                ),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (id, created_at)
            ) PARTITION BY RANGE (created_at);
            
            INSERT INTO realtime_learning_events 
            SELECT * FROM realtime_learning_events_backup;
            
            DROP TABLE realtime_learning_events_backup;
            
            RAISE NOTICE 'Converted realtime_learning_events to partitioned table';
        END IF;
        
        -- 인덱스 재생성
        CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_key 
        ON realtime_learning_events(icf_codes_key, iso_code);
        
        CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_created 
        ON realtime_learning_events(created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_type 
        ON realtime_learning_events(event_type);
        
        SELECT create_monthly_partition('realtime_learning_events', 'created_at', 3);
        
        COMMENT ON TABLE realtime_learning_events IS '실시간 학습 이벤트 로그 (월별 파티션, 1년 보관)';
    END IF;
END $$;

-- =========================================================
-- [9] 자동 파티션 생성 스케줄러 함수
-- =========================================================

-- 매월 자동으로 다음 달 파티션을 생성하는 함수
CREATE OR REPLACE FUNCTION auto_create_partitions()
RETURNS VOID AS $$
BEGIN
    -- 모든 파티션 테이블에 대해 다음 달 파티션 생성
    PERFORM create_monthly_partition('chat_messages', 'created_at', 1);
    PERFORM create_monthly_partition('conversion_events', 'created_at', 1);
    PERFORM create_monthly_partition('icf_code_usage_logs', 'created_at', 1);
    PERFORM create_monthly_partition('point_transactions', 'created_at', 1);
    PERFORM create_monthly_partition('notifications', 'created_at', 1);
    
    -- realtime_learning_events가 존재하는 경우
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'realtime_learning_events'
    ) THEN
        PERFORM create_monthly_partition('realtime_learning_events', 'created_at', 1);
    END IF;
    
    RAISE NOTICE 'Auto-created partitions for all partitioned tables';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_partitions IS '모든 파티션 테이블에 대해 자동으로 다음 달 파티션 생성';

-- =========================================================
-- [10] 보관 정책 적용 함수
-- =========================================================

-- 모든 파티션 테이블에 대해 보관 정책 적용
CREATE OR REPLACE FUNCTION apply_retention_policy(retention_months INTEGER DEFAULT 12)
RETURNS TABLE(table_name TEXT, dropped_partitions INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'chat_messages'::TEXT,
        drop_old_partitions('chat_messages', retention_months)
    UNION ALL
    SELECT 
        'conversion_events'::TEXT,
        drop_old_partitions('conversion_events', retention_months)
    UNION ALL
    SELECT 
        'icf_code_usage_logs'::TEXT,
        drop_old_partitions('icf_code_usage_logs', retention_months)
    UNION ALL
    SELECT 
        'point_transactions'::TEXT,
        drop_old_partitions('point_transactions', retention_months)
    UNION ALL
    SELECT 
        'notifications'::TEXT,
        drop_old_partitions('notifications', retention_months);
    
    -- realtime_learning_events가 존재하는 경우
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'realtime_learning_events'
    ) THEN
        RETURN QUERY
        SELECT 
            'realtime_learning_events'::TEXT,
            drop_old_partitions('realtime_learning_events', retention_months);
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_retention_policy IS '모든 파티션 테이블에 보관 정책 적용 (기본 12개월)';

-- =========================================================
-- [11] 파티션 상태 모니터링 뷰
-- =========================================================

CREATE OR REPLACE VIEW v_partition_status AS
SELECT 
    schemaname,
    tablename AS partition_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_stat_get_live_tuples(c.oid) AS row_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND tablename ~ '^(chat_messages|conversion_events|icf_code_usage_logs|point_transactions|notifications|realtime_learning_events)_\d{4}_\d{2}$'
ORDER BY tablename;

COMMENT ON VIEW v_partition_status IS '파티션별 크기 및 행 수 모니터링 뷰';

-- =========================================================
-- [12] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '데이터 폭증 테이블 파티션 및 보관 정책 설정 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '파티션 적용 테이블:';
  RAISE NOTICE '  - chat_messages (월별 파티션, 1년 보관)';
  RAISE NOTICE '  - conversion_events (월별 파티션, 1년 보관)';
  RAISE NOTICE '  - icf_code_usage_logs (월별 파티션, 1년 보관)';
  RAISE NOTICE '  - point_transactions (월별 파티션, 1년 보관)';
  RAISE NOTICE '  - notifications (월별 파티션, 1년 보관)';
  RAISE NOTICE '  - realtime_learning_events (월별 파티션, 1년 보관)';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '유틸리티 함수:';
  RAISE NOTICE '  - create_monthly_partition(): 월별 파티션 생성';
  RAISE NOTICE '  - drop_old_partitions(): 오래된 파티션 삭제';
  RAISE NOTICE '  - auto_create_partitions(): 자동 파티션 생성';
  RAISE NOTICE '  - apply_retention_policy(): 보관 정책 적용';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '모니터링:';
  RAISE NOTICE '  - SELECT * FROM v_partition_status; (파티션 상태 확인)';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '권장 스케줄:';
  RAISE NOTICE '  - 매월 1일: auto_create_partitions() 실행';
  RAISE NOTICE '  - 분기별: apply_retention_policy(12) 실행';
  RAISE NOTICE '=========================================================';
END $$;

