-- =========================================================
-- [LinkAble] MVP Database DDL Script
-- Database: PostgreSQL (Supabase)
-- Version: 1.2
-- Generated: 2025-02-20
-- =========================================================
-- 
-- ???ㅽ겕由쏀듃??紐⑤뱺 留덉씠洹몃젅?댁뀡???듯빀???꾩쟾??DDL?낅땲??
-- ?덈줈???곗씠?곕쿋?댁뒪 ?몄뒪?댁뒪瑜??앹꽦?섍굅???꾩껜 ?ㅽ궎留덈? ?ш뎄?깊븷 ???ъ슜?⑸땲??
--
-- 二쇱쓽: ???ㅽ겕由쏀듃??湲곗〈 ?곗씠?곕? ??젣?⑸땲??
-- ?꾨줈?뺤뀡 ?섍꼍?먯꽌??二쇱쓽?섏뿬 ?ъ슜?섏꽭??
-- =========================================================

-- =========================================================
-- [1] 湲곗〈 媛앹껜 ??젣 (CASCADE)
-- =========================================================

DROP VIEW IF EXISTS icf_code_expansion_priority CASCADE;
DROP VIEW IF EXISTS view_iso_code_stats CASCADE;
DROP VIEW IF EXISTS view_product_stats CASCADE;
DROP VIEW IF EXISTS view_user_analytics CASCADE;
DROP VIEW IF EXISTS view_daily_stats CASCADE;
DROP VIEW IF EXISTS view_platform_stats CASCADE;

DROP VIEW IF EXISTS view_consultation_icf_codes_jsonb CASCADE;
DROP VIEW IF EXISTS view_consultation_icf_codes_detail CASCADE;
DROP VIEW IF EXISTS view_products_with_codes CASCADE;
DROP TABLE IF EXISTS consultation_icf_codes CASCADE;
DROP TABLE IF EXISTS icf_codes CASCADE;
DROP TABLE IF EXISTS iso_codes CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS icf_auto_expand_config CASCADE;
DROP TABLE IF EXISTS icf_code_expansions CASCADE;
DROP TABLE IF EXISTS icf_code_statistics CASCADE;
DROP TABLE IF EXISTS icf_code_usage_logs CASCADE;
DROP TABLE IF EXISTS conversion_events CASCADE;
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS user_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS consultation_feedback CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ippa_evaluations CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS get_consultation_icf_codes CASCADE;
DROP FUNCTION IF EXISTS calculate_period_stats CASCADE;
DROP FUNCTION IF EXISTS calculate_user_kpi CASCADE;
DROP FUNCTION IF EXISTS update_icf_code_statistics CASCADE;
DROP FUNCTION IF EXISTS update_user_points CASCADE;
DROP FUNCTION IF EXISTS update_coupons_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_consultation_feedback_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- =========================================================
-- [2] ?좏떥由ы떚 ?⑥닔 ?앹꽦
-- =========================================================

-- updated_at ?먮룞 ?낅뜲?댄듃 ?⑥닔
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS '?덉퐫???섏젙 ??updated_at ?꾨뱶瑜??먮룞?쇰줈 媛깆떊';

-- =========================================================
-- [3] 湲곕낯 ?뚯씠釉??앹꽦
-- =========================================================

-- 1. Users (?ъ슜??
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'manager', 'admin'
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_role_check CHECK (role IN ('user', 'manager', 'admin'))
);

COMMENT ON TABLE users IS '?ъ슜???뺣낫 (Clerk Auth ?곕룞)';
COMMENT ON COLUMN users.role IS '沅뚰븳 援щ텇: user(?쇰컲), manager(?꾨Ц媛), admin(愿由ъ옄)';
COMMENT ON COLUMN users.points IS '?ъ슜???ъ씤??(K-IPPA ?됯?, 異붿쿇 ?대┃ ?깆쑝濡??띾뱷)';

