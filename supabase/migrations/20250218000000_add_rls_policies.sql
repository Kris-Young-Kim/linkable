-- =========================================================
-- [LinkAble] RLS (Row Level Security) 정책
-- Database: PostgreSQL (Supabase)
-- Version: 1.0
-- Generated: 2025-02-18
-- =========================================================
-- 
-- 주의사항:
-- 1. Clerk 인증을 사용하므로, auth.uid() 대신 커스텀 함수를 사용합니다.
-- 2. Service Role Key를 사용하는 API 엔드포인트는 RLS를 우회합니다.
-- 3. RLS를 완전히 활용하려면 클라이언트 측 인증으로 전환하거나,
--    API에서 사용자 컨텍스트를 명시적으로 전달해야 합니다.
-- =========================================================

-- =========================================================
-- [1] 헬퍼 함수 생성
-- =========================================================

-- Clerk ID를 기반으로 현재 사용자 ID를 가져오는 함수
-- JWT 커스텀 클레임에서 clerk_id를 추출하거나, 
-- 직접 전달된 clerk_id로 users 테이블에서 user_id를 조회
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  v_clerk_id TEXT;
  v_user_id UUID;
BEGIN
  -- JWT 커스텀 클레임에서 clerk_id 추출 시도
  -- (Supabase Auth JWT에 clerk_id를 커스텀 클레임으로 추가한 경우)
  BEGIN
    v_clerk_id := current_setting('request.jwt.claims', true)::json->>'clerk_id';
  EXCEPTION
    WHEN OTHERS THEN
      v_clerk_id := NULL;
  END;

  -- clerk_id가 없으면 NULL 반환
  IF v_clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- users 테이블에서 user_id 조회 (SECURITY DEFINER로 RLS 우회)
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.clerk_id = v_clerk_id
  LIMIT 1;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_id() IS 'Clerk ID를 기반으로 현재 사용자의 UUID를 반환 (RLS 정책용)';

-- 현재 사용자의 역할을 가져오는 함수
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_clerk_id TEXT;
  v_user_role TEXT;
BEGIN
  -- JWT 커스텀 클레임에서 clerk_id 추출
  BEGIN
    v_clerk_id := current_setting('request.jwt.claims', true)::json->>'clerk_id';
  EXCEPTION
    WHEN OTHERS THEN
      v_clerk_id := NULL;
  END;

  IF v_clerk_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- users 테이블에서 role 조회 (SECURITY DEFINER로 RLS 우회)
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.clerk_id = v_clerk_id
  LIMIT 1;

  RETURN v_user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_role() IS '현재 사용자의 역할을 반환 (admin, manager, user)';

-- 관리자 또는 전문가인지 확인하는 함수
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_current_user_role();
  RETURN user_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin_or_manager() IS '현재 사용자가 관리자 또는 전문가인지 확인';

-- =========================================================
-- [2] Users 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 정보만 조회 가능
CREATE POLICY "users_select_own"
ON users
FOR SELECT
USING (id = get_current_user_id());

-- 정책 2: 사용자는 자신의 정보만 수정 가능 (role 제외)
CREATE POLICY "users_update_own"
ON users
FOR UPDATE
USING (id = get_current_user_id())
WITH CHECK (
  id = get_current_user_id() AND
  -- role은 변경 불가 (관리자만 변경 가능)
  role = (SELECT role FROM users WHERE id = get_current_user_id())
);

-- 정책 3: 관리자는 모든 사용자 조회 가능
CREATE POLICY "users_select_admin"
ON users
FOR SELECT
USING (is_admin_or_manager());

-- 정책 4: 관리자는 모든 사용자 수정 가능
CREATE POLICY "users_update_admin"
ON users
FOR UPDATE
USING (is_admin_or_manager());

-- 정책 5: 인증된 사용자는 자신의 레코드 생성 가능 (회원가입 시)
CREATE POLICY "users_insert_own"
ON users
FOR INSERT
WITH CHECK (
  -- clerk_id가 JWT 클레임과 일치하는 경우만 허용
  clerk_id = current_setting('request.jwt.claims', true)::json->>'clerk_id'
);

-- =========================================================
-- [3] Consultations 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 상담만 조회 가능
CREATE POLICY "consultations_select_own"
ON consultations
FOR SELECT
USING (user_id = get_current_user_id());

