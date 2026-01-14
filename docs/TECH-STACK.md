# LinkAble 프로젝트 기술 스택

**프로젝트명**: LinkAble (링케이블)  
**버전**: v1.2  
**최종 업데이트**: 2025-01-13

---

## 📋 목차

1. [프론트엔드](#프론트엔드)
2. [백엔드](#백엔드)
3. [데이터베이스](#데이터베이스)
4. [인증 및 보안](#인증-및-보안)
5. [AI/ML](#aiml)
6. [UI/UX 라이브러리](#uiux-라이브러리)
7. [데이터 페칭](#데이터-페칭)
8. [테스팅](#테스팅)
9. [배포 및 인프라](#배포-및-인프라)
10. [개발 도구](#개발-도구)
11. [외부 서비스 통합](#외부-서비스-통합)

---

## 프론트엔드

### 핵심 프레임워크
- **Next.js 16.0.7** - React 기반 풀스택 프레임워크
  - App Router 사용
  - Server Components & Client Components
  - Server Actions
  - Turbopack (빌드 도구)
- **React 19.2.1** - UI 라이브러리
- **TypeScript 5** - 타입 안정성

### 스타일링
- **Tailwind CSS 4.1.9** - 유틸리티 퍼스트 CSS 프레임워크
- **PostCSS 8.5** - CSS 후처리기
- **Autoprefixer 10.4.20** - CSS 벤더 프리픽스 자동 추가
- **tailwindcss-animate 1.0.7** - 애니메이션 유틸리티
- **tw-animate-css 1.3.3** - 추가 애니메이션

### UI 컴포넌트 라이브러리
- **Radix UI** - 접근성 중심 헤드리스 UI 컴포넌트
  - Dialog, Dropdown, Select, Tabs, Toast 등
- **shadcn/ui** - Radix UI 기반 컴포넌트 시스템
- **Lucide React 0.454.0** - 아이콘 라이브러리
- **Sonner 1.7.4** - 토스트 알림
- **Vaul 1.1.2** - Drawer 컴포넌트

### 폼 관리
- **React Hook Form 7.60.0** - 폼 상태 관리
- **Zod 3.25.76** - 스키마 검증
- **@hookform/resolvers 3.10.0** - React Hook Form + Zod 통합

### 차트 및 데이터 시각화
- **Recharts** (latest) - React 차트 라이브러리
- **Embla Carousel React 8.5.1** - 캐러셀 컴포넌트

### 기타 UI 라이브러리
- **next-themes 0.4.6** - 다크 모드 지원
- **react-day-picker 9.8.0** - 날짜 선택기
- **cmdk 1.0.4** - 명령 팔레트
- **input-otp 1.4.1** - OTP 입력 컴포넌트
- **react-resizable-panels 2.1.7** - 리사이즈 가능한 패널

---

## 백엔드

### 런타임
- **Node.js** - 서버 사이드 런타임
- **Next.js API Routes** - 서버리스 API 엔드포인트

### 서버 사이드 기능
- **Server Actions** - Next.js 서버 액션
- **Edge Functions** - Supabase Edge Functions 지원

---

## 데이터베이스

### 데이터베이스
- **Supabase (PostgreSQL)** - 오픈소스 Firebase 대안
  - PostgreSQL 데이터베이스
  - Row Level Security (RLS)
  - 실시간 구독
  - Edge Functions
  - Storage

### ORM/쿼리 빌더
- **@supabase/supabase-js 2.84.0** - Supabase 클라이언트 라이브러리

---

## 인증 및 보안

### 인증
- **Clerk 6.36.5** - 사용자 인증 및 관리
  - 소셜 로그인 (카카오, 구글)
  - 세션 관리
  - 사용자 메타데이터

### 보안
- **jsonwebtoken 9.0.3** - JWT 토큰 처리
- **Next.js 보안 헤더** - CSP, XSS 보호 등

---

## AI/ML

### AI SDK
- **Vercel AI SDK 5.0.102** - AI 통합 프레임워크
- **@ai-sdk/google 2.0.43** - Google AI 통합

### AI 모델
- **Google Gemini** - 대화형 AI 모델
  - Gemini Flash Lite (채팅)
  - Gemini Vision API (이미지 분석)

### 벡터 임베딩
- **Supabase Vector** - 벡터 검색 및 임베딩 저장

---

## UI/UX 라이브러리

### 접근성
- **Radix UI** - ARIA 표준 준수
- **접근성 컨트롤** - 폰트 크기, 대비 조절 등

### 애니메이션
- **Tailwind CSS Animate** - CSS 애니메이션
- **Framer Motion** (간접 사용) - React 애니메이션

---

## 데이터 페칭

### 데이터 페칭 라이브러리
- **SWR 2.3.8** - 데이터 페칭 및 캐싱
- **Axios 1.13.2** - HTTP 클라이언트

### 상태 관리
- **React Context API** - 전역 상태 관리
- **SWR Provider** - 서버 상태 관리

---

## 테스팅

### E2E 테스팅
- **Playwright 1.48.0** - 엔드투엔드 테스팅

### 웹 스크래핑/크롤링
- **Puppeteer 24.32.0** - 헤드리스 브라우저 자동화
- **Puppeteer Core 24.34.0** - Puppeteer 코어
- **Selenium WebDriver 4.39.0** - 브라우저 자동화
- **Cheerio 1.1.2** - 서버 사이드 HTML 파싱
- **@hyperbrowser/sdk 0.81.2** - 하이퍼브라우저 SDK

---

## 배포 및 인프라

### 호스팅
- **Vercel** - Next.js 최적화 호스팅
  - 자동 배포
  - Edge Functions
  - Analytics

### 모니터링 및 분석
- **Vercel Analytics** - 웹 성능 분석
- **Google Analytics 4** - 사용자 행동 분석
- **Microsoft Clarity** - 사용자 세션 분석
- **Meta Pixel (Facebook Pixel)** - 광고 추적
- **Web Vitals 5.1.0** - Core Web Vitals 측정

### PWA (Progressive Web App)
- **Service Worker** - 오프라인 지원
- **Web App Manifest** - 홈 화면 추가
- **PWA 설치 프롬프트** - 사용자 설치 안내

---

## 개발 도구

### 빌드 도구
- **Turbopack** - Next.js 16 기본 번들러
- **TypeScript 5** - 타입 체크
- **tsx 4.21.0** - TypeScript 실행 도구

### 코드 품질
- **ESLint** - 코드 린팅
- **TypeScript Strict Mode** - 엄격한 타입 검사

### 유틸리티
- **date-fns 4.1.0** - 날짜 처리
- **clsx 2.1.1** - 클래스명 유틸리티
- **tailwind-merge 2.5.5** - Tailwind 클래스 병합
- **class-variance-authority 0.7.1** - 컴포넌트 변형 관리
- **iconv-lite 0.7.1** - 문자 인코딩 변환
- **dotenv 17.2.3** - 환경 변수 관리

### 문서 처리
- **pdf-parse 1.1.1** - PDF 파싱

---

## 외부 서비스 통합

### 인증 서비스
- **Clerk** - 사용자 인증 및 관리
  - 소셜 로그인 (카카오, 구글)
  - 사용자 세션 관리

### 데이터베이스 및 백엔드
- **Supabase** - 백엔드 서비스
  - PostgreSQL 데이터베이스
  - 실시간 구독
  - Storage
  - Edge Functions

### AI 서비스
- **Google Gemini API** - AI 채팅 및 이미지 분석
  - Gemini Flash Lite
  - Gemini Vision

### 분석 서비스
- **Google Analytics 4** - 웹 분석
- **Google Tag Manager** - 태그 관리
- **Microsoft Clarity** - 사용자 행동 분석
- **Meta Pixel** - Facebook 광고 추적
- **Vercel Analytics** - 성능 분석

### 검색 엔진 최적화
- **Google Search Console** - 검색 엔진 등록
- **Naver Search Advisor** - 네이버 검색 등록

---

## 프로젝트 구조

### 디렉토리 구조
```
linkable-MVP/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── admin/             # 관리자 페이지
│   ├── dashboard/         # 사용자 대시보드
│   └── ...
├── components/            # React 컴포넌트
│   ├── ui/               # UI 컴포넌트
│   ├── admin/            # 관리자 컴포넌트
│   └── ...
├── core/                  # 핵심 비즈니스 로직
│   ├── assessment/       # ICF 분석
│   ├── matching/         # 제품 매칭 알고리즘
│   └── validation/       # K-IPPA 검증
├── lib/                   # 유틸리티 및 헬퍼
│   ├── supabase/         # Supabase 클라이언트
│   ├── auth/             # 인증 관련
│   └── ...
├── supabase/              # Supabase 설정
│   └── migrations/       # 데이터베이스 마이그레이션
└── public/                # 정적 파일
```

---

## 주요 기능별 기술 스택

### AI 상담 시스템
- **Next.js AI SDK** - 스트리밍 응답
- **Google Gemini** - 자연어 처리
- **Web Speech API** - 음성 입력 (STT)
- **Gemini Vision API** - 이미지 분석

### 제품 추천 시스템
- **하이브리드 매칭 알고리즘**
  - Rule-based (ICF → ISO 매핑)
  - Semantic Matching (벡터 유사도)
  - Knowledge Graph (관계 그래프)
- **Supabase Vector** - 임베딩 저장 및 검색

### 데이터 수집
- **웹 크롤링**
  - Puppeteer
  - Selenium
  - Cheerio
- **제품 데이터 수집 및 정제**

### 관리자 대시보드
- **Recharts** - 데이터 시각화
- **실시간 통계** - SWR + Supabase Realtime

---

## 환경 변수

### 필수 환경 변수
```env
# 인증
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# 데이터베이스
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GOOGLE_GENERATIVE_AI_API_KEY=

# 분석
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_META_PIXEL_ID=

# 앱 URL
NEXT_PUBLIC_APP_URL=
```

---

## 빌드 및 배포

### 빌드 명령어
```bash
pnpm run build    # 프로덕션 빌드
pnpm run dev      # 개발 서버
pnpm run start    # 프로덕션 서버
```

### 배포 플랫폼
- **Vercel** - 자동 배포 (Git 연동)
- **Supabase** - 데이터베이스 및 백엔드

---

## 성능 최적화

### 이미지 최적화
- **Next.js Image Component** - 자동 최적화
- **WebP/AVIF 포맷** - 최신 이미지 포맷
- **Lazy Loading** - 지연 로딩

### 코드 스플리팅
- **Dynamic Imports** - 동적 임포트
- **Route-based Splitting** - 라우트 기반 분할

### 캐싱 전략
- **SWR** - 클라이언트 사이드 캐싱
- **Service Worker** - 오프라인 캐싱
- **ISR (Incremental Static Regeneration)** - 정적 페이지 재생성

---

## 보안 기능

### 보안 헤더
- **Content Security Policy (CSP)**
- **X-Frame-Options**
- **X-Content-Type-Options**
- **Referrer-Policy**

### 데이터 보호
- **Row Level Security (RLS)** - Supabase
- **JWT 토큰** - 인증 및 권한 관리
- **환경 변수** - 민감 정보 보호

---

## 접근성 (A11y)

### 접근성 기능
- **ARIA 라벨** - 스크린 리더 지원
- **키보드 네비게이션** - 키보드만으로 사용 가능
- **색상 대비** - WCAG 2.1 AA 준수
- **접근성 컨트롤** - 폰트 크기, 대비 조절

---

## 버전 관리

### 패키지 관리자
- **pnpm** - 빠른 패키지 관리자

### 버전 관리
- **Git** - 소스 코드 버전 관리

---

## 문서화

### 문서 도구
- **Markdown** - 문서 작성
- **Mermaid** - 다이어그램

---

**문서 버전**: v1.0  
**최종 업데이트**: 2025-01-13  
**작성자**: LinkAble 개발팀