-- 2. ISO Codes (ISO 9999 肄붾뱶 留덉뒪?? - ?뺢퇋??
CREATE TABLE iso_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- ISO 9999 肄붾뱶 (?? "15 09", "12 03")
    name VARCHAR(255) NOT NULL, -- 肄붾뱶紐?(?? "?앹궗 蹂댁“湲곌린", "蹂댄뻾 蹂댁“湲곌린")
    description TEXT, -- ?곸꽭 ?ㅻ챸
    parent_code VARCHAR(50), -- ?곸쐞 肄붾뱶 (怨꾩링 援ъ“??
    level INTEGER DEFAULT 1, -- 肄붾뱶 ?덈꺼 (1: ?遺꾨쪟, 2: 以묐텇瑜? 3: ?뚮텇瑜?
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0, -- ?쒖떆 ?쒖꽌
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_iso_codes_parent FOREIGN KEY (parent_code) REFERENCES iso_codes(code) ON DELETE SET NULL
);

COMMENT ON TABLE iso_codes IS 'ISO 9999 蹂댁“湲곌린 遺꾨쪟 肄붾뱶 留덉뒪??;
COMMENT ON COLUMN iso_codes.code IS 'ISO 9999 肄붾뱶 (怨좎쑀媛?';
COMMENT ON COLUMN iso_codes.name IS '肄붾뱶紐?(?쒓?)';
COMMENT ON COLUMN iso_codes.parent_code IS '?곸쐞 肄붾뱶 (怨꾩링 援ъ“)';
COMMENT ON COLUMN iso_codes.level IS '肄붾뱶 ?덈꺼: 1(?遺꾨쪟), 2(以묐텇瑜?, 3(?뚮텇瑜?';

-- 3. Manufacturers (?쒖“??留덉뒪?? - ?뺢퇋??
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- ?쒖“??肄붾뱶 (?? "OTTOBOCK", "SUNRISE")
    name VARCHAR(255) NOT NULL, -- ?쒖“?щ챸 (?? "?ㅽ넗蹂?, "?좊씪?댁쫰")
    name_en VARCHAR(255), -- ?곷Ц紐?
    country VARCHAR(100), -- 援??
    website_url TEXT, -- ?뱀궗?댄듃 URL
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE manufacturers IS '?쒖“??留덉뒪??;
COMMENT ON COLUMN manufacturers.code IS '?쒖“??肄붾뱶 (怨좎쑀媛? ?臾몄옄)';
COMMENT ON COLUMN manufacturers.name IS '?쒖“?щ챸 (?쒓?)';
COMMENT ON COLUMN manufacturers.name_en IS '?쒖“?щ챸 (?곷Ц)';

-- 4. Categories (?곹뭹 移댄뀒怨좊━ 留덉뒪?? - ?뺢퇋??
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- 移댄뀒怨좊━ 肄붾뱶 (?? "MOBILITY", "DAILY_LIVING")
    name VARCHAR(255) NOT NULL, -- 移댄뀒怨좊━紐?(?? "?대룞 蹂댁“", "?쇱긽?앺솢 蹂댁“")
    name_en VARCHAR(255), -- ?곷Ц紐?
    description TEXT, -- ?곸꽭 ?ㅻ챸
    parent_code VARCHAR(50), -- ?곸쐞 移댄뀒怨좊━ (怨꾩링 援ъ“??
    level INTEGER DEFAULT 1, -- 移댄뀒怨좊━ ?덈꺼
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_code) REFERENCES categories(code) ON DELETE SET NULL
);

COMMENT ON TABLE categories IS '?곹뭹 移댄뀒怨좊━ 留덉뒪??;
COMMENT ON COLUMN categories.code IS '移댄뀒怨좊━ 肄붾뱶 (怨좎쑀媛? ?臾몄옄)';
COMMENT ON COLUMN categories.name IS '移댄뀒怨좊━紐?(?쒓?)';
COMMENT ON COLUMN categories.parent_code IS '?곸쐞 移댄뀒怨좊━ (怨꾩링 援ъ“)';

-- 5. ICF Codes (ICF 肄붾뱶 留덉뒪?? - ?뺢퇋??
CREATE TABLE icf_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- ICF 肄붾뱶 (?? "b210", "d550", "e115")
    category CHAR(1) NOT NULL CHECK (category IN ('b', 'd', 'e', 'p')), -- 移댄뀒怨좊━: b(?좎껜湲곕뒫), d(?쒕룞), e(?섍꼍?붿냼), p(李몄뿬)
    name VARCHAR(255), -- 肄붾뱶紐?(?쒓?)
    name_en VARCHAR(255), -- 肄붾뱶紐?(?곷Ц)
    description TEXT, -- ?곸꽭 ?ㅻ챸
    parent_code VARCHAR(50), -- ?곸쐞 肄붾뱶 (怨꾩링 援ъ“??
    level INTEGER DEFAULT 1, -- 肄붾뱶 ?덈꺼
    is_in_core_set BOOLEAN DEFAULT FALSE, -- Core Set ?ы븿 ?щ?
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_icf_codes_parent FOREIGN KEY (parent_code) REFERENCES icf_codes(code) ON DELETE SET NULL
);

COMMENT ON TABLE icf_codes IS 'ICF 肄붾뱶 留덉뒪??(?뺢퇋??';
COMMENT ON COLUMN icf_codes.code IS 'ICF 肄붾뱶 (怨좎쑀媛? ?뚮Ц??';
COMMENT ON COLUMN icf_codes.category IS '移댄뀒怨좊━: b(?좎껜湲곕뒫), d(?쒕룞), e(?섍꼍?붿냼), p(李몄뿬)';
COMMENT ON COLUMN icf_codes.is_in_core_set IS 'ICF Core Set???ы븿??肄붾뱶?몄? ?щ?';

-- 6. Products (蹂댁“湲곌린 ?곹뭹) - ?뺢퇋??諛섏쁺
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    -- 湲곗〈 VARCHAR 而щ읆 (?섏쐞 ?명솚???좎?)
    iso_code VARCHAR(50) NOT NULL, -- ISO 9999 遺꾨쪟 肄붾뱶
    manufacturer VARCHAR(100),
    category VARCHAR(100),
    -- ?뺢퇋?붾맂 FK 而щ읆
    iso_code_id UUID,
    manufacturer_id UUID,
    category_id UUID,
    description TEXT,
    image_url TEXT,
    purchase_link TEXT, -- ?쒗쑕 ?섏씡 留곹겕
    price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- FK ?쒖빟議곌굔
    CONSTRAINT fk_products_iso_code FOREIGN KEY (iso_code_id) REFERENCES iso_codes(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

COMMENT ON TABLE products IS '蹂댁“湲곌린 留덉뒪???곗씠??(ISO 9999 湲곗?)';
COMMENT ON COLUMN products.iso_code IS 'ISO 9999 肄붾뱶 (?섏쐞 ?명솚?? ?뺢퇋?붾맂 iso_code_id ?ъ슜 沅뚯옣)';
COMMENT ON COLUMN products.manufacturer IS '?쒖“?щ챸 (?섏쐞 ?명솚?? ?뺢퇋?붾맂 manufacturer_id ?ъ슜 沅뚯옣)';
COMMENT ON COLUMN products.category IS '移댄뀒怨좊━紐?(?섏쐞 ?명솚?? ?뺢퇋?붾맂 category_id ?ъ슜 沅뚯옣)';

-- 7. Consultations (?곷떞 ?몄뀡)
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(200),
    status VARCHAR(50) DEFAULT 'in_progress',
    is_favorite BOOLEAN DEFAULT FALSE,
    disability_type TEXT,
    disability_severity TEXT,
    ippa_activities JSONB DEFAULT NULL, -- K-IPPA ?곷떞 ?④퀎?먯꽌 ?좏깮??ICF ?쒕룞 諛??먯닔 (湲곗큹??
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_consultations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT consultations_status_check CHECK (status IN ('in_progress', 'completed', 'archived'))
);

COMMENT ON TABLE consultations IS '?ъ슜???곷떞 ?몄뀡 ?ㅻ뜑';
COMMENT ON COLUMN consultations.is_favorite IS '?ъ슜?먭? 利먭꺼李얘린濡??쒖떆???곷떞?몄? ?щ?';
COMMENT ON COLUMN consultations.ippa_activities IS 'K-IPPA ?곷떞 ?④퀎?먯꽌 ?좏깮??ICF ?쒕룞 諛??먯닔 (湲곗큹??';

-- 8. Chat Messages (?곷떞 濡쒓렇)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    sender VARCHAR(20) NOT NULL, -- 'user', 'ai', 'system'
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_chat_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT chat_sender_check CHECK (sender IN ('user', 'ai', 'system'))
);

COMMENT ON TABLE chat_messages IS '?곷떞 ?곸꽭 ???濡쒓렇';

-- 9. Consultation ICF Codes (?곷떞-ICF 肄붾뱶 愿怨? - ?뺢퇋??
CREATE TABLE consultation_icf_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    icf_code_id UUID NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'chat_analysis' CHECK (source IN (
        'chat_analysis',
        'keyword_inference',
        'semantic_match',
        'manual_input',
        'ippa_evaluation'
    )), -- ICF 肄붾뱶 異붿텧 ?뚯뒪
    confidence_score DECIMAL(3, 2) DEFAULT 1.0, -- ?좊ː???먯닔 (0.0 ~ 1.0)
    context JSONB, -- 異붽? 而⑦뀓?ㅽ듃 ?뺣낫
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_consultation_icf_consultation FOREIGN KEY (consultation_id) 
        REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_consultation_icf_code FOREIGN KEY (icf_code_id) 
        REFERENCES icf_codes(id) ON DELETE CASCADE,
    -- ???곷떞???숈씪??ICF 肄붾뱶???섎굹留?(?뚯뒪媛 ?ㅻ? ???덉쑝誘濡?UNIQUE ?쒖빟? ?놁쓬)
    CONSTRAINT unique_consultation_icf_code UNIQUE (consultation_id, icf_code_id, source)
);

COMMENT ON TABLE consultation_icf_codes IS '?곷떞怨?ICF 肄붾뱶??愿怨?(1:N)';
COMMENT ON COLUMN consultation_icf_codes.source IS 'ICF 肄붾뱶 異붿텧 ?뚯뒪';
COMMENT ON COLUMN consultation_icf_codes.confidence_score IS '?좊ː???먯닔 (0.0 ~ 1.0)';

-- 10. Analysis Results (AI 遺꾩꽍 寃곌낵)
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    summary TEXT,
    icf_codes JSONB, -- {"b": [...], "d": [...], "e": [...]} (DEPRECATED: consultation_icf_codes ?ъ슜 沅뚯옣)
    icf_codes_deprecated JSONB, -- DEPRECATED: icf_codes JSONB ?꾨뱶. consultation_icf_codes ?뚯씠釉??ъ슜 沅뚯옣
    identified_problems TEXT,
    env_factors TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_analysis_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    -- ?곷떞 ?섎굹??遺꾩꽍 寃곌낵???섎굹留?議댁옱 (1:1)
    CONSTRAINT analysis_consultation_unique UNIQUE (consultation_id)
);

COMMENT ON TABLE analysis_results IS 'AI媛 遺꾩꽍??ICF 肄붾뱶 諛?臾몄젣 ?뺤쓽 (JSONB ?쒖슜)';
COMMENT ON COLUMN analysis_results.icf_codes_deprecated IS 'DEPRECATED: icf_codes JSONB ?꾨뱶. consultation_icf_codes ?뚯씠釉??ъ슜 沅뚯옣';

-- 11. Recommendations (異붿쿇 留ㅼ묶)
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    product_id UUID NOT NULL,
    match_reason TEXT, -- AI媛 ?앹꽦??異붿쿇 ?ъ쑀
    rank INTEGER,
    is_clicked BOOLEAN DEFAULT FALSE,
    purchase_completed BOOLEAN DEFAULT FALSE,
    purchase_completed_at TIMESTAMP WITH TIME ZONE,
    purchase_amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_recommendation_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

COMMENT ON TABLE recommendations IS '?곷떞 寃곌낵???곕Ⅸ ?곹뭹 異붿쿇 紐⑸줉 (?ㅻ????곌껐)';
COMMENT ON COLUMN recommendations.purchase_completed IS '援щℓ ?꾨즺 ?щ?';
COMMENT ON COLUMN recommendations.purchase_completed_at IS '援щℓ ?꾨즺 ?쇱떆';
COMMENT ON COLUMN recommendations.purchase_amount IS '援щℓ 湲덉븸';

-- 12. IPPA Evaluations (K-IPPA ?④낵???됯?)
CREATE TABLE ippa_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    recommendation_id UUID, -- 吏곸젒 援щℓ ??NULL 媛??
    
    problem_description TEXT, -- ?ъ슜?먭? ?뺤쓽??臾몄젣
    score_importance INTEGER NOT NULL DEFAULT 3,
    score_difficulty_pre INTEGER NOT NULL,
    score_difficulty_post INTEGER NOT NULL,
    activity_scores JSONB DEFAULT NULL, -- K-IPPA ?됯??먯꽌 媛?ICF ?쒕룞蹂??ъ쟾/?ы썑 ?먯닔 諛?媛쒖꽑??
    
    -- [?먮룞 怨꾩궛] ?④낵???먯닔 = (??- ?? * 以묒슂??
    effectiveness_score DECIMAL(5, 2) GENERATED ALWAYS AS 
        ((score_difficulty_pre - score_difficulty_post) * score_importance) STORED,
        
    feedback_comment TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_ippa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ippa_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ippa_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
    
    -- Score Range Checks (1~5)
    CONSTRAINT check_importance_range CHECK (score_importance BETWEEN 1 AND 5),
    CONSTRAINT check_pre_range CHECK (score_difficulty_pre BETWEEN 1 AND 5),
    CONSTRAINT check_post_range CHECK (score_difficulty_post BETWEEN 1 AND 5)
);

COMMENT ON TABLE ippa_evaluations IS 'K-IPPA 湲곕컲 ?ъ슜??諛??④낵??寃利??곗씠??;
COMMENT ON COLUMN ippa_evaluations.activity_scores IS 'K-IPPA ?됯??먯꽌 媛?ICF ?쒕룞蹂??ъ쟾/?ы썑 ?먯닔 諛?媛쒖꽑??;

-- =========================================================
-- [4] 異붽? ?뚯씠釉??앹꽦
-- =========================================================

-- 13. Notifications (?뚮┝)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    metadata JSONB
);

COMMENT ON TABLE notifications IS '?????뚮┝ 諛?由щ쭏?몃뜑';

-- 14. Consultation Feedback (?곷떞 ?쇰뱶諛?
CREATE TABLE consultation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    accuracy_rating INTEGER NOT NULL CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    feedback_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT fk_feedback_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- ???곷떞???섎굹???쇰뱶諛깅쭔 ?덉슜
    CONSTRAINT unique_feedback_per_consultation UNIQUE (consultation_id)
);

COMMENT ON TABLE consultation_feedback IS '?곷떞 醫낅즺 ??ICF 遺꾩꽍 ?뺥솗???쇰뱶諛?;
COMMENT ON COLUMN consultation_feedback.accuracy_rating IS 'ICF 遺꾩꽍 ?뺥솗???됯? (1-5??';
COMMENT ON COLUMN consultation_feedback.feedback_comment IS '異붽? ?섍껄 (?좏깮?ы빆)';

-- 15. Coupons (荑좏룿 留덉뒪??
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE coupons IS '荑좏룿 留덉뒪???곗씠??;
COMMENT ON COLUMN coupons.discount_type IS '?좎씤 ?좏삎: percentage(%), fixed(怨좎젙湲덉븸), free_shipping(臾대즺諛곗넚)';
COMMENT ON COLUMN coupons.discount_value IS '?좎씤 媛?(percentage硫?%, fixed硫???';

-- 16. User Coupons (?ъ슜??荑좏룿 蹂댁쑀)
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    coupon_id UUID NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user_coupon_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_coupon_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_coupon UNIQUE (user_id, coupon_id)
);

COMMENT ON TABLE user_coupons IS '?ъ슜?먭? 蹂댁쑀??荑좏룿';
COMMENT ON COLUMN user_coupons.used_at IS '荑좏룿 ?ъ슜 ?쒓컖 (NULL?대㈃ 誘몄궗??';

-- 17. Point Transactions (?ъ씤??嫄곕옒 ?대젰)
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'earned_ippa_evaluation',
        'earned_recommendation_click',
        'earned_consultation_complete',
        'earned_feedback_submit',
        'redeemed_coupon',
        'admin_adjustment'
    )),
    description TEXT,
    reference_id UUID, -- 愿??ID (recommendation_id, ippa_evaluation_id ??
    reference_type VARCHAR(50), -- 'recommendation', 'ippa_evaluation', 'consultation' ??
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_point_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE point_transactions IS '?ъ씤??嫄곕옒 ?대젰';
COMMENT ON COLUMN point_transactions.transaction_type IS '嫄곕옒 ?좏삎: earned(?띾뱷), redeemed(?ъ슜)';
COMMENT ON COLUMN point_transactions.reference_id IS '愿???뷀떚??ID (?좏깮??';

-- 18. Conversion Events (?꾪솚 ?대깽??濡쒓퉭)
CREATE TABLE conversion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'recommendation_click',
        'purchase_link_click',
        'support_program_click',
        'expert_inquiry_click',
        'ippa_evaluation_submit',
        'consultation_feedback_submit',
        'coupon_redeemed',
        'purchase_completed'
    )),
    source VARCHAR(50), -- 'primary', 'secondary', 'support', 'expert' ??
    recommendation_id UUID,
    product_id UUID,
    consultation_id UUID,
    purchase_amount DECIMAL(10, 2),
    commission_amount DECIMAL(10, 2),
    purchase_date TIMESTAMP WITH TIME ZONE,
    tracking_source VARCHAR(50), -- 'naver_api', 'postback', 'meta_pixel'
    metadata JSONB, -- 異붽? 硫뷀??곗씠??
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_conversion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversion_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversion_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_conversion_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL
);

