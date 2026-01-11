-- =========================================================
-- [LinkAble] 누락된 RLS 정책 추가
-- Database: PostgreSQL (Supabase)
-- Created: 2026-01-11
-- =========================================================
--
-- 목적: RLS가 활성화되었으나 정책이 없는 13개 테이블에 정책 추가
-- 테이블: analysis_results, chat_messages, consultation_feedback, 
--        consultation_icf_codes, icf_code_statistics, icf_code_usage_logs,
--        icf_codes, ippa_evaluations, iso_codes, manufacturers, 
--        recommendations, users
-- =========================================================

-- =========================================================
-- [1] Users 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 정보만 조회/수정 가능, 관리자는 모든 사용자 접근 가능

-- SELECT: 자신의 정보만 조회
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  TO authenticated
  USING (id = get_current_user_id());

-- SELECT: 관리자는 모든 사용자 조회
CREATE POLICY "users_select_admin" ON users
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 인증된 사용자는 자신의 레코드 생성 가능 (회원가입)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clerk_id = current_setting('request.jwt.claims', true)::json->>'clerk_id'
    OR clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- UPDATE: 자신의 정보만 수정 (role 제외)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = get_current_user_id())
  WITH CHECK (
    id = get_current_user_id() AND
    -- role은 변경 불가 (관리자만 변경 가능)
    role = (SELECT role FROM users WHERE id = get_current_user_id())
  );

-- UPDATE: 관리자는 모든 사용자 수정 가능
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager());

-- =========================================================
-- [2] Analysis Results 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 상담 분석 결과만 조회 가능

-- SELECT: 자신의 상담 분석 결과만 조회
CREATE POLICY "analysis_results_select_own" ON analysis_results
  FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- SELECT: 관리자는 모든 분석 결과 조회
CREATE POLICY "analysis_results_select_admin" ON analysis_results
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 자신의 상담 분석 결과만 생성 (서버 사이드에서만)
CREATE POLICY "analysis_results_insert_own" ON analysis_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- UPDATE: 자신의 상담 분석 결과만 수정
CREATE POLICY "analysis_results_update_own" ON analysis_results
  FOR UPDATE
  TO authenticated
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

-- =========================================================
-- [3] Chat Messages 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 상담 메시지만 조회/생성 가능

-- SELECT: 자신의 상담 메시지만 조회
CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- SELECT: 관리자는 모든 메시지 조회
CREATE POLICY "chat_messages_select_admin" ON chat_messages
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 자신의 상담 메시지만 생성
CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- UPDATE: 메시지는 수정 불가 (일반적으로)
-- DELETE: 메시지는 삭제 불가 (일반적으로)

-- =========================================================
-- [4] Consultation Feedback 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 상담 피드백만 조회/생성/수정 가능

-- SELECT: 자신의 상담 피드백만 조회
CREATE POLICY "consultation_feedback_select_own" ON consultation_feedback
  FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- SELECT: 관리자는 모든 피드백 조회
CREATE POLICY "consultation_feedback_select_admin" ON consultation_feedback
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 자신의 상담 피드백만 생성
CREATE POLICY "consultation_feedback_insert_own" ON consultation_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = get_current_user_id() AND
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- UPDATE: 자신의 피드백만 수정
CREATE POLICY "consultation_feedback_update_own" ON consultation_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- =========================================================
-- [5] Consultation ICF Codes 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 상담 ICF 코드만 조회 가능

-- SELECT: 자신의 상담 ICF 코드만 조회
CREATE POLICY "consultation_icf_codes_select_own" ON consultation_icf_codes
  FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- SELECT: 관리자는 모든 ICF 코드 조회
CREATE POLICY "consultation_icf_codes_select_admin" ON consultation_icf_codes
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 자신의 상담 ICF 코드만 생성 (서버 사이드에서만)
CREATE POLICY "consultation_icf_codes_insert_own" ON consultation_icf_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- =========================================================
-- [6] ICF Codes 테이블 RLS 정책
-- =========================================================
-- ICF 코드는 공개 읽기 가능 (마스터 데이터)

-- SELECT: 모든 인증된 사용자가 조회 가능
CREATE POLICY "icf_codes_select_all" ON icf_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- INSERT/UPDATE/DELETE: 관리자만 가능
CREATE POLICY "icf_codes_modify_admin" ON icf_codes
  FOR ALL
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- =========================================================
-- [7] ISO Codes 테이블 RLS 정책
-- =========================================================
-- ISO 코드는 공개 읽기 가능 (마스터 데이터)

