LinkAble Diagrams (Mermaid.md)
Project: LinkAble (링커블)
Description: System Architecture & Logic Flow Visualizations
Version: v1.2 (Activity Analysis Based)

1.  System Context Architecture (C4 Level 2)
    목적: 전체 시스템이 어떻게 외부 서비스(Clerk, Gemini, naver)와 상호작용하는지 시각화한 아키텍처 다이어그램입니다.

    ```mermaid
    graph TB
    subgraph "Client Side (Frontend)"
    User((사용자 User/Patient))
    Web["웹 LinkAble Web App<br/>(Next.js Client)"]
    end

        subgraph "Server Side (Backend)"
            API["서버 Next.js API Routes<br/>(Server Actions)"]
            Auth["인증 Clerk Auth"]
        end

        subgraph "Data & Intelligence"
            DB[("데이터 Supabase<br/>(PostgreSQL)")]
            AI["AI Google Gemini API<br/>(LLM Engine)"]
            Storage["저장 Supabase Storage<br/>(Images)"]
        end

        subgraph "External Ecosystem"
            Commerce["쇼핑 E-commerce<br/>(naver/Naver)"]
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
    ```

2.  User Activity Flow (Activity Analysis)
    목적: 사용자의 활동을 4단계 활동(Assessment, Matching, Action, Validation)으로 구분하여 전체 흐름을 시각화합니다.

    ```mermaid
    flowchart TD
    %% Start
    Start((Start)) --> Auth{Login Type}
    Auth -->|User| Role1[Save Role: User]
    Auth -->|Expert/Family| Role2[Save Role: Manager]

        %% Activity 1: Assessment (문제 해결)
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

        %% Activity 2: Matching (매칭 제품)
        subgraph "Activity 2: Matching"
            Check -- Yes --> Mapping[Map ICF(d,e) to ISO Code]
            Mapping --> DB_Search[Search DB for Products]
            DB_Search --> Generate_Reason[AI: Generate 'Why This Fits']
        end

        %% Activity 3: Action (구매 활동)
        subgraph "Activity 3: Action"
            Generate_Reason --> Show_Card[Display Product Cards]
            Show_Card --> Show_In_Chat[Show Recommendations in Chat] %% 채팅 표시
            Show_In_Chat --> User_Navigate[User Clicks 'View Recommendations'] %% 채팅 표시
            User_Navigate --> Show_Card
            Show_Card --> User_Click[Click 'Buy Now'] %% 구매 완료
            User_Click --> OutLink[Redirect to Commerce] %% 구매 완료
            OutLink --> Log_Click[Log: Recommendation Clicked] %% 구매 완료
        end

        %% Activity 4: Validation (사후 검증)
        subgraph "Activity 4: Validation (K-IPPA)"
            Log_Click -.->|Wait 14 Days| Notification[Send Feedback Alert]
            Notification --> Survey[Input: Pre/Post Score]
            Survey --> Calc[Calc: Effectiveness Score]
            Calc --> Reward[Give Points]
        end

        Reward --> End((End Loop))
    ```

3.  Core Logic Sequence (Detailed)
    목적: **"상담 요청 → AI 분석 → DB 조회 → 추천 생성"**의 상세한 순서를 시각화합니다.
    참고: System Prompt 참고하여 각 단계별로 구체적인 순서를 포함합니다.

    ```mermaid
    sequenceDiagram
    autonumber
    actor U as 사용자 User
    participant FE as 프론트 Client (UI)
    participant BE as 서버 API (Next.js)
    participant LLM as AI Gemini (링커블)
    participant DB as 데이터 Supabase

        Note over U, FE: [Activity 1] 사용자의 불편함을 파악
        U->>FE: "손이 떨려서 요리가 어려워요" (Voice/Text)
        FE->>BE: POST /api/chat (message, history)

        BE->>LLM: [System Prompt] <br/>1. Role: Assistive Tech Coordinator<br/>2. Constraint: NO Medical Advice<br/>3. Task: Extract ICF Codes (b, d, e)

        LLM-->>BE: JSON Response <br/>{ "icf": ["b765", "d550"], "needs": "Weighted Utensil" }

        BE->>DB: INSERT into Analysis_Results

        Note over BE, DB: [Activity 2] 제품 매칭 제품
        BE->>DB: SELECT * FROM products <br/>WHERE iso_code MATCHES 'd550 + b765' solution
        DB-->>BE: [Product: 손떨림방지 식기세트 ISO: 15 09 13]

        BE->>LLM: [Prompt] <br/>Generate specific recommendation reason based on user's tremor.
        LLM-->>BE: "손떨림으로 인한 어려움을 해결하는 식기세트를 추천합니다"

        BE->>DB: INSERT into Recommendations
        BE-->>FE: Return { ChatResponse, ProductCards }

        Note over FE, U: [현재 상태]
        FE->>U: 채팅 메시지 표시
        FE->>U: 추천 제품 카드 표시 채팅 (표시) - 추천 페이지로 이동 필요 없음
        Note over FE, U: [목표 상태]
        FE->>U: 채팅 메시지 + 추천 제품 카드 팝업 (2-3개)
        FE->>U: "추천 보기" CTA 버튼 표시
        U->>FE: CTA 클릭
        FE->>U: 추천 페이지로 이동 (/recommendations?consultationId={id})

        Note over U, FE: [Activity 3] 구매 활동
        U->>FE: '구매하러 가기' 버튼 클릭 → 구매 완료
        FE->>U: Open New Tab (naver/Naver) → 구매 완료
    ```

4.  Entity Relationship Diagram (ERD)
    목적: 데이터베이스 테이블 간의 관계를 시각화합니다. K-IPPA 평가를 통한 데이터 검증을 포함합니다.

    ```mermaid
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
    ```

5.  Consultation State Machine
    목적: 상담 세션(Consultation)의 다양한 상태 변화를 시각화합니다.

    ```mermaid
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
    ```
