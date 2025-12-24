# 데이터베이스 관리 원칙 및 유지보수 가이드

**문서 버전**: 2.0  
**최종 수정일**: 2025-02-21  
**적용 범위**: LinkAble 데이터베이스 전체

---

## 목차

1. [절대 수정 금지 테이블 리스트](#1-절대-수정-금지-테이블-리스트)
2. [제한적 수정 가능 테이블](#2-제한적-수정-가능-테이블)
3. [핵심 원칙](#3-핵심-원칙)
4. [테이블별 상세 설명](#4-테이블별-상세-설명)
5. [안전한 데이터 수정 방법](#5-안전한-데이터-수정-방법)
6. [운영자 체크리스트](#6-운영자-체크리스트)
7. [로그 모니터링 포인트](#7-로그-모니터링-포인트)
8. [비상 상황 대응](#8-비상-상황-대응)
9. [자동 추출 SQL 쿼리](#9-자동-추출-sql-쿼리)

---

## 1. 절대 수정 금지 테이블 리스트

아래 목록은 **Supabase 대시보드에서 직접 INSERT/UPDATE/DELETE를 수행하면 안 되는 테이블**입니다.

이 테이블들은 데이터 무결성, 정산, 추적, 보안의 핵심이므로, 잘못 수정하면 시스템 전체가 영향을 받습니다.

### A. 절대 수정 금지 테이블

| 테이블명 | 왜 절대 금지인가 | 특히 건드리면 바로 사고 나는 필드 |
|---------|----------------|-------------------------------|
| `users` | 인증/권한/포인트의 기준. 잘못 수정하면 계정 연결/권한/정산 모두 깨짐 | `id`, `clerk_id`, `email`, `role`, `points` |
| `consultations` | 상담 세션(업무의 "헤더"). 하위 로그/분석/추천/전환이 모두 연결됨 | `id`, `user_id`, `status` |
| `ippa_activities` | IPPA 활동 평가 원장. 수정하면 평가 결과/통계 신뢰도 붕괴 | `id`, `consultation_id`, `activity_scores` |
| `chat_messages` | 상담 대화 원장(증거/품질/재현 데이터). 삭제/수정 시 분석/분쟁 대응 불가 | `id`, `consultation_id`, `sender`, `message_text` |
| `analysis_results` | AI 분석 결과 원장(재현/감사). 수정하면 추천 근거/통계 신뢰도 붕괴 | `id`, `consultation_id`, `icf_codes` |
| `recommendations` | 추천 결과 원장. 클릭/구매/평가/통계가 연결됨 | `id`, `consultation_id`, `product_id`, `rank` |
| `conversion_events` | 클릭/전환/구매 이벤트 로그(매출/성과 지표의 근거). 수정 금지 | `id`, `event_type`, `recommendation_id`, `product_id`, `purchase_amount`, `metadata` |
| `ippa_evaluations` | 효과성 평가 원장(모델 개선/리포트). 수정하면 KPI 붕괴 | `id`, `user_id`, `product_id`, `recommendation_id`, `activity_scores` |
| `consultation_feedback` | 상담 피드백 원장(품질/CS). 수정하면 지표 왜곡 | `id`, `consultation_id`, `user_id`, `accuracy_rating` |
| `point_transactions` | 포인트 "원장". 여기 손대면 포인트 정산이 영구히 꼬임 | `id`, `user_id`, `points`, `transaction_type`, `reference_id` |
| `user_coupons` | 쿠폰 사용 이력/소진 증거. 수정하면 부정사용/정산 문제 | `id`, `user_id`, `coupon_id`, `used_at`, `expires_at` |
| `icf_code_usage_logs` | ICF 코드 사용 로그(분석 근거/품질). 수정 금지 | `id`, `icf_code`, `consultation_id`, `source`, `context` |
| `icf_code_statistics` | ICF 통계(집계 결과). 직접 수정 금지(재계산으로만 갱신) | `icf_code` (PK), `total_usage_count`, `unique_consultations` |
| `icf_code_expansions` | 코드 확장 히스토리(자동화/품질). 수정 금지 | `id`, `icf_code`, `expanded_at`, `iso_hints` |
| `icf_auto_expand_config` | 자동 확장 설정(시스템 동작을 바꿈). 비개발자 수정 금지 | `enabled`, `threshold`, `updated_by` |
| `notifications` | 사용자 알림 원장(증빙/CS). 수정/삭제하면 분쟁 대응 불가 | `id`, `user_id`, `type`, `message`, `is_read` |

---

## 2. 제한적 수정 가능 테이블

아래 2개 테이블은 운영자가 다루는 경우가 많아 **"제한적 허용"**으로 분류합니다.

### 2.1 products (상품 카탈로그)

**위험도**: 🟡 중간 (제한적 수정 가능)

**허용되는 필드 (필요 시 수정 가능)**:
- ✅ `description`: 상품 설명
- ✅ `image_url`: 상품 이미지 URL
- ✅ `purchase_link`: 구매 링크
- ✅ `price`: 가격
- ✅ `is_active`: 활성화 여부 (비활성화로 삭제 대체)
- ✅ `category`: 카테고리

**절대 금지 필드**:
- ❌ `id`: 상품 고유 식별자 (연결 무결성에 영향)
- ❌ `iso_code`: ISO 코드 (연결 무결성에 영향)
- ❌ 기타 연결 무결성에 영향을 주는 값

**주의사항**:
- ❌ 대량 일괄 수정 금지 (마이그레이션 스크립트 사용)
- ✅ 개별 상품 수정은 허용 (단, PK/FK 필드는 제외)
- ✅ 삭제 대신 `is_active = false` 사용

**안전한 수정 예시**:
```sql
-- ✅ 허용: 개별 상품 정보 수정
UPDATE products
SET description = '새로운 설명',
    price = 50000,
    is_active = true
WHERE id = '상품ID';

-- ❌ 금지: 대량 일괄 수정
UPDATE products SET price = price * 1.1;  -- 마이그레이션 스크립트로 처리해야 함

-- ❌ 금지: PK/FK 수정
UPDATE products SET id = '새ID';  -- 절대 금지
UPDATE products SET iso_code = '새코드';  -- 연결 무결성 파괴
```

### 2.2 coupons (쿠폰 정책)

**위험도**: 🟡 중간 (제한적 수정 가능)

**허용되는 필드**:
- ✅ `name`: 쿠폰 이름
- ✅ `description`: 쿠폰 설명
- ✅ `discount_value`: 할인 금액/비율
- ✅ `valid_from`: 유효 시작일
- ✅ `valid_until`: 유효 종료일
- ✅ `is_active`: 활성화 여부
- ✅ `usage_limit`: 사용 제한 횟수

**절대 금지 필드**:
- ❌ `id`: 쿠폰 고유 식별자
- ❌ `code`: 쿠폰 코드 (시스템에서 생성/관리)
- ❌ `usage_count`: 사용 횟수 (집계/운영 로직으로만 증가해야 함)

**주의사항**:
- ❌ `usage_count`는 직접 수정 금지 (시스템이 자동으로 증가)
- ✅ 쿠폰 정책 변경은 허용 (단, 이미 사용된 쿠폰은 변경 주의)
- ✅ 삭제 대신 `is_active = false` 사용

**안전한 수정 예시**:
```sql
-- ✅ 허용: 쿠폰 정책 수정
UPDATE coupons
SET name = '새로운 쿠폰명',
    discount_value = 10000,
    valid_until = '2025-12-31',
    is_active = true
WHERE id = '쿠폰ID';

-- ❌ 금지: 사용 횟수 직접 수정
UPDATE coupons SET usage_count = 0;  -- 집계 로직으로만 증가해야 함

-- ❌ 금지: 쿠폰 코드 수정
UPDATE coupons SET code = 'NEWCODE';  -- 시스템에서 관리
```

---

## 3. 핵심 원칙

### 2.1 절대 수정 금지 원칙

**다음 4가지 카테고리의 테이블은 운영자가 Supabase 대시보드에서 직접 수정하면 안 됩니다:**

1. **돈 (포인트/전환)**
   - `point_transactions`
   - `user_coupons`
   - `conversion_events`

2. **시간 (상담/메시지)**
   - `consultations`
   - `chat_messages`
   - `notifications`

3. **근거 (AI분석/로그)**
   - `analysis_results`
   - `recommendations`
   - `icf_code_usage_logs`
   - `icf_code_statistics`
   - `icf_code_expansions`
   - `consultation_feedback`
   - `ippa_evaluations`

4. **권한 (users/role)**
   - `users` (특히 `id`, `clerk_id`, `email`, `role`, `points`)

### 2.2 왜 위험한가?

#### 데이터 무결성 파괴
- 외래키 관계가 깨져서 조회 오류 발생
- 통계 집계가 잘못된 결과를 반환
- 정산 데이터가 맞지 않아 재무 문제 발생

#### 추적 불가능
- 로그/원장 데이터가 수정되면 감사(audit) 불가
- 분쟁 발생 시 증거 자료로 사용 불가
- 법적 문제 발생 시 대응 불가

#### 보안 취약
- `users` 테이블의 `role`을 잘못 수정하면 권한 우회 가능
- `clerk_id`를 수정하면 인증 시스템과 불일치 발생

---

## 4. 테이블별 상세 설명

### 3.1 users 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 사용자 고유 식별자. 변경 시 모든 관련 데이터와의 연결이 끊김
- `clerk_id`: Clerk 인증 시스템과의 연결. 변경 시 로그인 불가
- `email`: 인증 및 통신의 기준. 변경 시 계정 복구 불가
- `role`: 권한 관리의 기준. 변경 시 보안 취약 발생
- `points`: 포인트 잔액. 변경 시 정산 오류 발생

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)
- ✅ 애플리케이션을 통한 프로필 정보 수정 (이름, 프로필 이미지 등)

**금지되는 작업**:
- ❌ 대시보드에서 직접 `id`, `clerk_id`, `email`, `role`, `points` 수정
- ❌ 대시보드에서 직접 행 삭제

### 3.2 consultations 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 상담 고유 식별자. 변경 시 하위 데이터 연결 끊김
- `user_id`: 사용자 연결. 변경 시 소유권 문제 발생
- `status`: 상담 상태. 변경 시 워크플로우 오류 발생

**연결된 테이블**:
- `chat_messages` (consultation_id)
- `analysis_results` (consultation_id)
- `recommendations` (consultation_id)
- `consultation_feedback` (consultation_id)

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)
- ✅ 애플리케이션을 통한 상태 변경 (예: 진행 중 → 완료)

**금지되는 작업**:
- ❌ 대시보드에서 직접 `id`, `user_id` 수정
- ❌ 대시보드에서 직접 행 삭제

### 3.3 chat_messages 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 메시지 고유 식별자
- `consultation_id`: 상담 연결
- `sender`: 발신자 정보
- `message_text`: 메시지 내용 (증거 자료)

**위험성**:
- 법적 분쟁 시 증거 자료로 사용됨
- AI 분석의 근거 데이터
- 삭제/수정 시 재현 불가능

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)

**금지되는 작업**:
- ❌ 대시보드에서 직접 수정/삭제
- ❌ 메시지 내용 변경

### 3.4 point_transactions 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 거래 고유 식별자
- `user_id`: 사용자 연결
- `points`: 포인트 변동량
- `transaction_type`: 거래 유형
- `reference_id`: 참조 ID (상담, 추천 등)

**위험성**:
- 포인트 정산의 원장(ledger)
- 수정 시 포인트 잔액 불일치
- 정산 오류로 인한 재무 문제

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)

**금지되는 작업**:
- ❌ 대시보드에서 직접 수정/삭제
- ❌ 포인트 값 변경

### 3.5 conversion_events 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 이벤트 고유 식별자
- `event_type`: 이벤트 유형 (click, purchase 등)
- `recommendation_id`: 추천 연결
- `product_id`: 제품 연결
- `purchase_amount`: 구매 금액
- `metadata`: 추가 메타데이터

**위험성**:
- 매출/성과 지표의 근거 데이터
- 수정 시 KPI 왜곡
- 정산 데이터 불일치

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)

**금지되는 작업**:
- ❌ 대시보드에서 직접 수정/삭제
- ❌ 구매 금액 변경

### 3.6 analysis_results 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 분석 결과 고유 식별자
- `consultation_id`: 상담 연결
- `icf_codes`: ICF 코드 분석 결과

**위험성**:
- AI 추천의 근거 데이터
- 수정 시 추천 신뢰도 붕괴
- 재현 불가능

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)

**금지되는 작업**:
- ❌ 대시보드에서 직접 수정/삭제
- ❌ ICF 코드 변경

### 3.7 recommendations 테이블

**위험도**: 🔴 최고

**절대 수정 금지 필드**:
- `id`: 추천 고유 식별자
- `consultation_id`: 상담 연결
- `product_id`: 제품 연결
- `rank`: 추천 순위

**위험성**:
- 클릭/구매/평가 통계의 기준
- 수정 시 성과 지표 왜곡

**허용되는 작업**:
- ✅ 읽기 전용 조회 (SELECT)

**금지되는 작업**:
- ❌ 대시보드에서 직접 수정/삭제
- ❌ 순위 변경

### 3.8 기타 원장 테이블

#### ippa_evaluations
- 효과성 평가 원장
- 모델 개선 및 리포트의 근거
- 수정 시 KPI 붕괴

#### consultation_feedback
- 상담 피드백 원장
- 품질 관리 및 CS 대응의 근거
- 수정 시 지표 왜곡

#### user_coupons
- 쿠폰 사용 이력
- 부정사용 방지 및 정산의 근거
- 수정 시 정산 문제

#### icf_code_usage_logs
- ICF 코드 사용 로그
- 분석 근거 및 품질 관리
- 수정 금지

#### icf_code_statistics
- ICF 통계 집계 결과
- 직접 수정 금지 (재계산으로만 갱신)

#### icf_code_expansions
- 코드 확장 히스토리
- 자동화 및 품질 관리
- 수정 금지

#### icf_auto_expand_config
- 자동 확장 설정
- 시스템 동작을 바꾸는 설정
- 비개발자 수정 금지

#### notifications
- 사용자 알림 원장
- 증빙 및 CS 대응의 근거
- 수정/삭제 시 분쟁 대응 불가

---

## 5. 안전한 데이터 수정 방법

### 4.1 애플리케이션을 통한 수정

**원칙**: 모든 데이터 수정은 애플리케이션의 API를 통해 수행해야 합니다.

**이유**:
- 비즈니스 로직 검증
- 권한 검증
- 로그 기록
- 데이터 무결성 보장

**예시**:
- ✅ 사용자 프로필 수정: `/api/users/profile` API 사용
- ✅ 상담 상태 변경: `/api/consultations/[id]/status` API 사용
- ❌ Supabase 대시보드에서 직접 `users` 테이블 수정

### 4.2 마이그레이션을 통한 수정

**원칙**: 대량 데이터 수정은 마이그레이션 스크립트로 수행해야 합니다.

**절차**:
1. 마이그레이션 스크립트 작성
2. 개발 환경에서 테스트
3. 코드 리뷰
4. 스테이징 환경에서 검증
5. 프로덕션 적용

**예시**:
```sql
-- ✅ 올바른 방법: 마이그레이션 스크립트
-- supabase/migrations/YYYYMMDDHHMMSS_fix_user_points.sql
UPDATE point_transactions
SET points = points * 1.1
WHERE transaction_type = 'reward'
AND created_at >= '2025-01-01';

-- ❌ 잘못된 방법: 대시보드에서 직접 수정
```

### 4.3 읽기 전용 조회

**원칙**: 대시보드에서 데이터 조회는 허용됩니다.

**허용되는 작업**:
- ✅ SELECT 쿼리 실행
- ✅ 통계 조회
- ✅ 데이터 검증

**주의사항**:
- 개인정보가 포함된 데이터는 조회 시 주의
- 대량 조회는 성능에 영향을 줄 수 있음

---

## 6. 운영자 체크리스트

**작업 전/후 반드시 확인할 10개 항목**

대시보드에서 데이터를 수정하기 전에 반드시 아래 체크리스트를 확인하세요. 이 체크리스트를 따르면 비개발자 운영에서 사고 확률이 크게 줄어듭니다.

### 6.1 작업 전 체크리스트

#### ✅ 1. 작업 대상이 절대 수정 금지 테이블인지 먼저 확인한다

**금지 테이블 목록**:
- `users`, `consultations`, `chat_messages`, `analysis_results`, `recommendations`
- `conversion_events`, `point_transactions`, `user_coupons`
- `icf_*` (모든 ICF 관련 테이블)
- `notifications`, `ippa_activities`, `ippa_evaluations`, `consultation_feedback`

**확인 방법**:
- [ ] 작업 대상 테이블이 위 목록에 있는가?
- [ ] 있다면 즉시 중단하고 개발팀에 문의

#### ✅ 2. 수정 전, 대상 row를 먼저 SELECT로 '범위' 확인한다

**"몇 건이 바뀌는지"를 모르면 대량사고로 직행합니다.**

```sql
-- ✅ 반드시 먼저 실행: 영향받는 행 수 확인
SELECT COUNT(*) 
FROM products 
WHERE category = '보조기기'
AND is_active = true;

-- 확인 후에만 UPDATE 실행
UPDATE products 
SET price = price * 1.1
WHERE category = '보조기기'
AND is_active = true;
```

**확인 사항**:
- [ ] SELECT로 영향받는 행 수를 확인했는가?
- [ ] 예상보다 많은 행이 영향받는가? (있다면 중단)
- [ ] WHERE 조건이 정확한가?

#### ✅ 3. PK/FK는 절대 수정하지 않는다

**금지 필드**:
- `id`, `_id` (user_id, consultation_id, recommendation_id, product_id 등)

**확인 사항**:
- [ ] 수정하려는 필드가 PK(기본키)인가?
- [ ] 수정하려는 필드가 FK(외래키)인가?
- [ ] 하나라도 해당되면 수정 금지

#### ✅ 4. DELETE는 원칙적으로 금지 (특히 로그/원장성 테이블)

**삭제 대신 비활성화를 우선한다.**

**예시**:
- `products.is_active = false` (삭제 대신)
- `coupons.is_active = false` (삭제 대신)

**확인 사항**:
- [ ] DELETE를 실행하려는가?
- [ ] 로그/원장성 테이블인가?
- [ ] `is_active` 같은 비활성화 필드가 있는가?
- [ ] 있다면 DELETE 대신 비활성화 사용

#### ✅ 5. 결제/전환/포인트 값은 '수정'이 아니라 '정정 기록(추가 row)'로 처리한다

**특히 `point_transactions`, `conversion_events`는 덮어쓰기 금지.**

**올바른 방법**:
```sql
-- ✅ 올바른 방법: 정정 기록 추가
INSERT INTO point_transactions (user_id, points, transaction_type, reference_id, notes)
VALUES ('user_id', -100, 'correction', '원래거래ID', '오류 정정');

-- ❌ 잘못된 방법: 기존 거래 수정
UPDATE point_transactions SET points = -100 WHERE id = '거래ID';
```

**확인 사항**:
- [ ] `point_transactions` 또는 `conversion_events`를 수정하려는가?
- [ ] 수정 대신 정정 기록(INSERT)을 추가해야 하는가?

#### ✅ 6. 대시보드에서 대량 UPDATE/INSERT를 하지 않는다

**대량 작업은 반드시 개발자(또는 검증된 SQL 스크립트)로 진행.**

**기준**:
- 10건 이하: 대시보드에서 수정 가능 (단, PK/FK 제외)
- 10건 이상: 마이그레이션 스크립트 필수

**확인 사항**:
- [ ] 영향받는 행이 10건 이상인가?
- [ ] 있다면 개발팀에 마이그레이션 스크립트 작성 요청

#### ✅ 7. 작업 전 "백업/복구 가능 여부"를 확인한다

**Supabase 자동 백업이 있어도 "어떤 시점까지, 어떤 방식으로 복구 가능한지"를 운영자가 알고 있어야 합니다.**

**확인 사항**:
- [ ] 최근 백업이 언제인가?
- [ ] 복구 요청 루트/권한/절차를 알고 있는가?
- [ ] 복구 절차 문서를 확보했는가?

**복구 절차 문서 위치**: [데이터베이스 백업 가이드](./database-backup-guide.md)

### 6.2 작업 후 체크리스트

#### ✅ 8. 작업 후에는 '검증 쿼리'를 실행한다

**예시: 상품 변경 후**

```sql
-- 1. 변경된 레코드 재조회
SELECT id, name, price, is_active, updated_at
FROM products
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- 2. 추천/전환 화면이 정상인지 확인
SELECT COUNT(*) as recent_recommendations
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '1 hour';

SELECT COUNT(*) as recent_clicks
FROM conversion_events
WHERE event_type = 'recommendation_click'
AND created_at >= NOW() - INTERVAL '1 hour';
```

**확인 사항**:
- [ ] 변경된 레코드를 재조회하여 정상인가?
- [ ] 관련 기능(추천/전환)이 정상 작동하는가?
- [ ] 최근 1시간 추천/클릭이 들어오는가?

#### ✅ 9. 로그/지표 모니터링 (주 1회 이상)

**정기적으로 다음 지표를 확인하세요:**

**트래킹/매출 퍼널이 끊겼는지**:
```sql
-- conversion_events에서 최근 1시간 이벤트 건수
SELECT 
  event_type,
  COUNT(*) as count
FROM conversion_events
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY count DESC;
```

**추천 시스템이 멈췄는지**:
```sql
-- recommendations 최근 생성 건수
SELECT COUNT(*) as recent_recommendations
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- is_clicked 전환율
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_clicked = true) as clicked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_clicked = true) / COUNT(*), 2) as ctr
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**AI 분석이 실패하는지**:
```sql
-- analysis_results 최근 생성 건수
SELECT COUNT(*) as recent_analyses
FROM analysis_results
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 상담은 생기는데 분석 결과가 없으면 파이프라인 문제
SELECT 
  c.id as consultation_id,
  c.created_at,
  ar.id as analysis_id
FROM consultations c
LEFT JOIN analysis_results ar ON ar.consultation_id = c.id
WHERE c.created_at >= NOW() - INTERVAL '1 hour'
AND ar.id IS NULL;
```

**어뷰징/오류 조짐**:
```sql
-- point_transactions에서 특정 user_id가 비정상적으로 많은 적립
SELECT 
  user_id,
  COUNT(*) as transaction_count,
  SUM(points) as total_points
FROM point_transactions
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND transaction_type = 'reward'
GROUP BY user_id
HAVING COUNT(*) > 100 OR SUM(points) > 100000
ORDER BY total_points DESC;
```

**확인 사항**:
- [ ] `conversion_events` 이벤트 타입별 건수 변화 (갑자기 0이 되면 트래킹 장애)
- [ ] `recommendations.is_clicked` 비율 (CTR 급락은 UX/링크 장애 신호)
- [ ] `point_transactions` 최근 증가량 (비정상 급증은 어뷰징 신호)

#### ✅ 10. 권한 관련 변경은 절대 대시보드에서 즉흥적으로 하지 않는다

**금지 사항**:
- ❌ `users.role` 직접 변경 금지 (운영 프로세스/관리자 승인 절차 필요)
- ❌ RLS/정책 변경은 개발자 검토 후 배포

**확인 사항**:
- [ ] `users.role`을 변경하려는가?
- [ ] RLS 정책을 변경하려는가?
- [ ] 하나라도 해당되면 개발팀에 문의

---

## 7. 로그 모니터링 포인트

정기적으로 다음 지표들을 모니터링하여 시스템 건강도를 확인하세요.

### 7.1 트래킹/매출 퍼널 모니터링

**목적**: 트래킹/매출 퍼널이 끊겼는지 확인

**확인 쿼리**:
```sql
-- conversion_events에서 최근 1시간 이벤트 타입별 건수
SELECT 
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM conversion_events
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY count DESC;
```

**주요 이벤트 타입**:
- `recommendation_click`: 추천 클릭
- `purchase_link_click`: 구매 링크 클릭
- `purchase_completed`: 구매 완료

**경고 신호**:
- ⚠️ 최근 1시간 동안 이벤트가 0건이면 트래킹 장애 가능
- ⚠️ 특정 이벤트 타입만 0이면 해당 기능 장애 가능

### 7.2 추천 시스템 모니터링

**목적**: 추천 시스템이 멈췄는지 확인

**확인 쿼리**:
```sql
-- 1. recommendations 최근 생성 건수
SELECT COUNT(*) as recent_recommendations
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 2. is_clicked 전환율 (CTR)
SELECT 
  COUNT(*) as total_recommendations,
  COUNT(*) FILTER (WHERE is_clicked = true) as clicked_recommendations,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_clicked = true) / COUNT(*), 2) as click_through_rate
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**경고 신호**:
- ⚠️ 최근 1시간 동안 추천이 0건이면 추천 시스템 장애
- ⚠️ CTR이 급락하면 UX/링크 장애 가능

### 7.3 AI 분석 파이프라인 모니터링

**목적**: AI 분석이 실패하는지 확인

**확인 쿼리**:
```sql
-- 1. analysis_results 최근 생성 건수
SELECT COUNT(*) as recent_analyses
FROM analysis_results
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 2. 상담은 생기는데 분석 결과가 없으면 파이프라인 문제
SELECT 
  c.id as consultation_id,
  c.created_at as consultation_created,
  ar.id as analysis_id,
  ar.created_at as analysis_created
FROM consultations c
LEFT JOIN analysis_results ar ON ar.consultation_id = c.id
WHERE c.created_at >= NOW() - INTERVAL '1 hour'
AND ar.id IS NULL
ORDER BY c.created_at DESC;
```

**경고 신호**:
- ⚠️ 최근 1시간 동안 분석 결과가 0건이면 AI 파이프라인 장애
- ⚠️ 상담은 생기는데 분석 결과가 없으면 파이프라인 문제

### 7.4 어뷰징/오류 탐지

**목적**: 비정상적인 활동 탐지

**확인 쿼리**:
```sql
-- point_transactions에서 특정 user_id가 비정상적으로 많은 적립
SELECT 
  u.email,
  pt.user_id,
  COUNT(*) as transaction_count,
  SUM(pt.points) as total_points,
  MAX(pt.created_at) as last_transaction
FROM point_transactions pt
JOIN users u ON u.id = pt.user_id
WHERE pt.created_at >= NOW() - INTERVAL '24 hours'
AND pt.transaction_type = 'reward'
GROUP BY u.email, pt.user_id
HAVING COUNT(*) > 100 OR SUM(pt.points) > 100000
ORDER BY total_points DESC
LIMIT 20;
```

**경고 신호**:
- ⚠️ 특정 사용자가 24시간 내 100건 이상 거래 또는 100,000 포인트 이상 적립
- ⚠️ 비정상적인 패턴 발견 시 즉시 조사 필요

### 7.5 모니터링 주기

**권장 주기**:
- **일 1회**: 트래킹/매출 퍼널, 추천 시스템
- **주 1회**: AI 분석 파이프라인, 어뷰징 탐지
- **월 1회**: 전체 시스템 종합 점검

**자동화 권장**:
- 위 쿼리들을 스케줄러로 실행하여 대시보드에 표시
- 경고 신호 발생 시 알림 설정

---

## 8. 비상 상황 대응

### 8.1 데이터 오류 발견 시

**절차**:
1. **즉시 중단**: 대시보드에서 추가 수정 중단
2. **영향 범위 파악**: 어떤 데이터가 영향을 받았는지 확인
3. **백업 확인**: 최근 백업 데이터 확인
4. **복구 계획 수립**: 복구 방법 결정
5. **마이그레이션 작성**: 안전한 복구 스크립트 작성
6. **테스트**: 개발 환경에서 테스트
7. **복구 실행**: 프로덕션 환경에서 복구

### 5.2 데이터 복구

**원칙**: 백업에서 복구하거나, 마이그레이션 스크립트로 수정해야 합니다.

**절대 금지**:
- ❌ 대시보드에서 직접 데이터 수정으로 복구 시도
- ❌ 외래키 관계를 무시한 수정

**안전한 복구 방법**:
1. 백업에서 특정 테이블 복구
2. 마이그레이션 스크립트로 데이터 수정
3. 애플리케이션 API를 통한 수정

### 5.3 비상 연락처

**데이터베이스 문제 발생 시**:
- 개발팀에 즉시 연락
- 문제 상황 상세 설명
- 영향 범위 파악 요청

---

## 9. 자동 추출 SQL 쿼리

Supabase SQL Editor에서 실행하면, 현재 DB 스키마 기준으로 "절대 수정 금지" 후보 테이블을 자동으로 추출할 수 있습니다.

### 9.1 전체 테이블 목록 조회

```sql
-- 1) 전체 테이블 목록
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 9.2 "운영자가 건드리면 위험" 후보 추출

**이름 패턴 기반 자동 분류**:

```sql
-- 2) "운영자가 건드리면 위험" 후보(이름 패턴 기반)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND (
  table_name IN (
    'users',
    'consultations',
    'chat_messages',
    'analysis_results',
    'recommendations',
    'conversion_events',
    'point_transactions',
    'user_coupons',
    'ippa_activities',
    'ippa_evaluations',
    'consultation_feedback',
    'notifications'
  )
  OR table_name LIKE '%_logs%'
  OR table_name LIKE '%_events%'
  OR table_name LIKE '%_transactions%'
  OR table_name LIKE '%_statistics%'
  OR table_name LIKE '%_expansions%'
  OR table_name LIKE '%_config%'
  OR table_name LIKE 'icf_%'
)
ORDER BY table_name;
```

**패턴 설명**:
- `%_logs%`: 로그 테이블 (예: `icf_code_usage_logs`)
- `%_events%`: 이벤트 테이블 (예: `conversion_events`)
- `%_transactions%`: 거래 테이블 (예: `point_transactions`)
- `%_statistics%`: 통계 테이블 (예: `icf_code_statistics`)
- `%_expansions%`: 확장 히스토리 테이블 (예: `icf_code_expansions`)
- `%_config%`: 설정 테이블 (예: `icf_auto_expand_config`)
- `icf_%`: ICF 관련 모든 테이블

### 9.3 사용 방법

1. Supabase 대시보드 → SQL Editor 열기
2. 위 쿼리 중 하나를 선택하여 실행
3. 결과를 확인하여 작업 대상 테이블이 "위험 후보"에 포함되는지 확인
4. 포함된다면 작업 중단 및 개발팀에 문의

---

## 10. 참고 문서

- [보안 정책](./security-policy.md)
- [데이터베이스 백업 가이드](./database-backup-guide.md)
- [데이터베이스 정규화 가이드](./database-normalization-guide.md)
- [RLS 활성화 가이드](./rls-activation-guide.md)

---

**문서 승인**

- 작성자: Linkable
- 검토자: [이름]
- 승인자: [이름]
- 최종 승인일: 2025-02-21

---

## 변경 이력

### v2.0 (2025-02-21)
- 제한적 수정 가능 테이블 섹션 추가 (products, coupons)
- 운영자 체크리스트 10개 항목 추가
- 로그 모니터링 포인트 섹션 추가
- 자동 추출 SQL 쿼리 섹션 추가

### v1.0 (2025-02-21)
- 초기 문서 작성
- 절대 수정 금지 테이블 리스트
- 테이블별 상세 설명
- 안전한 데이터 수정 방법
- 비상 상황 대응

