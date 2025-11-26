# LinkAble 1개월 MVP Roadmap (4 Phases)

문서 참고: `docs/DIR.md`, `docs/Mermaid.md`, `docs/Read.md`, `docs/MRD.md`, `docs/PRD.md`, `docs/TRD.md`

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

## Phase 1 — Foundation & 환경 구축 (Week 1)

- [x] `DIR.md` 구조대로 디렉터리 생성 및 정리 (`core/assessment`, `core/matching`, `core/validation` 등).
- [x] Next.js 15 + Tailwind v4 설정 확인 (`next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`).
- [x] 공통 유틸 세팅: `lib/utils.ts`, `lib/translations.ts`, 테마/언어 Provider 초기화.
- [x] 환경 변수 템플릿(`.env.example`)에 Clerk/Supabase/Gemini 키 정의. _(현재 `docs/env.example`, 추후 `.env.example`로 복사)_
- [x] Supabase 스키마(`docs/Linkable-MVP.sql`)를 기준으로 테이블/관계 점검, RLS 비활성 확인.
- [x] Logging 기본 정책 수립: 핵심 이벤트용 헬퍼 함수 또는 최소 `console.log` 위치 정의.

### Deliverables

- 정리된 폴더 구조
- 동작하는 Next.js dev 환경
- `.env.example`, 기본 로그 가이드

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

## Phase 3 — Matching & UX (Week 3)

- [x] `core/matching/iso-mapping.ts`: d/e 코드 → ISO 9999 매핑 테이블 작성.
- [x] `core/matching/ranking.ts`: 클릭률/등록순 기반 간단 가중치 함수.
- [x] `app/api/products/route.ts`: 분석 결과 기반 ISO 검색, 추천 사유 생성, 클릭 로그 기록.
- [x] 랜딩/메인 페이지 (`app/(main)/page.tsx`): MRD/PRD 기반 헤더 카피, KPI, CTA, 메타 태그 반영.
- [x] 추천 페이지 및 카드 UI (`components/features/product/` + `app/(main)/recommendations`).
- [x] Dashboard 기본 뼈대 (`app/(main)/dashboard/page.tsx`): 상담 이력/추천 상태 리스트, CTA 버튼.
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
- [ ] MVP 제외 범위 준비:
  - 결제 연동(PG) 설계 메모.
  - 관리자용 통계/대시보드.
  - 커뮤니티 기능(사용자 후기/질문) MVP 범위 정의.

## Phase 5 — 프론트엔드 완성도 향상 (Post-MVP)

### 5.1 상담 완료 → 추천 페이지 연동 (최우선)

**목표**: 핵심 비즈니스 플로우 완성. 상담 완료 후 사용자가 자연스럽게 추천 페이지로 이동할 수 있도록 합니다.

- [x] **채팅 인터페이스에 추천 CTA 추가**:

  - [x] ICF 분석 완료 감지: `data.icfAnalysis && data.consultationId` 확인 (이미 111-124줄에 로직 존재)
  - [x] "추천 보기" 버튼 컴포넌트 추가
    - 위치: ICF 분석 완료 후, K-IPPA 폼 아래
    - 스타일: Primary 버튼, 큰 크기 (min-h-[44px])
    - 클릭 시: `/recommendations?consultationId={consultationId}`로 이동
    - 로딩 상태: 추천 생성 중일 때 스피너 표시
  - 위치: `components/chat-interface.tsx` (ICF 분석 완료 후)

- [x] **상담 완료 후 자동 추천 생성**:

  - [x] 옵션 A (권장): 프론트엔드에서 추천 미리 생성
    - `components/chat-interface.tsx`에서 ICF 분석 완료 시 `app/api/products/route.ts` 호출
    - `GET /api/products?consultationId={consultationId}&limit=3` 요청
    - 추천 생성 완료 후 CTA 버튼 활성화
    - 구현: `handleSend` 함수 내에서 ICF 분석 완료 시 자동 호출
  - [ ] 옵션 B: 백엔드에서 자동 생성 (미구현, 옵션 A로 대체)