COMMENT ON TABLE conversion_events IS '?꾪솚 ?대깽??濡쒓퉭 (Analytics ??쒕낫???곕룞??';
COMMENT ON COLUMN conversion_events.metadata IS '異붽? 硫뷀??곗씠??(JSON ?뺤떇)';
COMMENT ON COLUMN conversion_events.purchase_amount IS '援щℓ 湲덉븸';
COMMENT ON COLUMN conversion_events.commission_amount IS '?섏닔猷?湲덉븸';
COMMENT ON COLUMN conversion_events.purchase_date IS '援щℓ ?꾨즺 ?쇱떆';
COMMENT ON COLUMN conversion_events.tracking_source IS '異붿쟻 ?뚯뒪 (naver_api, postback, meta_pixel)';

-- 19. ICF Code Usage Logs (ICF 肄붾뱶 ?ъ슜 濡쒓렇)
CREATE TABLE icf_code_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icf_code TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
    is_in_core_set BOOLEAN NOT NULL DEFAULT false,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('chat_analysis', 'keyword_inference', 'semantic_match', 'manual_input')),
    context JSONB, -- 異붽? 而⑦뀓?ㅽ듃 ?뺣낫 (?? ?ъ슜???ㅼ썙?? 留ㅼ묶??ISO 肄붾뱶 ??
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE icf_code_usage_logs IS 'ICF 肄붾뱶 ?ъ슜 濡쒓렇 - 紐⑤뱺 ICF 肄붾뱶 ?ъ슜 ?대깽?몃? 湲곕줉';

-- 20. ICF Code Statistics (ICF 肄붾뱶 ?듦퀎)
CREATE TABLE icf_code_statistics (
    icf_code TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('b', 'd', 'e')),
    is_in_core_set BOOLEAN NOT NULL DEFAULT false,
    total_usage_count INTEGER NOT NULL DEFAULT 0,
    unique_consultations INTEGER NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    usage_by_source JSONB DEFAULT '{}'::jsonb, -- source蹂??ъ슜 ?잛닔
    associated_iso_codes TEXT[] DEFAULT '{}', -- ?④퍡 ?ъ슜??ISO 肄붾뱶 紐⑸줉
    associated_keywords TEXT[] DEFAULT '{}', -- ?④퍡 ?ъ슜???ㅼ썙??紐⑸줉
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE icf_code_statistics IS 'ICF 肄붾뱶 ?듦퀎 - 肄붾뱶蹂?吏묎퀎???ъ슜 ?듦퀎';

-- 21. ICF Code Expansions (ICF 肄붾뱶 ?뺤옣 ?대깽??湲곕줉)
CREATE TABLE icf_code_expansions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icf_code TEXT NOT NULL,
    expanded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expanded_by TEXT, -- Clerk user ID
    iso_hints TEXT[] DEFAULT '{}',
    notes TEXT
);