-- 정책 2: 사용자는 자신의 상담만 생성 가능
CREATE POLICY "consultations_insert_own"
ON consultations
FOR INSERT
WITH CHECK (user_id = get_current_user_id());

-- 정책 3: 사용자는 자신의 상담만 수정 가능
CREATE POLICY "consultations_update_own"
ON consultations
FOR UPDATE
USING (user_id = get_current_user_id())
WITH CHECK (user_id = get_current_user_id());

-- 정책 4: 사용자는 자신의 상담만 삭제 가능
CREATE POLICY "consultations_delete_own"
ON consultations
FOR DELETE
USING (user_id = get_current_user_id());

-- 정책 5: 관리자는 모든 상담 조회 가능
CREATE POLICY "consultations_select_admin"
ON consultations
FOR SELECT
USING (is_admin_or_manager());

-- =========================================================
-- [4] Chat Messages 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 상담 메시지만 조회 가능
CREATE POLICY "chat_messages_select_own"
ON chat_messages
FOR SELECT
USING (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
);

-- 정책 2: 사용자는 자신의 상담에 메시지 생성 가능
CREATE POLICY "chat_messages_insert_own"
ON chat_messages
FOR INSERT
WITH CHECK (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
);

-- 정책 3: 관리자는 모든 메시지 조회 가능
CREATE POLICY "chat_messages_select_admin"
ON chat_messages
FOR SELECT
USING (is_admin_or_manager());

-- =========================================================
-- [5] Analysis Results 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 상담 분석 결과만 조회 가능
CREATE POLICY "analysis_results_select_own"
ON analysis_results
FOR SELECT
USING (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
);

-- 정책 2: 사용자는 자신의 상담에 분석 결과 생성 가능
CREATE POLICY "analysis_results_insert_own"
ON analysis_results
FOR INSERT
WITH CHECK (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
);

-- 정책 3: 관리자는 모든 분석 결과 조회 가능
CREATE POLICY "analysis_results_select_admin"
ON analysis_results
FOR SELECT
USING (is_admin_or_manager());

-- =========================================================
-- [6] Recommendations 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 상담 추천만 조회 가능
CREATE POLICY "recommendations_select_own"
ON recommendations
FOR SELECT
USING (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
);

-- 정책 2: 사용자는 자신의 상담 추천만 수정 가능 (클릭, 구매 상태 등)
CREATE POLICY "recommendations_update_own"
ON recommendations
FOR UPDATE
USING (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
)
WITH CHECK (
  consultation_id IN (
    SELECT id FROM consultations WHERE user_id = get_current_user_id()
  )
);

-- 정책 3: 관리자는 모든 추천 조회 가능
CREATE POLICY "recommendations_select_admin"
ON recommendations
FOR SELECT
USING (is_admin_or_manager());

-- =========================================================
-- [7] IPPA Evaluations 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 평가만 조회 가능
CREATE POLICY "ippa_evaluations_select_own"
ON ippa_evaluations
FOR SELECT
USING (user_id = get_current_user_id());

-- 정책 2: 사용자는 자신의 평가만 생성 가능
CREATE POLICY "ippa_evaluations_insert_own"
ON ippa_evaluations
FOR INSERT
WITH CHECK (user_id = get_current_user_id());

-- 정책 3: 사용자는 자신의 평가만 수정 가능
CREATE POLICY "ippa_evaluations_update_own"
ON ippa_evaluations
FOR UPDATE
USING (user_id = get_current_user_id())
WITH CHECK (user_id = get_current_user_id());

-- 정책 4: 관리자는 모든 평가 조회 가능
CREATE POLICY "ippa_evaluations_select_admin"
ON ippa_evaluations
FOR SELECT
USING (is_admin_or_manager());

-- =========================================================
-- [8] Notifications 테이블 RLS 정책
-- =========================================================

-- 정책 1: 사용자는 자신의 알림만 조회 가능
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
USING (user_id = get_current_user_id());

-- 정책 2: 사용자는 자신의 알림만 수정 가능 (읽음 상태 등)
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
USING (user_id = get_current_user_id())
WITH CHECK (user_id = get_current_user_id());

