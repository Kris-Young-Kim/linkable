LinkAble Diagrams (Mermaid.md)
Project: LinkAble (링케이블)
Description: System Architecture & Logic Flow Visualizations
Version: v1.2 (Activity Analysis Based)

1.  System Context Architecture (C4 Level 2)
    개요: 전체 시스템이 외부 서비스(Clerk, Gemini, Coupang)와 어떻게 상호작용하는지 보여주는 조감도입니다.
    code
    Mermaid
    graph TB
    subgraph "Client Side (Frontend)"
    User((👤 User/Patient))
    Web["📱 LinkAble Web App<br/>(Next.js Client)"]
    end

        subgraph "Server Side (Backend)"
            API["⚙️ Next.js API Routes<br/>(Server Actions)"]
            Auth["🔒 Clerk Auth"]
        end

        subgraph "Data & Intelligence"
            DB[("🗄️ Supabase<br/>(PostgreSQL)")]
            AI["🧠 Google Gemini API<br/>(LLM Engine)"]
            Storage["☁️ Supabase Storage<br/>(Images)"]
        end

        subgraph "External Ecosystem"
            Commerce["🛒 E-commerce<br/>(Coupang/Naver)"]
        end

        %% Interactions
        User -->|Voice/Text Input| Web
        Web -->|Auth Check| Auth
        Web -->|API Request| API
        API -->|Prompt & Context| AI
        AI -->|ICF Analysis & Reasoning| API
        API -->|Query ISO Products| DB
        API -->|Save Environment Photos| Storage
        API -->|Return Recommendations| Web
        Web -->|Click Buy Link| Commerce

2.  User Activity Flow (Activity Analysis)
    개요: 사용자의 행동을 4단계 활동(Assessment, Matching, Action, Validation)으로 쪼개어 흐름을 정의했습니다.
    code
    Mermaid
    flowchart TD
    %% Start
    Start((Start)) --> Auth{Login Type}
    Auth -->|User| Role1[Save Role: User]
    Auth -->|Expert/Family| Role2[Save Role: Manager]

        %% Activity 1: Assessment (문제 파악)
        subgraph "Activity 1: Assessment"
            Role1 & Role2 --> Input[Input Discomfort]
            Input --> Mode{Input Mode}
            Mode -->|Text/Voice| STT[STT Processing]
            Mode -->|Image| Vision[Environment Analysis]
            STT & Vision --> AI_Analyse[AI: Extract ICF Codes]
            AI_Analyse --> Check{Is Info Sufficient?}
            Check -- No --> Question[AI: Ask Specific Questions]
            Question --> Input
        end

        %% Activity 2: Matching (해결책 매칭)
        subgraph "Activity 2: Matching"
            Check -- Yes --> Mapping[Map ICF(d,e) to ISO Code]
            Mapping --> DB_Search[Search DB for Products]
            DB_Search --> Generate_Reason[AI: Generate 'Why This Fits']
        end

        %% Activity 3: Action (구매 행동)
        subgraph "Activity 3: Action"
            Generate_Reason --> Show_Card[Display Product Cards]
            Show_Card --> Show_In_Chat[Show Recommendations in Chat] ⚠️ 미구현
            Show_In_Chat --> User_Navigate[User Clicks 'View Recommendations'] ⚠️ 미구현
            User_Navigate --> Show_Card
            Show_Card --> User_Click[Click 'Buy Now'] ✅ 구현 완료
            User_Click --> OutLink[Redirect to Commerce] ✅ 구현 완료
            OutLink --> Log_Click[Log: Recommendation Clicked] ✅ 구현 완료
        end

        %% Activity 4: Validation (사후 검증)
        subgraph "Activity 4: Validation (K-IPPA)"
            Log_Click -.->|Wait 14 Days| Notification[Send Feedback Alert]
            Notification --> Survey[Input: Pre/Post Score]
            Survey --> Calc[Calc: Effectiveness Score]
            Calc --> Reward[Give Points]
        end

        Reward --> End((End Loop))