COMMENT ON TABLE icf_code_expansions IS 'ICF 肄붾뱶 ?뺤옣 ?대깽??湲곕줉';

-- 22. ICF Auto Expand Config (?먮룞 ?뺤옣 ?ㅼ젙)
CREATE TABLE icf_auto_expand_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN NOT NULL DEFAULT false,
    threshold NUMERIC(5, 2) NOT NULL DEFAULT 20.0,
    last_run_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT -- Clerk user ID
);

COMMENT ON TABLE icf_auto_expand_config IS '?먮룞 ?뺤옣 ?ㅼ젙';

-- 珥덇린 ?ㅼ젙 ?쎌엯
INSERT INTO icf_auto_expand_config (enabled, threshold)
VALUES (false, 20.0)
ON CONFLICT DO NOTHING;

-- =========================================================
-- [5] ?몃뜳???앹꽦
-- =========================================================

-- Users
CREATE INDEX idx_users_email ON users(email);

-- ISO Codes
CREATE INDEX idx_iso_codes_code ON iso_codes(code);
CREATE INDEX idx_iso_codes_parent ON iso_codes(parent_code);
CREATE INDEX idx_iso_codes_active ON iso_codes(is_active) WHERE is_active = TRUE;

-- Manufacturers
CREATE INDEX idx_manufacturers_code ON manufacturers(code);
CREATE INDEX idx_manufacturers_active ON manufacturers(is_active) WHERE is_active = TRUE;

