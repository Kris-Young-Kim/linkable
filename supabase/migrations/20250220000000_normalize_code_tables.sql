-- =========================================================
-- [LinkAble] 데이터 정규화: 코드 테이블 생성 및 FK 관계 설정
-- Database: PostgreSQL (Supabase)
-- Version: 1.2
-- Generated: 2025-02-20
-- =========================================================
-- 
-- 목적: 데이터 정규화를 통한 중복 제거 및 무결성 강화
-- 
-- 생성 테이블:
-- 1. iso_codes: ISO 9999 코드 마스터
-- 2. manufacturers: 제조사 마스터
-- 3. categories: 상품 카테고리 마스터
-- 
-- 수정 테이블:
-- 1. products: VARCHAR 필드를 FK로 변경
-- =========================================================

-- =========================================================
-- [1] 코드 테이블 생성
-- =========================================================

-- 1. ISO Codes (ISO 9999 코드 마스터)
CREATE TABLE IF NOT EXISTS iso_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- ISO 9999 코드 (예: "15 09", "12 03")
    name VARCHAR(255) NOT NULL, -- 코드명 (예: "식사 보조기기", "보행 보조기기")
    description TEXT, -- 상세 설명
    parent_code VARCHAR(50), -- 상위 코드 (계층 구조용)
    level INTEGER DEFAULT 1, -- 코드 레벨 (1: 대분류, 2: 중분류, 3: 소분류)
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0, -- 표시 순서
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_iso_codes_parent FOREIGN KEY (parent_code) REFERENCES iso_codes(code) ON DELETE SET NULL
);

COMMENT ON TABLE iso_codes IS 'ISO 9999 보조기기 분류 코드 마스터';
COMMENT ON COLUMN iso_codes.code IS 'ISO 9999 코드 (고유값)';
COMMENT ON COLUMN iso_codes.name IS '코드명 (한글)';
COMMENT ON COLUMN iso_codes.parent_code IS '상위 코드 (계층 구조)';
COMMENT ON COLUMN iso_codes.level IS '코드 레벨: 1(대분류), 2(중분류), 3(소분류)';

-- 2. Manufacturers (제조사 마스터)
CREATE TABLE IF NOT EXISTS manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- 제조사 코드 (예: "OTTOBOCK", "SUNRISE")
    name VARCHAR(255) NOT NULL, -- 제조사명 (예: "오토복", "선라이즈")
    name_en VARCHAR(255), -- 영문명
    country VARCHAR(100), -- 국가
    website_url TEXT, -- 웹사이트 URL
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE manufacturers IS '제조사 마스터';
COMMENT ON COLUMN manufacturers.code IS '제조사 코드 (고유값, 대문자)';
COMMENT ON COLUMN manufacturers.name IS '제조사명 (한글)';
COMMENT ON COLUMN manufacturers.name_en IS '제조사명 (영문)';

-- 3. Categories (상품 카테고리 마스터)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- 카테고리 코드 (예: "MOBILITY", "DAILY_LIVING")
    name VARCHAR(255) NOT NULL, -- 카테고리명 (예: "이동 보조", "일상생활 보조")
    name_en VARCHAR(255), -- 영문명
    description TEXT, -- 상세 설명
    parent_code VARCHAR(50), -- 상위 카테고리 (계층 구조용)
    level INTEGER DEFAULT 1, -- 카테고리 레벨
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_code) REFERENCES categories(code) ON DELETE SET NULL
);

COMMENT ON TABLE categories IS '상품 카테고리 마스터';
COMMENT ON COLUMN categories.code IS '카테고리 코드 (고유값, 대문자)';
COMMENT ON COLUMN categories.name IS '카테고리명 (한글)';
COMMENT ON COLUMN categories.parent_code IS '상위 카테고리 (계층 구조)';

-- =========================================================
-- [2] 기존 데이터 마이그레이션 (임시 컬럼 추가)
-- =========================================================

-- products 테이블에 임시 컬럼 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS iso_code_id UUID,
ADD COLUMN IF NOT EXISTS manufacturer_id UUID,
ADD COLUMN IF NOT EXISTS category_id UUID;

-- ISO 코드 데이터 마이그레이션
INSERT INTO iso_codes (code, name, description, level, is_active)
SELECT DISTINCT 
    iso_code,
    COALESCE(
        CASE 
            WHEN iso_code LIKE '15%' THEN '식사 보조기기'
            WHEN iso_code LIKE '12%' THEN '보행 보조기기'
            WHEN iso_code LIKE '18%' THEN '의사소통 보조기기'
            WHEN iso_code LIKE '22%' THEN '이동 보조기기'
            ELSE '기타 보조기기'
        END,
        '기타 보조기기'
    ) as name,
    'ISO 9999:2022 분류 코드' as description,
    1 as level,
    TRUE as is_active
FROM products
WHERE iso_code IS NOT NULL
ON CONFLICT (code) DO NOTHING;

-- 제조사 데이터 마이그레이션
INSERT INTO manufacturers (code, name, is_active)
SELECT DISTINCT 
    UPPER(REGEXP_REPLACE(manufacturer, '[^A-Za-z0-9]', '', 'g')) as code,
    manufacturer as name,
    TRUE as is_active
FROM products
WHERE manufacturer IS NOT NULL 
  AND manufacturer != ''
