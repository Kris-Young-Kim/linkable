# LinkAble 1개월 MVP Roadmap

문서 참고: `docs/DIR.md`, `docs/Mermaid.md`, `docs/Read.md`, `docs/MRD.md`, `docs/PRD.md`, `docs/TRD.md`

## 목차

1. [최근 완료된 작업](#최근-완료된-작업)
2. [핵심 기능 흐름](#핵심-기능-흐름)
3. [사용자 여정](#사용자-여정)
4. [Phase 1 — Foundation & 환경 구축](#phase-1--foundation--환경-구축)
5. [데이터베이스 관리 원칙](#데이터베이스-관리-원칙)
6. [Phase 2 — Assessment 엔진](#phase-2--assessment-엔진)
7. [Phase 3 — Matching & UX](#phase-3--matching--ux)
8. [Phase 4 — Validation & 하드닝](#phase-4--validation--하드닝)
9. [Phase 4.5 — ICF 코드 확장 전략](#phase-45--icf-코드-확장-전략)
10. [Phase 4.6 — 매칭 정확도 개선](#phase-46--매칭-정확도-개선)
11. [Phase 4.7 — RLS 정책 활성화 및 Clerk JWT 통합](#phase-47--rls-정책-활성화-및-clerk-jwt-통합)
12. [Phase 5 — 프론트엔드 완성도 향상](#phase-5--프론트엔드-완성도-향상)
13. [Post-MVP 전략](#post-mvp-전략)

---

## 최근 완료된 작업

> **참고**: 상세한 완료 내역은 각 Phase 섹션을 참고하세요.

### 2025-02-27: AI 품질 측정 결과 저장 및 점수 반영 시스템

- ✅ `ai_quality_measurements` 테이블 생성 및 점수 계산 함수 구현
- ✅ 측정 스크립트 DB 저장 기능 추가
- ✅ API에서 계산된 점수 반환

### 2025-02-21: 데이터베이스 관리 원칙 수립

- ✅ 데이터베이스 관리 원칙 및 정규화 가이드 문서화
- ✅ 비개발자 데이터 관리 가이드 작성

### 2025-02-20: 피드백 데이터 분석 시스템 구축

- ✅ 피드백 분석 API 및 관리자 대시보드 UI
- ✅ 종합 매칭 품질 점수 계산 시스템

### 2025-02-19: 성능 최적화 및 측정 시스템 구축

- ✅ 성능 최적화 (이미지 프리로딩, 코드 스플리팅, API 응답 최적화)
- ✅ 전환율 측정 시스템 및 AI 매칭 품질 측정 시스템 구축

---

## 핵심 기능 흐름 (Core Flow)

```
사용자 활동 문제 입력 (채팅)
       ↓
ICF 분류 추출 (신체기능 b, 활동 d, 참여 p, 환경요소 e)
       ↓
ISO 9999 보조기기 분류 매칭
       ↓
유통업체/제휴몰 상품 연결 (아웃링크)
```

**구현 상태:**

- ✅ Phase 2: 사용자 입력 → ICF 추출 (완료)
- ✅ Phase 3: ISO 매칭 → 추천 생성 (완료)
- ⚠️ Phase 3: 유통업체/제휴몰 상품 연결 (부분 완료 - 아웃링크 구현됨, 상품 데이터 수집/동기화 필요)

---

## 사용자 여정 (User Journey)

### 일반 사용자 여정

```
홈페이지 (/)
    ↓
채팅 시작 (/chat)
    ↓
AI 상담 (텍스트/음성/이미지 입력)
    ↓
ICF 분석 완료 → 추천 자동 생성
    ↓
추천 페이지 (/recommendations/[consultationId])
    ↓
[선택적] 기초선 평가 (/dashboard/ippa/baseline/[consultationId])
    ↓
상품 선택 및 구매 (아웃링크)
    ↓
[14일 후] K-IPPA 사후 평가 알림
    ↓
K-IPPA 사후 평가 제출 (/dashboard/ippa/[recommendationId])
```

### 사용자 대시보드 ("내 상담")

- **목적**: 개인 상담 이력 확인 및 이어서 진행
- **기능**:
  - 상담 이력 리스트 (최근 10개)
  - 각 상담 카드 클릭 시 상세 페이지로 이동 (`/consultation/[id]`)
  - K-IPPA 평가 대상 추천 표시
  - 개인 효과성 대시보드 (EffectivenessDashboard)
- **제외된 기능**: 전체 플랫폼 통계 (관리자 전용)

### 관리자 여정

```
관리자 로그인 (role: admin 또는 expert)
    ↓
관리자 대시보드 (/admin/dashboard)
    ↓
- 전체 플랫폼 통계 확인
- 사용자별 종합 데이터 확인
  * 사용자 이름, 이메일, 역할
  * 상담 수, 추천 수, K-IPPA 평가 수
  * 평균 효과성 점수 및 점수 변화 추이
  * 포인트 현황
```

---

## Phase 1 — Foundation & 환경 구축 (Week 1)

- [x] `DIR.md` 구조대로 디렉터리 생성 및 정리 (`core/assessment`, `core/matching`, `core/validation` 등).
- [x] Next.js 15 + Tailwind v4 설정 확인 (`next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`).
- [x] 공통 유틸 세팅: `lib/utils.ts`, `lib/translations.ts`, 테마/언어 Provider 초기화.
- [x] 환경 변수 템플릿(`.env.example`)에 Clerk/Supabase/Gemini 키 정의.
- [x] Supabase 스키마(`docs/Linkable-MVP.sql`)를 기준으로 테이블/관계 점검, RLS 비활성 확인.
- [x] Logging 기본 정책 수립: 핵심 이벤트용 헬퍼 함수 또는 최소 `console.log` 위치 정의.
- [x] **데이터베이스 관리 원칙 수립**:
  - [x] 절대 수정 금지 테이블 리스트 정의 (`docs/database-maintenance-guide.md`)
  - [x] 제한적 수정 가능 테이블 정의 (products, coupons)
  - [x] 정규화 원칙 수립 (배열 데이터 사용 금지, 1:N 관계 사용)
  - [x] 운영자 체크리스트 작성 (`docs/비개발자-데이터관리-가이드.md`)
  - [x] 안전한 데이터 수정 방법 가이드 작성

### Deliverables

- 정리된 폴더 구조
- 동작하는 Next.js dev 환경
- `.env.example`, 기본 로그 가이드

---

## 데이터베이스 관리 원칙

**참고 문서**: `docs/database-maintenance-guide.md`, `docs/database-normalization-guide.md`, `docs/비개발자-데이터관리-가이드.md`

### 핵심 원칙

#### 1. 절대 수정 금지 테이블

다음 테이블들은 **Supabase 대시보드에서 절대 수정하면 안 됩니다**:

**돈 (포인트/전환)**:

- `point_transactions` - 포인트 원장
- `user_coupons` - 쿠폰 사용 이력
- `conversion_events` - 클릭/전환/구매 이벤트 로그

**시간 (상담/메시지)**:

- `consultations` - 상담 세션 헤더
- `chat_messages` - 상담 대화 원장
- `notifications` - 사용자 알림 원장

**근거 (AI분석/로그)**:

- `analysis_results` - AI 분석 결과 원장
- `recommendations` - 추천 결과 원장
- `icf_code_usage_logs` - ICF 코드 사용 로그
- `icf_code_statistics` - ICF 통계 (재계산으로만 갱신)
- `icf_code_expansions` - 코드 확장 히스토리
- `consultation_feedback` - 상담 피드백 원장
- `ippa_evaluations` - 효과성 평가 원장

**권한 (users/role)**:

- `users` - 특히 `id`, `clerk_id`, `email`, `role`, `points` 필드

**위험성**:

- 데이터 무결성 파괴 (외래키 관계 깨짐)
- 추적 불가능 (감사/증거 자료 손실)
- 보안 취약 (권한 우회 가능)

#### 2. 제한적 수정 가능 테이블

**products (상품 카탈로그)**:

- ✅ 허용: `description`, `image_url`, `purchase_link`, `price`, `is_active`, `category`
- ❌ 금지: `id`, `iso_code` (PK/FK 필드)
- ⚠️ 주의: 대량 일괄 수정 금지 (10건 이상은 마이그레이션 스크립트 필수)

**coupons (쿠폰 정책)**:

- ✅ 허용: `name`, `description`, `discount_value`, `valid_from`, `valid_until`, `is_active`, `usage_limit`
- ❌ 금지: `id`, `code`, `usage_count` (시스템에서 관리)

#### 3. 정규화 원칙

**핵심 원칙**: 배열 데이터(JSONB, ARRAY)는 사용하지 않고, 별도 테이블을 만들어 1:N 관계로 관리합니다.

**정규화된 구조**:

- ✅ `icf_codes` + `consultation_icf_codes` (1:N 관계)
- ✅ `iso_codes` + `products.iso_code_id` (FK 관계)
- ✅ `manufacturers` + `products.manufacturer_id` (FK 관계)
- ✅ `categories` + `products.category_id` (FK 관계)

**정규화 필요 영역** (우선순위 HIGH):

- `consultations.ippa_activities` (JSONB) → `consultation_ippa_activities` 테이블
- `ippa_evaluations.activity_scores` (JSONB) → `ippa_evaluation_activity_scores` 테이블
- `analysis_results.icf_codes` (JSONB) → `analysis_icf_codes` 테이블 (이미 `consultation_icf_codes` 존재)

#### 4. 안전한 데이터 수정 방법

**원칙**:

1. **애플리케이션을 통한 수정**: 모든 데이터 수정은 API를 통해 수행
2. **마이그레이션을 통한 수정**: 대량 데이터 수정은 마이그레이션 스크립트로 수행
3. **읽기 전용 조회**: 대시보드에서 데이터 조회는 허용

**절차**:

- 10건 이하: 대시보드에서 수정 가능 (단, PK/FK 제외)
- 10건 이상: 마이그레이션 스크립트 필수
- DELETE 대신 `is_active = false` 사용
- 포인트/전환 값은 수정 대신 정정 기록(INSERT) 추가

#### 5. 운영자 체크리스트 (작업 전)

1. ✅ 작업 대상이 절대 수정 금지 테이블인지 확인
2. ✅ 수정 전, 대상 row를 먼저 SELECT로 '범위' 확인
3. ✅ PK/FK는 절대 수정하지 않음
4. ✅ DELETE는 원칙적으로 금지 (비활성화 사용)
5. ✅ 결제/전환/포인트 값은 '정정 기록(추가 row)'로 처리
6. ✅ 대량 UPDATE/INSERT는 마이그레이션 스크립트 사용
7. ✅ 작업 전 "백업/복구 가능 여부" 확인

#### 6. 운영자 체크리스트 (작업 후)

8. ✅ 작업 후 '검증 쿼리' 실행
9. ✅ 로그/지표 모니터링 (주 1회 이상)
10. ✅ 권한 관련 변경은 절대 대시보드에서 즉흥적으로 하지 않음

#### 7. 로그 모니터링 포인트

**정기적으로 확인할 지표**:

- **일 1회**: 트래킹/매출 퍼널 (`conversion_events`), 추천 시스템 (`recommendations`)
- **주 1회**: AI 분석 파이프라인 (`analysis_results`), 어뷰징 탐지 (`point_transactions`)

**경고 신호**:

- ⚠️ 최근 1시간 동안 이벤트가 0건이면 트래킹 장애 가능
- ⚠️ 추천이 0건이면 추천 시스템 장애
- ⚠️ 상담은 생기는데 분석 결과가 없으면 파이프라인 문제
- ⚠️ 특정 사용자가 비정상적으로 많은 포인트 적립

#### 8. 크롤링 데이터 관리 원칙

**3단계 정규화 계층**:

- **Raw(원문 보관)**: 크롤링한 HTML/JSON 원문 저장
- **Listing(원천 상품)**: 소스별 상품 단위 (`source_id + external_id`)
- **Canonical(정제 상품)**: 서비스가 추천하는 표준 상품 (`products`)

**주요 테이블**:

- `crawl_sources` - 소스/채널 정의
- `crawl_jobs`, `crawl_requests` - 크롤링 작업 추적
- `raw_documents` - 원문 저장 (파티션 필요)
- `product_listings` - 원천 상품
- `listing_price_snapshots` - 가격/재고 변동값 (파티션 필요)
- `product_listing_map` - 중복 제거/매핑

**DBA 체크리스트**:

- 데이터 폭증 테이블부터 파티션/보관정책 먼저 정하기
- 중복 방지 키(UNIQUE) 필수 (`source_id + external_id`)
- 원문 저장은 "DB vs 스토리지" 조기에 결정
- 추천/구매/전환 "정답 테이블"을 하나로 고정
- 장애/차단/재시도는 애초에 데이터 모델에 포함

### 참고 문서

- [데이터베이스 관리 원칙](./database-maintenance-guide.md) - 상세한 관리 원칙 및 운영자 체크리스트
- [데이터베이스 정규화 가이드](./database-normalization-guide.md) - 정규화 관련 상세 가이드 및 크롤링 확장 DDL
- [비개발자 데이터 관리 가이드](./비개발자-데이터관리-가이드.md) - 비개발자 운영자를 위한 가이드

---

## Phase 2 — Assessment 엔진 (Week 2)

- [x] `core/assessment/icf-codes.ts`: ICF Core Set/매핑 데이터 작성.
- [x] `core/assessment/prompt-engineering.ts`: Gemini System Prompt + Few-shot, 의료 용어 차단 로직 포함.
- [x] `core/assessment/parser.ts`: Gemini JSON 응답 파싱 + zod validation.
- [x] `app/api/chat/route.ts`:
  - Clerk 세션 검증, 사용자 Role 저장.
  - 텍스트/음성/이미지 입력 처리 → Gemini 호출 → 파싱.
  - 분석 결과를 `analysis_results`/`chat_messages` 테이블에 저장, 단계별 로그 남기기.
- [x] `components/features/chat/` 구성: `ChatInterface`, `ChatBubble`, STT 버튼, Skeleton, 접근성 속성.

### Deliverables

- 동작하는 AI 상담 플로우(입력 → Gemini → 분석 저장)
- 최소한의 채팅 UI
- 로그: 상담 시작, LLM 응답, 추가 질문

---

## Phase 3 — Matching & UX (Week 3)

- [x] `core/matching/iso-mapping.ts`: d/e 코드 → ISO 9999 매핑 테이블 작성.
- [x] `core/matching/ranking.ts`: 클릭률/등록순 기반 간단 가중치 함수.
- [x] `app/api/products/route.ts`: 분석 결과 기반 ISO 검색, 추천 사유 생성, 클릭 로그 기록.
- [x] 랜딩/메인 페이지 (`app/(main)/page.tsx`): MRD/PRD 기반 헤더 카피, KPI, CTA, 메타 태그 반영.
- [x] 추천 페이지 및 카드 UI (`components/features/product/` + `app/(main)/recommendations`).
- [x] Dashboard 기본 뼈대 (`app/(main)/dashboard/page.tsx`): 상담 이력/추천 상태 리스트, CTA 버튼.
- [x] **사용자 대시보드 재구성**: "내 상담"으로 단순화, 개인 상담 이력 중심으로 변경.
- [x] **상품 데이터 연동 및 관리**:
  - [x] `lib/integrations/` 디렉터리 생성: 유통업체/제휴몰 API 연동 모듈 구조 설계.
  - [x] 상품 데이터 수집 전략 수립 (제휴몰 API 또는 수동 등록 방식 결정).
  - [x] `app/api/products/sync/route.ts`: 상품 데이터 동기화 API (선택적, MVP에서는 수동 등록).
  - [x] `products` 테이블 초기 데이터 입력: ISO 9999 기준 대표 보조기기 샘플 데이터 (최소 20-30개).
  - [x] `purchase_link` 필드 검증: 아웃링크 연결 테스트 및 링크 유효성 확인 로직.
  - [x] 상품 카드 클릭 시 네이버/제휴몰 최저가 페이지로 아웃링크 연결 구현 확인.

### Deliverables

- 분석 → 추천 → 아웃링크까지 흐름 구현
- 랜딩/추천 UI 정리 (접근성 포함)
- 클릭/추천 로그 수집
- **상품 데이터베이스 구축 및 유통업체/제휴몰 연결 검증**

---

## Phase 4 — Validation & 하드닝 (Week 4)

- [x] `core/validation/ippa-calculator.ts`: `(pre - post) * importance` 계산 함수.
- [x] `core/validation/feedback-analyser.ts`: 간단한 감성 분석/텍스트 요약 틀.
- [x] `app/api/ippa/route.ts`: 설문 제출 처리, 계산, DB 저장, 포인트 적립, 로그 남기기.
- [x] Dashboard 내 K-IPPA 섹션 및 `components/ippa-form.tsx` 폼 UI.
- [x] +14일 리마인더 트리거 설계 (예: CRON, Edge Scheduler 메모만 우선 작성) - `docs/reminder-trigger-design.md`.
- [x] QA & 폴리싱:
  - 접근성 체크 (키보드, 스크린리더, 색 대비) — `docs/QA-checklist.md`.
  - SEO 메타 태그 (`app/layout.tsx`) 최종 확인 — `docs/QA-checklist.md`.
  - 주요 유틸 단위 테스트/수동 테스트 시나리오 정리 — `docs/QA-checklist.md`.

### 남은 과제 (Post-MVP)

- [x] 인증 확장 (FR-Auth-02/03): 역할(Role) 선택 UI 및 Clerk 메타데이터 저장.
- [x] FR-IPPA-01 자동 알림: recommendations 생성 후 +14일 리마인더 자동 발송(스케줄러/크론).
- [x] Analytics & Metrics: 추천 정확도, K-IPPA 참여율 트래킹 및 대시보드 시각화.
- [x] **사용자/관리자 기능 분리**:
  - [x] 사용자 대시보드 재구성: "내 상담"으로 단순화 (개인 상담 이력만 표시)
  - [x] AnalyticsDashboard를 사용자 대시보드에서 제거
  - [x] 관리자 페이지 생성 (`/admin/dashboard`)
  - [x] 관리자 페이지에 전체 플랫폼 통계 표시
  - [x] 관리자 페이지에 사용자별 종합 데이터 표시 (이름, K-IPPA, 점수 변화 등)
  - [x] Clerk role 기반 관리자 접근 제어 (admin/expert만 접근)
  - [x] 헤더에 관리자 링크 자동 표시 (권한 있는 경우만)
- [ ] MVP 제외 범위 준비:
  - 결제 연동(PG) 설계 메모.
  - 커뮤니티 기능(사용자 후기/질문) MVP 범위 정의.

### Deliverables

- K-IPPA 제출 Loop
- 대시보드 Validation UI
- QA 체크리스트 (A11y, SEO, 로깅)

---

## Phase 4.5 — ICF 코드 확장 전략 (2025-02-11 완료)

### 목표

Core Set에 없는 ICF 코드를 동적으로 처리하고, 사용 통계를 수집하여 점진적 확장을 지원합니다.

### 구현 완료

- [x] **동적 ICF 코드 처리 (방안 2)**

  - `findIcfCode` 함수가 Core Set에 없는 코드도 기본 정보 반환
  - 카테고리(b/d/e) 기반 기본 설명 자동 생성
  - Core Set에 있는 코드는 상세 정보, 없는 코드는 기본 정보 반환

- [x] **ICF 코드 사용 통계 수집 시스템**

  - 데이터베이스 스키마: `icf_code_usage_logs`, `icf_code_statistics`, `icf_code_expansion_priority` 뷰
  - 로깅 시스템: `lib/icf-tracking.ts` 생성
  - 주요 사용 지점에 자동 로깅 추가:
    - `app/api/chat/route.ts`: 채팅 분석에서 추출된 ICF 코드
    - `app/api/products/route.ts`: 제품 매칭 시 사용된 ICF 코드

- [x] **확장 우선순위 분석 API**

  - `GET /api/admin/analytics/icf-expansion`: Core Set에 없는 코드 목록 및 우선순위 점수
  - 우선순위 점수 = 사용 빈도 + 고유 상담 수 + 최근성 보너스

- [x] **관리자 대시보드 UI**

  - 확장 우선순위 시각화 (`/admin/icf-expansion`)
  - 우선순위 기반 일괄 Core Set 추가 기능
  - ISO 매핑 힌트 수동/자동 추가 기능
  - 자동 확장 설정 UI

- [x] **자동 확장 워크플로우**

  - 우선순위 점수 기반 자동 Core Set 추가 API (`POST /api/admin/icf/auto-expand`)
  - 자동 확장 설정 관리 API (`GET/POST /api/admin/icf/auto-expand-config`)
  - 스케줄러/크론에서 호출 가능한 워크플로우

- [x] **AI 기반 ISO 매핑 힌트 자동 생성**
  - 누적 데이터를 활용한 의미론적 매핑 (`lib/icf-iso-generator.ts`)
  - Gemini API를 활용한 AI 기반 ISO 힌트 생성
  - 유사한 ICF 코드의 ISO 매핑 조회
  - 통합 ISO 힌트 생성 API (`POST /api/admin/icf/generate-iso-hints`)

### 향후 작업

- [x] **스케줄러 설정**
  - 자동 확장 워크플로우를 주기적으로 실행하는 크론 작업 설정
  - Vercel Cron을 활용한 자동화 (`vercel.json`에 매주 수요일 새벽 3시 UTC 스케줄 추가)

### 참고 문서

- `docs/icf-iso-matching-improvement-plan.md`: ICF 코드 확장 전략 상세 설명
- `supabase/migrations/20250211000000_add_icf_code_usage_tracking.sql`: 데이터베이스 스키마
- `lib/icf-tracking.ts`: 로깅 유틸리티

---

## Phase 4.6 — 매칭 정확도 개선 (2025-02-17 추가)

**목표**: ICF-ISO 매칭 정확도를 60-70%에서 85-90%로 향상

### 현재 상태

- ✅ 하이브리드 매칭 시스템 (규칙 + 시맨틱 + 지식 그래프)
- ✅ 피드백 수집 시스템 (클릭, 구매, K-IPPA 평가)
- ✅ 벡터 DB 구축 (Supabase pgvector 확장)
- ⚠️ 피드백 데이터를 점수 계산에 활용하지 않음
- ⚠️ ICF 코드 간 상관관계 미반영
- ⚠️ 사용자 컨텍스트 활용 부족

### 우선순위별 구현 계획

#### 🔥 1주차: 피드백 기반 점수 보정 (최우선)

- [x] `core/matching/feedback-scorer.ts` 생성
  - 클릭률, 구매 전환율, K-IPPA 효과성 점수 수집
  - ICF 코드 조합별 통계 집계
  - 피드백 기반 점수 보정 로직 구현
- [x] `hybrid-matcher.ts`에 피드백 점수 통합
- [x] 테스트 및 검증
- **예상 효과**: +5-10% 정확도 향상

#### 📈 2주차: ICF 상관관계 반영

- [x] `core/matching/icf-correlation.ts` 생성
  - `icf_code_usage_logs`에서 상관관계 데이터 추출
  - ICF 코드 조합별 상관관계 계산
- [x] `getIsoMatches` 점수 계산에 상관관계 보너스 추가
- [x] 테스트 및 검증
- **예상 효과**: +3-5% 정확도 향상

#### 🎯 3-4주차: 사용자 컨텍스트 가중치

- [x] `core/matching/context-weights.ts` 생성
  - 연령대, 환경, 장애 유형별 가중치 로직
  - 이전 사용 제품과의 유사도 반영
- [x] 사용자 프로필 데이터 수집 강화
- [x] 컨텍스트별 가중치 적용
- **예상 효과**: +5-8% 정확도 향상

#### 🚀 5-8주차: 벡터 DB 구축

- [x] Supabase pgvector 확장 설정
- [x] ICF-ISO 매핑 임베딩 생성 파이프라인
- [x] 시맨틱 매칭 강화
- [ ] 실시간 학습 시스템 구축
- **예상 효과**: +10-15% 정확도 향상

### 예상 효과 요약

| 단계     | 기간              | 예상 정확도 | 누적 효과 |
| -------- | ----------------- | ----------- | --------- |
| 현재     | -                 | 60-70%      | -         |
| 1-2주 후 | 피드백 + 상관관계 | 70-75%      | +5-10%    |
| 1개월 후 | + 컨텍스트        | 80-85%      | +15-20%   |
| 2개월 후 | + 벡터 DB         | 85-90%      | +25-30%   |

### 참고 문서

- `docs/icf-iso-matching-improvement-plan.md`: 상세 개선 방안 및 구현 가이드

---

## Phase 4.7 — RLS 정책 활성화 및 Clerk JWT 통합 (2025-02-18 추가)

**목표**: Row Level Security (RLS) 정책을 완전히 활용하여 데이터 보안 강화

### 완료된 작업

- [x] **RLS 정책 생성 및 활성화**

  - 모든 테이블에 대한 RLS 정책 작성
  - 헬퍼 함수 생성 (`get_current_user_id`, `get_current_user_role`, `is_admin_or_manager`)
  - 마이그레이션 파일 생성 및 적용
  - 테스트 스크립트 작성

- [x] **Clerk JWT를 Supabase JWT로 변환**
  - JWT 생성 유틸리티 함수 생성 (`lib/supabase/jwt-helper.ts`)
  - Supabase 서버 클라이언트 수정 (`lib/supabase/server.ts`)
  - 환경 변수 추가 및 API Route 수정 (chat, consultations, products, recommendations)
  - RLS 헬퍼 함수 변수명 충돌 해결
  - 종합 테스트 통과 확인

### 향후 작업

- [x] **클라이언트 측 인증 통합** (2025-02-19 완료)

  **목표**: 클라이언트 측에서도 Clerk 인증 정보를 Supabase JWT로 변환하여 RLS 정책이 적용되도록 함

  **구현 완료**:

  - API Route 생성 (`app/api/auth/supabase-token/route.ts`)
  - 클라이언트 유틸 수정 (`lib/supabase/client.ts`) - JWT 캐싱 및 자동 갱신 로직
  - 클라이언트 측 인증 통합 가이드 작성

  **참고 문서**:

  - `docs/client-auth-integration-guide.md`: 클라이언트 측 인증 통합 가이드
  - `app/api/auth/supabase-token/route.ts`: JWT 생성 API Route
  - `lib/supabase/client.ts`: 클라이언트 측 Supabase 유틸리티

- [x] **Supabase Edge Function 활용** (2025-02-19 완료)

  **목표**: Edge Network에서 JWT 변환을 처리하여 성능 향상 및 서버 부하 감소

  **구현 완료**:

  - Edge Function 생성 (`supabase/functions/clerk-to-supabase-jwt/index.ts`)
  - Edge Function 사용 가이드 및 배포 가이드 작성

  3. **배포 준비** (선택사항 - 현재는 API Route 방식 사용 중) ✅ **완료** (2025-12-26)

     - [x] Edge Function 코드 작성 완료
     - [x] 배포 스크립트 작성 완료 (`scripts/deploy-edge-function.ts`)
     - [x] 테스트 스크립트 작성 완료 (`scripts/test-edge-function.ts`)
     - [x] **환경 변수 설정** (Supabase CLI로 설정 완료)
       - [x] `JWT_SECRET` 설정 완료 (`npx supabase secrets set JWT_SECRET`)
       - [x] `ANON_KEY` 설정 완료 (`npx supabase secrets set ANON_KEY`)
       - [x] `SUPABASE_URL`은 Supabase가 자동으로 제공 (코드에서 지원)
     - [x] **Edge Function 배포**
       - [x] 배포 스크립트로 배포 완료 (`pnpm run deploy:edge-function`)
       - [x] 프로젝트 연결 완료 (`sityptcwbnremuzsvbhx`)
       - [x] Edge Function 배포 완료 (`clerk-to-supabase-jwt`)
     - [x] **배포 후 테스트**
       - [x] `pnpm run test:edge-function` 실행 완료
       - [x] 모든 테스트 케이스 통과 확인 (5/5 통과, 100% 성공률)
       - [x] JWT 생성 검증 완료
       - [x] CORS 헤더 확인 완료
       - [x] 에러 처리 검증 완료
       - [x] GET 메서드 거부 확인 완료

  **참고**: 현재는 API Route 방식(`app/api/auth/supabase-token/route.ts`)을 사용 중이므로, Edge Function 배포는 선택사항입니다. Edge Function을 사용하면 성능 향상이 있지만, 현재 방식으로도 충분히 동작합니다.

  **⚠️ 주의사항**:

  - 환경 변수는 민감한 정보이므로 Supabase Dashboard의 Secrets에서만 관리
  - Edge Function 배포는 선택사항이며, 현재 API Route 방식으로 충분히 동작함

  **참고 문서**:

  - `supabase/functions/clerk-to-supabase-jwt/index.ts`: Edge Function 구현
  - `supabase/functions/clerk-to-supabase-jwt/README.md`: Edge Function 사용 가이드
  - `docs/supabase-edge-function-guide.md`: 배포 및 설정 가이드

### 참고 문서

- `docs/rls-activation-guide.md`: RLS 활성화 가이드
- `docs/rls-testing-guide.md`: RLS 테스트 가이드
- `docs/rls-fix-ambiguous-clerk-id.md`: RLS 헬퍼 함수 수정 가이드
- `supabase/migrations/20250218000000_add_rls_policies.sql`: RLS 정책 마이그레이션
- `supabase/migrations/20250219000000_fix_ambiguous_clerk_id.sql`: RLS 헬퍼 함수 수정 마이그레이션
- `scripts/test-rls-policies.ts`: RLS 정책 기본 테스트 스크립트
- `scripts/test-rls-policies-comprehensive.ts`: RLS 정책 종합 테스트 스크립트 (JWT 기반)

### 중요 사항

**현재 상태**:

- ✅ RLS 정책 활성화 완료
- ✅ Clerk JWT를 Supabase JWT로 변환 구현 완료
- ✅ API Route에서 `getSupabaseUserClient` 사용으로 전환 완료
- ✅ RLS 정책 테스트 통과 확인
- ✅ 사용자별 데이터 접근 제어 작동 확인
- ✅ 관리자 권한 테스트 통과 확인

**완료된 작업 요약**:

✅ **Phase 4.7 완료** (2025-02-19)

- RLS 정책 생성 및 활성화
- Clerk JWT를 Supabase JWT로 변환
- 클라이언트 측 인증 통합
- Supabase Edge Function 활용 (선택적)

---

## Phase 5 — 프론트엔드 완성도 향상 (Post-MVP)

### 5.1 상담 완료 → 추천 페이지 연동 (최우선)

**목표**: 핵심 비즈니스 플로우 완성. 상담 완료 후 사용자가 자연스럽게 추천 페이지로 이동할 수 있도록 합니다.

- [x] **채팅 인터페이스에 추천 CTA 추가** ✅ - ICF 분석 완료 감지, "추천 보기" 버튼 추가, 로딩 상태 처리
- [x] **상담 완료 후 자동 추천 생성** ✅ - 프론트엔드에서 추천 미리 생성, CTA 버튼 활성화
- [x] **채팅 내 추천 카드 미리보기** ✅ - 상위 2-3개 추천 카드 표시, 반응형 그리드 레이아웃

### 5.2 멀티모달 입력 기능 구현

- [x] **STT (음성 입력) 구현** ✅ - Web Speech API 연동, 음성 인식 중 비주얼 피드백, 브라우저 호환성 체크
- [x] **이미지 업로드 (Gemini Vision) 구현** ✅ - 파일 업로드 UI, 파일 크기/타입 검증, Gemini Vision API 연동

### 5.3 스트리밍 응답 구현

- [x] **Next.js AI SDK 스트리밍** ✅ - 백엔드/프론트엔드 스트리밍 처리, 실시간 타이핑 경험 개선, 에러 처리 및 재연결 로직

### 5.4 분석 결과 시각화 및 리포트

- [x] **ICF 분석 결과 시각화 컴포넌트** ✅ - ICF 코드별 카테고리 표시, 툴팁/모달, 관련 ISO 코드 연결
- [x] **상담 리포트 페이지** ✅ - 상담 요약 및 ICF 분석 결과 표시, 환경 요소 분석 시각화, PDF 다운로드 기능
- [x] **상담 상세 페이지** ✅ - 상담 메시지 히스토리, 분석 결과 상세 확인, 추천 목록 및 상태

### 5.5 페이지 구조 완성

- [x] **K-IPPA 전용 페이지** ✅ - 독립 페이지로 K-IPPA 평가, 알림 링크에서 직접 접근, 평가 히스토리 및 비교 기능
- [x] **추천 상세 페이지** ✅ - 특정 상담 기반 추천 전용 페이지, 상담 컨텍스트 표시, 필터링/정렬 옵션
- [x] **대시보드 상담 이력 상세 보기** ✅ - 상담 카드 클릭 시 상세 페이지 이동, 메시지 히스토리 및 분석 결과 확인

### 5.6 UX 개선

- [x] **ICF 코드 상세 설명** ✅ - 코드 클릭 시 툴팁/모달, Dialog 모달로 상세 정보, 카테고리별 색상 구분
- [x] **실시간 피드백 개선** ✅ - AI 응답 생성 중 애니메이션, 로딩 메시지 스타일링, 로딩 스켈레톤 UI 개선

### 5.7 관리자 페이지 및 사용자/관리자 기능 분리

- [x] **사용자 대시보드 재구성** ✅ - "내 상담"으로 변경, AnalyticsDashboard 제거, 개인 상담 이력 중심으로 단순화
- [x] **관리자 페이지 생성** ✅ - 관리자 전용 접근 제어, 전체 플랫폼 통계, 사용자별 종합 데이터, 필터링 탭
- [x] **관리자 API 엔드포인트** ✅ - 전체 플랫폼 통계 API, 사용자별 종합 데이터 API

### 5.8 네비게이션 개선

- [x] **GNB (Global Navigation Bar)** ✅ - 모바일 Sheet Navigation, 언어 스위치, A11y/반응형 QA
- [x] **LNB (Local Navigation)** ✅ - `/recommendations/[id]`, `/dashboard`에 적용
- [x] **SNB (Side Navigation)** ✅ - `/admin/dashboard` 레이아웃에 적용
- [x] **FNB (Footer Navigation Bar)** ✅ - Footer 하단 Quick Links, 모바일 언어 선택 드롭다운
- [x] **Breadcrumbs** ✅ - 주요 페이지에 적용, SEO/접근성 테스트

### Deliverables (Phase 5)

- 멀티모달 입력 (STT, 이미지) 완전 구현
- 스트리밍 응답으로 실시간 상담 경험 개선
- ICF 분석 결과 시각화 및 리포트 페이지
- 완전한 페이지 구조 (상담 상세, 리포트, K-IPPA 전용 페이지)
- **상담 완료 → 추천 페이지 자동 연동 플로우** (핵심 비즈니스 플로우)
- **사용자/관리자 기능 분리** (사용자 대시보드 단순화, 관리자 페이지 분리)
- 향상된 사용자 경험

---

## SEO 표준 및 최적화 (SEO Standard & Optimization)

### 개요

이 SEO 표준은 웹페이지가 검색 엔진 결과 페이지에서 상위에 노출되기 위해 필요한 요건에 대한 지침을 제공합니다. 검색 엔진 최적화(SEO)는 검색 엔진의 크롤링(수집) 및 인덱싱(색인)을 관리하기 위해 사이트에 콘텐츠 전략, 기술적 설정, 전술을 적용하는 방법론입니다.

### 검색 엔진 작동 원리

검색 엔진은 **크롤링(Crawling)**, **인덱싱(Indexing)**, **랭킹(Ranking)**의 세 단계로 작동합니다:

1. **크롤링**: 개별 URL을 발견하는 단계
2. **인덱싱**: 페이지의 콘텐츠를 추출하여 검색 엔진 데이터베이스에 저장
3. **랭킹**: 알고리즘에 의해 각 페이지의 관련성에 따라 순위 결정

### 랭킹 신호 (Ranking Signals)

검색 엔진이 콘텐츠 순위를 매기기 위해 집중하는 네 가지 주요 영역:

1. **콘텐츠 품질 및 E-E-A-T**: 경험(Experience), 전문성(Expertise), 권위(Authoritativeness), 신뢰성(Trustworthiness)
2. **아키텍처**: 크롤링 용이성, 페이지 로딩 속도, HTTPS, 모바일 친화성
3. **링크 그래프**: 인바운드 링크(백링크)의 권위와 관련성
4. **사용자 신호**: 검색 결과 페이지에서의 클릭률(CTR)과 체류 시간

**모바일 우선 인덱싱**: 구글은 "모바일 우선(mobile-first)" 모델을 적용하여 모바일 기기의 콘텐츠와 사용자 경험이 모든 플랫폼의 검색 성능 기준이 됩니다.

### 구현 작업

#### 콘텐츠 (Content)

- [x] **페이지 제목 (Title Tags)**

  - [x] 모든 페이지에 고유하고 명확한 제목 태그 구현 (필수) ✅ `app/page.tsx`, `app/layout.tsx`, `app/dashboard/page.tsx` 등
  - [x] 제목은 약 60자 이내(픽셀 너비 580px) 권장 ✅ 대부분 준수
  - [x] 키워드는 제목의 시작 부분에 배치 ✅ "LinkAble — AI 기반 보조기기 매칭"
  - [x] 브랜드 접미사 포함 (예: " — LinkAble") ✅ 모든 페이지에 "LinkAble" 포함
  - [ ] 특수 문자 이스케이프 처리 (일부 페이지 확인 필요)

- [x] **헤딩 구조 (Headings)**

  - [x] 페이지당 정확히 하나의 `<h1>` 사용 (필수) ✅ 확인됨 (`app/page.tsx`, `components/hero-section.tsx` 등)
  - [x] 헤딩은 논리적이고 순차적 순서(H1 -> H2 -> H3) 사용 (필수) ✅ 대부분 준수
  - [x] 헤딩은 콘텐츠 섹션을 정확하고 설명적으로 나타냄 (필수) ✅ 확인됨
  - [x] 헤딩은 스타일링 목적으로 사용하지 않음 (필수) ✅ 확인됨

- [ ] **콘텐츠 품질 및 E-E-A-T (Content Quality & E-E-A-T)**

  **E-E-A-T는 구글의 핵심 랭킹 신호입니다:**

  - [x] **Experience (경험)**: 실제 사용 경험 기반 콘텐츠

    - [x] 실제 사용자 사례 및 후기 포함 (K-IPPA 평가 데이터 활용) ✅ `app/api/public/testimonials/route.ts`, `components/testimonials-section.tsx`
    - [x] "16년 경력 보조공학 전문가" 같은 경험 강조 ✅ `components/pages/about-content.tsx`에 전문가 경험 섹션 추가
    - [x] 실제 사용 환경 사진/영상 포함 (권장) ✅ About 페이지에 이미지 포함
    - [x] 사용자 스토리 및 성공 사례 공유 (권장) ✅ 홈페이지에 사용자 후기 섹션 추가 (`app/page.tsx`)

  - [x] **Expertise (전문성)**: 주제에 대한 전문 지식

    - [x] ICF(국제기능분류) 및 ISO 9999 표준 기반 전문 콘텐츠 ✅ `docs/목적-및-핵심-가치.md`, `app/page.tsx` 메타데이터
    - [x] 보조공학 전문 용어의 정확한 사용 ✅ 프로젝트 전반에 걸쳐 사용
    - [ ] 전문가 인증 정보 표시 (보조공학사, 작업치료사 등) (부분 구현)
    - [ ] 전문가 프로필 및 자격 정보 페이지 제공 (권장)
    - [x] 전문가가 직접 작성/검토한 콘텐츠임을 명시 ✅ "16년 경력 보조공학 전문가" 언급 (`docs/목적-및-핵심-가치.md`)

  - [x] **Authoritativeness (권위)**: 신뢰할 수 있는 출처

    - [x] 국제 표준(ICF, ISO 9999) 인용 및 참조 ✅ 프로젝트 전반에 걸쳐 명시
    - [ ] 정부 기관, 학회, 전문 기관 출처 명시 (부분 구현)
    - [ ] 관련 연구 및 논문 인용 (권장)
    - [ ] 전문가 추천 및 인증 표시 (부분 구현)
    - [ ] 언론 보도 및 언급 이력 표시 (권장)

  - [x] **Trustworthiness (신뢰성)**: 신뢰할 수 있는 정보 제공
    - [x] 정확한 정보 제공 및 사실 확인 ✅ ICF/ISO 표준 기반
    - [x] 의료 행위 금지 명시 (Non-Medical 원칙) ✅ `components/disclaimer-modal.tsx`, `docs/PRD.md`
    - [x] 면책 고지 및 이용 약관 명확히 표시 ✅ `app/terms/page.tsx`, `components/pages/terms-content.tsx`
    - [x] 개인정보 보호 정책 및 보안 인증 표시 ✅ `app/privacy/page.tsx`, `components/pages/privacy-content.tsx`
    - [x] 사용자 리뷰 및 평가 시스템 (K-IPPA 데이터 활용) ✅ `app/dashboard/ippa/page.tsx`, K-IPPA 평가 시스템 구현됨
    - [x] 투명한 비즈니스 정보 제공 (회사 정보, 연락처) ✅ `app/about/page.tsx`, Footer에 연락처 정보
    - [x] AI 생성 콘텐츠는 반드시 인간의 검토(Human-in-the-loop)를 거침 (필수) ✅ 프로젝트 원칙에 명시

  **콘텐츠 품질 기본 요구사항:**

  - [x] 키워드 조사 수행 (권장) ✅ `docs/seo-content-quality-guide.md`에 키워드 전략 문서화
  - [x] 자연어로 작성되고 읽기 쉽고 명확한 콘텐츠 (권장) ✅ 모든 페이지에서 자연스러운 한국어 사용, 가독성 체크리스트 완료
  - [x] 사용자의 검색 의도(Search Intent)와의 일치도 확인 ✅ 정보성/탐색성/거래성 의도별 콘텐츠 매핑 완료 (`docs/seo-content-quality-guide.md`)
  - [x] 콘텐츠의 독창성 및 유용성 확보 ✅ ICF-ISO 매칭, K-IPPA 검증 등 독창적 기능, 실제 사용자 경험 데이터 활용
  - [x] 정기적인 콘텐츠 업데이트 및 최신 정보 반영 (권장) ✅ K-IPPA 평가 기반 자동 업데이트, 수동 업데이트 가이드 문서화

- [x] **내비게이션 (Navigation)**

  - [x] 링크는 자바스크립트 없이도 크롤링 가능 (필수) ✅ Next.js Link 컴포넌트 사용
  - [x] 앵커 텍스트는 목적지를 설명하며 "여기를 클릭" 같은 용어 피함 (권장) ✅ 확인됨
  - [x] 내부 링크를 통해 관련 콘텐츠 연결 (권장) ✅ Footer, Header 등에 내부 링크 구현
  - [x] 제3자 속성이나 광고성 링크에는 `rel="nofollow"` 또는 `rel="sponsored"` 사용 (권장) ✅ 제품 구매 링크에 `rel="nofollow sponsored noreferrer"` 추가 (`components/admin/admin-product-manager.tsx`), 외부 링크에 `rel="noreferrer noopener"` 추가 (`components/navigation/local-nav.tsx`)

- [x] **브레드크럼 (Breadcrumbs)**

  - [x] 브레드크럼은 자바스크립트가 비활성화된 상태에서도 접근 가능 (필수) ✅ `components/navigation/breadcrumbs.tsx` - 서버 렌더링 가능
  - [x] 모든 페이지에 일관되게 나타남 (권장) ✅ 주요 페이지(대시보드, 상담, 추천, K-IPPA, 관리자)에 브레드크럼 추가 완료
  - [x] 구조화된 데이터(Schema.org BreadcrumbList) 사용 (권장) ✅ `itemScope`, `itemType="https://schema.org/BreadcrumbList"` 구현됨

- [x] **미디어 (Media)**

  - [x] 모든 이미지에 alt 속성 포함 (필수) ✅ `components/product-recommendation-card.tsx`, `components/hero-section.tsx` 등 확인됨
  - [x] 이미지 검색이 중요한 자산에는 alt 속성 반드시 채움 (필수) ✅ 확인됨
  - [x] 구조화된 데이터(ImageObject) 사용 (권장) ✅ `components/structured-data/image-object.tsx` 생성, 홈페이지 Open Graph 이미지에 적용 (`app/page.tsx`)
  - [x] 차세대 이미지 포맷(WebP, AVIF) 사용 (권장) ✅ `next.config.mjs`에 `formats: ["image/avif", "image/webp"]` 설정됨
  - [ ] 비디오에는 텍스트 스크립트(자막/대본) 포함 (필수) (비디오 콘텐츠 없음)
  - [ ] 비디오 구조화된 데이터(VideoObject) 사용 (권장) (비디오 콘텐츠 없음)
  - [x] 파일 이름은 콘텐츠를 설명하는 키워드 포함, 하이픈으로 구분, 소문자 사용 (권장) ✅ `public/` 폴더의 모든 이미지 파일 이름 확인 완료 (예: `elderly-person-happily-using-tablet-in-cozy-home-e.jpg`, `ergonomic-jar-opener-with-rubber-grip.jpg`)

- [x] **메타데이터 (Metadata)**
  - [x] 모든 페이지에 고유한 메타 설명 포함 (권장) ✅ `app/page.tsx`, `app/dashboard/page.tsx`, `app/recommendations/page.tsx` 등
  - [x] 메타 설명은 30~150자(한중일 30~75자) 사이 (권장) ✅ 대부분 준수
  - [x] 클릭을 유도하는(CTA) 문구 포함 (권장) ✅ "AI 상담, ISO 매칭, K-IPPA 검증까지 한 번에 제공"
  - [x] 메타 키워드 태그는 사용하지 않음 (권장) ✅ Next.js Metadata API 사용 (keywords는 layout.tsx에만 있으나 권장사항)

#### 크롤링 가능성 (Crawlability)

- [x] **사이트맵 (Sitemap)**

  - [x] XML 사이트맵 구현 (필수) ✅ `app/sitemap.ts` - Next.js App Router의 MetadataRoute.Sitemap 사용
  - [x] 표준(Canonical) URL만 포함 (필수) ✅ 공개 페이지만 포함, 인증 필요 페이지 제외
  - [x] robots.txt에 의해 차단된 URL은 포함하지 않음 (필수) ✅ `/dashboard/`, `/admin/`, `/consultation/` 등 제외
  - [x] XML 사이트맵은 50MB(비압축) 또는 50,000개 이상의 URL을 포함하지 않음 (필수) ✅ 현재 6개 페이지만 포함 (50,000개 미만)
  - [x] XML 사이트맵은 UTF-8로 인코딩 (필수) ✅ Next.js 기본 UTF-8 인코딩
  - [x] HTML 사이트맵 구현 (필수) ✅ `app/site-map/page.tsx` - 사용자 친화적인 HTML 사이트맵 페이지 생성 (`/site-map`)
  - [x] RSS 피드 구현 (필수) ✅ `app/feed.xml/route.ts` - RSS 2.0 형식의 XML 피드 생성 (`/feed.xml`)

- [x] **리디렉션 (Redirects)**

  - [x] 영구적인 이동에는 301, 일시적인 이동에는 302 사용 (필수) ✅ Next.js `redirect()` 함수 사용 (기본 307), 영구 리디렉션 필요 시 `redirect(url, "permanent")` 사용 가능, 현재는 일시적 리디렉션만 사용 (인증, 동적 라우팅)
  - [x] 리디렉션 체인 최소화 (필수) ✅ 모든 리디렉션이 직접 리디렉션 (1단계), 리디렉션 체인 없음
  - [x] 메타 리프레시 및 자바스크립트 리디렉션 사용하지 않음 (필수) ✅ SEO 목적 리디렉션은 서버 사이드만 사용, `window.location`은 사용자 액션에 의한 것만 사용 (이메일 링크 등)

- [x] **사용자 에이전트 관리**

  - [x] 올바른 HTTP 상태 코드 사용 (404, 410, 503 등) (필수) ✅ `app/not-found.tsx` 생성, `app/consultation/[id]/page.tsx`, `app/recommendations/[consultationId]/page.tsx`, `app/dashboard/ippa/[recommendationId]/page.tsx`에서 `notFound()` 사용하여 404 반환. API 라우트에서 410 Gone 적절히 사용 중 (`app/api/admin/icf/auto-expand/route.ts` 등)
  - [x] 검색 엔진 봇에게 사용자와 동일한 콘텐츠 제공 (클로킹 금지) (필수) ✅ User-Agent는 분석/로깅 목적으로만 사용되며, 콘텐츠 제공에 대한 조건부 렌더링 없음. 모든 사용자(봇 포함)에게 동일한 콘텐츠 제공

- [x] **검색 엔진 관리**
  - [x] robots `<meta>` 태그 적절히 구현 (필수) ✅ 루트 레이아웃(`app/layout.tsx`)에 기본 설정 추가, 공개 페이지는 `index: true, follow: true`, 인증 필요 페이지는 `index: false, follow: false` 설정 완료. Google Bot 설정 포함 (`max-video-preview`, `max-image-preview`, `max-snippet`)
  - [x] robots.txt 적절히 사용 (필수) ✅ `app/robots.ts` - 공개 페이지 허용, 인증 필요 페이지 차단
  - [x] Google Search Console 등록 및 관리 (필수) ✅ 코드 지원 완료 (`app/layout.tsx`에 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` 환경변수로 메타 태그 자동 생성). 인증 코드 수신: `6R8ZTYTcP0WfjFqL3NggGSeCLs8rL00dAcpCEv42PY4` (환경변수 설정 필요)
  - [x] Naver Search Advisor 등록 및 관리 (권장) ✅ 코드 지원 완료 (`app/layout.tsx`에 `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` 환경변수로 메타 태그 자동 생성). 인증 코드 수신: `c2a34d18164b148f3dbc7ae787d72ecb4163e48b` (환경변수 설정 필요)

#### URL 및 도메인 (URLs & Domains)

- [ ] **도메인**

  - [ ] HTTPS가 기본 프로토콜로 사용 (필수)
  - [ ] HTTP 요청은 HTTPS로 301 리디렉션 (필수)

- [ ] **URL 구조**

  - [ ] URL은 콘텐츠 허브를 중심으로 생성 (권장)
  - [ ] 하위 디렉터리 내의 모든 단어는 하이픈으로 구분 (필수)
  - [ ] URL 내의 모든 문자는 소문자 (필수)
  - [ ] URL은 정규화되고 인코딩됨 (필수)
  - [ ] 검색을 위한 주요 페이지는 파라미터 사용을 피함 (권장)

- [x] **표준화 (Canonicalization)**
  - [ ] 비표준 도메인은 표준 도메인으로 리디렉션 (필수) (프로덕션 배포 시 확인 필요)
  - [x] 중복 콘텐츠 방지를 위해 Canonical 태그 사용 (필수) ✅ `app/page.tsx`, `app/dashboard/page.tsx` 등에 `alternates: { canonical: pageUrl }` 구현됨

#### 모바일 (Mobile)

- [x] **반응형 디자인**

  - [x] 반응형 디자인 사용 (필수) ✅ Tailwind CSS 반응형 클래스 사용 (`md:`, `lg:` 등)
  - [x] 데스크톱과 모바일의 콘텐츠 일치 (필수) ✅ 단일 URL, 동일 콘텐츠
  - [x] 독립 모바일 사이트(m.example.com) 지양 (권장) ✅ 반응형 디자인 사용

- [x] **사용자 경험**
  - [x] 상호작용 요소는 최소 44x44 CSS 픽셀 타겟 영역 (필수) ✅ shadcn/ui 컴포넌트 기본 설정
  - [ ] `meta name="viewport"` 태그 정의 (필수) (Next.js 기본 제공 확인 필요)
  - [x] 구식 기술(Flash 등) 사용하지 않음 (필수) ✅ 최신 웹 기술만 사용

#### 구조화된 데이터 (Structured Data)

- [x] **Schema.org 마크업**
  - [ ] JSON-LD 형식 사용 (권장) (부분 구현 - BreadcrumbList만 마이크로데이터 형식)
  - [x] 구조화된 데이터는 페이지 콘텐츠를 정확히 반영 (필수) ✅ BreadcrumbList 구현됨
  - [x] Open Graph 및 Twitter Card 마크업 구현 (필수) ✅ `app/page.tsx`, `app/dashboard/page.tsx` 등에 구현됨
  - [ ] 주요 페이지 타입별 구조화된 데이터 구현:
    - [ ] Organization (조직 정보) (미구현)
    - [ ] WebSite (사이트 정보) (미구현)
    - [x] BreadcrumbList (브레드크럼) ✅ `components/navigation/breadcrumbs.tsx`
    - [ ] Article/BlogPosting (블로그/기사) (미구현)
    - [ ] Product (상품 정보) (미구현)
    - [ ] FAQPage (FAQ) (미구현)
    - [ ] HowTo (사용 가이드) (미구현)

#### 지역 및 언어 타겟팅

- [x] **다국어/다국가 지원**
  - [ ] `hreflang` 태그 적절히 구현 (필수) (미구현 - 단일 언어 사이트)
  - [ ] `x-default` 값으로 기본 페이지 지정 (권장) (미구현)
  - [x] `lang` 속성으로 언어 표시 (필수) ✅ `app/layout.tsx`에 `<html lang="ko">` 구현됨

#### 기술적 요소 (Technical)

- [x] **자바스크립트 (JavaScript)**

  - [x] 핵심 콘텐츠는 자바스크립트 없이도 접근 가능하거나 SSR 사용 (필수) ✅ Next.js App Router 기본 SSR
  - [x] SPA는 SSR 또는 정적 생성 사용 (권장) ✅ Next.js App Router 사용, `dynamic import`로 코드 스플리팅
  - [x] Hashbang(#!) 방식 사용하지 않음 (필수) ✅ Next.js 기본 라우팅 사용
  - [x] 모든 페이지는 고유하고 SEO 친화적인 URL로 접근 가능 (필수) ✅ `/`, `/dashboard`, `/recommendations` 등

- [x] **성능 (Performance)**
  - [x] **Core Web Vitals 최적화** (필수) ✅ `components/performance/web-vitals-tracker.tsx` 구현됨
    - [x] LCP (Largest Contentful Paint): 2.5초 이하 (권장) ✅ 이미지 프리로딩 구현 (`docs/performance-optimization-summary.md`)
    - [x] INP (Interaction to Next Paint): 200ms 이하 (권장) ✅ 코드 스플리팅으로 최적화
    - [x] CLS (Cumulative Layout Shift): 0.1 이하 (권장) ✅ 레이아웃 안정성 확보
  - [x] 텍스트 기반 자산(HTML, CSS, JS) 축소 및 압축 (권장) ✅ Next.js 프로덕션 빌드 기본 제공
  - [x] 사용하지 않는 자바스크립트 실행 최소화 (권장) ✅ 코드 스플리팅 및 동적 import 사용
  - [x] 이미지 및 비디오 자산 최적화 및 CDN 활용 (권장) ✅ Next.js Image 컴포넌트, WebP/AVIF 포맷 지원
  - [x] HTTP 캐싱 활성화 (권장) ✅ API 라우트에 캐싱 헤더 설정 (`app/api/products/route.ts`)

### 추천 SEO 도구 및 리소스

#### 웹마스터 도구

- [Google Search Console](https://search.google.com/search-console) - 구글 공식 웹마스터 도구
- [Bing Webmaster Tools](https://www.bing.com/webmasters) - 마이크로소프트 Bing 웹마스터 도구
- [Naver Search Advisor](https://searchadvisor.naver.com/) - 네이버 검색 어드바이저

#### 테스트 및 검증 도구

- [Rich Results Test](https://search.google.com/test/rich-results) - 구조화된 데이터 테스트
- [Schema.org Validator](https://validator.schema.org) - Schema.org 마크업 검증
- [PageSpeed Insights](https://pagespeed.web.dev/) - 코어 웹 바이탈 성능 분석

#### SEO 분석 도구

- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) - 기술적 SEO 감사를 위한 웹사이트 크롤러
- [Ahrefs](https://ahrefs.com) - 종합 SEO 도구 세트
- [SEMrush](https://www.semrush.com) - 올인원 마케팅 툴킷

#### 유용한 리소스

- [Google Search Central](https://developers.google.com/search) - 구글 검색 공식 문서
- [Schema.org](https://schema.org) - 구조화된 데이터 어휘 문서

### 우선순위

**즉시 작업 (1-2주)**:

- 페이지 제목 및 메타 설명 구현
- 구조화된 데이터 기본 구현 (Organization, WebSite, BreadcrumbList)
- XML 사이트맵 생성
- robots.txt 설정
- Google Search Console 등록

**단기 작업 (3-4주)**:

- 모든 페이지의 헤딩 구조 점검 및 수정
- 이미지 alt 속성 점검 및 보완
- 모바일 반응형 디자인 검증
- Core Web Vitals 최적화
- Open Graph 및 Twitter Card 구현

**중기 작업 (5-8주)**:

- 다국어 지원 시 hreflang 구현
- 상품 페이지 구조화된 데이터 (Product) 구현
- FAQ 및 HowTo 구조화된 데이터 구현
- 백링크 전략 수립 및 실행
- 정기적인 SEO 감사 및 모니터링

---

## Post-MVP 전략

### 상품 데이터 수집 및 관리

#### 완료된 작업

- [x] 상품 데이터 수집 파이프라인 설계서 (`docs/product-sync-plan.md`) 작성
- [x] 수동 크롤링 스크립트 (`scripts/manual-product-import.ts`)
- [x] 웹 스크래핑 크롤러 구현
  - [x] Puppeteer/Playwright 기반 스크래퍼
  - [x] 네이버/11번가 등 주요 쇼핑몰 지원
  - [x] 보조기기 전문 쇼핑몰 지원 (7개 사이트)
  - [x] 크롤링 데이터 → DB 자동 등록 파이프라인
  - [x] 관리자 UI에 크롤링 기능 추가
- [x] 제휴몰 API 연동
  - [x] 상품 검색 API 구현
  - [x] 상품 상세 정보 조회 API 구현
  - [x] 제휴 링크 자동 생성
  - [x] 구매 리포트 조회 API 구현
- [x] 구매 완료 추적 시스템 구현
  - [x] 제휴몰 Postback URL 엔드포인트
  - [x] Meta Pixel 연동
  - [x] DB 스키마 업데이트
- [x] n8n Webhook 기반 수동 등록 워크플로우 구축

#### 진행 중인 작업

- [ ] n8n Schedule Trigger 기반 자동 크롤링 워크플로우 (제휴몰파트너스 API 확보 후)
- [ ] 상품 데이터 검증 유닛 테스트
- [ ] Admin UI에서 상품 수동 등록/수정 화면 추가
- [ ] 제휴 링크 상태 체크 함수 구현

#### 데이터베이스 관리 원칙 적용

**크롤링 데이터 관리 원칙** (참고: `docs/database-normalization-guide.md`):

- [x] **3단계 정규화 계층 설계**:

  - Raw(원문 보관): `raw_documents` 테이블
  - Listing(원천 상품): `product_listings` 테이블 (`source_id + external_id` 유니크)
  - Canonical(정제 상품): `products` 테이블

- [ ] **크롤링 관련 테이블 구축**:

  - [ ] `crawl_sources` - 소스/채널 정의
  - [ ] `crawl_jobs`, `crawl_requests` - 크롤링 작업 추적 (파티션 필요)
  - [ ] `raw_documents` - 원문 저장 (파티션 필요)
  - [ ] `product_listings` - 원천 상품
  - [ ] `listing_price_snapshots` - 가격/재고 변동값 (파티션 필요)
  - [ ] `product_listing_map` - 중복 제거/매핑

- [x] **DBA 체크리스트 적용**:
  - [x] 데이터 폭증 테이블 파티션/보관정책 설정
    - [x] `chat_messages` - 월별 파티션, 1년 보관
    - [x] `conversion_events` - 월별 파티션, 1년 보관
    - [x] `icf_code_usage_logs` - 월별 파티션, 1년 보관
    - [x] `point_transactions` - 월별 파티션, 1년 보관
    - [x] `notifications` - 월별 파티션, 1년 보관
    - [x] `realtime_learning_events` - 월별 파티션, 1년 보관
    - [x] 자동 파티션 생성 함수 (`create_monthly_partition`)
    - [x] 오래된 파티션 삭제 함수 (`drop_old_partitions`)
    - [x] 보관 정책 적용 함수 (`apply_retention_policy`)
    - [x] 파티션 상태 모니터링 뷰 (`v_partition_status`)
  - [x] 중복 방지 키(UNIQUE) 설정 (`source_id + external_id`)
    - [x] `product_listings` 테이블에 `(source_id, external_id)` UNIQUE 제약조건 설정
    - [x] `listing_price_snapshots` 테이블에 중복 방지 인덱스 설정
  - [x] 원문 저장 전략 결정 (DB vs 스토리지)
    - [x] 하이브리드 방식 채택: 작은 원문(10KB 이하)은 DB 직접 저장, 큰 원문은 스토리지 키 참조
    - [x] `raw_documents` 테이블에 `content_text`(DB)와 `storage_key`(스토리지) 필드 모두 제공
    - [x] `decide_raw_storage()` 함수로 저장 전략 자동 결정
    - [x] `generate_content_hash()` 함수로 중복 제거 지원
  - [ ] 추천/구매/전환 "정답 테이블" 통일 (`conversion_events` 기준)
  - [x] 장애/차단/재시도 필드 추가 (`attempt_count`, `next_retry_at`, `error_*`)
    - [x] `notifications` 테이블에 재시도/에러 필드 추가
      - [x] `attempt_count`, `max_attempts`, `next_retry_at` 필드 추가
      - [x] `error_code`, `error_message`, `error_details` 필드 추가
      - [x] `delivery_status` 필드 추가 (pending, sent, failed, blocked)
      - [x] 재시도 대기 중인 알림 조회 인덱스 추가
    - [x] `conversion_events` 테이블에 재시도/에러 필드 추가
      - [x] `attempt_count`, `max_attempts`, `next_retry_at` 필드 추가
      - [x] `error_code`, `error_message`, `error_details` 필드 추가
      - [x] `processing_status` 필드 추가 (pending, processing, completed, failed, blocked)
      - [x] 재시도 대기 중인 이벤트 조회 인덱스 추가
    - [x] `recommendations` 테이블에 재시도/에러 필드 추가 (선택적)
      - [x] `generation_attempt_count`, `generation_max_attempts`, `generation_next_retry_at` 필드 추가
      - [x] `generation_error_code`, `generation_error_message`, `generation_error_details` 필드 추가
      - [x] 재시도 대기 중인 추천 조회 인덱스 추가
    - [x] 재시도 로직을 위한 헬퍼 함수 추가
      - [x] `calculate_next_retry_at()` 함수 (지수 백오프 알고리즘)
      - [x] `can_retry()` 함수 (재시도 가능 여부 확인)
    - [x] 재시도 대기 중인 레코드 조회 뷰 추가 (`v_retry_queue`)

**상품 데이터 수정 원칙** (참고: `docs/database-maintenance-guide.md`):

- ✅ `products` 테이블은 제한적 수정 가능 (개별 상품 정보 수정 허용)
- ❌ PK/FK 필드 수정 금지 (`id`, `iso_code_id` 등)
- ❌ 대량 일괄 수정 금지 (10건 이상은 마이그레이션 스크립트 필수)
- ✅ 삭제 대신 `is_active = false` 사용

---

## 목표 점수 달성을 위한 구체적 작업 계획

**목표**: 전체 평균 3.3/5 → **4.0/5** 달성 (각 영역별 목표 점수 달성)

### 1. 성능/로딩: 3.8/5 → 4.2/5 (0.4 향상 필요)

**우선순위**: 높음 | **예상 기간**: 2-3주

#### 단기 작업 (1-2주)

- [x] **이미지 프리로딩 구현** ✅ - Hero 섹션 이미지 프리로딩, 예상 효과: LCP 2.8초 → 2.3초
- [x] **코드 스플리팅 확대** ✅ - 라우트 레벨 코드 스플리팅, 예상 효과: 초기 번들 350KB → 280KB
- [x] **API 응답 최적화** ✅ - 스트리밍 응답 최적화, 불필요한 필드 제거, 예상 효과: TTFB 560ms → 450ms

#### 중기 작업 (3-4주)

- [x] **서버 컴포넌트 전환** ✅ - hero, features, how-it-works, footer 전환 완료, 예상 효과: 번들 크기 20-30% 추가 감소
- [x] **클라이언트 사이드 캐싱 도입** ✅ - SWR 도입 및 전역 설정, API hooks 생성, 예상 효과: 반복 요청 시 응답 시간 80% 감소
- [x] **정적 생성 (SSG) 확대** ✅ - 정적 페이지 SSG 적용, ISR 전략 최적화, 예상 효과: 정적 페이지 TTFB 50% 감소

**예상 점수 향상**: +0.4 (3.8 → 4.2)

---

### 2. UX 반응성: 3.9/5 → 4.3/5 (0.4 향상 필요)

**우선순위**: 높음 | **예상 기간**: 2-3주

#### 단기 작업 (1-2주)

- [x] **상담→추천 플로우 완료율 측정 및 개선** ✅ - 추천 페이지 방문 추적, CTA 강조, 관리자 대시보드 표시, 예상 효과: 완료율 50% → 70%
- [x] **로딩 상태 피드백 개선** ✅ - 공통 로딩 컴포넌트 생성, 모든 비동기 작업에 로딩 스피너/스켈레톤 추가, 에러 메시지 개선
- [x] **접근성 추가 개선** ✅ - Skip to main content, 키보드 네비게이션, 스크린 리더 지원, WCAG AA 준수, 예상 효과: 접근성 점수 10% 향상

#### 중기 작업 (3-4주)

- [ ] **사용자 피드백 수집 시스템**

  - 보조기기 추천 완료 후 **개인 대시보드**에서 만족도/도움 여부 질문
  - 상담 종료 시 간단한 만족도 설문 (1-2문항)
  - 추천 페이지 또는 대시보드 위젯에 "도움이 되었나요?" 피드백 버튼
  - 예상 효과: 사용자 경험 개선 데이터 수집

- [ ] **에러 복구 경험 개선**
  - 네트워크 오류 시 자동 재시도
  - 오프라인 상태 감지 및 안내
  - 예상 효과: 에러로 인한 이탈률 30% 감소

**예상 점수 향상**: +0.4 (3.9 → 4.3)

---

### 3. AI 매칭 품질: 3.3/5 → 4.2/5 (0.9 향상 필요)

**우선순위**: 매우 높음 | **예상 기간**: 4-6주

#### 즉시 작업 (1주)

- [x] **실제 정확도 측정 시스템 구축** ✅ - ICF/ISO 정확도 측정 스크립트, 관리자 대시보드 UI
- [x] **피드백 데이터 분석** ✅ - 피드백 분석 API 및 대시보드, 클릭률/구매 전환율 기반 매칭 품질 평가

#### 단기 작업 (2-3주)

- [x] **하이브리드 매칭 시스템 최적화** ✅ - 가중치 설정 테이블, A/B 테스트 시스템, 성능 로깅, 예상 효과: 정확도 5-10% 향상
- [x] **벡터 DB 활용 강화** ✅ - 임베딩 품질 개선, 동적 임계값 조정, 향상된 벡터 검색 함수, 예상 효과: 정확도 10-15% 향상

#### 중기 작업 (4-6주)

- [x] **실시간 학습 시스템 구축** ✅ - 실시간 학습 설정/통계 테이블, 피드백 스코어러 통합, 관리 API, 예상 효과: 시간이 지날수록 정확도 지속 향상
- [x] **ICF 코드 확장 자동화** ✅ - 자동 확장 설정/후보 테이블, 확장 함수, 관리 API, 예상 효과: 새로운 케이스 대응 속도 향상

**예상 점수 향상**: +0.9 (3.3 → 4.2)

---

### 4. 구매/전환: 2.2/5 → 4.0/5 (1.8 향상 필요)

**우선순위**: 매우 높음 | **예상 기간**: 6-8주

#### 즉시 작업 (1주)

- [x] **전환율 측정 시스템 구축** ✅ - 전환율 측정 API 및 관리자 대시보드, 목표: CTA 클릭률 25%, 문의 연결 10% 달성 여부 확인

#### 단기 작업 (2-4주)

- [x] **CTA 최적화 (A/B 테스트)** ✅ - A/B 테스트 시스템 구축, ProductRecommendationCard 통합, 예상 효과: 클릭률 30-50% 향상
- [x] **인센티브 시스템 활성화** ✅ - 포인트/쿠폰 시스템, Toast 알림, 쿠폰 샵 페이지, 예상 효과: 전환율 20-30% 향상
- [x] **추천 카드 개선** ✅ - 이미지 품질 향상 (85→95), aspect-video 비율, hover 효과, 예상 효과: 클릭률 15-25% 향상

#### 중기 작업 (5-8주)

- [ ] **리마인더 시스템 강화**

  - 7일 후 리마인더 (추천 재확인)
  - 14일 후 리마인더 (K-IPPA 평가)
  - 이메일/SMS 알림 추가 (선택적)
  - 예상 효과: 재방문율 40% 향상, 전환율 25% 향상

- [ ] **전문가 상담 연결 시스템**

  - 전문가 상담 신청 프로세스 구축
  - 상담 예약 시스템 연동
  - 예상 효과: 문의 연결율 10% 달성

- [ ] **지원제도 정보 강화**
  - 각 상품별 지원제도 정보 상세 표시
  - 지원제도 신청 가이드 제공
  - 예상 효과: 전환율 15-20% 향상

**예상 점수 향상**: +1.8 (2.2 → 4.0)

---

### 5. 운영/신뢰성: 4.0/5 → 4.5/5 (0.5 향상 필요)

**우선순위**: 중간 | **예상 기간**: 3-4주

#### 단기 작업 (1-2주)

- [x] **모니터링 시스템 강화** ✅ - GA4 실시간 대시보드, Supabase 로그 모니터링, 에러 알림 시스템, 예상 효과: 문제 감지 시간 80% 단축
- [x] **자동 복구 시스템** ✅ - API 오류 자동 재시도 (Exponential Backoff), DB 연결 자동 재연결, 예상 효과: 가용성 99.5% → 99.8%

#### 중기 작업 (3-4주)

- [ ] **백업 시스템 자동화**

  - 일일 데이터베이스 스냅샷 자동 생성
  - 백업 검증 및 복구 테스트
  - 예상 효과: 데이터 손실 위험 90% 감소

- [ ] **성능 모니터링**
  - Core Web Vitals 실시간 추적
  - API 응답 시간 모니터링
  - 성능 저하 시 자동 알림
  - 예상 효과: 성능 문제 조기 발견

**예상 점수 향상**: +0.5 (4.0 → 4.5)

---

### 6. 비즈니스 스케일: 2.8/5 → 4.0/5 (1.2 향상 필요)

**우선순위**: 중간 | **예상 기간**: 8-12주

#### 단기 작업 (2-4주)

- [ ] **파트너 PoC 실행**

  - 복지용구 센터 1곳 선정 및 연락
  - PoC 제안서 제출 및 계약
  - 파일럿 진행 (최소 3개월)
  - 예상 효과: 실제 사용 사례 확보, 피드백 수집

- [ ] **유저 인터뷰 진행**
  - 인터뷰 대상자 모집 (최소 10명)
  - 인터뷰 가이드에 따른 체계적 인터뷰 진행
  - 인터뷰 결과 분석 및 개선 사항 도출
  - 예상 효과: 사용자 니즈 파악, UX 개선

#### 중기 작업 (5-8주)

- [ ] **KPI 대시보드 고도화**

  - 실시간 KPI 모니터링 (추천 CTR, K-IPPA 참여율)
  - 트렌드 분석 및 예측
  - 예상 효과: 데이터 기반 의사결정

- [ ] **파트너 확대**
  - 추가 파트너 후보 발굴
  - 파트너 온보딩 프로세스 구축
  - 예상 효과: 비즈니스 확장 기반 마련

#### 장기 작업 (9-12주)

- [ ] **유료 PoC 설계 및 실행**
  - 추천/분석 리포트 유료화 모델 설계
  - 가격 정책 수립
  - 유료 PoC 실행
  - 예상 효과: 수익 모델 검증

**예상 점수 향상**: +1.2 (2.8 → 4.0)

---

## 추후 필요한 작업 계획

**현재 프로젝트 상태**: MVP 기준으로 대부분 완료 (88% 달성률)  
**다음 단계**: 실제 사용자 데이터 수집 및 측정 결과 기반 개선

### 즉시 시작 (1-2주)

- [x] **AI 매칭 품질 측정 실행**: 내부 QA 테스트 케이스 실행, ICF/ISO 정확도 측정 스크립트 실행, 관리자 대시보드에서 메트릭 확인 ✅ (구현 완료 및 실행됨)
- [x] **전환율 측정 데이터 수집**: 실제 사용자 데이터 수집, CTA 클릭률/구매 전환율 측정, 전환 퍼널 분석 ✅ (구현 완료, 데이터 수집 시스템 준비됨)
- [x] **정적 생성 (SSG) 확대**: `/about`, `/privacy`, `/terms` 등 정적 페이지 SSG 적용 ✅ (export const dynamic = 'force-static' 추가 완료)

### 단기 작업 (3-4주)

- [x] **추천 카드 개선**: 가격 정보/리뷰 표시, 상품 데이터 수집 시 가격/리뷰 정보 포함 ✅ (구현 완료)
- [x] **리마인더 시스템 강화**: 7일/14일 후 리마인더, 이메일/SMS 알림 추가 ✅ (구현 완료)
- [x] **사용자 피드백 수집 시스템**: 상담 종료 설문, 추천 페이지 피드백 버튼 ✅ (구현 완료)
- [x] **백업 시스템 자동화**: 일일 DB 스냅샷 자동 생성, 백업 검증 및 복구 테스트 ✅ (구현 완료)
- [x] **성능 모니터링**: Core Web Vitals 추적, API 응답 시간 모니터링, 성능 저하 시 자동 알림 ✅ (구현 완료)

### 중기 작업 (5-8주)

- [x] **하이브리드 매칭 시스템 최적화**: 실제 사용자 데이터 기반 가중치 최적화, A/B 테스트 (2025-03-03 완료)
  - 매칭 성능 로그 분석 기반 가중치 최적화 크론 작업 구현 (`/api/cron/optimize-matching-weights`)
  - 주 1회 자동 최적화 실행 (매주 월요일 새벽 4시)
  - 최고 성능 설정 자동 생성 및 활성화 제안
- [x] **벡터 DB 활용 강화**: 임베딩 품질 개선, 시맨틱 매칭 임계값 동적 조정 (2025-03-03 완료)
  - 실제 사용자 데이터 기반 동적 임계값 조정 크론 작업 구현 (`/api/cron/adjust-vector-thresholds`)
  - 주 1회 자동 조정 실행 (매주 화요일 새벽 5시)
  - 클릭률 기반 임계값 최적화
- [x] **실시간 학습 시스템 활성화**: 설정 활성화, 피드백 실시간 반영 (2025-03-03 완료)
  - 기본 실시간 학습 설정 활성화 마이그레이션 생성 (`20250303000000_activate_realtime_learning_default.sql`)
  - 기본 설정 자동 활성화 및 기존 설정 비활성화
- [x] **ICF 코드 확장 자동화 실행**: 스케줄러 설정, 자동 확장 워크플로우 주기적 실행 (2025-03-03 완료)
  - ICF 코드 자동 확장 크론 작업 구현 (`/api/cron/icf-auto-expand`)
  - 주 1회 자동 확장 실행 (매주 수요일 새벽 3시)
  - 활성화된 설정 기반 자동 확장 후보 생성 및 실행
- [ ] **파트너 PoC 실행**: 복지용구 센터 선정 및 파일럿 진행 (비즈니스 작업)
- [ ] **유저 인터뷰 진행**: 인터뷰 대상자 모집 및 체계적 인터뷰 진행 (비즈니스 작업)
- [x] **KPI 대시보드 고도화**: 실시간 KPI 모니터링, 트렌드 분석 (2025-03-03 완료)
  - 트렌드 분석 API 구현 (`/api/admin/analytics/trends`)
  - 일별/주별 트렌드 데이터 제공
  - 클릭률, 참여율, 효과성 점수 트렌드 분석
  - 실시간 모니터링 강화

### 장기 작업 (9-12주)

- [ ] **유료 PoC 설계 및 실행**: 유료화 모델 설계, 가격 정책 수립
- [ ] **수익 모델 검증**: 제휴 수수료 추적, ROI 분석
- [ ] **파트너 온보딩 프로세스 구축**: 온보딩 가이드 작성, 자동화된 워크플로우

---

## 우선순위별 작업 로드맵

### Week 1-2: 측정 및 검증

- AI 매칭 품질 측정 실행 (내부 QA, ICF/ISO 정확도 측정)
- 전환율 측정 데이터 수집 (실제 사용자 데이터, CTA 클릭률, 구매 전환율)
- 성능 벤치마크 측정 (LCP, TTFB, 번들 크기, Lighthouse 점수)

### Week 3-4: 즉시 개선

- 성능 최적화 (SSG 확대)
- CTA A/B 테스트 실행 및 최적화
- UX 개선 (로딩 피드백, 접근성, 사용자 피드백 수집)

### Week 5-8: 핵심 기능 강화

- AI 매칭 품질 고도화 (하이브리드 매칭 최적화, 벡터 DB 강화, 실시간 학습 활성화, ICF 확장 자동화)
- 전환율 개선 (추천 카드 개선, 리마인더 시스템 강화)
- 운영/신뢰성 강화 (백업 자동화, 성능 모니터링)

### Week 9-12: 비즈니스 확장

- 파트너 PoC 실행 및 유저 인터뷰 진행
- 비즈니스 모델 검증 (유료 PoC, 수익 모델 검증, 파트너 온보딩)

---

## 예상 최종 달성률

| 단계                  | 달성률  | 주요 작업                                        |
| --------------------- | ------- | ------------------------------------------------ |
| **현재**              | **88%** | MVP 기준 대부분 완료                             |
| **즉시 작업 완료 시** | **90%** | 측정 및 검증, 성능 최적화 마무리                 |
| **단기 작업 완료 시** | **92%** | 구매/전환 개선, UX 반응성 개선, 운영/신뢰성 강화 |
| **중기 작업 완료 시** | **95%** | AI 매칭 품질 고도화, 비즈니스 스케일 확장        |
| **장기 작업 완료 시** | **98%** | 비즈니스 모델 검증, 지속 가능한 성장 기반 마련   |

**목표**: **95%+ 달성률** (4.0/5 점수 달성)

---

## 핵심 권장사항

### 1. 즉시 실행: 측정 시스템 활용

**우선순위**: 🔥 최우선

- 측정 시스템은 이미 구축되어 있음
- 실제 데이터 수집 및 분석이 가장 시급함
- 측정 결과를 바탕으로 개선 포인트 도출

**실행 방법**:

- 내부 QA 테스트 케이스 즉시 실행
- 베타 테스트 또는 실제 사용자 트래픽 확보
- 관리자 대시보드에서 지표 모니터링 시작

---

### 2. 단기 집중: 구매/전환율 개선

**우선순위**: 🔥 매우 높음

- 가장 큰 점수 향상 가능 (2.2/5 → 4.0/5, +1.8)
- 비즈니스 성공에 직접적인 영향
- 이미 구축된 시스템 활용 가능 (A/B 테스트, 인센티브)

**실행 방법**:

- 전환율 측정 데이터 수집 (1-2주)
- A/B 테스트 실행 및 최적화
- 인센티브 시스템 활성화
- 추천 카드 개선 (가격, 리뷰)

---

### 3. 중기 전략: AI 매칭 품질 고도화

**우선순위**: 🔥 매우 높음

- 핵심 경쟁력
- 이미 구축된 시스템 최적화 및 활성화
- 시간이 지날수록 정확도 지속 향상

**실행 방법**:

- 실제 사용자 데이터 기반 가중치 최적화
- 실시간 학습 시스템 활성화
- ICF 코드 확장 자동화 실행
- 벡터 DB 활용 강화

---

### 4. 장기 비전: 비즈니스 스케일 확장

**우선순위**: 🟡 중간

- 지속 가능한 성장 기반 마련
- 실제 사용 사례 확보
- 수익 모델 검증

**실행 방법**:

- 파트너 PoC 실행
- 유저 인터뷰 진행
- 비즈니스 모델 검증

---

## 중요 참고사항

### 현재 프로젝트 상태

- ✅ **MVP 기준으로 대부분 완료** (88% 달성률)
- ✅ **측정 시스템 구축 완료** (AI 품질, 전환율, 피드백 분석)
- ✅ **고도화 시스템 구축 완료** (하이브리드 매칭, 실시간 학습, A/B 테스트)
- ⚠️ **실제 데이터 수집 및 검증 필요**

### 다음 단계

1. **측정 및 검증**: 구축된 시스템을 활용하여 실제 데이터 수집
2. **데이터 기반 개선**: 측정 결과를 바탕으로 개선 포인트 도출 및 실행
3. **지속적인 최적화**: 실시간 학습 시스템을 활용한 지속적인 개선

---

_각 Phase 종료 시 문서(`README` or Notion)로 진행 상황을 요약하여 다음 Phase 준비에 활용하세요._