-- Categories
CREATE INDEX idx_categories_code ON categories(code);
CREATE INDEX idx_categories_parent ON categories(parent_code);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- ICF Codes
CREATE INDEX idx_icf_codes_code ON icf_codes(code);
CREATE INDEX idx_icf_codes_category ON icf_codes(category);
CREATE INDEX idx_icf_codes_core_set ON icf_codes(is_in_core_set) WHERE is_in_core_set = TRUE;
CREATE INDEX idx_icf_codes_parent ON icf_codes(parent_code);
CREATE INDEX idx_icf_codes_active ON icf_codes(is_active) WHERE is_active = TRUE;

-- Consultation ICF Codes
CREATE INDEX idx_consultation_icf_consultation ON consultation_icf_codes(consultation_id);
CREATE INDEX idx_consultation_icf_code ON consultation_icf_codes(icf_code_id);
CREATE INDEX idx_consultation_icf_source ON consultation_icf_codes(source);
CREATE INDEX idx_consultation_icf_created ON consultation_icf_codes(created_at);

-- Products
CREATE INDEX idx_products_iso_code ON products(iso_code);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_iso_code_id ON products(iso_code_id);
CREATE INDEX idx_products_manufacturer_id ON products(manufacturer_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Consultations
CREATE INDEX idx_consultations_user_id ON consultations(user_id);
CREATE INDEX idx_consultations_created_at ON consultations(created_at);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_is_favorite ON consultations(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_consultations_ippa_activities ON consultations USING GIN (ippa_activities);

-- Chat Messages
CREATE INDEX idx_chat_messages_consultation_id ON chat_messages(consultation_id);

-- Recommendations
CREATE INDEX idx_recommendations_consultation_id ON recommendations(consultation_id);
CREATE INDEX idx_recommendations_product_id ON recommendations(product_id);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at);
CREATE INDEX idx_recommendations_is_clicked ON recommendations(is_clicked);
CREATE INDEX idx_recommendations_purchase_completed ON recommendations(purchase_completed, purchase_completed_at);

-- IPPA Evaluations
CREATE INDEX idx_ippa_user_id ON ippa_evaluations(user_id);
CREATE INDEX idx_ippa_product_id ON ippa_evaluations(product_id);
CREATE INDEX idx_ippa_evaluations_evaluated_at ON ippa_evaluations(evaluated_at);
CREATE INDEX idx_ippa_evaluations_recommendation_id ON ippa_evaluations(recommendation_id);
CREATE INDEX idx_ippa_evaluations_activity_scores ON ippa_evaluations USING GIN (activity_scores);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Consultation Feedback
CREATE INDEX idx_feedback_consultation_id ON consultation_feedback(consultation_id);
CREATE INDEX idx_feedback_user_id ON consultation_feedback(user_id);
CREATE INDEX idx_feedback_created_at ON consultation_feedback(created_at);

-- User Coupons
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_expires_at ON user_coupons(expires_at);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at);

-- Point Transactions
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX idx_point_transactions_reference ON point_transactions(reference_type, reference_id);

-- Conversion Events
CREATE INDEX idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX idx_conversion_events_recommendation_id ON conversion_events(recommendation_id);
CREATE INDEX idx_conversion_events_purchase_completed ON conversion_events(event_type, purchase_date) WHERE event_type = 'purchase_completed';
CREATE INDEX idx_conversion_events_tracking_source ON conversion_events(tracking_source, purchase_date);

-- ICF Code Usage Logs
CREATE INDEX idx_icf_code_usage_logs_code ON icf_code_usage_logs(icf_code);
CREATE INDEX idx_icf_code_usage_logs_category ON icf_code_usage_logs(category);
CREATE INDEX idx_icf_code_usage_logs_core_set ON icf_code_usage_logs(is_in_core_set);
CREATE INDEX idx_icf_code_usage_logs_created_at ON icf_code_usage_logs(created_at);
CREATE INDEX idx_icf_code_usage_logs_consultation ON icf_code_usage_logs(consultation_id);

-- ICF Code Statistics
CREATE INDEX idx_icf_code_statistics_category ON icf_code_statistics(category);
CREATE INDEX idx_icf_code_statistics_core_set ON icf_code_statistics(is_in_core_set);
CREATE INDEX idx_icf_code_statistics_usage_count ON icf_code_statistics(total_usage_count DESC);
CREATE INDEX idx_icf_code_statistics_last_seen ON icf_code_statistics(last_seen_at DESC);

-- ICF Code Expansions
CREATE INDEX idx_icf_code_expansions_code ON icf_code_expansions(icf_code);
CREATE INDEX idx_icf_code_expansions_expanded_at ON icf_code_expansions(expanded_at DESC);

-- =========================================================
-- [6] ?⑥닔 ?앹꽦
-- =========================================================

-- Consultation Feedback updated_at ?낅뜲?댄듃 ?⑥닔
CREATE OR REPLACE FUNCTION update_consultation_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_consultation_feedback_updated_at() IS 'consultation_feedback ?뚯씠釉붿쓽 updated_at ?먮룞 ?낅뜲?댄듃';

-- Coupons updated_at ?낅뜲?댄듃 ?⑥닔
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_coupons_updated_at() IS 'coupons ?뚯씠釉붿쓽 updated_at ?먮룞 ?낅뜲?댄듃';

-- ?ъ씤???먮룞 ?낅뜲?댄듃 ?⑥닔
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET points = points + NEW.points
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_points() IS '?ъ씤??嫄곕옒 諛쒖깮 ??users.points ?먮룞 ?낅뜲?댄듃';

