LinkAble (링케이블) 🔗
"불편함을 가능성으로 연결하다 (Connecting Disabilities to Abilities)"
Activity Analysis 기반 AI 보조공학 큐레이션 & 효과성 검증 플랫폼
![alt text](https://img.shields.io/badge/version-1.0.0-blue.svg)

![alt text](https://img.shields.io/badge/license-MIT-green.svg)

![alt text](https://img.shields.io/badge/status-MVP-orange.svg)

![alt text](https://img.shields.io/badge/Next.js-14-black)

![alt text](https://img.shields.io/badge/AI-Gemini_Flash_Lite_Latest-purple)
📖 프로젝트 소개 (About)
LinkAble은 정보의 비대칭으로 인해 자신에게 맞는 보조기기를 찾지 못하는 사용자들을 위해 탄생했습니다.
단순한 쇼핑몰이 아닙니다. 16년 경력의 보조공학사/작업치료사의 임상 노하우를 AI에 학습시켜, 사용자의 **작업 수행(Occupational Performance)**을 분석하고 최적의 도구를 매칭하는 '디지털 코디네이터' 서비스입니다.
🌟 핵심 가치 (Core Values)
Professional: ICF(국제기능분류) 기준의 정밀한 기능 분석.
Standardized: ISO 9999 국제 표준에 따른 보조기기 매칭.
Evidence-based: K-IPPA 평가 도구를 통한 사용 후 효과성 데이터 검증.
Safe: 의료법을 준수하는 비의료적 기능 보조 가이드라인 적용.
🧠 방법론: 활동 분석 (Activity Analysis Approach)
이 소프트웨어는 사용자의 경험을 작업치료의 활동 분석(Activity Analysis) 프레임워크에 따라 4단계로 세분화하여 설계되었습니다.
단계 활동 (Activity) 시스템 로직 (System Logic)
Step 1 문제 호소 (Assessment) 자연어/음성 입력을 통해 신체 기능(b), 활동(d), 환경(e) 코드를 추출합니다.
Step 2 해결책 탐색 (Matching) 추출된 문제(Problem)와 해결 도구(Solution)의 Gap을 분석하여 ISO 코드를 매핑합니다.
Step 3 구매 실행 (Action) 매칭된 ISO 코드를 가진 최적의 상품을 E-commerce로 연결합니다.
Step 4 가치 검증 (Validation) 사용 전/후 수행 난이도 변화를 측정하여 K-IPPA 효과성 점수를 산출합니다.
🚀 주요 기능 (Key Features)

1. AI 코디네이터 '에이블 코디' (Able Cordi)
   Gemini Flash Lite Latest 기반 상담: 의료 용어를 배제하고 기능 중심의 따뜻한 상담 제공.
   멀티모달 환경 분석: 집안 사진(문턱, 화장실 등)을 업로드하면 위험 요소를 감지하고 환경 수정 제안.
2. 스마트 매칭 엔진 (The Link Engine)
   ICF-ISO Mapping: d450(걷기) + e120(단차) → ISO 18 12 10(이동식 경사로) 자동 변환 로직.
   개인화 추천: 사용자의 신체적 제약(떨림, 마비, 근력 저하 등)을 고려한 필터링.
3. 데이터 선순환 구조 (Data Flywheel)
   K-IPPA 리포트: "이 기기를 쓰고 식사 시간이 20분 단축되었습니다"와 같은 정량적 데이터 시각화.
   재학습: 축적된 평가 데이터는 AI의 추천 정확도를 높이는 데 재사용.
   🛠 기술 스택 (Tech Stack)
   Frontend (User Activity Layer)
   Framework: Next.js 15 (App Router)
   Language: TypeScript
   UI System: Tailwind CSS, Shadcn UI (Radix UI 기반 접근성 준수)
   Accessibility: WCAG 2.1 AA (스크린 리더, 키보드 네비게이션 최적화)
   Backend & Data (Persistence Layer)
   Database: Supabase (PostgreSQL)
   Auth: Clerk (소셜 로그인 - 카카오, 구글)
   Storage: Supabase Storage (이미지 저장)
   Intelligence (AI Layer)
   Model: Google Gemini Flash Lite Latest
   Integration: Vercel AI SDK
   Pattern: RAG (Retrieval-Augmented Generation) & Function Calling
   📂 폴더 구조 (Project Structure)
   LinkAble은 **기능 단위(Feature-Sliced)**가 아닌 도메인 로직 단위로 구조화되어 있습니다. 상세 구조는 DIR.md를 참고하세요.
   code
   Bash
   link-able/
   ├── app/ # Pages & API Routes
   ├── components/ # UI Components (Shadcn)
   ├── core/ # [Core Logic] 활동 분석 엔진 ★
   │ ├── assessment/ # ICF 코드 추출 및 프롬프트
   │ ├── matching/ # ISO 매핑 알고리즘
   │ └── validation/ # K-IPPA 계산 로직
   ├── lib/ # Infrastructure (DB, AI Client)
   └── public/ # Static Assets
   💻 설치 및 실행 (Getting Started)
4. Prerequisites
   Node.js 18.17+
   npm or yarn or pnpm
5. Clone & Install
   code
   Bash
   git clone https://github.com/your-username/link-able.git
   cd link-able
   npm install
6. Environment Setup (.env.local)
   프로젝트 루트에 .env.local 파일을 생성하고 아래 키를 입력하세요.
   code
   Env

# Auth (Clerk)

NEXT*PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test*...
CLERK*SECRET_KEY=sk_test*...

# Database (Supabase)

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# AI (Google Gemini)

GOOGLE_GENERATIVE_AI_API_KEY=AIza... 4. Run Development Server
code
Bash
npm run dev
브라우저에서 http://localhost:3000으로 접속하여 '에이블 코디'를 만나보세요.
⚠️ 안전 및 윤리 가이드 (Safety & Ethics)
본 서비스는 비의료 건강관리 서비스 가이드라인을 준수합니다.
Non-Medical: '에이블 코디'는 의사가 아니며, 의학적 진단(Diagnosis)이나 처방(Prescription)을 제공하지 않습니다.
Functional Focus: 오직 사용자의 **기능적 불편함(Functional Limitation)**을 보완하기 위한 보조공학적 정보만을 제공합니다.
Disclaimer: 모든 추천 결과는 참고용이며, 건강상의 중대한 문제는 반드시 전문 의료인과 상의해야 합니다.
📜 문서 링크 (Documentation)
더 자세한 설계 내용은 아래 문서들을 참고하세요.
MRD (시장 요구사항 정의서): 시장 분석 및 비즈니스 모델
PRD (제품 요구사항 정의서): 상세 기능 명세 및 유저 스토리
TRD (기술 요구사항 정의서): 시스템 아키텍처 및 API 명세
Mermaid Charts: 시스템 흐름도 및 시퀀스 다이어그램
🧑‍⚕️ Author (Expertise)
Project Lead: 16년 차 보조공학 전문가
Certified Assistive Technology Professional (보조공학사)
Occupational Therapist (작업치료사)
Social Worker (사회복지사)
"기술은 사람을 향할 때 가장 빛납니다. LinkAble은 기술과 사람을 잇는 따뜻한 연결고리가 되겠습니다."
© 2025 LinkAble. All rights reserved.