-- 정책 3: 관리자는 모든 알림 생성 가능 (시스템 알림 등)
CREATE POLICY "notifications_insert_admin"
ON notifications
FOR INSERT
WITH CHECK (is_admin_or_manager());

-- =========================================================
-- [9] Consultation Feedback 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'consultation_feedback'
  ) THEN
    -- 정책 1: 사용자는 자신의 피드백만 조회 가능
    DROP POLICY IF EXISTS "consultation_feedback_select_own" ON consultation_feedback;
    CREATE POLICY "consultation_feedback_select_own"
    ON consultation_feedback
    FOR SELECT
    USING (user_id = get_current_user_id());

    -- 정책 2: 사용자는 자신의 상담에 피드백 생성 가능
    DROP POLICY IF EXISTS "consultation_feedback_insert_own" ON consultation_feedback;
    CREATE POLICY "consultation_feedback_insert_own"
    ON consultation_feedback
    FOR INSERT
    WITH CHECK (
      user_id = get_current_user_id() AND
      consultation_id IN (
        SELECT id FROM consultations WHERE user_id = get_current_user_id()
      )
    );

    -- 정책 3: 관리자는 모든 피드백 조회 가능
    DROP POLICY IF EXISTS "consultation_feedback_select_admin" ON consultation_feedback;
    CREATE POLICY "consultation_feedback_select_admin"
    ON consultation_feedback
    FOR SELECT
    USING (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'consultation_feedback 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [10] Point Transactions 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'point_transactions'
  ) THEN
    -- 정책 1: 사용자는 자신의 포인트 거래만 조회 가능
    DROP POLICY IF EXISTS "point_transactions_select_own" ON point_transactions;
    CREATE POLICY "point_transactions_select_own"
    ON point_transactions
    FOR SELECT
    USING (user_id = get_current_user_id());

    -- 정책 2: 관리자는 모든 포인트 거래 조회 및 생성 가능
    DROP POLICY IF EXISTS "point_transactions_admin" ON point_transactions;
    CREATE POLICY "point_transactions_admin"
    ON point_transactions
    FOR ALL
    USING (is_admin_or_manager())
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'point_transactions 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [11] User Coupons 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_coupons'
  ) THEN
    -- 정책 1: 사용자는 자신의 쿠폰만 조회 가능
    DROP POLICY IF EXISTS "user_coupons_select_own" ON user_coupons;
    CREATE POLICY "user_coupons_select_own"
    ON user_coupons
    FOR SELECT
    USING (user_id = get_current_user_id());

    -- 정책 2: 사용자는 자신의 쿠폰만 수정 가능 (사용 상태 등)
    DROP POLICY IF EXISTS "user_coupons_update_own" ON user_coupons;
    CREATE POLICY "user_coupons_update_own"
    ON user_coupons
    FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

    -- 정책 3: 관리자는 모든 쿠폰 조회 및 생성 가능
    DROP POLICY IF EXISTS "user_coupons_admin" ON user_coupons;
    CREATE POLICY "user_coupons_admin"
    ON user_coupons
    FOR ALL
    USING (is_admin_or_manager())
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'user_coupons 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [12] Conversion Events 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversion_events'
  ) THEN
    -- 정책 1: 사용자는 자신의 전환 이벤트만 조회 가능
    DROP POLICY IF EXISTS "conversion_events_select_own" ON conversion_events;
    CREATE POLICY "conversion_events_select_own"
    ON conversion_events
    FOR SELECT
    USING (user_id = get_current_user_id() OR user_id IS NULL);

    -- 정책 2: 시스템은 모든 전환 이벤트 생성 가능 (user_id가 NULL일 수 있음)
    -- Service Role Key를 사용하는 경우 이 정책은 필요 없음
    DROP POLICY IF EXISTS "conversion_events_insert_system" ON conversion_events;
    CREATE POLICY "conversion_events_insert_system"
    ON conversion_events
    FOR INSERT
    WITH CHECK (true);

    -- 정책 3: 관리자는 모든 전환 이벤트 조회 가능
    DROP POLICY IF EXISTS "conversion_events_select_admin" ON conversion_events;
    CREATE POLICY "conversion_events_select_admin"
    ON conversion_events
    FOR SELECT
    USING (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'conversion_events 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [13] ICF Code Usage Logs 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'icf_code_usage_logs'
  ) THEN
    -- 정책 1: 사용자는 자신의 상담에서 사용된 ICF 코드 로그만 조회 가능
    DROP POLICY IF EXISTS "icf_code_usage_logs_select_own" ON icf_code_usage_logs;
    CREATE POLICY "icf_code_usage_logs_select_own"
    ON icf_code_usage_logs
    FOR SELECT
    USING (
      consultation_id IS NULL OR
      consultation_id IN (
        SELECT id FROM consultations WHERE user_id = get_current_user_id()
      )
    );

    -- 정책 2: 시스템은 모든 ICF 코드 로그 생성 가능
    DROP POLICY IF EXISTS "icf_code_usage_logs_insert_system" ON icf_code_usage_logs;
    CREATE POLICY "icf_code_usage_logs_insert_system"
    ON icf_code_usage_logs
    FOR INSERT
    WITH CHECK (true);

    -- 정책 3: 관리자는 모든 ICF 코드 로그 조회 가능
    DROP POLICY IF EXISTS "icf_code_usage_logs_select_admin" ON icf_code_usage_logs;
    CREATE POLICY "icf_code_usage_logs_select_admin"
    ON icf_code_usage_logs
    FOR SELECT
    USING (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'icf_code_usage_logs 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [14] Products 테이블 RLS 정책 (공개 데이터)
-- =========================================================

-- 정책 1: 모든 인증된 사용자는 활성화된 상품 조회 가능
CREATE POLICY "products_select_active"
ON products
FOR SELECT
USING (
  is_active = true AND
  get_current_user_id() IS NOT NULL
);

-- 정책 2: 관리자는 모든 상품 조회 및 수정 가능
CREATE POLICY "products_admin"
ON products
FOR ALL
USING (is_admin_or_manager())
WITH CHECK (is_admin_or_manager());

-- =========================================================
-- [15] Coupons 테이블 RLS 정책 (공개 데이터)
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'coupons'
  ) THEN
    -- 정책 1: 모든 인증된 사용자는 활성화된 쿠폰 조회 가능
    DROP POLICY IF EXISTS "coupons_select_active" ON coupons;
    CREATE POLICY "coupons_select_active"
    ON coupons
    FOR SELECT
    USING (
      is_active = true AND
      get_current_user_id() IS NOT NULL
    );

    -- 정책 2: 관리자는 모든 쿠폰 조회 및 수정 가능
    DROP POLICY IF EXISTS "coupons_admin" ON coupons;
    CREATE POLICY "coupons_admin"
    ON coupons
    FOR ALL
    USING (is_admin_or_manager())
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'coupons 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [16] ICF Code Statistics 테이블 RLS 정책 (읽기 전용)
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'icf_code_statistics'
  ) THEN
    -- 정책 1: 모든 인증된 사용자는 통계 조회 가능
    DROP POLICY IF EXISTS "icf_code_statistics_select_all" ON icf_code_statistics;
    CREATE POLICY "icf_code_statistics_select_all"
    ON icf_code_statistics
    FOR SELECT
    USING (get_current_user_id() IS NOT NULL);

    -- 정책 2: 관리자는 통계 수정 가능 (트리거를 통한 자동 업데이트는 Service Role 사용)
    DROP POLICY IF EXISTS "icf_code_statistics_admin" ON icf_code_statistics;
    CREATE POLICY "icf_code_statistics_admin"
    ON icf_code_statistics
    FOR UPDATE
    USING (is_admin_or_manager())
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'icf_code_statistics 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [17] ICF Code Expansions 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'icf_code_expansions'
  ) THEN
    -- 정책 1: 모든 인증된 사용자는 확장 이벤트 조회 가능
    DROP POLICY IF EXISTS "icf_code_expansions_select_all" ON icf_code_expansions;
    CREATE POLICY "icf_code_expansions_select_all"
    ON icf_code_expansions
    FOR SELECT
    USING (get_current_user_id() IS NOT NULL);

    -- 정책 2: 관리자만 확장 이벤트 생성 가능
    DROP POLICY IF EXISTS "icf_code_expansions_insert_admin" ON icf_code_expansions;
    CREATE POLICY "icf_code_expansions_insert_admin"
    ON icf_code_expansions
    FOR INSERT
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'icf_code_expansions 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [18] ICF Auto Expand Config 테이블 RLS 정책
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'icf_auto_expand_config'
  ) THEN
    -- 정책 1: 관리자만 설정 조회 및 수정 가능
    DROP POLICY IF EXISTS "icf_auto_expand_config_admin" ON icf_auto_expand_config;
    CREATE POLICY "icf_auto_expand_config_admin"
    ON icf_auto_expand_config
    FOR ALL
    USING (is_admin_or_manager())
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'icf_auto_expand_config 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [19] ICF ISO Embeddings 테이블 RLS 정책 (벡터 DB)
-- =========================================================

