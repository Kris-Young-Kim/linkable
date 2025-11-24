# LinkAble 1개월 MVP Roadmap (4 Phases)

문서 참고: `docs/DIR.md`, `docs/Mermaid.md`, `docs/Read.md`, `docs/MRD.md`, `docs/PRD.md`, `docs/TRD.md`

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

- [ ] `core/assessment/icf-codes.ts`: ICF Core Set/매핑 데이터 작성.
- [ ] `core/assessment/prompt-engineering.ts`: Gemini System Prompt + Few-shot, 의료 용어 차단 로직 포함.
- [ ] `core/assessment/parser.ts`: Gemini JSON 응답 파싱 + zod validation.
- [ ] `app/api/chat/route.ts`:
  - Clerk 세션 검증, 사용자 Role 저장.
  - 텍스트/음성/이미지 입력 처리 → Gemini 호출 → 파싱.
  - 분석 결과를 `analysis_results`/`chat_messages` 테이블에 저장, 단계별 로그 남기기.
- [ ] `components/features/chat/` 구성: `ChatInterface`, `ChatBubble`, STT 버튼, Skeleton, 접근성 속성.

### Deliverables

- 동작하는 AI 상담 플로우(입력 → Gemini → 분석 저장)
- 최소한의 채팅 UI
- 로그: 상담 시작, LLM 응답, 추가 질문

## Phase 3 — Matching & UX (Week 3)

- [ ] `core/matching/iso-mapping.ts`: d/e 코드 → ISO 9999 매핑 테이블 작성.
- [ ] `core/matching/ranking.ts`: 클릭률/등록순 기반 간단 가중치 함수.
- [ ] `app/api/products/route.ts`: 분석 결과 기반 ISO 검색, 추천 사유 생성, 클릭 로그 기록.
- [ ] 랜딩/메인 페이지 (`app/(main)/page.tsx`): MRD/PRD 기반 헤더 카피, KPI, CTA, 메타 태그 반영.
- [ ] 추천 페이지 및 카드 UI (`components/features/product/` + `app/(main)/recommendations`).
- [ ] Dashboard 기본 뼈대 (`app/(main)/dashboard/page.tsx`): 상담 이력/추천 상태 리스트, CTA 버튼.

### Deliverables

- 분석 → 추천 → 아웃링크까지 흐름 구현
- 랜딩/추천 UI 정리 (접근성 포함)
- 클릭/추천 로그 수집

## Phase 4 — Validation & 하드닝 (Week 4)

- [ ] `core/validation/ippa-calculator.ts`: `(pre - post) * importance` 계산 함수.
- [ ] `core/validation/feedback-analyser.ts`: 간단한 감성 분석/텍스트 요약 틀.
- [ ] `app/api/ippa/route.ts`: 설문 제출 처리, 계산, DB 저장, 포인트 적립, 로그 남기기.
- [ ] Dashboard 내 K-IPPA 섹션 및 `app/(main)/dashboard/ippa` 폼 UI (`components/features/ippa/`).
- [ ] +14일 리마인더 트리거 설계 (예: CRON, Edge Scheduler 메모만 우선 작성).
- [ ] QA & 폴리싱:
  - 접근성 체크 (키보드, 스크린리더, 색 대비).
  - SEO 메타 태그 (`app/layout.tsx`) 최종 확인.
  - 주요 유틸 단위 테스트 or 수동 테스트 시나리오.

### Deliverables

- K-IPPA 제출 Loop
- 대시보드 Validation UI
- QA 체크리스트 (A11y, SEO, 로깅)

---

_각 Phase 종료 시 문서(`README` or Notion)로 진행 상황을 요약하여 다음 Phase 준비에 활용하세요._