-- ICF 肄붾뱶 ?듦퀎 ?낅뜲?댄듃 ?⑥닔
CREATE OR REPLACE FUNCTION update_icf_code_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO icf_code_statistics (
    icf_code,
    category,
    is_in_core_set,
    total_usage_count,
    unique_consultations,
    first_seen_at,
    last_seen_at,
    usage_by_source,
    updated_at
  )
  VALUES (
    NEW.icf_code,
    NEW.category,
    NEW.is_in_core_set,
    1,
    1,
    NEW.created_at,
    NEW.created_at,
    jsonb_build_object(NEW.source, 1),
    NOW()
  )
  ON CONFLICT (icf_code) DO UPDATE SET
    total_usage_count = icf_code_statistics.total_usage_count + 1,
    unique_consultations = CASE 
      WHEN NEW.consultation_id IS NOT NULL AND 
           NOT EXISTS (
             SELECT 1 FROM icf_code_usage_logs 
             WHERE icf_code = NEW.icf_code 
             AND consultation_id = NEW.consultation_id
             AND id != NEW.id
           )
      THEN icf_code_statistics.unique_consultations + 1
      ELSE icf_code_statistics.unique_consultations
    END,
    last_seen_at = GREATEST(icf_code_statistics.last_seen_at, NEW.created_at),
    first_seen_at = LEAST(icf_code_statistics.first_seen_at, NEW.created_at),
    usage_by_source = jsonb_set(
      COALESCE(icf_code_statistics.usage_by_source, '{}'::jsonb),
      ARRAY[NEW.source],
      to_jsonb(COALESCE((icf_code_statistics.usage_by_source->>NEW.source)::integer, 0) + 1)
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_icf_code_statistics() IS 'ICF 肄붾뱶 ?ъ슜 濡쒓렇 ?쎌엯 ???듦퀎 ?먮룞 ?낅뜲?댄듃';

-- ?ъ슜?먮퀎 KPI 怨꾩궛 ?⑥닔
CREATE OR REPLACE FUNCTION calculate_user_kpi(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  total_consultations BIGINT,
  completed_consultations BIGINT,
  total_recommendations BIGINT,
  clicked_recommendations BIGINT,
  click_through_rate NUMERIC,
  total_ippa_evaluations BIGINT,
  ippa_participation_rate NUMERIC,
  average_effectiveness_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    ua.total_consultations,
    ua.completed_consultations,
    ua.total_recommendations,
    ua.clicked_recommendations,
    CASE 
      WHEN ua.total_recommendations > 0
      THEN ROUND(
        ua.clicked_recommendations::numeric / ua.total_recommendations::numeric * 100,
        2
      )
      ELSE 0
    END as click_through_rate,
    ua.total_ippa_evaluations,
    ua.ippa_participation_rate,
    ua.average_effectiveness_score
  FROM view_user_analytics ua
  WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_kpi(UUID) IS '?뱀젙 ?ъ슜?먯쓽 KPI瑜?怨꾩궛?섎뒗 ?꾨줈?쒖?';

-- 湲곌컙蹂??듦퀎 怨꾩궛 ?⑥닔
CREATE OR REPLACE FUNCTION calculate_period_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_recommendations BIGINT,
  clicked_recommendations BIGINT,
  click_through_rate NUMERIC,
  total_ippa_evaluations BIGINT,
  average_effectiveness_score NUMERIC,
  total_consultations BIGINT,
  completed_consultations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_start_date as period_start,
    p_end_date as period_end,
    COUNT(DISTINCT r.id) as total_recommendations,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
    CASE 
      WHEN COUNT(DISTINCT r.id) > 0
      THEN ROUND(
        COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
        COUNT(DISTINCT r.id)::numeric * 100,
        2
      )
      ELSE 0
    END as click_through_rate,
    COUNT(DISTINCT i.id) as total_ippa_evaluations,
    CASE 
      WHEN COUNT(DISTINCT i.id) > 0
      THEN ROUND(
        AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
        2
      )
      ELSE NULL
    END as average_effectiveness_score,
    COUNT(DISTINCT c.id) as total_consultations,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_consultations
  FROM recommendations r
  LEFT JOIN consultations c ON c.id = r.consultation_id
  LEFT JOIN ippa_evaluations i ON i.recommendation_id = r.id
  WHERE r.created_at >= p_start_date AND r.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_period_stats(TIMESTAMPTZ, TIMESTAMPTZ) IS '?뱀젙 湲곌컙???듦퀎瑜?怨꾩궛?섎뒗 ?꾨줈?쒖?';

-- =========================================================
-- [7] ?몃━嫄??앹꽦
-- =========================================================

-- updated_at ?먮룞 ?낅뜲?댄듃 ?몃━嫄?
CREATE TRIGGER update_users_modtime 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_modtime 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_modtime 
  BEFORE UPDATE ON consultations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iso_codes_modtime 
  BEFORE UPDATE ON iso_codes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturers_modtime 
  BEFORE UPDATE ON manufacturers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_modtime 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_icf_codes_modtime 
  BEFORE UPDATE ON icf_codes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ippa_modtime 
  BEFORE UPDATE ON ippa_evaluations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_consultation_feedback_updated_at
  BEFORE UPDATE ON consultation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_consultation_feedback_updated_at();

CREATE TRIGGER trigger_update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_coupons_updated_at();

-- ?ъ씤???먮룞 ?낅뜲?댄듃 ?몃━嫄?
CREATE TRIGGER trigger_update_user_points
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points();

-- ICF 肄붾뱶 ?듦퀎 ?먮룞 ?낅뜲?댄듃 ?몃━嫄?
CREATE TRIGGER trigger_update_icf_code_statistics
  AFTER INSERT ON icf_code_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_icf_code_statistics();

-- =========================================================
-- [8] 酉??앹꽦
-- =========================================================

-- ?꾩껜 ?뚮옯???듦퀎 酉?
CREATE OR REPLACE VIEW view_platform_stats AS
SELECT 
  -- 異붿쿇 ?듦퀎
  (SELECT COUNT(*) FROM recommendations) as total_recommendations,
  (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations) > 0 
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) / 
      (SELECT COUNT(*)::numeric FROM recommendations) * 100, 
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA ?됯? ?듦퀎
  (SELECT COUNT(*) FROM ippa_evaluations) as total_ippa_evaluations,
  CASE 
    WHEN (SELECT COUNT(*) FROM recommendations WHERE is_clicked = true) > 0
    THEN ROUND(
      -- recommendation_id媛 ?덇퀬 ?대떦 異붿쿇???대┃???됯?留?移댁슫??
      (SELECT COUNT(*)::numeric 
       FROM ippa_evaluations i
       INNER JOIN recommendations r ON i.recommendation_id = r.id
       WHERE r.is_clicked = true 
         AND i.recommendation_id IS NOT NULL) / 
      (SELECT COUNT(*)::numeric FROM recommendations WHERE is_clicked = true) * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- ?곷떞 ?듦퀎
  (SELECT COUNT(*) FROM consultations) as total_consultations,
  (SELECT COUNT(*) FROM consultations WHERE status = 'completed') as completed_consultations,
  CASE 
    WHEN (SELECT COUNT(*) FROM consultations) > 0
    THEN ROUND(
      (SELECT COUNT(*)::numeric FROM consultations WHERE status = 'completed') / 
      (SELECT COUNT(*)::numeric FROM consultations) * 100,
      2
    )
    ELSE 0
  END as consultation_completion_rate,
  
  -- ?됯퇏 ?④낵???먯닔
  CASE 
    WHEN (SELECT COUNT(*) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL) > 0
    THEN ROUND(
      (SELECT AVG(effectiveness_score) FROM ippa_evaluations WHERE effectiveness_score IS NOT NULL),
      2
    )
    ELSE 0
  END as average_effectiveness_score,
  
  -- 理쒓렐 30???쒕룞
  (SELECT COUNT(*) FROM recommendations WHERE created_at >= NOW() - INTERVAL '30 days') as recent_recommendations,
  (SELECT COUNT(*) FROM ippa_evaluations WHERE evaluated_at >= NOW() - INTERVAL '30 days') as recent_ippa_evaluations,
  
  -- ?낅뜲?댄듃 ?쒓컙
  NOW() as last_updated;

COMMENT ON VIEW view_platform_stats IS '?꾩껜 ?뚮옯???듦퀎瑜??ㅼ떆媛꾩쑝濡?吏묎퀎?섎뒗 View (K-IPPA 李몄뿬??怨꾩궛 濡쒖쭅 ?섏젙)';

-- ?쇰퀎 ?듦퀎 酉?(理쒓렐 30??
CREATE OR REPLACE VIEW view_daily_stats AS
SELECT 
  DATE(created_at) as stat_date,
  COUNT(*) as recommendations_count,
  COUNT(*) FILTER (WHERE is_clicked = true) as clicked_count
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

COMMENT ON VIEW view_daily_stats IS '理쒓렐 30???쇰퀎 異붿쿇 ?듦퀎';

-- ?ъ슜?먮퀎 ?듦퀎 酉?
CREATE OR REPLACE VIEW view_user_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  u.points,
  u.created_at as user_created_at,
  
  -- ?곷떞 ?듦퀎
  COUNT(DISTINCT c.id) as total_consultations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_consultations,
  
  -- 異붿쿇 ?듦퀎
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  
  -- K-IPPA ?됯? ?듦퀎
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) > 0
    THEN ROUND(
      COUNT(DISTINCT i.id)::numeric / 
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric * 100,
      2
    )
    ELSE 0
  END as ippa_participation_rate,
  
  -- ?됯퇏 ?④낵???먯닔
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 理쒓렐 ?쒕룞
  MAX(r.created_at) as last_recommendation_at,
  MAX(i.evaluated_at) as last_ippa_evaluation_at

FROM users u
LEFT JOIN consultations c ON c.user_id = u.id
LEFT JOIN recommendations r ON r.consultation_id = c.id
LEFT JOIN ippa_evaluations i ON i.user_id = u.id
GROUP BY u.id, u.email, u.name, u.role, u.points, u.created_at;

COMMENT ON VIEW view_user_analytics IS '?ъ슜?먮퀎 ?곸꽭 ?듦퀎瑜?吏묎퀎?섎뒗 View';

-- ?곹뭹蹂??듦퀎 酉?
CREATE OR REPLACE VIEW view_product_stats AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.iso_code,
  p.manufacturer,
  p.price,
  
  -- 異붿쿇 ?듦퀎
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND(
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
      COUNT(DISTINCT r.id)::numeric * 100,
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA ?됯? ?듦퀎
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- 理쒓렐 ?쒕룞
  MAX(r.created_at) as last_recommended_at

FROM products p
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.iso_code, p.manufacturer, p.price;

COMMENT ON VIEW view_product_stats IS '?곹뭹蹂?異붿쿇 諛??됯? ?듦퀎瑜?吏묎퀎?섎뒗 View';

-- ISO 肄붾뱶蹂??듦퀎 酉?
CREATE OR REPLACE VIEW view_iso_code_stats AS
SELECT 
  p.iso_code,
  
  -- 異붿쿇 ?듦퀎
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true) as clicked_recommendations,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0
    THEN ROUND(
      COUNT(DISTINCT r.id) FILTER (WHERE r.is_clicked = true)::numeric / 
      COUNT(DISTINCT r.id)::numeric * 100,
      2
    )
    ELSE 0
  END as click_through_rate,
  
  -- K-IPPA ?됯? ?듦퀎
  COUNT(DISTINCT i.id) as total_ippa_evaluations,
  CASE 
    WHEN COUNT(DISTINCT i.id) > 0
    THEN ROUND(
      AVG(i.effectiveness_score) FILTER (WHERE i.effectiveness_score IS NOT NULL),
      2
    )
    ELSE NULL
  END as average_effectiveness_score,
  
  -- ?곹뭹 ??
  COUNT(DISTINCT p.id) as product_count

FROM products p
LEFT JOIN recommendations r ON r.product_id = p.id
LEFT JOIN ippa_evaluations i ON i.product_id = p.id
WHERE p.is_active = true
GROUP BY p.iso_code;

COMMENT ON VIEW view_iso_code_stats IS 'ISO 肄붾뱶蹂?異붿쿇 諛??됯? ?듦퀎瑜?吏묎퀎?섎뒗 View';

-- ICF 肄붾뱶 ?뺤옣 ?곗꽑?쒖쐞 酉?
CREATE OR REPLACE VIEW icf_code_expansion_priority AS
SELECT 
  s.icf_code,
  s.category,
  s.is_in_core_set,
  s.total_usage_count,
  s.unique_consultations,
  s.usage_by_source,
  s.first_seen_at,
  s.last_seen_at,
  -- ?곗꽑?쒖쐞 ?먯닔 怨꾩궛 (?ъ슜 鍮덈룄 + 怨좎쑀 ?곷떞 ??+ 理쒓렐??
  (
    s.total_usage_count * 1.0 +
    s.unique_consultations * 2.0 +
    CASE 
      WHEN s.last_seen_at > NOW() - INTERVAL '7 days' THEN 5.0
      WHEN s.last_seen_at > NOW() - INTERVAL '30 days' THEN 2.0
      ELSE 0.0
    END
  ) AS priority_score
FROM icf_code_statistics s
WHERE s.is_in_core_set = false
ORDER BY priority_score DESC;

COMMENT ON VIEW icf_code_expansion_priority IS 'ICF 肄붾뱶 ?뺤옣 ?곗꽑?쒖쐞 - Core Set???녿뒗 肄붾뱶???뺤옣 ?꾩슂??遺꾩꽍';

-- ?곷떞蹂?ICF 肄붾뱶瑜?JSONB ?뺥깭濡?議고쉶?섎뒗 酉?(湲곗〈 肄붾뱶 ?명솚??
CREATE OR REPLACE VIEW view_consultation_icf_codes_jsonb AS
SELECT 
    c.id as consultation_id,
    jsonb_build_object(
        'b', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'b'),
            '[]'::jsonb
        ),
        'd', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'd'),
            '[]'::jsonb
        ),
        'e', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'e'),
            '[]'::jsonb
        ),
        'p', COALESCE(
            jsonb_agg(DISTINCT ic.code) FILTER (WHERE ic.category = 'p'),
            '[]'::jsonb
        )
    ) as icf_codes