-- 테이블이 존재하는 경우에만 정책 생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'icf_iso_embeddings'
  ) THEN
    -- 정책 1: 모든 인증된 사용자는 임베딩 조회 가능 (시맨틱 매칭용)
    DROP POLICY IF EXISTS "icf_iso_embeddings_select_all" ON icf_iso_embeddings;
    CREATE POLICY "icf_iso_embeddings_select_all"
    ON icf_iso_embeddings
    FOR SELECT
    USING (get_current_user_id() IS NOT NULL);

    -- 정책 2: 관리자만 임베딩 생성 및 수정 가능
    DROP POLICY IF EXISTS "icf_iso_embeddings_admin" ON icf_iso_embeddings;
    CREATE POLICY "icf_iso_embeddings_admin"
    ON icf_iso_embeddings
    FOR ALL
    USING (is_admin_or_manager())
    WITH CHECK (is_admin_or_manager());
  ELSE
    RAISE NOTICE 'icf_iso_embeddings 테이블이 존재하지 않아 정책 생성을 건너뜁니다.';
  END IF;
END $$;

-- =========================================================
-- [20] RLS 활성화
-- =========================================================

-- 모든 테이블에 RLS 활성화 (테이블이 존재하는 경우에만)
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_enable TEXT[] := ARRAY[
    'users', 'consultations', 'chat_messages', 'analysis_results', 
    'recommendations', 'ippa_evaluations', 'notifications', 
    'consultation_feedback', 'point_transactions', 'user_coupons', 
    'conversion_events', 'icf_code_usage_logs', 'products', 'coupons', 
    'icf_code_statistics', 'icf_code_expansions', 'icf_auto_expand_config', 
    'icf_iso_embeddings'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_enable
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND information_schema.tables.table_name = tbl_name
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
      RAISE NOTICE 'RLS 활성화: %', tbl_name;
    ELSE
      RAISE NOTICE '테이블이 존재하지 않아 RLS 활성화 건너뜀: %', tbl_name;
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- [21] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'LinkAble RLS 정책 생성 및 활성화 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '활성화된 테이블:';
  RAISE NOTICE '  - users, consultations, chat_messages';
  RAISE NOTICE '  - analysis_results, recommendations, ippa_evaluations';
  RAISE NOTICE '  - notifications, consultation_feedback';
  RAISE NOTICE '  - point_transactions, user_coupons, conversion_events';
  RAISE NOTICE '  - icf_code_usage_logs, products, coupons';
  RAISE NOTICE '  - icf_code_statistics, icf_code_expansions';
  RAISE NOTICE '  - icf_auto_expand_config, icf_iso_embeddings';
  RAISE NOTICE '';
  RAISE NOTICE '중요 사항:';
  RAISE NOTICE '  1. Clerk 인증을 사용하므로, JWT 커스텀 클레임에';
  RAISE NOTICE '     clerk_id를 추가해야 합니다.';
  RAISE NOTICE '  2. Service Role Key를 사용하는 API는 RLS를 우회합니다.';
  RAISE NOTICE '     RLS를 완전히 활용하려면 클라이언트 측 인증으로';
  RAISE NOTICE '     전환하거나, API에서 사용자 컨텍스트를 명시적으로';
  RAISE NOTICE '     전달해야 합니다.';
  RAISE NOTICE '  3. 헬퍼 함수 (get_current_user_id, get_current_user_role)';
  RAISE NOTICE '     는 JWT 클레임에서 clerk_id를 읽습니다.';
  RAISE NOTICE '=========================================================';
END $$;