- [x] **채팅 내 추천 카드 미리보기** (선택적, Phase 5.1 완료 후):
  - [x] 상위 2-3개 추천 카드를 채팅 말풍선과 함께 표시
  - [x] 이미지가 없으면 플레이스홀더(`Package` 아이콘)로 대체
  - [x] 반응형 그리드 레이아웃 (모바일: 1열, 태블릿: 2열, 데스크톱: 3열)
  - [x] "더 보기" 버튼으로 전체 추천 페이지 이동
  - [x] Mermaid 다이어그램 명세 반영 ("FE->>U: 채팅 말풍선 + 추천 상품 카드 표시")

### 5.2 멀티모달 입력 기능 구현

- [x] **STT (음성 입력) 구현**:

  - [x] Web Speech API 연동
    - `window.SpeechRecognition` 또는 `window.webkitSpeechRecognition` 사용
    - 언어: `ko-KR`
    - `continuous: false`, `interimResults: false`
  - [x] `components/chat-interface.tsx`의 `toggleVoiceRecording` 함수 구현
  - [x] 음성 인식 중 비주얼 피드백 (펄스 애니메이션 및 빨간색 버튼)
  - [x] 브라우저 호환성 체크 및 폴백 처리
    - Chrome, Edge 지원
    - Safari/FF 폴백: 안내 메시지 표시 및 버튼 비활성화
  - [x] 에러 처리: 인식 실패 시 사용자 안내 (no-speech, not-allowed 등)
  - [x] 상태 관리: `isRecording` 상태로 버튼 활성/비활성, 인식 결과를 `input` 상태에 자동 입력
  - 위치: `components/chat-interface.tsx`

- [x] **이미지 업로드 (Gemini Vision) 구현**:
  - [x] 파일 업로드 UI 컴포넌트 (인라인 구현)
    - 파일 선택 버튼 (Paperclip 아이콘)
    - 이미지 미리보기 및 제거 기능
    - 파일 크기 제한 (5MB)
    - 파일 타입 검증 (image/\*)
  - [x] Gemini Vision API 연동
    - 이미지를 base64로 인코딩
    - `app/api/chat/route.ts`에 `image` 파라미터 추가
    - `lib/gemini.ts`의 `callGemini` 함수에 이미지 지원 추가
    - Gemini API에 이미지와 텍스트 함께 전송
  - [x] 이미지 분석 결과 시각화
    - Gemini Vision API가 이미지를 분석하여 환경 요소 추출
    - 분석 결과가 ICF 코드 및 추천에 반영됨
  - 위치: `components/chat-interface.tsx:173-174`

### 5.3 스트리밍 응답 구현

- [x] **Next.js AI SDK 스트리밍**:
  - [x] Next.js AI SDK 설치 및 설정
    - `pnpm install ai @ai-sdk/google`
  - [x] 백엔드 스트리밍
    - `app/api/chat/route.ts`에서 `streamText` + 커스텀 SSE 이벤트로 Gemini 응답 스트리밍
  - [x] 프론트엔드 스트리밍 처리
    - `components/chat-interface.tsx`에서 `ReadableStream` + SSE 파싱으로 실시간 텍스트 업데이트
  - [x] 실시간 타이핑 경험 개선
    - 기존 인디케이터 유지 + 말풍선 실시간 업데이트로 "링커가 생각 중" 상태를 시각적으로 표현
  - [x] 에러 처리 및 재연결 로직
    - SSE 오류 시 즉시 에러 이벤트 수신 후 사용자에게 안내 문구 표시

### 5.4 분석 결과 시각화 및 리포트

