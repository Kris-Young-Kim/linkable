# 마이그레이션 파일 정리 가이드

## 필수 마이그레이션 (반드시 유지)

### 1. 핵심 스키마
- ✅ `20241125000000_initial_schema.sql` - 초기 스키마 (users, consultations, products, chat_messages 등)
- ✅ `20241126100000_create_notifications_table.sql` - 알림 테이블

### 2. 데이터 정규화 (핵심)
- ✅ `20250220000000_normalize_code_tables.sql` - iso_codes, manufacturers, categories 마스터 테이블
- ✅ `20250220000001_normalize_icf_codes.sql` - ICF 코드 정규화
- ✅ `20250120000000_remove_iso_code_column.sql` - iso_code 컬럼 제거 (iso_code_id만 사용)

### 3. 핵심 기능 테이블
- ✅ `20250120000000_create_consultation_feedback.sql` - 상담 피드백
- ✅ `20250121000000_add_points_coupons_incentives.sql` - 포인트/쿠폰 시스템
- ✅ `20250122000000_add_ippa_activities.sql` - K-IPPA 활동
- ✅ `20250210000000_add_purchase_tracking.sql` - 구매 추적
- ✅ `20260110000000_create_icf_iso_mappings.sql` - ICF-ISO 매핑 (핵심)

### 4. 벡터 DB 및 매칭
- ✅ `20250217000000_add_vector_db.sql` - 벡터 검색
- ✅ `20250221000000_add_matching_weight_config.sql` - 매칭 가중치
- ✅ `20250221000001_enhance_vector_db.sql` - 벡터 DB 강화

### 5. 실시간 학습
- ✅ `20250221000002_realtime_learning_system.sql` - 실시간 학습 시스템

### 6. RLS (Row Level Security)
- ✅ `20250218000000_add_rls_policies.sql` - 보안 정책
- ✅ `20250110000000_fix_rls_get_current_user_id.sql` - RLS 함수 수정
- ✅ `20250110000002_fix_consultations_rls_policy.sql` - 상담 RLS 수정
- ✅ `20260110000001_fix_consultations_rls_use_function.sql` - RLS 함수 사용

### 7. 크롤링 시스템
- ✅ `20250226000000_create_crawling_tables.sql` - 크롤링 테이블

### 8. ISO 코드 레벨 수정
- ✅ `20250130000000_fix_iso_code_levels.sql` - ISO 코드 레벨 수정
- ✅ `20250230000000_migrate_products_to_division_level.sql` - Division 레벨로 마이그레이션

---

## 선택적 마이그레이션 (기능에 따라 필요)

### 분석/모니터링 (선택)
- ⚠️ `20250115000000_create_kpi_views.sql` - KPI 뷰 (분석 필요시)
- ⚠️ `20250228000001_add_performance_monitoring_tables.sql` - 성능 모니터링
- ⚠️ `20250228000002_optimize_query_performance.sql` - 쿼리 최적화
- ⚠️ `20250211000000_add_icf_code_usage_tracking.sql` - ICF 사용 추적
- ⚠️ `20250211000001_add_icf_expansions_table.sql` - ICF 확장 (제거됨)

### A/B 테스트 (선택)
- ⚠️ `20250221000004_cta_ab_testing.sql` - CTA A/B 테스트

### 데이터 보관 (선택)
- ⚠️ `20250225000000_add_data_retention_partitioning.sql` - 파티셔닝 (대용량 데이터)

### AI 품질 측정 (선택)
- ⚠️ `20250227000000_add_ai_quality_measurements.sql` - AI 품질 측정

### 제품 기능 (선택)
- ⚠️ `20250302000001_add_product_rating_reviews.sql` - 제품 평점/리뷰
- ⚠️ `20250302000003_create_recommendation_feedback_table.sql` - 추천 피드백
- ⚠️ `20250302000005_create_precomputed_icf_iso_mappings.sql` - 사전 계산 매핑

### 기타 (선택)
- ⚠️ `20250123000000_add_favorite_to_consultations.sql` - 즐겨찾기
- ⚠️ `20250124000000_fix_ippa_participation_rate.sql` - K-IPPA 참여율 수정
- ⚠️ `20250209000000_add_disability_fields_to_consultations.sql` - 장애 필드
- ⚠️ `20250219000000_fix_ambiguous_clerk_id.sql` - Clerk ID 수정
- ⚠️ `20250228000000_add_retry_error_fields.sql` - 재시도 에러 필드
- ⚠️ `20250302000002_add_ippa_reminder_7days_type.sql` - 알림 타입 추가
- ⚠️ `20250302000004_create_backup_logs_table.sql` - 백업 로그
- ⚠️ `20250303000000_activate_realtime_learning_default.sql` - 실시간 학습 기본값
- ⚠️ `20250304000000_remove_duplicate_products.sql` - 중복 제품 제거
- ⚠️ `20250305000000_replace_00_00_with_n999999.sql` - 특수 코드 교체

---

## 불필요한 마이그레이션 (삭제 가능)

### 중복/대체됨
- ❌ `20250302000000_fix_products_iso_code_nullable.sql` - **remove_iso_code_column.sql로 대체됨**
- ❌ `20250220000001_disable_rls_for_development.sql` - **개발용, 프로덕션 불필요**

### 제거 마이그레이션 (이미 적용됨)
- ❌ `20250301000001_remove_icf_expansion_system.sql` - **이미 제거됨, 새 환경에서는 불필요**

---

## 정리 후 예상 파일 수

**필수**: 약 20개
**선택적**: 약 15개
**삭제**: 약 3개

**최종 권장**: 필수 20개 + 선택적 5-10개 = **25-30개**

---

## 삭제 권장 파일 목록

```bash
# 중복/대체됨
rm supabase/migrations/20250302000000_fix_products_iso_code_nullable.sql

# 개발용 (프로덕션 불필요)
rm supabase/migrations/20250220000001_disable_rls_for_development.sql

# 이미 제거된 기능 (새 환경 불필요)
rm supabase/migrations/20250301000001_remove_icf_expansion_system.sql
```

---

## 주의사항

1. **프로덕션 환경**: 이미 적용된 마이그레이션은 삭제하지 마세요
2. **새 환경**: 위 가이드를 따라 필수만 남기고 시작 가능
3. **백업**: 삭제 전 반드시 백업
4. **테스트**: 삭제 후 새 환경에서 테스트 필수
