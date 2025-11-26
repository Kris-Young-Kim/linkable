TRD (Technical Requirements Document)
프로젝트명: LinkAble (링케이블)
버전: v1.2 (Activity Analysis Based Architecture)
기술 총괄: 에이블 코디 팀
작성일: 2025.11.24

1.  시스템 아키텍처 개요 (System Architecture)
    LinkAble은 Next.js 15 App Router를 기반으로 한 Serverless Architecture를 채택한다. 프론트엔드와 백엔드가 통합된 모놀리식 구조처럼 보이지만, 실제 로직은 Vercel Edge Network와 Supabase PaaS 위에서 분산 처리된다.
    1.1 High-Level Architecture
    code
    Mermaid
    graph LR
    Client[Client (Browser)] <-->|HTTPS/JSON| NextServer[Next.js Server (Vercel)]
    NextServer <-->|Auth| Clerk[Clerk Auth]
    NextServer <-->|SQL/REST| Supabase[Supabase DB]
    NextServer <-->|gRPC| Gemini[Google Gemini API]
        subgraph "Data Flow"
        Client -- 1. 상담 요청 --> NextServer
        NextServer -- 2. 프롬프트 전송 --> Gemini
        Gemini -- 3. JSON 응답 --> NextServer
        NextServer -- 4. ISO 매칭 쿼리 --> Supabase
        Supabase -- 5. 상품 데이터 반환 --> NextServer
        NextServer -- 6. UI 렌더링 --> Client
        end
2.  기술 스택 상세 (Tech Stack Details)
    2.1 Frontend (User Activity Layer)
    Framework: Next.js 15 (App Router, Server Components).
    Language: TypeScript 5.x (Strict Mode).
    UI Library: Shadcn UI (Radix UI 기반 Headless Component).
    Styling: Tailwind CSS (Mobile First, Custom Color Palette 설정).
    State Management:
    Global: 없음 (Server State 위주).
    Form: react-hook-form + zod (유효성 검사).
    Voice Input: Web Speech API (SpeechRecognition).
    2.2 Backend & Database (Data Persistence Layer)
    Database: Supabase (PostgreSQL 15+).
    ORM: 없음 (Supabase JS Client Type Generation 사용).
    Auth: Clerk (Middleware를 통한 Route Protection).
    Storage: Supabase Storage (환경 분석용 유저 업로드 이미지).
    2.3 AI Engine (Intelligence Layer)
    LLM: Google Gemini Flash Lite Latest.
    Integration: Vercel AI SDK (ai/rsc, streamText).
    Prompt Engineering: Few-shot Prompting + JSON Mode.
3.  데이터베이스 설계 및 정책 (Database Schema & Policy)
    3.1 ERD 핵심 구조 (활동 분석 반영)
    Users: Clerk ID를 Foreign Key로 사용하여 인증과 데이터를 느슨하게 결합.
    Analysis_Results: AI 분석 결과는 유연성을 위해 JSONB 타입 사용.
    icf_codes: {"b": ["b280"], "d": ["d450"], "e": ["e115"]} 구조.
    Products: ISO 코드는 계층 구조 검색을 위해 String으로 저장 (12 06 06).
    3.2 보안 정책 (RLS - Row Level Security)
    Supabase의 핵심 보안 기능인 RLS를 필수 적용한다.
    Policy 1 (Users): auth.uid() == clerk_id 인 경우만 SELECT/UPDATE.
    Policy 2 (Consultations): auth.uid() == user_id 인 경우만 접근 가능.
    Policy 3 (Products): is_active == true인 경우 누구나 SELECT 가능 (Public).
4.  핵심 기능 구현 로직 (Core Logic Specs)
    선생님의 '활동 분석'을 코드로 변환한 로직입니다.
    4.1 [활동 1] AI 상담 및 문제 정의 (Assessment)
    API Endpoint: POST /api/chat
    Input: { messages: Message[], context_image?: string, mediaDescription?: string }
    Processing (Server Action):
    - ✅ Clerk 세션 확인 구현 완료
    - ✅ User Input 처리 및 Gemini Flash Lite Latest 호출 구현 완료
    - ✅ System Prompt 주입 구현 완료
    - ⚠️ Function Calling (Tool Use) 미구현
    - ⚠️ Streaming Text 응답 미구현 (현재 일반 JSON 응답)
    - ⚠️ Image Input 처리 미구현 (mediaDescription 파라미터는 있으나 UI 연동 없음)
    Output: 
    - 현재: JSON 응답 (text, icfAnalysis, followUpQuestions)
    - 목표: Streaming Text + (분석 완료 시) UI Component (<AnalysisCard />)
    4.2 [활동 2] ISO 매칭 및 추천 (Intervention)
    Algorithm: Rule-based Mapping (MVP 최적화).
    - ✅ AI가 추출한 d-code(활동)와 e-code(환경)를 조합하여 ISO 매칭 구현 완료
    - ✅ DB products 테이블에서 해당 패턴을 해결하는 iso_code 검색 구현 완료
    - ✅ Query: SELECT * FROM products WHERE iso_code IN (...) 구현 완료
    - ✅ Fallback: 정확한 매칭이 없을 경우, 상위 카테고리(Sub-class) 수준에서 검색 구현 완료
    - ⚠️ 상담 완료 후 추천 페이지로 자동 연동 플로우 미구현
    - ⚠️ 채팅 인터페이스에 추천 CTA 버튼 미구현
    - ⚠️ 채팅 내 추천 카드 미리보기 미구현
    4.3 [활동 3] K-IPPA 평가 루프 (Validation)
    API Endpoint: POST /api/ippa/submit
    Logic:
    사용자가 입력한 pre_score, post_score, importance 수신.
    서버 사이드 계산: effect_score = (pre - post) _ importance.
    DB 저장 후, users.points 업데이트 (Transaction 처리 필수).