ON CONFLICT (code) DO NOTHING;

-- 카테고리 데이터 마이그레이션
INSERT INTO categories (code, name, is_active)
SELECT DISTINCT 
    UPPER(REGEXP_REPLACE(category, '[^A-Za-z0-9]', '_', 'g')) as code,
    category as name,
    TRUE as is_active
FROM products
WHERE category IS NOT NULL 
  AND category != ''
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- [3] FK 관계 설정
-- =========================================================

-- products 테이블의 임시 컬럼에 FK 값 업데이트
UPDATE products p
SET iso_code_id = ic.id
FROM iso_codes ic
WHERE p.iso_code = ic.code;

UPDATE products p
SET manufacturer_id = m.id
FROM manufacturers m
WHERE UPPER(REGEXP_REPLACE(p.manufacturer, '[^A-Za-z0-9]', '', 'g')) = m.code
  AND p.manufacturer IS NOT NULL;

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE UPPER(REGEXP_REPLACE(p.category, '[^A-Za-z0-9]', '_', 'g')) = c.code
  AND p.category IS NOT NULL;

-- =========================================================
-- [4] 기존 컬럼 제거 및 FK 제약조건 추가
-- =========================================================

-- FK 제약조건 추가
ALTER TABLE products
ADD CONSTRAINT fk_products_iso_code FOREIGN KEY (iso_code_id) REFERENCES iso_codes(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_products_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- 기존 VARCHAR 컬럼은 유지 (하위 호환성)
-- 필요시 나중에 제거 가능:
-- ALTER TABLE products DROP COLUMN iso_code;
-- ALTER TABLE products DROP COLUMN manufacturer;
-- ALTER TABLE products DROP COLUMN category;

-- =========================================================
-- [5] 인덱스 생성
-- =========================================================

-- ISO Codes
CREATE INDEX IF NOT EXISTS idx_iso_codes_code ON iso_codes(code);
CREATE INDEX IF NOT EXISTS idx_iso_codes_parent ON iso_codes(parent_code);
CREATE INDEX IF NOT EXISTS idx_iso_codes_active ON iso_codes(is_active) WHERE is_active = TRUE;

-- Manufacturers
CREATE INDEX IF NOT EXISTS idx_manufacturers_code ON manufacturers(code);
CREATE INDEX IF NOT EXISTS idx_manufacturers_active ON manufacturers(is_active) WHERE is_active = TRUE;

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_code);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- Products (FK 인덱스)
CREATE INDEX IF NOT EXISTS idx_products_iso_code_id ON products(iso_code_id);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_id ON products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- =========================================================
-- [6] 트리거 생성 (updated_at 자동 업데이트)
-- =========================================================

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

-- =========================================================
-- [7] 뷰 생성 (하위 호환성)
-- =========================================================

-- products 테이블 조인 뷰 (기존 코드와의 호환성 유지)
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

COMMENT ON VIEW view_products_with_codes IS 'products 테이블과 코드 테이블 조인 뷰 (하위 호환성)';

-- =========================================================
-- [8] 초기 데이터 삽입 (기본 ISO 코드)
-- =========================================================

-- 주요 ISO 9999 코드 삽입 (예시)
INSERT INTO iso_codes (code, name, description, level, display_order) VALUES
('15 09', '식사 보조기기', '식사 및 음식 섭취를 위한 보조기기', 1, 1),
('12 03', '보행 보조기기', '보행을 위한 보조기기', 1, 2),
('18 03', '의사소통 보조기기', '의사소통을 위한 보조기기', 1, 3),
('22 03', '이동 보조기기', '이동을 위한 보조기기', 1, 4),
('24 03', '신체 자세 보조기기', '신체 자세 유지를 위한 보조기기', 1, 5)
ON CONFLICT (code) DO NOTHING;

-- 주요 카테고리 삽입
INSERT INTO categories (code, name, name_en, level, display_order) VALUES
('MOBILITY', '이동 보조', 'Mobility Aids', 1, 1),
('DAILY_LIVING', '일상생활 보조', 'Daily Living Aids', 1, 2),
('COMMUNICATION', '의사소통 보조', 'Communication Aids', 1, 3),
('POSITIONING', '자세 보조', 'Positioning Aids', 1, 4),
('VISION', '시각 보조', 'Vision Aids', 1, 5),
('HEARING', '청각 보조', 'Hearing Aids', 1, 6)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- [9] 완료 메시지
-- =========================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '데이터 정규화 마이그레이션 완료';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - iso_codes: ISO 9999 코드 마스터';
  RAISE NOTICE '  - manufacturers: 제조사 마스터';
  RAISE NOTICE '  - categories: 카테고리 마스터';
  RAISE NOTICE '수정된 테이블:';
  RAISE NOTICE '  - products: FK 컬럼 추가 (iso_code_id, manufacturer_id, category_id)';
  RAISE NOTICE '생성된 뷰:';
  RAISE NOTICE '  - view_products_with_codes: 하위 호환성 뷰';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '주의: 기존 VARCHAR 컬럼(iso_code, manufacturer, category)은 유지됩니다.';
  RAISE NOTICE '      필요시 나중에 제거할 수 있습니다.';
  RAISE NOTICE '=========================================================';
END $$;

