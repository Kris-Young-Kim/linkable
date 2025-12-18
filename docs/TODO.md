# LinkAble 1개월 MVP Roadmap

문서 참고: `docs/DIR.md`, `docs/Mermaid.md`, `docs/Read.md`, `docs/MRD.md`, `docs/PRD.md`, `docs/TRD.md`

## 목차

1. [최근 완료된 작업](#최근-완료된-작업)
2. [핵심 기능 흐름](#핵심-기능-흐름)
3. [사용자 여정](#사용자-여정)
4. [Phase 1 — Foundation & 환경 구축](#phase-1--foundation--환경-구축)
5. [Phase 2 — Assessment 엔진](#phase-2--assessment-엔진)
6. [Phase 3 — Matching & UX](#phase-3--matching--ux)
7. [Phase 4 — Validation & 하드닝](#phase-4--validation--하드닝)
8. [Phase 4.5 — ICF 코드 확장 전략](#phase-45--icf-코드-확장-전략)
9. [Phase 4.6 — 매칭 정확도 개선](#phase-46--매칭-정확도-개선)
10. [Phase 4.7 — RLS 정책 활성화 및 Clerk JWT 통합](#phase-47--rls-정책-활성화-및-clerk-jwt-통합)
11. [Phase 5 — 프론트엔드 완성도 향상](#phase-5--프론트엔드-완성도-향상)
12. [Post-MVP 전략](#post-mvp-전략)

---

## 최근 완료된 작업

### 2025-02-18: RLS 정책 활성화

- ✅ RLS 정책 생성 및 활성화
  - 모든 테이블에 대한 RLS 정책 작성
  - 헬퍼 함수 생성 (`get_current_user_id`, `get_current_user_role`, `is_admin_or_manager`)
  - 마이그레이션 파일 생성 및 적용
  - 테스트 스크립트 작성

### 2025-02-17: 매칭 정확도 개선 시작

- ✅ 하이브리드 매칭 시스템 (규칙 + 시맨틱 + 지식 그래프)
- ✅ 피드백 수집 시스템 (클릭, 구매, K-IPPA 평가)
- ✅ 벡터 DB 구축 (Supabase pgvector 확장)

### 2025-02-11: ICF 코드 확장 전략

- ✅ 동적 ICF 코드 처리
- ✅ ICF 코드 사용 통계 수집 시스템
- ✅ 관리자 대시보드 UI
- ✅ 자동 확장 워크플로우
- ✅ AI 기반 ISO 매핑 힌트 자동 생성

### 2025-01-22: K-IPPA 사용자 여정 개선

- ✅ 채팅 인터페이스에서 K-IPPA 폼 제거
- ✅ 추천 페이지에 기초선 평가 제안 섹션 추가
- ✅ 기초선 평가 전용 페이지 생성
- ✅ ICF 활동 항목 통합

### 2025-01-10: 인프라/빌드 개선

- ✅ Next.js 16 `middleware` → `proxy` 전환
- ✅ Playwright 설정 정비
- ✅ 불필요 산출물 정리
- ✅ pnpm-lock 동기화 완료

### 기능/버그픽스

- ✅ 상담 피드백 API 오류 로깅 강화
- ✅ 피드백 저장 실패 시에도 원인 파악용 로그 추가

---

## 핵심 기능 흐름 (Core Flow)

```
사용자 활동 문제 입력 (채팅)
       ↓
ICF 분류 추출 (신체기능 b, 활동 d, 참여 p, 환경요소 e)
       ↓
ISO 9999 보조기기 분류 매칭
       ↓
쿠팡/유통업체 상품 연결 (아웃링크)
```

**구현 상태:**

- ✅ Phase 2: 사용자 입력 → ICF 추출 (완료)
- ✅ Phase 3: ISO 매칭 → 추천 생성 (완료)
- ⚠️ Phase 3: 쿠팡/유통업체 상품 연결 (부분 완료 - 아웃링크 구현됨, 상품 데이터 수집/동기화 필요)

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

### Deliverables

- 정리된 폴더 구조
- 동작하는 Next.js dev 환경
- `.env.example`, 기본 로그 가이드

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
  - [x] `lib/integrations/` 디렉터리 생성: 쿠팡/유통업체 API 연동 모듈 구조 설계.
  - [x] 상품 데이터 수집 전략 수립 (쿠팡 파트너스 API 또는 수동 등록 방식 결정).
  - [x] `app/api/products/sync/route.ts`: 상품 데이터 동기화 API (선택적, MVP에서는 수동 등록).
  - [x] `products` 테이블 초기 데이터 입력: ISO 9999 기준 대표 보조기기 샘플 데이터 (최소 20-30개).
  - [x] `purchase_link` 필드 검증: 아웃링크 연결 테스트 및 링크 유효성 확인 로직.
  - [x] 상품 카드 클릭 시 쿠팡/네이버 최저가 페이지로 아웃링크 연결 구현 확인.

### Deliverables

- 분석 → 추천 → 아웃링크까지 흐름 구현
- 랜딩/추천 UI 정리 (접근성 포함)
- 클릭/추천 로그 수집
- **상품 데이터베이스 구축 및 쿠팡/유통업체 연결 검증**

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

- [ ] **스케줄러 설정**
  - 자동 확장 워크플로우를 주기적으로 실행하는 크론 작업 설정
  - n8n 또는 Vercel Cron을 활용한 자동화

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

- [x] RLS 정책 생성 및 활성화
  - [x] 모든 테이블에 대한 RLS 정책 작성
  - [x] 헬퍼 함수 생성 (`get_current_user_id`, `get_current_user_role`, `is_admin_or_manager`)
  - [x] 테이블 존재 여부 확인 로직 추가
  - [x] 마이그레이션 파일 생성 및 적용 (`supabase/migrations/20250218000000_add_rls_policies.sql`)
  - [x] 테스트 스크립트 작성 (`scripts/test-rls-policies.ts`)

### 완료된 작업

- [x] **Clerk JWT를 Supabase JWT로 변환**
  - [x] JWT 생성 유틸리티 함수 생성 (`lib/supabase/jwt-helper.ts`)
    - [x] `jsonwebtoken` 패키지 설치
    - [x] `createSupabaseJWT` 함수 구현
    - [x] Clerk 사용자 정보를 기반으로 Supabase JWT 생성
    - [x] 커스텀 클레임에 `clerk_id` 추가
  - [x] Supabase 서버 클라이언트 수정 (`lib/supabase/server.ts`)
    - [x] `getSupabaseUserClient` 함수 추가
    - [x] Clerk 인증 정보를 기반으로 JWT 생성
    - [x] JWT를 사용하여 Supabase 클라이언트 생성
  - [x] 환경 변수 추가
    - [x] `SUPABASE_JWT_SECRET` 환경 변수 설정
    - [x] `.env.example` 업데이트
  - [x] API Route 수정
    - [x] `app/api/chat/route.ts`: `getSupabaseUserClient` 사용
    - [x] `app/api/consultations/route.ts`: `getSupabaseUserClient` 사용
    - [x] `app/api/products/route.ts`: `getSupabaseUserClient` 사용
    - [x] `app/api/recommendations/[id]/route.ts`: `getSupabaseUserClient` 사용
  - [x] RLS 헬퍼 함수 수정
    - [x] `get_current_user_id()` 함수 변수명 충돌 해결
    - [x] `get_current_user_role()` 함수 변수명 충돌 해결
    - [x] 마이그레이션 파일 생성 (`supabase/migrations/20250219000000_fix_ambiguous_clerk_id.sql`)
  - [x] 테스트 및 검증
    - [x] RLS 정책 종합 테스트 스크립트 생성 (`scripts/test-rls-policies-comprehensive.ts`)
    - [x] RLS 정책이 올바르게 작동하는지 확인
    - [x] 사용자별 데이터 접근 제어 테스트
    - [x] 관리자 권한 테스트
    - [x] 모든 테스트 통과 확인

### 향후 작업

- [ ] **클라이언트 측 인증 통합** (선택적)

  - [ ] Clerk JWT 템플릿 생성 (Supabase용)
  - [ ] 클라이언트 측 Supabase 클라이언트 수정
  - [ ] Clerk JWT를 Supabase에 전달하는 로직 구현

- [ ] **Supabase Edge Function 활용** (선택적)
  - [ ] Clerk JWT 변환 Edge Function 생성
  - [ ] Edge Function 배포 및 테스트

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

- JWT 생성 유틸리티 함수 생성 완료
- Supabase 서버 클라이언트 수정 완료
- 주요 API Route 수정 완료 (chat, consultations, products, recommendations)
- RLS 헬퍼 함수 변수명 충돌 해결 완료
- 종합 테스트 통과 확인 완료

**다음 단계** (선택적):

- 클라이언트 측 인증 통합
- Supabase Edge Function 활용

---

## Phase 5 — 프론트엔드 완성도 향상 (Post-MVP)

### 5.1 상담 완료 → 추천 페이지 연동 (최우선)

**목표**: 핵심 비즈니스 플로우 완성. 상담 완료 후 사용자가 자연스럽게 추천 페이지로 이동할 수 있도록 합니다.

- [x] **채팅 인터페이스에 추천 CTA 추가**:

  - [x] ICF 분석 완료 감지: `data.icfAnalysis && data.consultationId` 확인
  - [x] "추천 보기" 버튼 컴포넌트 추가
  - [x] 위치: ICF 분석 완료 후, K-IPPA 폼 아래
  - [x] 스타일: Primary 버튼, 큰 크기 (min-h-[44px])
  - [x] 클릭 시: `/recommendations/[consultationId]`로 이동
  - [x] 로딩 상태: 추천 생성 중일 때 스피너 표시

- [x] **상담 완료 후 자동 추천 생성**:

  - [x] 프론트엔드에서 추천 미리 생성
  - [x] `components/chat-interface.tsx`에서 ICF 분석 완료 시 `app/api/products/route.ts` 호출
  - [x] `GET /api/products?consultationId={consultationId}&limit=3` 요청
  - [x] 추천 생성 완료 후 CTA 버튼 활성화

- [x] **채팅 내 추천 카드 미리보기**:
  - [x] 상위 2-3개 추천 카드를 채팅 말풍선과 함께 표시
  - [x] 이미지가 없으면 플레이스홀더(`Package` 아이콘)로 대체
  - [x] 반응형 그리드 레이아웃 (모바일: 1열, 태블릿: 2열, 데스크톱: 3열)
  - [x] "더 보기" 버튼으로 전체 추천 페이지 이동

### 5.2 멀티모달 입력 기능 구현

- [x] **STT (음성 입력) 구현**:

  - [x] Web Speech API 연동
  - [x] 언어: `ko-KR`
  - [x] 음성 인식 중 비주얼 피드백 (펄스 애니메이션 및 빨간색 버튼)
  - [x] 브라우저 호환성 체크 및 폴백 처리
  - [x] 에러 처리: 인식 실패 시 사용자 안내

- [x] **이미지 업로드 (Gemini Vision) 구현**:
  - [x] 파일 업로드 UI 컴포넌트 (인라인 구현)
  - [x] 파일 크기 제한 (5MB)
  - [x] 파일 타입 검증 (image/\*)
  - [x] Gemini Vision API 연동
  - [x] 이미지 분석 결과 시각화

### 5.3 스트리밍 응답 구현

- [x] **Next.js AI SDK 스트리밍**:
  - [x] Next.js AI SDK 설치 및 설정
  - [x] 백엔드 스트리밍 (`streamText` + 커스텀 SSE 이벤트)
  - [x] 프론트엔드 스트리밍 처리 (`ReadableStream` + SSE 파싱)
  - [x] 실시간 타이핑 경험 개선
  - [x] 에러 처리 및 재연결 로직

### 5.4 분석 결과 시각화 및 리포트

- [x] **ICF 분석 결과 시각화 컴포넌트**:

  - [x] `components/features/analysis/icf-visualization.tsx` 생성
  - [x] ICF 코드별 카테고리 표시 (b=파랑, d=초록, e=주황)
  - [x] 각 코드 설명 툴팁/모달
  - [x] 관련 ISO 코드 연결 표시
  - [x] 분석 신뢰도 표시

- [x] **상담 리포트 페이지** (`app/consultation/report/[id]/page.tsx`):

  - [x] 상담 요약 및 ICF 분석 결과 전체 표시
  - [x] 환경 요소 분석 결과 시각화
  - [x] 생성된 추천 목록 링크
  - [x] PDF 다운로드 기능 (선택적)

- [x] **상담 상세 페이지** (`app/consultation/[id]/page.tsx`):
  - [x] 상담 메시지 전체 히스토리
  - [x] 분석 결과 상세 확인 (ICF 시각화 포함)
  - [x] 생성된 추천 목록 및 상태

### 5.5 페이지 구조 완성

- [x] **K-IPPA 전용 페이지** (`app/dashboard/ippa/[recommendationId]/page.tsx`):

  - [x] 독립 페이지로 K-IPPA 평가
  - [x] 알림 링크에서 직접 접근 가능
  - [x] 평가 히스토리 확인
  - [x] 이전 평가와 비교 기능

- [x] **추천 상세 페이지** (`app/recommendations/[consultationId]/page.tsx`):

  - [x] 특정 상담 기반 추천 전용 페이지
  - [x] 상담 컨텍스트 표시
  - [x] 필터링/정렬 옵션
  - [x] 동적 라우트로 전환

- [x] **대시보드 상담 이력 상세 보기**:
  - [x] 상담 카드 클릭 시 상세 페이지로 이동
  - [x] 메시지 히스토리 전체 보기
  - [x] 분석 결과 재확인

### 5.6 UX 개선

- [x] **ICF 코드 상세 설명**:

  - [x] 코드 클릭 시 설명 툴팁/모달
  - [x] Dialog 모달로 상세 정보 표시
  - [x] 카테고리별 색상 구분
  - [x] 관련 ISO 코드 연결 표시

- [x] **실시간 피드백 개선**:
  - [x] AI 응답 생성 중 애니메이션 개선
  - [x] "링커가 생각 중입니다..." 메시지 스타일링
  - [x] 로딩 스켈레톤 UI 개선

### 5.7 관리자 페이지 및 사용자/관리자 기능 분리

- [x] **사용자 대시보드 재구성**:

  - [x] 제목을 "내 상담"으로 변경
  - [x] AnalyticsDashboard 제거 (관리자 전용으로 이동)
  - [x] 개인 상담 이력 중심으로 단순화

- [x] **관리자 페이지 생성** (`/admin/dashboard`):

  - [x] 관리자 전용 접근 제어 (Clerk role: admin/expert)
  - [x] 전체 플랫폼 통계 표시
  - [x] 사용자별 종합 데이터 테이블
  - [x] 필터링 탭 (전체 사용자 / K-IPPA 평가 완료 / 활성 사용자)
  - [x] 헤더에 관리자 링크 자동 표시 (권한 있는 경우만)

- [x] **관리자 API 엔드포인트**:
  - [x] `GET /api/admin/analytics` - 전체 플랫폼 통계
  - [x] `GET /api/admin/users` - 사용자별 종합 데이터

### 5.8 네비게이션 개선

- [x] **GNB (Global Navigation Bar)**:

  - [x] `components/navigation/global-nav.tsx` 생성
  - [x] 모바일 Sheet Navigation, 언어 스위치 포함
  - [x] A11y/반응형 QA

- [x] **LNB (Local Navigation)**:

  - [x] `components/navigation/local-nav.tsx` 템플릿 작성
  - [x] `/recommendations/[id]`에 LNB 적용
  - [x] `/dashboard`에 LNB 적용

- [x] **SNB (Side Navigation)**:

  - [x] `components/navigation/side-nav.tsx` 작성
  - [x] `/admin/dashboard` 레이아웃에 SNB 적용

- [x] **FNB (Footer Navigation Bar)**:

  - [x] Footer 하단에 "Quick Links" 바 추가
  - [x] Footer 모바일 섹션에 언어 선택 드롭다운 추가

- [x] **Breadcrumbs**:
  - [x] `components/navigation/breadcrumbs.tsx` 구현
  - [x] 주요 페이지에 적용
  - [x] SEO/접근성 테스트

### Deliverables (Phase 5)

- 멀티모달 입력 (STT, 이미지) 완전 구현
- 스트리밍 응답으로 실시간 상담 경험 개선
- ICF 분석 결과 시각화 및 리포트 페이지
- 완전한 페이지 구조 (상담 상세, 리포트, K-IPPA 전용 페이지)
- **상담 완료 → 추천 페이지 자동 연동 플로우** (핵심 비즈니스 플로우)
- **사용자/관리자 기능 분리** (사용자 대시보드 단순화, 관리자 페이지 분리)
- 향상된 사용자 경험

---

## Post-MVP 전략

### 상품 데이터 수집 및 관리

#### 완료된 작업

- [x] 상품 데이터 수집 파이프라인 설계서 (`docs/product-sync-plan.md`) 작성
- [x] 수동 크롤링 스크립트 (`scripts/manual-product-import.ts`)
- [x] 웹 스크래핑 크롤러 구현
  - [x] Puppeteer/Playwright 기반 스크래퍼
  - [x] 쿠팡/네이버/11번가 등 주요 쇼핑몰 지원
  - [x] 보조기기 전문 쇼핑몰 지원 (7개 사이트)
  - [x] 크롤링 데이터 → DB 자동 등록 파이프라인
  - [x] 관리자 UI에 크롤링 기능 추가
- [x] 쿠팡 파트너스 API 연동 (`lib/integrations/coupang.ts`)
  - [x] 상품 검색 API 구현
  - [x] 상품 상세 정보 조회 API 구현
  - [x] 제휴 링크 자동 생성
  - [x] 구매 리포트 조회 API 구현
- [x] 구매 완료 추적 시스템 구현
  - [x] 쿠팡 파트너스 Postback URL 엔드포인트
  - [x] Meta Pixel 연동
  - [x] DB 스키마 업데이트
- [x] n8n Webhook 기반 수동 등록 워크플로우 구축

#### 진행 중인 작업

- [ ] n8n Schedule Trigger 기반 자동 크롤링 워크플로우 (쿠팡파트너스 API 확보 후)
- [ ] 상품 데이터 검증 유닛 테스트
- [ ] Admin UI에서 상품 수동 등록/수정 화면 추가
- [ ] 제휴 링크 상태 체크 함수 구현

### Post-MVP Score Improvement Strategy

| 영역            | 현재 점수 | 목표  | 핵심 지표                          | 실행 전략                                                                                                                                          |
| --------------- | --------- | ----- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 성능/로딩       | 3.0/5     | 4.2/5 | LCP ≤ 2.5s, TTFB 30%↓              | - Next.js 동적 import + Suspense<br/>- Hero/카드 이미지 `next/image` 전환 + prefetch<br/>- 추천/채팅 로딩 스켈레톤, SSE 에러 토스트                |
| UX 반응성       | 3.2/5     | 4.3/5 | 상담→추천 플로우 완료율 70%        | - 상담 종료 시 CTA 가시화 (추천 보기, 평가하기)<br/>- 버튼 상태/로딩/토스트 일관화<br/>- 접근성 체크리스트(포커스, SR 텍스트) 적용                 |
| AI 매칭 품질    | 3.3/5     | 4.2/5 | 내부 QA에서 ICF 정확도 85%         | - Keyword rule 추가(b2xx,d3xx,e1xx 등 도메인 확대)<br/>- QA 스크립트로 batch 테스트 자동화<br/>- 상담 종료 시 "ICF 정확성" 미니 설문 수집          |
| 구매/전환       | 2.2/5     | 4.0/5 | 추천 CTA 클릭률 25%, 문의 연결 10% | - 상품 카드에 `구매하기/지원제도` 버튼 추가<br/>- 추천 시 쿠폰/포인트 인센티브 및 7·14일 리마인더<br/>- 제휴 링크 클릭 이벤트 로그 → Supabase 집계 |
| 운영/신뢰성     | 3.4/5     | 4.5/5 | 오류 자동 로깅 100%, SLA 99.5%     | - Vercel/Logflare/Supabase Edge Function 모니터링<br/>- DB snapshot 스케줄링 및 알림<br/>- FAQ/가이드 모달, 예외 공지 템플릿                       |
| 비즈니스 스케일 | 2.8/5     | 4.0/5 | 파트너 PoC 1건, 유저 인터뷰 10회   | - 복지용구 센터·재활 병원과 파일럿 진행<br/>- 추천/분석 리포트 유료 PoC 설계<br/>- KPI 대시보드(추천 CTR, K-IPPA 참여율) 시각화                    |

> 진행 순서: (1) 성능 최적화 & UX 폴리싱 → (2) AI 품질 룰/검증 확장 → (3) CTA·전환 구조 개선 → (4) 운영/로깅 자동화 → (5) 파트너 PoC.

#### 성능/로딩 최적화

- [x] 추천/대시보드 페이지 주요 컴포넌트 동적 import + Suspense
- [x] Hero, 추천 카드, 대시보드 그래프 `next/image`/`ImageResponse`로 교체
- [x] SSE 스트림 로딩 스켈레톤/토스트 컴포넌트 추가
- [x] Lighthouse/Next-Profiler 측정 & 성능 회귀 테스트 문서화

#### UX 반응성 향상

- [x] 채팅/추천/대시보드 CTA 버튼 통일 (컴포넌트화)
- [x] 접근성 체크리스트 (포커스 링, SR 텍스트, 대비) 실행
- [x] 상담→추천 플로우 안내 모달/토스트 설계

#### AI 매칭 품질 강화

- [x] ICF Keyword Rule 세트 확장 (시각, 의사소통, 인지, 자세)
- [x] QA 스크립트 (`scripts/tests/icf-matching.test.ts`) 작성
- [x] 상담 종료 설문 UI 추가 ("분석 정확했나요?")

#### 구매/전환 장치

- [x] 추천 카드 CTA: 구매하기/지원제도/전문가 문의 버튼 추가
- [x] 포인트/쿠폰 인센티브 로직 설계 + DB 필드 추가
- [x] 클릭/전환 이벤트 로깅 + Analytics 대시보드와 연동

#### 운영/신뢰성

- [x] Observability 스택 구성 (Vercel Log Drains + Supabase Edge logging)
- [x] DB snapshot/백업 스케줄 자동화 문서화
- [x] 에러 대응 가이드/FAQ 모달 작성 및 연결

#### 비즈니스 스케일

- [x] 파트너 PoC 후보 리스트 + 제안서 템플릿 작성
- [x] 사용자 인터뷰 가이드 및 일정표 수립
- [x] KPI 대시보드(추천 CTR, K-IPPA 참여율) 시각화 MVP 제작

---

_각 Phase 종료 시 문서(`README` or Notion)로 진행 상황을 요약하여 다음 Phase 준비에 활용하세요._