5.  프론트엔드 및 접근성 엔지니어링 (Frontend & A11y)
    5.1 컴포넌트 설계 (Shadcn UI 확장)
    ChatInput:
    - ✅ 기본 텍스트 입력 구현 완료
    - ⚠️ 마이크 버튼 클릭 시 window.SpeechRecognition 활성화 (UI만 존재, 기능 미구현)
    - ⚠️ 음성 인식 중 비주얼 피드백(파형 애니메이션) 제공 (미구현)
    - ⚠️ 이미지 업로드 기능 (UI만 존재, Gemini Vision API 연동 미구현)
    ProductCard:
    - ✅ 기본 카드 UI 구현 완료
    - ✅ 스크린 리더 사용자를 위해 aria-label 제공
    - ✅ 이미지 alt 태그 구현 완료
    ICFVisualization:
    - ⚠️ ICF 분석 결과 시각화 컴포넌트 미구현
    - 필요 기능: b/d/e 코드별 분류, 설명 툴팁, 관련 ISO 코드 연결
    AnalysisCard:
    - ⚠️ 분석 결과 카드 컴포넌트 미구현
    - 필요 기능: 분석 요약, ICF 코드 시각화, 환경 요소 분석 결과
    5.2 접근성 체크리스트 (WCAG 2.1 AA)
    Keyboard Nav: 모든 인터랙션(버튼, 링크, 입력창)은 Tab 키로 이동 가능해야 함.
    Focus Ring: Tailwind 클래스 ring-2 ring-offset-2 ring-teal-600 적용.
    Text Scaling: rem 단위 사용으로 브라우저 폰트 크기 설정 존중.
6.  API 명세 (Internal API Specs)
    6.1 Chat Completion
    code
    TypeScript
    // POST /api/chat
    interface ChatRequest {
    message: string;
    history: Array<{ role: 'user' | 'model'; content: string }>;
    }

interface ChatResponse {
text: string; // Streaming
data?: { // Meta data (Analysis finished)
icf: ICFObject;
products: Product[];
};
}
6.2 Product Recommendation
code
TypeScript
// GET /api/products/recommend?icf_codes=b280,d450
interface ProductResponse {
data: Array<{
id: string;
name: string;
iso_code: string;
match_reason: string; // "무릎 통증 완화에 도움"
price: number;
link: string;
}>;
} 7. 배포 및 환경 설정 (Deployment)
7.1 환경 변수 (.env.local)
개발자가 반드시 확보해야 할 Key 목록.
code
Bash

# App

NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Auth (Clerk)

NEXT*PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test*..."
CLERK*SECRET_KEY="sk_test*..."

# DB (Supabase)

NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# AI (Google)

GOOGLE_GENERATIVE_AI_API_KEY="AIza..."
7.2 CI/CD 파이프라인
GitHub Main Push: Vercel 자동 배포 트리거.
Build Command: next build (Type check 포함).
DB Migration: Supabase CLI를 통한 로컬 -> 리모트 마이그레이션 권장. 8. 안전 및 윤리적 제약 (Technical Safety)
8.1 시스템 프롬프트 가드레일 (Guardrails)
Gemini 호출 시 System Instruction에 아래 내용을 포함하여 기술적으로 의료 행위를 차단한다.
"If the user asks for a diagnosis or medical treatment, explicitly state: 'I am a coordinator, not a doctor. Please consult a medical professional.' and do NOT provide medical advice."
8.2 데이터 프라이버시
상담 내용은 사용자의 동의 없이는 익명화된 통계 데이터로만 활용한다.
DB의 chat_messages 테이블은 일정 기간(예: 3년) 후 자동 파기 정책을 고려한다 (MVP 제외).
