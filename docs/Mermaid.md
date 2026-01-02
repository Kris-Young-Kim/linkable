LinkAble Diagrams (Mermaid.md)
Project: LinkAble (留곸??대툝)
Description: System Architecture & Logic Flow Visualizations
Version: v1.2 (Activity Analysis Based)

1.  System Context Architecture (C4 Level 2)
    媛쒖슂: ?꾩껜 ?쒖뒪?쒖씠 ?몃? ?쒕퉬??Clerk, Gemini, naver)? ?대뼸寃??곹샇?묒슜?섎뒗吏 蹂댁뿬二쇰뒗 議곌컧?꾩엯?덈떎.
    code
    Mermaid
    graph TB
    subgraph "Client Side (Frontend)"
    User((?뫀 User/Patient))
    Web["?벑 LinkAble Web App<br/>(Next.js Client)"]
    end

        subgraph "Server Side (Backend)"
            API["?숋툘 Next.js API Routes<br/>(Server Actions)"]
            Auth["?뵏 Clerk Auth"]
        end

        subgraph "Data & Intelligence"
            DB[("?뾼截?Supabase<br/>(PostgreSQL)")]
            AI["?쭬 Google Gemini API<br/>(LLM Engine)"]
            Storage["?곻툘 Supabase Storage<br/>(Images)"]
        end

        subgraph "External Ecosystem"
            Commerce["?썟 E-commerce<br/>(naver/Naver)"]
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
    媛쒖슂: ?ъ슜?먯쓽 ?됰룞??4?④퀎 ?쒕룞(Assessment, Matching, Action, Validation)?쇰줈 履쇨컻???먮쫫???뺤쓽?덉뒿?덈떎.
    code
    Mermaid
    flowchart TD
    %% Start
    Start((Start)) --> Auth{Login Type}
    Auth -->|User| Role1[Save Role: User]
    Auth -->|Expert/Family| Role2[Save Role: Manager]

        %% Activity 1: Assessment (臾몄젣 ?뚯븙)
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

        %% Activity 2: Matching (?닿껐梨?留ㅼ묶)
        subgraph "Activity 2: Matching"
            Check -- Yes --> Mapping[Map ICF(d,e) to ISO Code]
            Mapping --> DB_Search[Search DB for Products]
            DB_Search --> Generate_Reason[AI: Generate 'Why This Fits']
        end

        %% Activity 3: Action (援щℓ ?됰룞)
        subgraph "Activity 3: Action"
            Generate_Reason --> Show_Card[Display Product Cards]
            Show_Card --> Show_In_Chat[Show Recommendations in Chat] ?좑툘 誘멸뎄??
            Show_In_Chat --> User_Navigate[User Clicks 'View Recommendations'] ?좑툘 誘멸뎄??
            User_Navigate --> Show_Card
            Show_Card --> User_Click[Click 'Buy Now'] ??援ы쁽 ?꾨즺
            User_Click --> OutLink[Redirect to Commerce] ??援ы쁽 ?꾨즺
            OutLink --> Log_Click[Log: Recommendation Clicked] ??援ы쁽 ?꾨즺
        end

        %% Activity 4: Validation (?ы썑 寃利?
        subgraph "Activity 4: Validation (K-IPPA)"
            Log_Click -.->|Wait 14 Days| Notification[Send Feedback Alert]
            Notification --> Survey[Input: Pre/Post Score]
            Survey --> Calc[Calc: Effectiveness Score]
            Calc --> Reward[Give Points]
        end

        Reward --> End((End Loop))

3.  Core Logic Sequence (Detailed)
    媛쒖슂: **"?곷떞 ?붿껌 ??AI 遺꾩꽍 ??DB 寃?????듬? ?앹꽦"**???듭떖 濡쒖쭅???쒓컖?뷀뻽?듬땲??
    二쇱쓽: System Prompt 遺遺꾩뿉 ?섎즺 ?⑹뼱 湲덉? 濡쒖쭅???ы븿?섏뼱 ?덉뒿?덈떎.
    code
    Mermaid
    sequenceDiagram
    autonumber
    actor U as ?뫀 User
    participant FE as ?벑 Client (UI)
    participant BE as ?숋툘 API (Next.js)
    participant LLM as ?쭬 Gemini (留곸빱)
    participant DB as ?뾼截?Supabase

        Note over U, FE: [Activity 1] ?ъ슜?먭? 遺덊렪?⑥쓣 ?몄냼
        U->>FE: "?먯씠 ?⑤젮??諛?癒밴린媛 ?섎뱾??" (Voice/Text)
        FE->>BE: POST /api/chat (message, history)

        BE->>LLM: [System Prompt] <br/>1. Role: Assistive Tech Coordinator<br/>2. Constraint: NO Medical Advice<br/>3. Task: Extract ICF Codes (b, d, e)

        LLM-->>BE: JSON Response <br/>{ "icf": ["b765", "d550"], "needs": "Weighted Utensil" }

        BE->>DB: INSERT into Analysis_Results

        Note over BE, DB: [Activity 2] ?붾（??留ㅼ묶 ?꾨줈?몄뒪
        BE->>DB: SELECT * FROM products <br/>WHERE iso_code MATCHES 'd550 + b765' solution
        DB-->>BE: [Product: 臾닿쾶議곗젅 ?잕??? ISO: 15 09 13]

        BE->>LLM: [Prompt] <br/>Generate specific recommendation reason based on user's tremor.
        LLM-->>BE: "???⑤┝???≪븘二쇰뒗 臾닿쾶媛??덈뒗 ?잕??쎌쓣 異붿쿇?⑸땲??"

        BE->>DB: INSERT into Recommendations
        BE-->>FE: Return { ChatResponse, ProductCards }

        Note over FE, U: [?꾩옱 援ы쁽 ?곹깭]
        FE->>U: 梨꾪똿 留먰뭾???쒖떆 ??
        FE->>U: 異붿쿇 ?곹뭹 移대뱶 ?쒖떆 ?좑툘 (誘멸뎄??- 異붿쿇 ?섏씠吏濡??섎룞 ?대룞 ?꾩슂)
        
        Note over FE, U: [紐⑺몴 援ы쁽]
        FE->>U: 梨꾪똿 留먰뭾??+ 異붿쿇 ?곹뭹 移대뱶 誘몃━蹂닿린 (?곸쐞 2-3媛?
        FE->>U: "異붿쿇 蹂닿린" CTA 踰꾪듉 ?쒖떆
        U->>FE: CTA ?대┃
        FE->>U: 異붿쿇 ?섏씠吏濡??대룞 (/recommendations?consultationId={id})

        Note over U, FE: [Activity 3] 援щℓ ?됰룞
        U->>FE: '援щℓ?섎윭 媛湲? ?대┃ ??援ы쁽 ?꾨즺
        FE->>U: Open New Tab (naver/Naver) ??援ы쁽 ?꾨즺

4.  Entity Relationship Diagram (ERD)
    媛쒖슂: ?곗씠?곕쿋?댁뒪 ?뚯씠釉?媛꾩쓽 愿怨?援ъ“?낅땲?? K-IPPA ?됯?瑜??꾪븳 ?곗씠???곌껐???듭떖?낅땲??
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
    媛쒖슂: ?곷떞 ?몄뀡(Consultation)???대뼡 ?곹깭 蹂?붾? 寃る뒗吏 蹂댁뿬以띾땲??
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
