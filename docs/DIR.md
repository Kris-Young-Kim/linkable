Project Directory Structure (DIR.md)
Project: LinkAble (링케이블)
Stack: Next.js 14 (App Router), Supabase, Clerk, Gemini
Architecture: Feature-Sliced Design (Activity Analysis Based)
Version: v1.2

1. Overview (구조 개요)
   LinkAble의 폴더 구조는 유지보수성과 확장성을 최우선으로 합니다. 특히 core/ 디렉토리는 16년 차 전문가의 임상 로직(ICF, ISO, IPPA)이 담긴 '두뇌' 역할을 합니다.
   code
   Bash
   link-able/
   ├── app/ # [Routing] 페이지 및 API 라우팅 (Next.js App Router)
   ├── components/ # [UI] 재사용 가능한 컴포넌트 (Shadcn UI + Feature UI)
   ├── core/ # [Logic] 비즈니스 로직 및 알고리즘 (활동 분석의 핵심)
   ├── lib/ # [Infra] 외부 서비스 연동 (Supabase, Gemini, Utils)
   ├── types/ # [Type] TypeScript 타입 정의
   ├── public/ # [Assets] 정적 파일
   └── config files... # 설정 파일들 (Tailwind, Next.js, etc.)
2. Detailed Structure (상세 구조)
   📁 app/ (Routing Layer)
   URL 경로와 API 엔드포인트를 정의합니다.
   code
   Bash
   app/
   ├── (auth)/ # [Route Group] 인증 관련 (레이아웃 분리)
   │ ├── sign-in/[[...sign-in]]/page.tsx
   │ ├── sign-up/[[...sign-up]]/page.tsx
   │ └── layout.tsx # 인증 페이지 전용 레이아웃 (Centering)
   │
   ├── (main)/ # [Route Group] 메인 서비스 (GNB, Footer 포함)
   │ ├── layout.tsx # 메인 레이아웃 (Navigation 포함)
   │ ├── page.tsx # [Landing] 서비스 소개 및 시작하기
   │ │
   │ ├── consultation/ # [Activity 1] 상담 및 문제 파악
   │ │ ├── page.tsx # 상담 시작 (초기 진입)
   │ │ ├── chat/ # AI 채팅 인터페이스
   │ │ │ └── page.tsx
   │ │ └── report/ # 분석 결과 요약 페이지
   │ │ └── [id]/page.tsx
   │ │
   │ ├── recommendations/ # [Activity 2 & 3] 매칭 및 구매
   │ │ └── [consultationId]/ # 특정 상담 기반 추천 리스트
   │ │ └── page.tsx
   │ │
   │ └── dashboard/ # [Activity 4] 사후 관리 및 IPPA
   │ ├── page.tsx # 마이페이지 (상담 이력)
   │ └── ippa/ # K-IPPA 평가 페이지
   │ └── [recommendationId]/page.tsx
   │
   ├── api/ # [Backend] Serverless Functions
   │ ├── chat/ # AI 상담 및 ICF 추출 API
   │ │ └── route.ts
   │ ├── products/ # 상품 검색 및 추천 API
   │ │ └── route.ts
   │ ├── ippa/ # 평가 데이터 저장 API
   │ │ └── route.ts
   │ └── webhooks/ # Clerk/Supabase Webhook 처리
   │ └── route.ts
   │
   ├── globals.css # 전역 스타일 (Tailwind directives)
   ├── layout.tsx # Root Layout (Providers 설정)
   └── not-found.tsx # 404 페이지
   📁 core/ (Business Logic Layer) ★ 핵심
   선생님의 임상 노하우가 코드로 변환되어 저장되는 곳입니다.
   code
   Bash
   core/
   ├── assessment/ # [Activity 1] 평가 로직
   │ ├── icf-codes.ts # ICF Core Set 데이터 (b, d, e 코드 정의)
   │ ├── prompt-engineering.ts # Gemini System Instruction (페르소나 설정)
   │ └── parser.ts # AI 응답(JSON) 파싱 및 유효성 검사
   │
   ├── matching/ # [Activity 2] 매칭 로직
   │ ├── iso-mapping.ts # ICF(Problem) <-> ISO(Solution) 매핑 테이블
   │ └── ranking.ts # 추천 순위 알고리즘 (가중치 계산)
   │
   └── validation/ # [Activity 4] 검증 로직
   ├── ippa-calculator.ts # 효과성 점수 계산 함수 ((Pre-Post)\*Importance)
   └── feedback-analyser.ts # 텍스트 피드백 감성 분석 (긍정/부정)
   📁 components/ (Presentation Layer)
   화면에 보이는 요소들을 정의합니다.
   code
   Bash
   components/
   ├── ui/ # [Primitive] Shadcn UI (버튼, 카드, 입력창 등)
   │ ├── button.tsx
   │ ├── card.tsx
   │ ├── input.tsx
   │ ├── scroll-area.tsx
   │ └── ... (shadcn 설치 시 자동 생성)
   │
   ├── features/ # [Domain] 기능별 복합 컴포넌트
   │ ├── chat/ # 채팅 관련
   │ │ ├── chat-bubble.tsx # 말풍선 (User/AI 구분)
   │ │ ├── chat-input.tsx # 텍스트 + 음성 입력창
   │ │ └── typing-indicator.tsx
   │ │
   │ ├── product/ # 상품 관련
   │ │ ├── product-card.tsx # 추천 상품 카드 (이미지, 태그, 구매버튼)
   │ │ └── iso-badge.tsx # ISO 인증 뱃지
   │ │
   │ └── ippa/ # 평가 관련
   │ ├── score-slider.tsx # 난이도 조절 슬라이더
   │ └── star-rating.tsx # 중요도 별점
   │
   └── layout/ # 레이아웃 관련
   ├── header.tsx # 로고, 네비게이션, 프로필
   ├── footer.tsx # 면책 조항(Disclaimer) 포함
   └── mobile-nav.tsx # 모바일용 햄버거 메뉴
   📁 lib/ (Infrastructure Layer)
   외부 서비스 연결 및 공통 유틸리티입니다.
   code
   Bash
   lib/
   ├── supabase/
   │ ├── client.ts # Client Component용 Supabase 클라이언트
   │ └── server.ts # Server Component용 Supabase 클라이언트 (Cookie 처리)
   ├── gemini.ts # Google Generative AI SDK 설정
   ├── utils.ts # Tailwind Class 병합(cn) 등 공용 함수
   └── constants.ts # 전역 상수 (사이트명, 메타데이터 등)
   📁 types/ (Type Definitions)
   데이터의 형태를 정의하여 오류를 방지합니다.
   code
   Bash
   types/
   ├── database.types.ts # Supabase에서 생성된 DB 스키마 타입
   ├── icf.d.ts # ICF 코드 객체 타입 정의
   ├── chat.d.ts # 채팅 메시지 및 AI 응답 구조 타입
   └── global.d.ts # 전역 타입 확장
   📁 Root Files (Configuration)
   code
   Bash
   ├── .env.local # 환경 변수 (API Key - 절대 커밋 금지)
   ├── middleware.ts # Clerk 인증 미들웨어 (페이지 보호)
   ├── next.config.mjs # Next.js 설정 (이미지 도메인 허용 등)
   ├── package.json # 의존성 목록
   ├── tailwind.config.ts # 컬러 팔레트(Teal/Coral) 설정
   ├── tsconfig.json # TypeScript 설정
   ├── README.md # 프로젝트 문서
   ├── PRD.md # 기획서
   ├── TRD.md # 기술 문서
   └── DIR.md # (본 파일)