3.  Core Logic Sequence (Detailed)
    개요: **"상담 요청 → AI 분석 → DB 검색 → 답변 생성"**의 핵심 로직을 시각화했습니다.
    주의: System Prompt 부분에 의료 용어 금지 로직이 포함되어 있습니다.
    code
    Mermaid
    sequenceDiagram
    autonumber
    actor U as 👤 User
    participant FE as 📱 Client (UI)
    participant BE as ⚙️ API (Next.js)
    participant LLM as 🧠 Gemini (링커)
    participant DB as 🗄️ Supabase

        Note over U, FE: [Activity 1] 사용자가 불편함을 호소
        U->>FE: "손이 떨려서 밥 먹기가 힘들어." (Voice/Text)
        FE->>BE: POST /api/chat (message, history)

        BE->>LLM: [System Prompt] <br/>1. Role: Assistive Tech Coordinator<br/>2. Constraint: NO Medical Advice<br/>3. Task: Extract ICF Codes (b, d, e)

        LLM-->>BE: JSON Response <br/>{ "icf": ["b765", "d550"], "needs": "Weighted Utensil" }

        BE->>DB: INSERT into Analysis_Results

        Note over BE, DB: [Activity 2] 솔루션 매칭 프로세스
        BE->>DB: SELECT * FROM products <br/>WHERE iso_code MATCHES 'd550 + b765' solution
        DB-->>BE: [Product: 무게조절 숟가락, ISO: 15 09 13]

        BE->>LLM: [Prompt] <br/>Generate specific recommendation reason based on user's tremor.
        LLM-->>BE: "손 떨림을 잡아주는 무게감 있는 숟가락을 추천합니다."

        BE->>DB: INSERT into Recommendations
        BE-->>FE: Return { ChatResponse, ProductCards }

        Note over FE, U: [현재 구현 상태]
        FE->>U: 채팅 말풍선 표시 ✅
        FE->>U: 추천 상품 카드 표시 ⚠️ (미구현 - 추천 페이지로 수동 이동 필요)
        
        Note over FE, U: [목표 구현]
        FE->>U: 채팅 말풍선 + 추천 상품 카드 미리보기 (상위 2-3개)
        FE->>U: "추천 보기" CTA 버튼 표시
        U->>FE: CTA 클릭
        FE->>U: 추천 페이지로 이동 (/recommendations?consultationId={id})

        Note over U, FE: [Activity 3] 구매 행동
        U->>FE: '구매하러 가기' 클릭 ✅ 구현 완료
        FE->>U: Open New Tab (Coupang/Naver) ✅ 구현 완료

4.  Entity Relationship Diagram (ERD)
    개요: 데이터베이스 테이블 간의 관계 구조입니다. K-IPPA 평가를 위한 데이터 연결이 핵심입니다.
    code
    Mermaid
    erDiagram
    USERS ||--o{ CONSULTATIONS : initiates
    USERS ||--o{ IPPA_EVALUATIONS : submits

        CONSULTATIONS ||--|{ CHAT_MESSAGES : contains
        CONSULTATIONS ||--|| ANALYSIS_RESULTS : generates
        CONSULTATIONS ||--o{ RECOMMENDATIONS : results_in

        PRODUCTS ||--o{ RECOMMENDATIONS : is_referenced_in
        PRODUCTS ||--o{ IPPA_EVALUATIONS : receives

        RECOMMENDATIONS ||--o| IPPA_EVALUATIONS : validates

        USERS {
            uuid id PK "Clerk ID Reference"
            string role "user | manager"
            int points "Reward"
        }

        CONSULTATIONS {
            uuid id PK
            string status "in_progress | completed"
        }

        ANALYSIS_RESULTS {
            uuid id PK
            jsonb icf_codes "Extracted Codes"
            text env_factors "Environment Context"
        }

        PRODUCTS {
            uuid id PK
            string name
            string iso_code "ISO 9999"
            string purchase_link "Affiliate URL"
        }

        IPPA_EVALUATIONS {
            uuid id PK
            int score_importance "Weight (1-5)"
            int score_diff_pre "Before"
            int score_diff_post "After"
            float effectiveness "Calculated Score"
        }

5.  Consultation State Machine
    개요: 상담 세션(Consultation)이 어떤 상태 변화를 겪는지 보여줍니다.
    code
    Mermaid
    stateDiagram-v2
    [*] --> Idle
        Idle --> InProgress : User starts chat

        state InProgress {
            [*] --> Listening : Wait for Input
            Listening --> Analyzing : Input Received
            Analyzing --> Generating : ICF Extracted
            Generating --> Listening : Ask follow-up question
            Generating --> RecommendationReady : Sufficient Info
        }

        RecommendationReady --> UserBrowsing : Show Products

        UserBrowsing --> Clicked : User clicks product
        UserBrowsing --> InProgress : User asks more

        Clicked --> WaitPeriod : Purchase made

        WaitPeriod --> EvaluationPending : 14 days passed

        EvaluationPending --> Evaluated : K-IPPA Survey Done
        Evaluated --> [*]