FROM consultations c
LEFT JOIN consultation_icf_codes cic ON cic.consultation_id = c.id
LEFT JOIN icf_codes ic ON cic.icf_code_id = ic.id
GROUP BY c.id;

COMMENT ON VIEW view_consultation_icf_codes_jsonb IS '?곷떞蹂?ICF 肄붾뱶瑜?JSONB ?뺥깭濡?議고쉶 (?섏쐞 ?명솚??';

-- ?곷떞蹂?ICF 肄붾뱶 ?곸꽭 議고쉶 酉?
CREATE OR REPLACE VIEW view_consultation_icf_codes_detail AS
SELECT 
    c.id as consultation_id,
    cic.id as relation_id,
    ic.id as icf_code_id,
    ic.code as icf_code,
    ic.category,
    ic.name as icf_code_name,
    ic.name_en as icf_code_name_en,
    ic.description,
    ic.is_in_core_set,
    cic.source,
    cic.confidence_score,
    cic.context,
    cic.created_at
FROM consultations c
INNER JOIN consultation_icf_codes cic ON cic.consultation_id = c.id
INNER JOIN icf_codes ic ON cic.icf_code_id = ic.id
ORDER BY c.id, ic.category, ic.code;

COMMENT ON VIEW view_consultation_icf_codes_detail IS '?곷떞蹂?ICF 肄붾뱶 ?곸꽭 議고쉶 (?뺢퇋?붾맂 援ъ“)';