- [x] **ICF 분석 결과 시각화 컴포넌트**:

  - [x] `components/features/analysis/icf-visualization.tsx` 생성
  - [x] ICF 코드별 카테고리 표시
    - b (신체기능): 파란색 계열 배지
    - d (활동): 초록색 계열 배지
    - e (환경): 주황색 계열 배지
  - [x] 각 코드 설명 툴팁/모달
    - `core/assessment/icf-codes.ts` 데이터 기반 설명 노출
  - [x] 관련 ISO 코드 연결 표시
    - `isoHints` 배열을 칩 형태로 렌더링
  - [x] 분석 신뢰도 표시 (선택적)
    - 추출된 코드 수 기반의 간단한 Confidence 스코어
  - [x] 채팅 인터페이스에 분석 완료 시 자동 표시
    - SSE `analysis` 이벤트 수신 시 자동 렌더링

- [x] **상담 리포트 페이지** (`app/consultation/report/[id]/page.tsx`):

  - [x] 상담 요약 및 ICF 분석 결과 전체 표시
  - [x] 환경 요소 분석 결과 시각화
  - [x] 생성된 추천 목록 링크
  - [x] PDF 다운로드 기능 (선택적) — UI에 버튼/가이드 추가, 실제 PDF 생성은 후속 과제
  - [x] 분석/추천 데이터를 서버 컴포넌트에서 직접 조회 (`supabase` 서비스 클라이언트 활용)

- [ ] **상담 상세 페이지** (`app/consultation/[id]/page.tsx`):
  - [ ] 상담 메시지 전체 히스토리
  - [ ] 분석 결과 상세 확인
  - [ ] 생성된 추천 목록 및 상태
  - [ ] K-IPPA 평가 상태

### 5.5 페이지 구조 완성

- [ ] **K-IPPA 전용 페이지** (`app/dashboard/ippa/[recommendationId]/page.tsx`):

  - [ ] 독립 페이지로 K-IPPA 평가
  - [ ] 알림 링크에서 직접 접근 가능 (`/dashboard?evaluate={recommendationId}` 처리)
  - [ ] 평가 히스토리 확인
  - [ ] 이전 평가와 비교 기능

- [ ] **추천 상세 페이지** (`app/recommendations/[consultationId]/page.tsx`):

  - [ ] 특정 상담 기반 추천 전용 페이지
  - [ ] 상담 컨텍스트 표시
  - [ ] 필터링/정렬 옵션
  - [ ] 현재 쿼리 파라미터 방식에서 동적 라우트로 전환

- [ ] **대시보드 상담 이력 상세 보기**:
  - [ ] 상담 카드 클릭 시 상세 페이지로 이동
  - [ ] 메시지 히스토리 전체 보기
  - [ ] 분석 결과 재확인
  - [ ] 추천 재조회 기능

### 5.6 UX 개선

- [ ] **ICF 코드 상세 설명**:

  - [ ] 코드 클릭 시 설명 툴팁/모달
  - [ ] 카테고리별 색상 구분 (b=파랑, d=초록, e=주황)
  - [ ] 관련 ISO 코드 연결 표시

- [ ] **실시간 피드백 개선**:
  - [ ] AI 응답 생성 중 애니메이션 개선
  - [ ] "링커가 생각 중입니다..." 메시지 스타일링
  - [ ] 로딩 스켈레톤 UI 개선

### Deliverables (Phase 5)

- 멀티모달 입력 (STT, 이미지) 완전 구현
- 스트리밍 응답으로 실시간 상담 경험 개선
- ICF 분석 결과 시각화 및 리포트 페이지
- 완전한 페이지 구조 (상담 상세, 리포트, K-IPPA 전용 페이지)
- **상담 완료 → 추천 페이지 자동 연동 플로우** (핵심 비즈니스 플로우)
- 향상된 사용자 경험

### Deliverables (Phase 4)

- K-IPPA 제출 Loop
- 대시보드 Validation UI
- QA 체크리스트 (A11y, SEO, 로깅)

---

_각 Phase 종료 시 문서(`README` or Notion)로 진행 상황을 요약하여 다음 Phase 준비에 활용하세요._