-- SELECT: 모든 인증된 사용자가 조회 가능
CREATE POLICY "iso_codes_select_all" ON iso_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- INSERT/UPDATE/DELETE: 관리자만 가능
CREATE POLICY "iso_codes_modify_admin" ON iso_codes
  FOR ALL
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- =========================================================
-- [8] Manufacturers 테이블 RLS 정책
-- =========================================================
-- 제조사는 공개 읽기 가능 (마스터 데이터)

-- SELECT: 모든 인증된 사용자가 조회 가능
CREATE POLICY "manufacturers_select_all" ON manufacturers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- INSERT/UPDATE/DELETE: 관리자만 가능
CREATE POLICY "manufacturers_modify_admin" ON manufacturers
  FOR ALL
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- =========================================================
-- [9] Recommendations 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 상담 추천만 조회 가능

-- SELECT: 자신의 상담 추천만 조회
CREATE POLICY "recommendations_select_own" ON recommendations
  FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- SELECT: 관리자는 모든 추천 조회
CREATE POLICY "recommendations_select_admin" ON recommendations
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 자신의 상담 추천만 생성 (서버 사이드에서만)
CREATE POLICY "recommendations_insert_own" ON recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- UPDATE: 자신의 추천만 수정 (클릭, 구매 완료 등)
CREATE POLICY "recommendations_update_own" ON recommendations
  FOR UPDATE
  TO authenticated
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

-- =========================================================
-- [10] IPPA Evaluations 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 평가만 조회/생성/수정 가능

-- SELECT: 자신의 평가만 조회
CREATE POLICY "ippa_evaluations_select_own" ON ippa_evaluations
  FOR SELECT
  TO authenticated
  USING (user_id = get_current_user_id());

-- SELECT: 관리자는 모든 평가 조회
CREATE POLICY "ippa_evaluations_select_admin" ON ippa_evaluations
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 자신의 평가만 생성
CREATE POLICY "ippa_evaluations_insert_own" ON ippa_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = get_current_user_id());

-- UPDATE: 자신의 평가만 수정
CREATE POLICY "ippa_evaluations_update_own" ON ippa_evaluations
  FOR UPDATE
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- DELETE: 자신의 평가만 삭제
CREATE POLICY "ippa_evaluations_delete_own" ON ippa_evaluations
  FOR DELETE
  TO authenticated
  USING (user_id = get_current_user_id());

-- =========================================================
-- [11] ICF Code Usage Logs 테이블 RLS 정책
-- =========================================================
-- 사용자는 자신의 상담 로그만 조회 가능, 관리자는 모든 로그 조회

-- SELECT: 자신의 상담 로그만 조회
CREATE POLICY "icf_code_usage_logs_select_own" ON icf_code_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    consultation_id IS NULL OR
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = get_current_user_id()
    )
  );

-- SELECT: 관리자는 모든 로그 조회
CREATE POLICY "icf_code_usage_logs_select_admin" ON icf_code_usage_logs
  FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- INSERT: 서버 사이드에서만 생성 (일반 사용자는 직접 생성 불가)
CREATE POLICY "icf_code_usage_logs_insert_system" ON icf_code_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- 서버 사이드에서만 사용하므로 제한 없음

-- =========================================================
-- [12] ICF Code Statistics 테이블 RLS 정책
-- =========================================================
-- 통계 데이터는 공개 읽기 가능 (집계된 데이터)

-- SELECT: 모든 인증된 사용자가 조회 가능
CREATE POLICY "icf_code_statistics_select_all" ON icf_code_statistics
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: 관리자만 가능 (통계는 시스템이 자동 생성)
CREATE POLICY "icf_code_statistics_modify_admin" ON icf_code_statistics
  FOR ALL
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- =========================================================
-- 정책 생성 완료 메시지
-- =========================================================
DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'RLS 정책 생성 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '추가된 정책:';
  RAISE NOTICE '  - users: 5개 정책';
  RAISE NOTICE '  - analysis_results: 4개 정책';
  RAISE NOTICE '  - chat_messages: 2개 정책';
  RAISE NOTICE '  - consultation_feedback: 4개 정책';
  RAISE NOTICE '  - consultation_icf_codes: 3개 정책';
  RAISE NOTICE '  - icf_codes: 2개 정책';
  RAISE NOTICE '  - iso_codes: 2개 정책';
  RAISE NOTICE '  - manufacturers: 2개 정책';
  RAISE NOTICE '  - recommendations: 4개 정책';
  RAISE NOTICE '  - ippa_evaluations: 5개 정책';
  RAISE NOTICE '  - icf_code_usage_logs: 3개 정책';
  RAISE NOTICE '  - icf_code_statistics: 2개 정책';
  RAISE NOTICE '=========================================================';
END $$;