-- products ?뚯씠釉?議곗씤 酉?(湲곗〈 肄붾뱶????명솚???좎?)
CREATE OR REPLACE VIEW view_products_with_codes AS
SELECT 
    p.id,
    p.name,
    p.iso_code_id,
    ic.code as iso_code,
    ic.name as iso_code_name,
    p.manufacturer_id,
    m.code as manufacturer_code,
    m.name as manufacturer,
    p.category_id,
    c.code as category_code,
    c.name as category,
    p.description,
    p.image_url,
    p.purchase_link,
    p.price,
    p.is_active,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN iso_codes ic ON p.iso_code_id = ic.id
LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
LEFT JOIN categories c ON p.category_id = c.id;

COMMENT ON VIEW view_products_with_codes IS 'products ?뚯씠釉붽낵 肄붾뱶 ?뚯씠釉?議곗씤 酉?(?섏쐞 ?명솚??';

-- =========================================================
-- [10] ?⑥닔 ?앹꽦 (異붽?)
-- =========================================================

-- ?곷떞??ICF 肄붾뱶瑜?諛곗뿴濡?諛섑솚?섎뒗 ?⑥닔
CREATE OR REPLACE FUNCTION get_consultation_icf_codes(p_consultation_id UUID)
RETURNS TABLE (
    code TEXT,
    category CHAR(1),
    name VARCHAR(255),
    source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.code::TEXT,
        ic.category,
        ic.name,
        cic.source
    FROM consultation_icf_codes cic
    INNER JOIN icf_codes ic ON cic.icf_code_id = ic.id
    WHERE cic.consultation_id = p_consultation_id
    ORDER BY ic.category, ic.code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_consultation_icf_codes(UUID) IS '?곷떞??ICF 肄붾뱶瑜?諛곗뿴濡?諛섑솚 (移댄뀒怨좊━蹂??뺣젹)';

-- =========================================================
-- [11] ?꾨즺 硫붿떆吏
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'LinkAble MVP Database DDL Script ?ㅽ뻾 ?꾨즺';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '?앹꽦??媛앹껜:';
  RAISE NOTICE '  - ?뚯씠釉? 22媛?(?뺢퇋?붾맂 肄붾뱶 ?뚯씠釉??ы븿)';
  RAISE NOTICE '    * 肄붾뱶 留덉뒪?? iso_codes, icf_codes, manufacturers, categories';
  RAISE NOTICE '    * 愿怨??뚯씠釉? consultation_icf_codes';
  RAISE NOTICE '  - 酉? 9媛?(?섏쐞 ?명솚??酉??ы븿)';
  RAISE NOTICE '  - ?⑥닔: 8媛?;
  RAISE NOTICE '  - ?몃━嫄? 12媛?;
  RAISE NOTICE '  - ?몃뜳?? 60媛??댁긽';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '?뺢퇋???꾨즺:';
  RAISE NOTICE '  - ISO 9999 肄붾뱶: iso_codes ?뚯씠釉?;
  RAISE NOTICE '  - ICF 肄붾뱶: icf_codes + consultation_icf_codes ?뚯씠釉?;
  RAISE NOTICE '  - ?쒖“?? manufacturers ?뚯씠釉?;
  RAISE NOTICE '  - 移댄뀒怨좊━: categories ?뚯씠釉?;
  RAISE NOTICE '  - products ?뚯씠釉붿뿉 FK 而щ읆 異붽? (?섏쐞 ?명솚???좎?)';
  RAISE NOTICE '=========================================================';
END $$;

