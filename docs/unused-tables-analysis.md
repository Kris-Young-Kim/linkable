# 사용하지 않는 테이블 분석 및 삭제 추천

**작성일**: 2025-01-XX  
**분석 범위**: Supabase public 스키마의 모든 테이블

---

## 분석 결과 요약

현재 데이터베이스의 모든 테이블을 코드베이스에서 검색한 결과, **실제로 사용되지 않는 테이블은 없습니다.**

모든 테이블이 다음 중 하나 이상의 이유로 필요합니다:
1. ✅ 실제 코드에서 사용 중
2. ✅ FK 제약조건으로 참조됨 (구조적 필요)
3. ✅ 정규화 구조의 일부
4. ✅ 향후 사용 예정 (크롤링 시스템 등)

---

## 테이블별 상세 분석

### ✅ 사용 중인 테이블 (삭제 불가)

#### 핵심 운영 테이블
- `users` (9 rows) - 인증/권한 시스템
- `consultations` (82 rows) - 상담 세션
- `chat_messages` (240 rows) - 대화 로그
- `products` (1543 rows) - 상품 마스터
- `recommendations` (131 rows) - 추천 결과
- `analysis_results` (23 rows) - AI 분석 결과
- `conversion_events` (4 rows) - 전환 이벤트
- `point_transactions` (4 rows) - 포인트 거래
- `notifications` (9 rows) - 알림
- `consultation_feedback` (2 rows) - 피드백
- `ippa_evaluations` (0 rows) - **코드에서 사용 중** (`app/api/ippa/route.ts`)

#### 코드 마스터 테이블
- `iso_codes` (917 rows) - ISO 9999 코드
- `icf_codes` (850 rows) - ICF 코드
- `icf_code_usage_logs` (853 rows) - ICF 사용 로그
- `icf_code_statistics` (61 rows) - ICF 통계
- `icf_iso_mappings` (118 rows) - ICF-ISO 매핑

#### 인센티브 시스템
- `coupons` (0 rows) - **코드에서 사용 중** (`lib/incentives.ts`, `app/api/incentives/coupons/route.ts`)
- `user_coupons` (0 rows) - **코드에서 사용 중** (`lib/incentives.ts`)

#### 정규화 구조
- `consultation_icf_codes` (0 rows) - **정규화 구조의 일부**, 향후 사용 예정
- `manufacturers` (0 rows) - **FK로 참조됨** (`products.manufacturer_id`)
- `categories` (0 rows) - **FK로 참조됨** (`products.category_id`)

#### 크롤링 시스템
- `crawl_sources` - **코드에서 사용 중** (`app/api/admin/products/crawl/webhook/route.ts`)
- `product_listings` - **코드에서 사용 중** (`app/api/admin/products/crawl/webhook/route.ts`)
- `listing_price_snapshots` - **코드에서 사용 중** (`app/api/admin/products/crawl/webhook/route.ts`)
- `crawl_jobs` - 향후 사용 예정 (크롤링 작업 추적)
- `crawl_requests` - 향후 사용 예정 (크롤링 요청 추적)
- `raw_documents` - 향후 사용 예정 (원문 저장)
- `product_listing_map` - 향후 사용 예정 (매핑)

#### 실시간 학습
- `realtime_learning_configs` (1 row) - **코드에서 사용 중** (`app/api/admin/realtime-learning/route.ts`, `lib/realtime-learning.ts`)

#### 성능 모니터링
- `performance_web_vitals` (1073 rows) - 성능 메트릭

---

## 빈 테이블이지만 필요한 이유

### 1. `manufacturers` (0 rows)
- **필요 이유**: `products.manufacturer_id` FK로 참조됨
- **상태**: 정규화 구조의 일부, 향후 제조사 데이터 입력 예정
- **삭제 가능 여부**: ❌ 불가 (FK 제약조건 위반)

### 2. `categories` (0 rows)
- **필요 이유**: `products.category_id` FK로 참조됨
- **상태**: 정규화 구조의 일부, 향후 카테고리 데이터 입력 예정
- **삭제 가능 여부**: ❌ 불가 (FK 제약조건 위반)

### 3. `coupons` (0 rows)
- **필요 이유**: 인센티브 시스템에서 사용 중
- **상태**: 코드에서 활발히 사용 (`lib/incentives.ts`)
- **삭제 가능 여부**: ❌ 불가 (코드에서 사용 중)

### 4. `user_coupons` (0 rows)
- **필요 이유**: 인센티브 시스템에서 사용 중
- **상태**: 코드에서 활발히 사용 (`lib/incentives.ts`)
- **삭제 가능 여부**: ❌ 불가 (코드에서 사용 중)

### 5. `consultation_icf_codes` (0 rows)
- **필요 이유**: 정규화 구조의 일부
- **상태**: ICF 코드 정규화를 위한 관계 테이블
- **삭제 가능 여부**: ❌ 불가 (정규화 구조 필요)

### 6. `ippa_evaluations` (0 rows)
- **필요 이유**: K-IPPA 평가 시스템에서 사용 중
- **상태**: 코드에서 활발히 사용 (`app/api/ippa/route.ts`)
- **삭제 가능 여부**: ❌ 불가 (코드에서 사용 중)

---

## 크롤링 관련 테이블 상태

크롤링 시스템은 현재 부분적으로 구현되어 있습니다:

### ✅ 구현 완료 및 사용 중
- `crawl_sources` - webhook에서 사용
- `product_listings` - webhook에서 사용
- `listing_price_snapshots` - webhook에서 사용

### 🔄 향후 사용 예정 (마이그레이션 존재)
- `crawl_jobs` - 크롤링 작업 추적
- `crawl_requests` - 크롤링 요청 추적
- `raw_documents` - 원문 저장
- `product_listing_map` - 매핑

**삭제 권장**: ❌ **삭제하지 않음** (향후 사용 예정, 마이그레이션 파일 존재)

---

## 최종 결론

### 삭제 가능한 테이블: **없음**

모든 테이블이 다음 중 하나 이상의 이유로 필요합니다:
1. 실제 코드에서 사용 중
2. FK 제약조건으로 참조됨
3. 정규화 구조의 일부
4. 향후 사용 예정

### 권장 사항

1. **빈 테이블 유지**: 
   - `manufacturers`, `categories`는 정규화 구조의 일부이므로 유지
   - 향후 데이터 입력 시 사용 예정

2. **크롤링 테이블 유지**:
   - 크롤링 시스템이 부분적으로 구현되어 있음
   - 향후 확장 시 필요

3. **정규화 구조 유지**:
   - `consultation_icf_codes`는 정규화 구조의 일부
   - 향후 ICF 코드 분석 시 필요

---

## 참고 자료

- [데이터베이스 정규화 가이드](./database-normalization-guide.md)
- [데이터베이스 관리 가이드](./database-maintenance-guide.md)
- [크롤링 데이터 관리 가이드](./비개발자-데이터관리-가이드.md)
