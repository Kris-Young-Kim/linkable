PRD (Product Requirements Document)
프로젝트명: LinkAble (링케이블) - AI 기반 보조기기 큐레이션 플랫폼
버전: v1.5 (Activity Analysis Enhanced)
작성일: 2024.05.20
문서 상태: Final Draft for MVP

1. 개요 (Product Overview)
   1.1 제품 비전
   "불편함을 가능성으로 연결하다 (Connecting Disabilities to Abilities)"
   LinkAble은 사용자의 자연어 호소를 ICF(국제기능분류) 기준으로 구조화하고, ISO 9999 표준 보조기기를 매칭하며, K-IPPA를 통해 효과성을 검증하는 '전주기적 보조공학 코디네이팅 서비스'이다.
   1.2 개발 목표 (MVP Goals)
   접근성 극대화: 텍스트 입력이 어려운 고령자를 위한 음성(STT) 및 이미지 기반 상담 구현.
   데이터 구조화: 비정형 상담 데이터를 ICF Code와 ISO Code로 자동 변환하는 파이프라인 구축.
   검증 루프 완성: 단순 구매에서 끝나는 것이 아니라, 사용 후 평가(K-IPPA) 데이터가 다시 AI 학습으로 이어지는 선순환 구조 확보.
   1.3 핵심 원칙 (Core Principles)
   Non-Medical: 의학적 진단/처방 용어 절대 배제 → 기능적(Functional) 해결책 제시.
   Evidence-based: 모든 추천은 임상적 근거(ICF, ISO)와 데이터(IPPA)에 기반함.
   Accessibility First: WCAG 2.1 AA 표준 준수 (필수).
2. 사용자 페르소나 (User Personas)
   👤 Persona A: 김철수 (72세, 파킨슨병 초기)
   신체 기능(Body Function): 손 떨림(b765), 근력 약화(b730).
   활동 제약(Activity): 숟가락질 시 국물을 흘림(d550), 작은 버튼 누르기 어려움.
   기술 수용도: 카카오톡 사용 가능, 타자 치기 힘듦.
   Needs: "말(Voice)로 하면 알아서 찾아주는 똘똘한 비서가 필요해."
   👤 Persona B: 이영희 (42세, 김철수 님의 딸)
   환경적 요소(Environment): 멀리 떨어져 살아 아버지를 자주 못 뵈움.
   심리적 요소: "잘못된 기기를 사드려서 다치실까 봐 걱정됨."
   Needs: 전문가가 검증한 제품이라는 확신(Validation)과 부모님의 만족도 확인.
3. 유저 스토리 & 활동 분석 (User Stories with Activity Analysis)
   우리는 사용자의 행동을 4단계 활동(Activity)으로 세분화하여 요구사항을 도출한다.
   Activity 1: 문제 호소 (Assessment Phase)
   User Story: "사용자는 자신의 불편함을 전문 용어가 아닌 일상 언어로 표현하고 싶어 한다."
   Step: 사용자가 "화장실 문턱 때문에 휠체어가 못 들어가"라고 말함.
   Requirement: AI는 이를 d460(이동), e155(건축물) 코드로 변환해야 함.
   Activity 2: 해결책 탐색 (Matching Phase)
   User Story: "사용자는 수많은 상품 중 내 몸에 딱 맞는 것만 골라보기를 원한다."
   Step: AI가 분석된 코드를 기반으로 ISO 9999 분류 중 '경사로(18 12 10)'를 필터링함.
   Requirement: 추천 사유("문턱 제거를 위해")가 명시된 카드 UI 제공.
   Activity 3: 구매 실행 (Action Phase)
   User Story: "사용자는 가장 저렴하고 빠르게 배송되는 곳에서 구매하고 싶어 한다."
   Step: 추천 카드를 클릭하면 쿠팡/네이버 최저가 페이지로 이동.
   Requirement: 아웃링크(Out-link) 방식의 커머스 브릿지 구현.
   Activity 4: 결과 확인 (Feedback Phase)
   User Story: "사용자는 이 기기가 실제로 도움이 되었는지 기록하고 보상받고 싶어 한다."
   Step: 2주 후 알림을 통해 "식사가 얼마나 편해지셨나요?" 설문 응답.
   Requirement: K-IPPA 점수 계산 로직 및 포인트 적립 시스템.
4. 기능 요구사항 (Functional Requirements)
   4.1 인증 및 계정 (Auth)
   FR-Auth-01: Clerk를 활용한 소셜 로그인 (카카오, 구글 필수).
   FR-Auth-02: 회원가입 시 '사용자(당사자)' vs '보호자/전문가' 유형 선택.
   FR-Auth-03: 초기 설정 시 Role을 메타데이터에 저장.
   4.2 AI 상담 엔진 (AI Core)
   FR-AI-01 (Chat Interface):
   Next.js AI SDK 활용 스트리밍 답변.
   STT(Speech-to-Text): Web Speech API 또는 OpenAI Whisper 활용 음성 입력 버튼.
   Image Input: Gemini Vision API를 통한 환경(문턱, 계단 등) 사진 분석.
   FR-AI-02 (Prompt Logic - 'Able Cordi'):
   System Prompt: "너는 16년 차 보조공학 코디네이터야. 의료 용어를 쓰지 말고 기능 중심으로 말해."
   Structured Output: AI 응답은 반드시 아래 JSON 포맷을 포함해야 함 (DB 저장용).
   code
   JSON
   {
   "icf_analysis": { "b": ["b765"], "d": ["d550"], "e": [] },
   "iso_recommendation": ["15 09 13"],
   "reasoning": "손 떨림을 보정하기 위해 무게감 있는 식사 도구를 추천합니다."
   }
   4.3 매칭 및 추천 시스템 (Recommendation Engine)
   FR-Match-01 (Filtering): AI가 추출한 iso_code와 DB의 products 테이블 내 iso_code 일치 항목 검색 (SQL Query).
   FR-Match-02 (Ranking): 유사 상품 노출 시 '클릭률'과 '평점' 가중치 반영 (MVP에서는 랜덤 or 등록순).
   FR-Match-03 (Display): 상품 카드에 [ISO 인증], [해결 가능 문제] 태그 자동 부착.
   4.4 사후 관리 시스템 (K-IPPA Validation)
   FR-IPPA-01 (Trigger): recommendations 테이블 생성일 기준 +14일 뒤 알림 발송.
   FR-IPPA-02 (Survey UI):
   Q1. 해결하고자 했던 문제 (AI가 요약한 내용 자동 입력).
   Q2. 중요도 (1~5점 별점).
   Q3. 사용 전 수행 난이도 vs 사용 후 수행 난이도 (슬라이더 UI).
   FR-IPPA-03 (Calculation): 결과 제출 시 (Pre - Post) \* Importance 점수 계산 후 ippa_evaluations 테이블 저장.
5. 비기능 요구사항 (Non-Functional Requirements)
   5.1 데이터베이스 & 보안
   NFR-DB-01: Supabase RLS(Row Level Security) 정책 적용 (본인 상담 내역만 조회 가능).
   NFR-Sec-01: 개인정보(민감 정보) 암호화 저장.
   5.2 성능 (Performance)
   NFR-Perf-01: AI 응답 대기 시간 동안 '스켈레톤 UI' 또는 '에이블 코디가 생각 중입니다...' 애니메이션 제공 (체감 대기 시간 감소).
   NFR-Perf-02: Vercel Edge Functions 활용하여 Latency 최소화.
   5.3 접근성 (Accessibility - Critical)
   NFR-A11y-01: Semantic HTML 준수 (<button>, <article> 등).
   NFR-A11y-02: 모든 이미지에 alt 텍스트 자동 생성 (AI 활용).
   NFR-A11y-03: 색상 대비비(Contrast Ratio) 4.5:1 이상 준수 (Teal #0F766E on White).
   NFR-A11y-04: 포커스 링(Focus Ring) 두께 2px 이상 명확히 표시.
6. UI/UX 가이드라인 (Design System)
   6.1 컬러 팔레트 (Color)
   Primary: Deep Teal (#0F766E) - 신뢰, 전문성, 안정감.
   Secondary: Soft Coral (#FB7185) - 따뜻함, 활력, 포인트.
   Background: Off-White (#F8FAFC) - 눈의 피로도 감소.
   Text: Slate-900 (본문), Slate-500 (설명).
   6.2 타이포그래피 (Typography)
   Font: Pretendard or Inter (웹폰트).
   Size: 본문 최소 18px (고령자 타겟).
   6.3 컴포넌트 (Shadcn UI 기반)
   Chat Bubble: 둥근 모서리(Rounded-xl), 사용자(우측/Teal), AI(좌측/Gray).
   Product Card: 큰 이미지 영역, 명확한 '구매하러 가기' 버튼(높이 48px 이상).
7. 데이터 추적 및 분석 (Analytics)
   Metric 1: 상담 완료율 (Funnel: 접속 → 입력 → 결과).
   Metric 2: 추천 정확도 (사용자가 추천 상품을 클릭했는가?).
   Metric 3: K-IPPA 참여율 (사용자 경험의 완결성).
8. MVP 제외 범위 (Out of Scope)
   직접 결제 시스템 (PG 연동) → MVP는 아웃링크로 대체.
   전문가용 관리자 대시보드 (복잡한 통계) → 2차 고도화 시 반영.
   커뮤니티 기능.
