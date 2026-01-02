# ?곗씠?곕쿋?댁뒪 ?뺢퇋??媛?대뱶

## 媛쒖슂

?곗씠???뺢퇋?붾? ?듯빐 以묐났 ?곗씠?곕? ?쒓굅?섍퀬 ?곗씠??臾닿껐?깆쓣 媛뺥솕?덉뒿?덈떎.

**?듭떖 ?먯튃**: 諛곗뿴 ?곗씠??JSONB, ARRAY)???ъ슜?섏? ?딄퀬, 蹂꾨룄 ?뚯씠釉붿쓣 留뚮뱾??1:N 愿怨꾨줈 愿由ы빀?덈떎.

## ?뺢퇋?붾맂 肄붾뱶 ?뚯씠釉?

### 1. ISO 9999 肄붾뱶
- **留덉뒪???뚯씠釉?*: `iso_codes`
- **愿怨??뚯씠釉?*: `products.iso_code_id` ??`iso_codes(id)` (FK)
- **湲곗〈 諛⑹떇**: `products.iso_code VARCHAR(50)` ??
- **?뺢퇋??諛⑹떇**: `products.iso_code_id UUID` ??`iso_codes(id)` ??

### 2. ICF 肄붾뱶
- **留덉뒪???뚯씠釉?*: `icf_codes`
- **愿怨??뚯씠釉?*: `consultation_icf_codes` (?곷떞怨?ICF 肄붾뱶??1:N 愿怨?
- **湲곗〈 諛⑹떇**: `analysis_results.icf_codes JSONB` ??
- **?뺢퇋??諛⑹떇**: `consultation_icf_codes` ?뚯씠釉붾줈 1:N 愿怨???

## ?앹꽦??肄붾뱶 ?뚯씠釉?

### ICF 肄붾뱶 ?뺢퇋??

#### `icf_codes` - ICF 肄붾뱶 留덉뒪??

**紐⑹쟻**: ICF 肄붾뱶瑜?以묒븰?먯꽌 愿由?

**援ъ“**:
```sql
CREATE TABLE icf_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ICF 肄붾뱶 (?? "b210", "d550")
    category CHAR(1) NOT NULL,         -- 移댄뀒怨좊━: b, d, e, p
    name VARCHAR(255),                  -- 肄붾뱶紐?(?쒓?)
    name_en VARCHAR(255),               -- 肄붾뱶紐?(?곷Ц)
    description TEXT,                   -- ?곸꽭 ?ㅻ챸
    parent_code VARCHAR(50),            -- ?곸쐞 肄붾뱶 (怨꾩링 援ъ“)
    level INTEGER DEFAULT 1,           -- 肄붾뱶 ?덈꺼
    is_in_core_set BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `consultation_icf_codes` - ?곷떞-ICF 肄붾뱶 愿怨?(1:N)

**紐⑹쟻**: ?곷떞怨?ICF 肄붾뱶??1:N 愿怨?愿由?

**援ъ“**:
```sql
CREATE TABLE consultation_icf_codes (
    id UUID PRIMARY KEY,
    consultation_id UUID NOT NULL,     -- ?곷떞 ID
    icf_code_id UUID NOT NULL,         -- ICF 肄붾뱶 ID
    source VARCHAR(50) NOT NULL,        -- 異붿텧 ?뚯뒪 (chat_analysis, keyword_inference ??
    confidence_score DECIMAL(3, 2),     -- ?좊ː???먯닔
    context JSONB,                      -- 異붽? 而⑦뀓?ㅽ듃
    created_at TIMESTAMPTZ,
    
    FOREIGN KEY (consultation_id) REFERENCES consultations(id),
    FOREIGN KEY (icf_code_id) REFERENCES icf_codes(id),
    UNIQUE (consultation_id, icf_code_id, source)
);
```

**?뱀쭠**:
- ???곷떞???щ윭 ICF 肄붾뱶 ?곌껐 媛??(1:N)
- 異붿텧 ?뚯뒪蹂꾨줈 援щ텇 (chat_analysis, keyword_inference ??
- ?좊ː???먯닔 愿由?

---

## 湲곗〈 肄붾뱶 ?뚯씠釉?

### 1. `iso_codes` - ISO 9999 肄붾뱶 留덉뒪??

**紐⑹쟻**: ISO 9999 蹂댁“湲곌린 遺꾨쪟 肄붾뱶瑜?以묒븰?먯꽌 愿由?

**援ъ“**:
```sql
CREATE TABLE iso_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ISO 肄붾뱶 (?? "15 09")
    name VARCHAR(255) NOT NULL,        -- 肄붾뱶紐?(?? "?앹궗 蹂댁“湲곌린")
    description TEXT,                  -- ?곸꽭 ?ㅻ챸
    parent_code VARCHAR(50),           -- ?곸쐞 肄붾뱶 (怨꾩링 援ъ“)
    level INTEGER DEFAULT 1,           -- 肄붾뱶 ?덈꺼 (1: ?遺꾨쪟, 2: 以묐텇瑜? 3: ?뚮텇瑜?
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**?뱀쭠**:
- 怨꾩링 援ъ“ 吏??(parent_code)
- 肄붾뱶 ?덈꺼 愿由?(?遺꾨쪟/以묐텇瑜??뚮텇瑜?
- ?쒖꽦???곹깭 愿由?

### 2. `manufacturers` - ?쒖“??留덉뒪??

**紐⑹쟻**: ?쒖“???뺣낫瑜?以묒븰?먯꽌 愿由?

**援ъ“**:
```sql
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- ?쒖“??肄붾뱶 (?? "OTTOBOCK")
    name VARCHAR(255) NOT NULL,        -- ?쒖“?щ챸 (?? "?ㅽ넗蹂?)
    name_en VARCHAR(255),              -- ?곷Ц紐?
    country VARCHAR(100),              -- 援??
    website_url TEXT,                  -- ?뱀궗?댄듃 URL
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**?뱀쭠**:
- 肄붾뱶 湲곕컲 愿由?(?臾몄옄)
- ?ㅺ뎅??吏??(?쒓?/?곷Ц)
- 援?? ?뺣낫 愿由?

### 3. `categories` - ?곹뭹 移댄뀒怨좊━ 留덉뒪??

**紐⑹쟻**: ?곹뭹 移댄뀒怨좊━瑜?以묒븰?먯꽌 愿由?

**援ъ“**:
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- 移댄뀒怨좊━ 肄붾뱶 (?? "MOBILITY")
    name VARCHAR(255) NOT NULL,        -- 移댄뀒怨좊━紐?(?? "?대룞 蹂댁“")
    name_en VARCHAR(255),              -- ?곷Ц紐?
    description TEXT,                  -- ?곸꽭 ?ㅻ챸
    parent_code VARCHAR(50),           -- ?곸쐞 移댄뀒怨좊━ (怨꾩링 援ъ“)
    level INTEGER DEFAULT 1,           -- 移댄뀒怨좊━ ?덈꺼
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**?뱀쭠**:
- 怨꾩링 援ъ“ 吏??
- ?ㅺ뎅??吏??

## `products` ?뚯씠釉?蹂寃쎌궗??

### 異붽???FK 而щ읆

```sql
ALTER TABLE products
ADD COLUMN iso_code_id UUID REFERENCES iso_codes(id),
ADD COLUMN manufacturer_id UUID REFERENCES manufacturers(id),
ADD COLUMN category_id UUID REFERENCES categories(id);
```

### ?좎??섎뒗 湲곗〈 而щ읆 (?섏쐞 ?명솚??

```sql
-- 湲곗〈 VARCHAR 而щ읆? ?좎???
iso_code VARCHAR(50),
manufacturer VARCHAR(100),
category VARCHAR(100)
```

**?댁쑀**: 湲곗〈 肄붾뱶????명솚?깆쓣 ?꾪빐 ?좎??⑸땲?? ?꾩슂???섏쨷???쒓굅?????덉뒿?덈떎.

## ?ъ슜 諛⑸쾿

### 1. ICF 肄붾뱶 議고쉶 (?뺢퇋?붾맂 援ъ“)

```typescript
// ?곷떞??ICF 肄붾뱶 議고쉶 (1:N 愿怨?
const { data: icfCodes } = await supabase
  .from("consultation_icf_codes")
  .select(`
    *,
    icf_codes!icf_code_id (code, category, name, name_en, description)
  `)
  .eq("consultation_id", consultationId);

// 移댄뀒怨좊━蹂꾨줈 洹몃９??
const grouped = {
  b: icfCodes?.filter(c => c.icf_codes.category === 'b') || [],
  d: icfCodes?.filter(c => c.icf_codes.category === 'd') || [],
  e: icfCodes?.filter(c => c.icf_codes.category === 'e') || [],
  p: icfCodes?.filter(c => c.icf_codes.category === 'p') || [],
};
```

### 2. ICF 肄붾뱶 議고쉶 (?섏쐞 ?명솚??酉?

```typescript
// JSONB ?뺥깭濡?議고쉶 (湲곗〈 肄붾뱶 ?명솚??
const { data } = await supabase
  .from("view_consultation_icf_codes_jsonb")
  .select("icf_codes")
  .eq("consultation_id", consultationId)
  .single();

// 寃곌낵: { icf_codes: { b: [...], d: [...], e: [...] } }
```

### 3. ICF 肄붾뱶 ???(?뺢퇋?붾맂 援ъ“)

```typescript
// ICF 肄붾뱶 留덉뒪?곗뿉??ID 議고쉶 ?먮뒗 ?앹꽦
const icfCodeIds = await Promise.all(
  icfCodes.map(async (code) => {
    // 肄붾뱶媛 ?대? 議댁옱?섎뒗吏 ?뺤씤
    let { data: existing } = await supabase
      .from("icf_codes")
      .select("id")
      .eq("code", code.toLowerCase())
      .single();

    if (!existing) {
      // ?놁쑝硫??앹꽦
      const category = code[0].toLowerCase(); // b, d, e, p
      const { data: newCode } = await supabase
        .from("icf_codes")
        .insert({
          code: code.toLowerCase(),
          category,
          is_in_core_set: false,
        })
        .select("id")
        .single();
      return newCode.id;
    }
    return existing.id;
  })
);

// ?곷떞-ICF 肄붾뱶 愿怨????
await supabase.from("consultation_icf_codes").insert(
  icfCodeIds.map(icfCodeId => ({
    consultation_id: consultationId,
    icf_code_id: icfCodeId,
    source: "chat_analysis",
    confidence_score: 1.0,
  }))
);
```

### 4. 肄붾뱶 ?뚯씠釉?議고쉶

```typescript
// ISO 肄붾뱶 紐⑸줉 議고쉶
const { data: isoCodes } = await supabase
  .from("iso_codes")
  .select("*")
  .eq("is_active", true)
  .order("display_order");

// ?쒖“??紐⑸줉 議고쉶
const { data: manufacturers } = await supabase
  .from("manufacturers")
  .select("*")
  .eq("is_active", true)
  .order("display_order");

// 移댄뀒怨좊━ 紐⑸줉 議고쉶
const { data: categories } = await supabase
  .from("categories")
  .select("*")
  .eq("is_active", true)
  .order("display_order");
```

### 2. Products 議고쉶 (FK ?ъ슜)

```typescript
// FK瑜??ъ슜??議고쉶 (沅뚯옣)
const { data: products } = await supabase
  .from("products")
  .select(`
    *,
    iso_codes!iso_code_id (code, name),
    manufacturers!manufacturer_id (code, name),
    categories!category_id (code, name)
  `)
  .eq("is_active", true);
```

### 3. Products 議고쉶 (酉??ъ슜)

```typescript
// 酉곕? ?ъ슜??議고쉶 (?섏쐞 ?명솚??
const { data: products } = await supabase
  .from("view_products_with_codes")
  .select("*")
  .eq("is_active", true);
```

### 4. 肄붾뱶濡??곹뭹 ?꾪꽣留?

```typescript
// ISO 肄붾뱶濡??꾪꽣留?(FK ?ъ슜)
const { data: products } = await supabase
  .from("products")
  .select(`
    *,
    iso_codes!iso_code_id (code, name)
  `)
  .eq("iso_codes.code", "15 09")
  .eq("is_active", true);

// ?먮뒗 湲곗〈 諛⑹떇 (VARCHAR ?꾨뱶 ?ъ슜)
const { data: products } = await supabase
  .from("products")
  .select("*")
  .eq("iso_code", "15 09")
  .eq("is_active", true);
```

## 留덉씠洹몃젅?댁뀡 ?꾨왂

### ?④퀎 1: 肄붾뱶 ?뚯씠釉??앹꽦 諛??곗씠??留덉씠洹몃젅?댁뀡 ??

- 肄붾뱶 ?뚯씠釉??앹꽦
- 湲곗〈 ?곗씠?곗뿉??肄붾뱶 異붿텧 諛??쎌엯
- FK 而щ읆 異붽? 諛?媛??낅뜲?댄듃

### ?④퀎 2: API 肄붾뱶 ?낅뜲?댄듃 (吏꾪뻾 以?

- FK瑜??ъ슜??議고쉶濡??먯쭊???꾪솚
- 湲곗〈 VARCHAR ?꾨뱶???좎? (?섏쐞 ?명솚??

### ?④퀎 3: 湲곗〈 VARCHAR ?꾨뱶 ?쒓굅 (?좏깮??

- 紐⑤뱺 肄붾뱶媛 FK瑜??ъ슜?섎룄濡??꾪솚 ?꾨즺 ??
- VARCHAR ?꾨뱶 ?쒓굅 媛??

## 愿由ъ옄 UI 媛쒖꽑 ?ы빆

### 肄붾뱶 愿由??섏씠吏 異붽? (沅뚯옣)

1. **ISO 肄붾뱶 愿由?* (`/admin/iso-codes`)
   - ISO 肄붾뱶 異붽?/?섏젙/??젣
   - 怨꾩링 援ъ“ ?쒓컖??
   - 肄붾뱶 ?덈꺼 愿由?

2. **?쒖“??愿由?* (`/admin/manufacturers`)
   - ?쒖“??異붽?/?섏젙/??젣
   - 援??蹂??꾪꽣留?
   - ?뱀궗?댄듃 留곹겕 愿由?

3. **移댄뀒怨좊━ 愿由?* (`/admin/categories`)
   - 移댄뀒怨좊━ 異붽?/?섏젙/??젣
   - 怨꾩링 援ъ“ ?쒓컖??

## ?μ젏

### 1. ?곗씠??臾닿껐??媛뺥솕

- FK ?쒖빟議곌굔?쇰줈 ?섎せ??肄붾뱶 ?낅젰 諛⑹?
- 肄붾뱶 蹂寃????먮룞 諛섏쁺 (CASCADE ?듭뀡)

### 2. 以묐났 ?쒓굅

- ?숈씪??肄붾뱶紐낆씠 ?щ윭 怨녹뿉 ??λ릺??臾몄젣 ?닿껐
- 肄붾뱶 ?뺣낫 ?쇨????좎?

### 3. ?좎?蹂댁닔 ?⑹씠

- 肄붾뱶 ?뺣낫 蹂寃?????怨노쭔 ?섏젙
- 肄붾뱶 ?ъ슜 ?듦퀎 吏묎퀎 ?⑹씠

### 4. ?뺤옣??

- 肄붾뱶蹂?硫뷀??곗씠??異붽? ?⑹씠
- 怨꾩링 援ъ“ 吏??

## 二쇱쓽?ы빆

1. **?섏쐞 ?명솚??*: 湲곗〈 VARCHAR ?꾨뱶???좎??섎?濡?湲곗〈 肄붾뱶??怨꾩냽 ?묐룞?⑸땲??

2. **?곗씠???숆린??*: FK? VARCHAR ?꾨뱶 媛??숆린?붽? ?꾩슂?????덉뒿?덈떎. ?몃━嫄곕줈 ?먮룞??媛??

3. **留덉씠洹몃젅?댁뀡 ?쒖꽌**: 
   - 肄붾뱶 ?뚯씠釉??앹꽦 ???곗씠??留덉씠洹몃젅?댁뀡 ??FK ?ㅼ젙 ??API ?낅뜲?댄듃

## 李멸퀬 ?뚯씪

- 留덉씠洹몃젅?댁뀡: `supabase/migrations/20250220000000_normalize_code_tables.sql`
- 酉? `view_products_with_codes` (?섏쐞 ?명솚??

---

## ?뺢퇋??媛쒖꽑 怨꾪쉷

### ?꾩옱 ?ㅽ궎留??됯?

#### ????????(?뺢퇋??愿??

**?듭떖 ?낅Т ?먮쫫???뷀떚?곕줈 ??遺꾨━?섏뼱 ?덉쓬 (湲곕낯 3NF ?먮쫫 ?묓샇)**:
- `consultations` (?몄뀡 ?ㅻ뜑)
- `chat_messages` (???濡쒓렇)
- `analysis_results` (AI 遺꾩꽍 寃곌낵)
- `recommendations` (?곷떞-?곹뭹 留ㅼ묶)
- `ippa_evaluations` (?④낵???됯?)

**?댁쁺怨?OLTP)? 遺꾩꽍怨?濡쒓렇/吏묎퀎) ??븷 遺꾨━**:
- `conversion_events`, `icf_code_usage_logs`, `icf_code_statistics` ???대깽???듦퀎 ?뚯씠釉붿씠 ?댁쁺怨꾩? 遺꾨━?섏뼱 ?덉쓬

### ?뺢퇋?붽? ?꾩슂??吏??

#### A. JSONB / 諛곗뿴(?ㅼ쨷媛? 而щ읆: 1NF 愿?먯뿉??"諛섏젙洹쒗솕"

**?꾩옱 援ъ“??MVP?먯꽑 鍮좊Ⅴ吏留? "?쒕룞/ICF肄붾뱶 ?⑥쐞濡?寃?됀룹쭛怨꽷룻븘?곕쭅"???섏뼱?섎뒗 ?쒓컙 議곗씤 ?뚯씠釉붿씠 ?꾩슂?⑸땲??**

| ?뚯씠釉?| 而щ읆 | ?꾩옱 ?뺥깭 | 臾몄젣(?뺢퇋???댁쁺) | 沅뚯옣(?뺢퇋?? |
|--------|------|----------|------------------|--------------|
| `consultations` | `ippa_activities` | JSONB (?쒕룞/?먯닔 臾띠쓬) | ?쒕룞蹂??듦퀎/寃??寃利??대젮?, 援ъ“ 蹂寃???留덉씠洹몃젅?댁뀡 遺??| `consultation_ippa_activities` (???⑥쐞) |
| `ippa_evaluations` | `activity_scores` | JSONB (?쒕룞蹂??ъ쟾/?ы썑/媛쒖꽑) | "?쒕룞 ?⑥쐞" 遺꾩꽍/由ы룷?멸? ?대젮? | `ippa_evaluation_activity_scores` |
| `analysis_results` | `icf_codes` | JSONB (b/d/e 移댄뀒怨좊━蹂?肄붾뱶 諛곗뿴) | ICF 肄붾뱶蹂??뺥솗??鍮덈룄/洹쇨굅 ????뺤옣 ???쒓퀎 | `analysis_icf_codes` (category, code, confidence ?? |
| `icf_code_statistics` | `associated_iso_codes` | TEXT[] (諛곗뿴) | ?ㅼ쨷媛?1NF ?꾨컲). iso_code蹂?keyword蹂?topN 戮묎린 鍮꾪슚??| ?곌껐 ?뚯씠釉?遺꾨━(?꾩슂 ?? |
| `icf_code_statistics` | `associated_keywords` | TEXT[] (諛곗뿴) | ?꾩? ?숈씪 | ?곌껐 ?뚯씠釉?遺꾨━(?꾩슂 ?? |
| `icf_code_expansions` | `iso_hints` | TEXT[] (諛곗뿴) | ?꾩? ?숈씪 | ?곌껐 ?뚯씠釉?遺꾨━(?꾩슂 ?? |

**?꾩떎?곸씤 寃곕줎**:
- "?곷떞 ?붾㈃?먯꽌 蹂댁뿬二쇨린" ?섏??대㈃ JSONB ?좎? 媛??
- ?섏?留????쒕퉬?ㅻ뒗 **異붿쿇/?④낵??肄붾뱶 ?듦퀎媛 ?듭떖**?대씪, ?쒕룞 ?먯닔(ippa)? ICF 肄붾뱶(analysis)???뺢퇋???대뱷????
- **以묒슂?? HIGH**

#### B. 以묐났/?댁쨷 ???媛?μ꽦: "?낅뜲?댄듃 ?댁긽(Anomaly)" ?꾪뿕

**異붿쿇/?꾪솚/援щℓ???대깽?멸? 留롮븘????怨녹뿉留?'?뺣떟'???덈뒗 寃?醫뗭뒿?덈떎.**

| ?뚯씠釉?| 而щ읆/媛쒕뀗 | ?댁뒋 | 沅뚯옣 |
|--------|----------|------|------|
| `recommendations` | `purchase_completed`, `purchase_completed_at`, `purchase_amount` | `conversion_events`?먮룄 援щℓ ?대깽??湲덉븸???ㅼ뼱媛????덉뼱 以묐났 ???媛?μ꽦????| 援щℓ??"?대깽??濡쒓렇" ?먮뒗 "purchase ?뚯씠釉? 以???怨녹쓣 ?뚯뒪 ?ㅻ툕 ?몃（?ㅻ줈 怨좎젙 |
| `users` | `points` | `point_transactions`???⑷퀎(?먯옣)? 以묐났. ?몃━嫄곕줈 留욎텛怨??덉?留??댁쁺 以??ㅻ쪟/?ъ쿂由???遺덉씪移??꾪뿕 | `users.points`??罹먯떆 而щ읆濡??몄젙?섎릺, ?뺢린?곸쑝濡??먯옣 ?⑷퀎濡??ш퀎??寃利?猷⑦떞 沅뚯옣 |

#### C. 肄붾뱶/遺꾨쪟 媛믪씠 "臾몄옄??濡쒕쭔 愿由щ맖: ?곗씠???덉쭏 臾몄젣

**?꾩옱??CHECK ?쒖빟 ?쇰?媛 ?덉?留? ?쒕퉬?ㅺ? 而ㅼ?硫?"媛??쒖???媛 以묒슂?댁쭛?덈떎.**

| ?뚯씠釉?| 而щ읆 | ?꾩옱 由ъ뒪??| 沅뚯옣 |
|--------|------|------------|------|
| `consultations` | `disability_type`, `disability_severity` | TEXT (?먯쑀 ?낅젰) | ?숈씪 媛쒕뀗???щ윭 媛믪쑝濡????(?ㅽ?/?쒓린 李⑥씠) ???듦퀎/異붿쿇 紐⑤뜽 ?덉쭏 ???| 肄붾뱶 ?뚯씠釉?lookup) ?먮뒗 ENUM/?꾨찓??|
| `products` | `category`, `manufacturer` | 臾몄옄??| 移댄뀒怨좊━/?쒖“???쒖???遺덇?, 以묐났/?쒓린 ?붾뱾由?| `product_categories`, `manufacturers` 遺꾨━(?꾩슂 ?? |
| `conversion_events` | `event_type`, `source`, `tracking_source` | 臾몄옄??CHECK | ?대깽??醫낅쪟 ?뺤옣 ??DDL 蹂寃???쓬 | ENUM(怨좎젙?대㈃) / 肄붾뱶 ?뚯씠釉??먯＜ ?섎㈃) |

#### D. 臾닿껐??Integrity) 愿?먯뿉??"援ъ“??3NF?щ룄" ?꾪뿕??吏??

**?뺢퇋?붾씪湲곕낫??DBA ?댁쁺 由ъ뒪?ъ엯?덈떎.**

| ?뚯씠釉?| 而щ읆 | ?댁뒋 | 沅뚯옣 |
|--------|------|------|------|
| `point_transactions` | `reference_type` + `reference_id` | ?대━紐⑦뵿 李몄“??FK瑜?嫄????놁뼱 怨좎븘 ?덉퐫???ㅽ? 諛쒖깮 媛??| (1) reference_type蹂?遺꾨━ ?뚯씠釉? (2) ?몃━嫄곕줈 議댁옱寃利? (3) 理쒖냼??enum+寃利??⑥닔 |
| `recommendations` | `(consultation_id, product_id)` | 以묐났 異붿쿇 row媛 ?앷만 ???덉쓬 (?ъ떎???ъ텛泥?濡쒖쭅?먯꽌) | "?섎룄"媛 1??異붿쿇?대㈃ UNIQUE 沅뚯옣 |
| `ippa_evaluations` | `(user_id, product_id, recommendation_id)` | ?숈씪 異붿쿇??????됯? 以묐났 媛??| UNIQUE ?뺤콉 ?뺤쓽 ?꾩슂 |

### ?뺢퇋???곗꽑?쒖쐞

#### ???곗꽑?쒖쐞 HIGH (異붿쿇/?④낵??肄붾뱶 湲곕컲 ?쒕퉬???듭떖)

**1. K-IPPA ?쒕룞 ?먯닔 援ъ“ ?뺢퇋??*

**?꾩옱 臾몄젣**:
- ?곷떞 ???좏깮???쒕룞 baseline: `consultations.ippa_activities` (JSONB)
- ?됯? ??post score: `ippa_evaluations.activity_scores` (JSONB)

**?뺢퇋?????댁젏**:
- ?쒕룞蹂?異붿쿇 ?깅뒫/?④낵??遺꾩꽍 媛??
- ?뱀젙 ICF ?쒕룞?먯꽌 ?대뼡 ?쒗뭹援곗씠 ?④낵?곸씤吏 遺꾩꽍 媛??
- ?듭떖 KPI 怨꾩궛???ъ썙吏?

**沅뚯옣 援ъ“**:
```sql
-- ?곷떞 ?④퀎 ?쒕룞 ?먯닔
CREATE TABLE consultation_ippa_activities (
    id UUID PRIMARY KEY,
    consultation_id UUID NOT NULL,
    icf_code VARCHAR(50) NOT NULL,
    importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
    pre_difficulty INTEGER NOT NULL CHECK (pre_difficulty BETWEEN 1 AND 5),
    collected_at TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE
);

-- ?됯? ?④퀎 ?쒕룞 ?먯닔
CREATE TABLE ippa_evaluation_activity_scores (
    id UUID PRIMARY KEY,
    evaluation_id UUID NOT NULL,
    icf_code VARCHAR(50) NOT NULL,
    importance INTEGER NOT NULL,
    pre_difficulty INTEGER NOT NULL,
    post_difficulty INTEGER NOT NULL,
    assistive_device TEXT,
    improvement INTEGER,
    effectiveness_score DECIMAL(5, 2),
    FOREIGN KEY (evaluation_id) REFERENCES ippa_evaluations(id) ON DELETE CASCADE
);
```

**2. AI 遺꾩꽍 ICF 肄붾뱶 ?뺢퇋??(理쒖냼??"肄붾뱶 ?? ???**

**?꾩옱**: `analysis_results.icf_codes` (JSONB)

**沅뚯옣**: JSONB瑜??좎??섎뜑?쇰룄, 議고쉶/?듦퀎?⑹쑝濡?**???뚯씠釉붿쓣 ?섎굹 ?먮뒗 諛⑹떇(?댁쨷??**

**?덉떆**:
- `analysis_results.icf_codes`: ?먮Ц 洹몃?濡?蹂닿? (媛먯궗/由ы뵆?덉씠??
- `analysis_icf_codes`: 議고쉶/??궧/?듦퀎??

**沅뚯옣 援ъ“**:
```sql
CREATE TABLE analysis_icf_codes (
    id UUID PRIMARY KEY,
    analysis_result_id UUID NOT NULL,
    icf_code VARCHAR(50) NOT NULL,
    category CHAR(1) NOT NULL CHECK (category IN ('b', 'd', 'e', 'p')),
    confidence_score DECIMAL(3, 2),
    source VARCHAR(50),
    context JSONB,
    FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id) ON DELETE CASCADE
);
```

#### ???곗꽑?쒖쐞 MEDIUM (?곗씠???덉쭏/?댁쁺 ?덉젙??

**1. disability_type, disability_severity瑜?lookup/肄붾뱶??*

**?댁쑀**: 異붿쿇 紐⑤뜽/猷?湲곕컲 異붿쿇???ㅼ뼱媛덉닔濡?媛??쒖??붾뒗 以묒슂

**沅뚯옣 援ъ“**:
```sql
CREATE TABLE disability_types (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE disability_severities (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

**2. 異붿쿇/援щℓ/?꾪솚??"吏꾩떎???먯쿇"???섎굹濡??뺣━**

**臾몄젣**: 援щℓ ?꾨즺 ?щ?瑜?`recommendations`???섏?, `conversion_events`???섏?, ?먮뒗 `purchases` ?뚯씠釉붾줈 ?섏? 寃곗젙 ?꾩슂

**沅뚯옣**:
- `conversion_events`瑜??뚯뒪 ?ㅻ툕 ?몃（?ㅻ줈 ?ъ슜
- `recommendations.purchase_completed` ?깆? ?쒓굅?섍굅??酉곕줈 怨꾩궛

#### ???곗꽑?쒖쐞 LOW (MVP?먯꽌??蹂대쪟 媛??

**1. ?쒖“??移댄뀒怨좊━ 遺꾨━**

- ?대? `manufacturers`, `categories` ?뚯씠釉붿씠 ?덉쓬
- `products` ?뚯씠釉붿뿉??FK ?곌껐留??꾨즺?섎㈃ ??

**2. ICF ?듦퀎??諛곗뿴 而щ읆 遺꾨━**

- `icf_code_statistics.associated_iso_codes`, `associated_keywords` ??
- "寃???꾪꽣/由ы룷???붽뎄"媛 而ㅼ쭏 ???④퀎?곸쑝濡??대룄 ??

### ?щ·留?湲곕뒫 愿???뺢퇋??(?뺤옣 ?ъ씤??

#### ?щ·留??곗씠?곗쓽 3?④퀎 ?뺢퇋??怨꾩링

?щ·留곸씠 ?ㅼ뼱?ㅻ㈃ **"?뺢퇋??怨꾩링"??3?⑥쑝濡??섎늻??寃??ㅻТ ?쒖?**?낅땲??

**A. Raw(?먮Ц 蹂닿?) 怨꾩링 ??"利앷굅/?ы쁽/?붾쾭源?**
- ?щ·留곹븳 HTML/JSON ?먮Ц??洹몃?濡????
- ?뚯떛 濡쒖쭅??諛붾뚯뼱???ы뙆??媛??
- ?μ븷 遺꾩꽍/踰뺤쟻 ?댁뒋/?먯쿇 ?ъ씠??蹂寃???묒뿉 ?좊━

**B. Listing(?먯쿇 ?곹뭹) 怨꾩링 ??"?뚯뒪蹂??곹뭹 ?⑥쐞"**
- 荑좏뙜/?ㅻ쭏?몄뒪?좎뼱/?먯궗紐???`source + external_id` 湲곗??쇰줈 ??嫄댁쓽 ?먯쿇?곹뭹
- 媛寃??ш퀬/諛곗넚/由щ럭/??궧 媛숈? "?먯＜ 蹂?섎뒗 媛?? 蹂꾨룄 ?ㅻ깄???뚯씠釉붾줈 遺꾨━(?뺢퇋??

**C. Canonical(?뺤젣 ?곹뭹) 怨꾩링 ??"?쒕퉬?ㅺ? 異붿쿇?섎뒗 ?쒖? ?곹뭹"**
- 吏湲?ERD??`products`媛 ?ш린???대떦
- ?щ윭 source listing???섎굹??canonical product??留ㅽ븨(以묐났 ?쒓굅, ?듯빀)

**?듭떖 ?ъ씤??*:
> ?щ·留??쒖뒪?쒖? "?먯쿇(source)"??諛붾뚭퀬 "媛寃??ш퀬"媛 怨꾩냽 蹂?⑸땲??  
> 洹몃옒??`products` ???뚯씠釉붿뿉 ???뚮젮 ?ｌ쑝硫?6媛쒖썡 ?꾩뿉 臾댁“嫄??댁쁺??吏?μ씠 ?⑸땲??

#### 瑗?異붽??섎㈃ 醫뗭? ?뚯씠釉?(?뺢퇋???뺤옣 ?ъ씤??

**1. ?뚯뒪/梨꾨꼸 ?뺤쓽: `crawl_sources`**

**???꾩슂?쒓?**:
- 媛숈? ?곹뭹???뚯뒪留덈떎 ID 泥닿퀎媛 ?ㅻⅤ怨? ?щ·留??뺤콉(?덉씠?몃━諛??ㅻ뜑/?뚯꽌/robots)???ㅻ쫫
- "?대뒓 ?ъ씠?몄뿉???붾뒗吏"媛 PK???쇰?媛 ??

**?뺢퇋???ъ씤??*: `source_code` (unique)濡??쒖??? listings??`source_id` FK留??ㅺ퀬 ?덉쓬

**2. ?щ·留??묒뾽/?ㅽ뻾 異붿쟻: `crawl_jobs`, `crawl_requests`**

**???꾩슂?쒓? (DBA ?ㅻТ)**:
- ?щ·留곸? 100% ?μ븷媛 ?⑸땲??李⑤떒/??꾩븘???뚯꽌 源⑥쭚/援ъ“ 蹂寃?
- "?몄젣, 臾댁뾿?? ???ㅽ뙣?덈뒗吏"瑜?DB???④꺼???ъ떆??蹂듦뎄媛 媛?ν빀?덈떎

**?뺢퇋???ъ씤??*: Job(諛곗튂 ?⑥쐞)怨?Request(?섏씠吏 ?⑥쐞)瑜?遺꾨━, request??raw ??κ낵 ?곌껐??1:N)

**3. ?먮Ц ??? `raw_documents`**

**???꾩슂?쒓?**:
- ?뚯떛 寃곌낵留???ν븯硫?"?뚯꽌 踰꾧렇"媛 ?ъ쓣 ???ы쁽??????
- ?뚯뒪 援ъ“ 蹂寃???怨쇨굅 ?곗씠?곕? ?ㅼ떆 ?뚯떛?댁빞 ???뚭? 留롮쓬

**?ㅻТ ?ъ씤??*:
- ?먮Ц? ?⑸웾??留ㅼ슦 ?????뚰떚?붾떇/TTL(蹂닿?湲곌컙)/?뺤텞 ?뺤콉 ?꾩슂
- DB???ｌ쓣吏, S3/?ㅽ넗由ъ????ｊ퀬 DB?먮뒗 寃쎈줈留??섏? 寃곗젙?댁빞 ??
- **MVP**: DB??JSON/?띿뒪?????OK
- **?댁쁺 洹쒕え**: ?먮Ц? ?ㅻ툕?앺듃 ?ㅽ넗由ъ? + DB?먮뒗 硫뷀?/?댁떆/寃쎈줈留?異붿쿇

**4. ?먯쿇 ?곹뭹: `product_listings`**

**?뺢퇋???듭떖**:
- `products` (?뺤젣)? 遺꾨━?댁빞 ??
- listing? "?먯쿇 ?뚯뒪???곹뭹 1媛??대ŉ, `source_id + external_id`媛 ?좎씪 ??

**???닿쾶 以묒슂?**:
- "媛숈? canonical product"媛 荑좏뙜?먮룄 ?덇퀬 ?ㅻ쭏?몄뒪?좎뼱?먮룄 ?덉쓬
- listing??遺꾨━?섎㈃:
  - 媛寃??ш퀬??listing ?⑥쐞濡?異붿쟻
  - canonical product??異붿쿇/寃?됱쓽 湲곗??쇰줈 ?덉젙?곸쑝濡??좎?

**5. 媛寃??ш퀬/諛곗넚 ??蹂?숆컪: `listing_price_snapshots`, `listing_availability_snapshots`**

**?뺢퇋???듭떖**:
- listing row瑜??낅뜲?댄듃濡???뼱?곗? 留먭퀬, ?ㅻ깄???쒓컙異? ?뚯씠釉붾줈 遺꾨━
- ?대젃寃??댁빞 "媛寃⑸???, "?ш퀬蹂??, "異붿쿇 ??援щℓ?? 遺꾩꽍??媛?ν빀?덈떎

**DBA ?ㅻТ ?ъ씤??*:
- ?ㅻ깄???뚯씠釉붿? 媛??鍮⑤━ 而ㅼ쭚 ???뚰떚?붾떇/BRIN ?몃뜳??蹂닿??뺤콉 ?꾩닔

**6. ?대?吏/?듭뀡/?띿꽦(洹쒓꺽) ?뚯씠釉?*

**?щ·留??곹뭹?먮뒗 ?媛?*:
- ?대?吏 ?щ윭 ??1:N)
- ?듭뀡(?ъ씠利??됱긽/醫뚯슦/洹쒓꺽)(1:N)
- ?띿꽦(?ъ쭏/?명솚/?ъ씠利?ISO9999 肄붾뱶 ?꾨낫 ??(1:N)

**?뺢퇋???꾨왂**:
- ?⑥닚??JSONB濡쒕룄 媛?ν븯吏留? "議고쉶/?꾪꽣"媛 ?붽뎄?섎㈃ 遺꾨━ ?뚯씠釉붿씠 留욎뒿?덈떎
- ?? "臾대쫷蹂댁“湲?+ ?ъ씠利?L + 醫뚯륫" ?꾪꽣留곸씠 ?꾩슂?댁?硫?JSONB??怨좏넻

**7. 以묐났 ?쒓굅/留ㅽ븨: `product_listing_map`**

**?뺢퇋???듭떖**:
- listing(?먯쿇) ??product(?뺤젣) 愿怨꾨뒗 嫄곗쓽 ??긽 N:1 (?щ윭 listing???섎굹??canonical product濡??⑹퀜吏?
- 留ㅽ븨?먮뒗 ?좊ː??留ㅼ묶洹쇨굅/?뱀씤?щ? 媛숈? ?댁쁺 ?꾨뱶媛 ?꾩슂?⑸땲??

**?ㅻТ ?ъ씤??*:
- ?먮룞 留ㅼ묶 寃곌낵瑜??щ엺???뱀씤?섎뒗 ?뚮줈?곌? ?덉쑝硫?`match_status`媛 ?꾩닔
- 異붿쿇?먯꽌 "?뺤젣?곹뭹(product)"瑜??곕릺, ?ㅼ젣 援щℓ 留곹겕??"listing"???寃??섎뒗 援ъ“媛 留롮쓬

#### DBA ?ㅻТ ?곸슜 ?ъ씤??(?꾩뾽?먯꽌 ???섎㈃ ?ш퀬?섎뒗 寃껊뱾)

**A. ?좎씪???낆꽌???꾨왂 (以묐났 ?쎌엯 諛⑹?)**

- `product_listings`??諛섎뱶?? `UNIQUE(source_id, external_id)`
- `listing_price_snapshots`?? `(listing_id, captured_at)` ?먮뒗 `(listing_id, captured_date, captured_hour)` 媛숈? 以묐났 諛⑹? ??怨좊젮

**?닿구 ???섎㈃**: 媛숈? ?곹뭹??留??щ·留곷쭏????listing?쇰줈 ?앹꽦 ??異붿쿇/?듦퀎 ?꾨? 源⑥쭚

**B. "???뚯씠釉????뚰떚?붾떇/?몃뜳??*

**?щ·留??ㅻ깄?룹? ?곗씠?곌? ??컻?⑸땲??**

**?뚰떚?붾떇 異붿쿇 ???*:
- `raw_documents`
- `listing_price_snapshots`
- `crawl_requests`

**?몃뜳???꾨왂**:
- ?ㅻ깄?? `(listing_id, captured_at DESC)`
- ?쒓컙 議곌굔??留롮? ?뚯씠釉? BRIN(captured_at)??怨좊젮(??⑸웾?먯꽌 ?⑥쑉??

**C. 蹂닿? ?뺤콉(?곗씠???섎챸二쇨린)**

- ?먮Ц(raw)? 蹂닿?湲곌컙??吏㏐쾶 媛?멸???寃쎌슦媛 留롮뒿?덈떎(?? 30~90??
- ?ㅻ깄?룸룄 "理쒓렐 1?꾩? 珥섏킌?? 洹??댁쟾? ???⑥쐞 吏묎퀎留??④린湲? 媛숈? ?뺤콉???ㅻТ??

**D. ?щ·留??ㅽ뙣/?ъ떆???ㅺ퀎**

**DB??理쒖냼???꾨옒媛 ?덉뼱???댁쁺?⑸땲??*:
- `status`: queued/running/succeeded/failed
- `error_code`, `error_message`
- `attempt_count`, `next_retry_at`
- `http_status`, `response_time_ms`

**E. 異붿쿇/?꾪솚 紐⑤뜽怨??곌껐??"?뺣떟 ?곗씠?? ?뺣━**

**?꾩옱 ERD?먯꽌 `recommendations`??援щℓ?꾨즺/湲덉븸???덇퀬, `conversion_events`???덉뒿?덈떎.**

**?щ·留곴퉴吏 ?ㅼ뼱?ㅻ㈃ ???쇱옱?섍린 ?ъ썙?? ?ㅼ쓬 以??섎굹濡??듭씪?섎뒗 寃?醫뗭뒿?덈떎**:

**??(異붿쿇)**: 援щℓ/?꾪솚? ?대깽??濡쒓렇(`conversion_events`)留??뺣떟
- `recommendations.purchase_completed` 媛숈? 而щ읆? 罹먯떆/?뚯깮?쇰줈留??ъ슜

**??**: `purchases` ?뚯씠釉붿쓣 蹂꾨룄濡??먭퀬 ?뺣떟??
- 寃곗젣/援щℓ媛 "?뺥삎 ?곗씠??濡?以묒슂?댁?硫?`purchases`媛 醫뗭쓬

#### ?곌껐 諛⑹떇 ???3媛吏 鍮꾧탳

**怨듯넻 ?꾩젣**: "?뺤젣?곹뭹 vs ?먯쿇?곹뭹"
- `products` = canonical(?뺤젣) ?곹뭹: ?쒕퉬?ㅺ? 蹂댁뿬二쇰뒗 ?쒖? ?곹뭹(以묐났 ?쒓굅, ?ㅻ챸/?대?吏/移댄뀒怨좊━ ??
- `product_listings` = source listing(?먯쿇) ?곹뭹: 荑좏뙜/?ㅻ쭏?몄뒪?좎뼱/?먯궗紐????뚯뒪蹂??곹뭹 ?⑥쐞 (`source_id + external_id`濡??좊땲??

**???A) 異붿쿇? "product 湲곗?", ?대┃/援щℓ??"listing ?좏깮" (沅뚯옣, 媛??洹좏삎??**

**援ъ“**:
- `recommendations`: `(consultation_id, product_id)`
- `conversion_events`: `(recommendation_id, listing_id nullable/?꾩닔, event_type, amount, ??`
- `product_listing_map`: listing ??product 留ㅽ븨

**?μ젏**:
- UI/異붿쿇 ?덉쭏: 異붿쿇/寃?됱? product 以묒떖?쇰줈 源붾걫
- ?먯쿇 留곹겕/媛寃⑹? listing?먯꽌 媛?몄삤硫??섎?濡?媛寃?蹂???ш퀬 蹂?숈뿉 ?좊━
- "媛숈? ?쒗뭹???щ윭 留덉폆?먯꽌 ?먮ℓ"瑜??먯뿰?ㅻ읇寃?泥섎━

**?⑥젏/?댁쁺 ?ъ씤??*:
- ?대┃ ?쒖젏??"?대뒓 listing??蹂댁뿬以꾩?" 寃곗젙 濡쒖쭅 ?꾩슂 (?? 理쒖?媛/?좊ː???믪? ?뚯뒪/?ш퀬 ?덈뒗 listing ?곗꽑)

**異붿쿇 ?ъ슜 耳?댁뒪**: 異붿쿇 ?덉쭏(?쒗뭹 ?⑥쐞)???듭떖?닿퀬, ?ㅺ뎄留?留곹겕???щ윭 ?뚯뒪 以??좏깮?댁빞 ?섎뒗 ?쒕퉬??

**???B) 異붿쿇 ?먯껜瑜?"listing 湲곗?"?쇰줈 ???(?⑥닚, ?ㅺ뎄留??몃옒?뱀? ?ъ?)**

**援ъ“**:
- `recommendations`: `(consultation_id, listing_id, product_id optional)`
- `conversion_events`: `recommendation_id` 以묒떖

**?μ젏**:
- 異붿쿇 ???대┃ ??援щℓ媛 ??긽 ?숈씪 URL濡??댁뼱???몃옒?뱀씠 ?⑥닚
- "?대뼡 ?뚯뒪???대뼡 ?곹뭹???깃낵媛 醫뗭븯?붿?" 遺꾩꽍???쎈떎

**?⑥젏/?댁쁺 ?ъ씤??*:
- ?숈씪 ?쒗뭹???뚯뒪留덈떎 議댁옱?섎㈃ 異붿쿇??以묐났?쇰줈 蹂댁씠??UX媛 ?앷?
- "?쒗뭹 ?⑥쐞 遺꾩꽍"???섎젮硫?寃곌뎅 product 留ㅽ븨???꾩슂

**異붿쿇 ?ъ슜 耳?댁뒪**: 1~2媛??뚯뒪留??곌퀬, 留덉폆蹂?李⑥씠媛 ???쒕퉬??媛寃?諛곗넚/?듭뀡???듭떖)

**???C) ?섏씠釉뚮━?? 異붿쿇? product, "異붿쿇 ?뱀떆 ???listing"???④퍡 怨좎젙**

**援ъ“**:
- `recommendations`: `(consultation_id, product_id, primary_listing_id)`
- ?대깽?몃뒗 `listing_id`瑜?洹몃?濡??곌굅?? `primary_listing_id`瑜?湲곕낯媛믪쑝濡??ъ슜

**?μ젏**:
- 異붿쿇 ?붾㈃?먯꽌 留곹겕媛 利됱떆 寃곗젙(?⑥닚 UX)
- 異붿쿇 ?뱀떆??"????뚯뒪/???媛寃? ?ㅻ깄?룹뿉 ?좊━

**?⑥젏/?댁쁺 ?ъ씤??*:
- `primary_listing`???덉젅/李⑤떒/留곹겕 蹂寃????泥?listing ?좏깮 濡쒖쭅???꾩슂
- 異붿쿇 ?뱀떆 媛寃⑷낵 ?꾩옱 媛寃?李⑥씠 ?쒖떆 ?뺤콉 ?꾩슂(踰??좊ː)

**異붿쿇 ?ъ슜 耳?댁뒪**: 異붿쿇 寃곌낵??"諛붾줈媛湲?留곹겕"媛 以묒슂?섍퀬, "????뚯뒪" ?댁쁺 ?뺤콉???덈뒗 ?쒕퉬??

**DBA 愿??寃곕줎(異붿쿇)**:
- ?댁쁺 ?덉젙?깃낵 遺꾩꽍 諛몃윴?ㅺ? 媛??醫뗭? 嫄?**???A**
- ?뚯뒪媛 ?곴퀬 ?몃옒???⑥닚?붽? 理쒖슦?좎씠硫?**???B**
- UX ?⑥닚 + ?댁쁺?뺤콉(??쒕쭏耳????덉쑝硫?**???C**

### 寃곕줎

**???ㅽ궎留덉쓽 ?뺢퇋???곹깭瑜???以꾨줈 留먰븯硫?*:

> ?듭떖 ?뷀떚??遺꾨━?????섏뼱 ?덇퀬(湲곕낯 3NF ?먮쫫 ?묓샇),  
> ?ㅻ쭔 ???쒕퉬?ㅼ쓽 蹂몄쭏??"?쒕룞/ICF 肄붾뱶 湲곕컲 異붿쿇 & ?④낵??痢≪젙"?닿린 ?뚮Ц?? 
> JSONB濡?臾띠씤 ?쒕룞/ICF 援ъ“??鍮좊Ⅸ ?쒖젏???뺢퇋?뷀븷?섎줉 ?곗씠???쒖슜 媛移섍? ?ш쾶 ?щ씪媛묐땲??  
> 洹몃━怨?`recommendations` ??`conversion_events`??援щℓ/?꾪솚 以묐났 ???媛?μ꽦? ?댁쁺 以?媛???뷀븳 ?μ븷 ?ъ씤?몃씪, ?뚯뒪 ?ㅻ툕 ?몃（?ㅻ? ?뺥븯??嫄?異붿쿇?⑸땲??

### 留덉씠洹몃젅?댁뀡 ?꾨왂

**?④퀎蹂??묎렐**:

1. **Phase 1 (HIGH ?곗꽑?쒖쐞)**: IPPA ?쒕룞 ?먯닔 ?뺢퇋??
   - `consultation_ippa_activities` ?뚯씠釉??앹꽦
   - `ippa_evaluation_activity_scores` ?뚯씠釉??앹꽦
   - 湲곗〈 JSONB ?곗씠??留덉씠洹몃젅?댁뀡
   - API 肄붾뱶 ?낅뜲?댄듃

2. **Phase 2 (HIGH ?곗꽑?쒖쐞)**: ICF 肄붾뱶 ?뺢퇋???꾨즺
   - `analysis_icf_codes` ?뚯씠釉??앹꽦 (?대? `consultation_icf_codes`???덉쓬)
   - 湲곗〈 JSONB ?곗씠??留덉씠洹몃젅?댁뀡
   - API 肄붾뱶 ?낅뜲?댄듃

3. **Phase 3 (MEDIUM ?곗꽑?쒖쐞)**: ?곗씠???덉쭏 媛쒖꽑
   - `disability_types`, `disability_severities` ?뚯씠釉??앹꽦
   - 援щℓ/?꾪솚 ?뚯뒪 ?ㅻ툕 ?몃（???뺣━

4. **Phase 4 (LOW ?곗꽑?쒖쐞)**: ?뺤옣 湲곕뒫
   - ?щ·留?愿???뚯씠釉?異붽?
   - 諛곗뿴 而щ읆 遺꾨━ (?꾩슂 ??

### ?щ·留??뺤옣 DDL (?꾩쟾???ㅽ겕由쏀듃)

?꾨옒 DDL? 湲곗〈 `products`, `recommendations`, `conversion_events`媛 ?대? 議댁옱?쒕떎怨?媛?뺥븯怨?"?щ·留??뺤옣"留?異붽??⑸땲??

#### 2-1) ?щ·留??먯쿇/?ㅻ깄???뚯씠釉?DDL

```sql
BEGIN;

-- UUID ?앹꽦
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) ?뚯뒪(留덉폆/梨꾨꼸) ?뺤쓽
CREATE TABLE IF NOT EXISTS crawl_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code text NOT NULL UNIQUE, -- 'naver','smartstore','selfmall'
    display_name text NOT NULL,
    base_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) ?щ·留?Job(諛곗튂 ?⑥쐞)
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES crawl_sources(id) ON DELETE RESTRICT,
    job_type text NOT NULL, -- 'search','detail','price_refresh'
    status text NOT NULL DEFAULT 'queued', -- queued/running/succeeded/failed
    started_at timestamptz,
    finished_at timestamptz,
    total_targets integer NOT NULL DEFAULT 0,
    success_count integer NOT NULL DEFAULT 0,
    fail_count integer NOT NULL DEFAULT 0,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source_status
ON crawl_jobs(source_id, status, created_at DESC);

-- 3) ?щ·留?Request(?섏씠吏 ?⑥쐞) - ?뚰떚???????⑸웾)
CREATE TABLE IF NOT EXISTS crawl_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    target_url text NOT NULL,
    status text NOT NULL DEFAULT 'queued', -- queued/running/succeeded/failed
    http_status integer,
    response_time_ms integer,
    attempt_count integer NOT NULL DEFAULT 0,
    next_retry_at timestamptz,
    error_code text,
    error_message text,
    fetched_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- (?덉떆) ???뚰떚??2媛??앹꽦 (?댁쁺?먯꽌???먮룞 ?앹꽦 ?⑥닔 ?ъ슜 沅뚯옣)
CREATE TABLE IF NOT EXISTS crawl_requests_2025_01
PARTITION OF crawl_requests FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS crawl_requests_2025_02
PARTITION OF crawl_requests FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_crawl_requests_job_status
ON crawl_requests (job_id, status);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_next_retry
ON crawl_requests (next_retry_at)
WHERE next_retry_at IS NOT NULL;

-- 4) ?먮Ц(Raw) ???- ?뚰떚???????⑸웾)
-- ?댁쁺 洹쒕え媛 而ㅼ?硫?content_text???ㅻ툕?앺듃 ?ㅽ넗由ъ?濡?鍮쇨퀬 storage_key留??먮뒗 諛⑹떇??異붿쿇
CREATE TABLE IF NOT EXISTS raw_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES crawl_requests(id) ON DELETE CASCADE,
    content_type text NOT NULL, -- 'text/html','application/json'
    content_text text, -- or NULL if stored externally
    storage_key text, -- e.g. 's3://bucket/key' (?좏깮)
    content_hash text, -- 蹂寃쎄컧吏/dedupe
    created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS raw_documents_2025_01
PARTITION OF raw_documents FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS raw_documents_2025_02
PARTITION OF raw_documents FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_raw_documents_request
ON raw_documents (request_id);

CREATE INDEX IF NOT EXISTS idx_raw_documents_hash
ON raw_documents (content_hash);

-- 5) ?먯쿇 ?곹뭹 Listing(?뚯뒪蹂??곹뭹)
CREATE TABLE IF NOT EXISTS product_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES crawl_sources(id) ON DELETE RESTRICT,
    external_id text NOT NULL, -- ?뚯뒪 ?곹뭹 ID
    product_url text NOT NULL,
    title text,
    brand text,
    seller_name text,
    currency text NOT NULL DEFAULT 'KRW',
    is_active boolean NOT NULL DEFAULT true,
    last_crawled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_product_listings_source_active
ON product_listings (source_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_listings_updated
ON product_listings (updated_at DESC);

-- 6) Listing 蹂???ㅻ깄??媛寃??ш퀬) - ?뚰떚?????珥덈??⑸웾)
CREATE TABLE IF NOT EXISTS listing_price_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    price numeric(12,2),
    shipping_fee numeric(12,2),
    stock_status text, -- 'in_stock','out_of_stock','unknown'
    captured_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (captured_at);

CREATE TABLE IF NOT EXISTS listing_price_snapshots_2025_01
PARTITION OF listing_price_snapshots FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS listing_price_snapshots_2025_02
PARTITION OF listing_price_snapshots FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX IF NOT EXISTS idx_listing_price_listing_time
ON listing_price_snapshots (listing_id, captured_at DESC);

-- 7) ?뺤젣?곹뭹(products) ??listing 留ㅽ븨 (以묐났 ?쒓굅/?듯빀???듭떖)
CREATE TABLE IF NOT EXISTS product_listing_map (
    listing_id uuid PRIMARY KEY REFERENCES product_listings(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    match_status text NOT NULL DEFAULT 'auto', -- auto/manual/rejected
    match_score numeric(5,2),
    match_reason text,
    matched_by uuid, -- users.id (寃?섏옄)
    matched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_listing_map_product
ON product_listing_map (product_id);

COMMIT;
```

#### 2-2) recommendations / conversion_events??listing ?곌껐???ｋ뒗 DDL

**???A瑜?湲곗??쇰줈 "?대┃/援щℓ ?대깽?멸? ?대뼡 listing?먯꽌 諛쒖깮?덈뒗吏"瑜??④린?ㅻ㈃ `conversion_events`??`listing_id`瑜?異붽??섎뒗 寃?媛??源붾걫?⑸땲??**

```sql
-- (???A/C 沅뚯옣) conversion_events??listing_id 異붽?
ALTER TABLE conversion_events
ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES product_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_listing_time
ON conversion_events (listing_id, created_at DESC);
```

**???C瑜??곕㈃ recommendations?????listing??異붽?:**

```sql
-- (???C) recommendations?????listing??怨좎젙
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS primary_listing_id uuid REFERENCES product_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_primary_listing
ON recommendations(primary_listing_id);
```

#### 2-3) ?뚰떚???먮룞 ?앹꽦/蹂닿??뺤콉(?쒗뵆由?

**(1) ???뚰떚???앹꽦 ?⑥닔 ?쒗뵆由?*

?댁쁺?먯꽌??"留ㅼ썡 1?????ㅼ쓬 ???뚰떚?섍퉴吏 誘몃━ ?앹꽦?섎뒗 諛⑹떇 異붿쿇:

```sql
CREATE OR REPLACE FUNCTION ensure_monthly_partition(
    p_parent regclass,
    p_col_name text,
    p_month date
) RETURNS void AS $$
DECLARE
    v_start date := date_trunc('month', p_month)::date;
    v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
    v_tbl text := format('%s_%s', p_parent::text, to_char(v_start, 'YYYY_MM'));
    v_sql text;
BEGIN
    v_sql := format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L);',
        v_tbl, p_parent, v_start::text, v_end::text
    );
    EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql;
```

**?ъ슜 ??*:
```sql
SELECT ensure_monthly_partition('crawl_requests', 'created_at', current_date);
SELECT ensure_monthly_partition('raw_documents', 'created_at', current_date);
SELECT ensure_monthly_partition('listing_price_snapshots', 'captured_at', current_date);
```

**(2) 蹂닿??뺤콉(?ㅻ옒???뚰떚????젣) ?쒗뵆由?*

`keep_months` 湲곗??쇰줈 ?댁쟾 ?뚰떚??DROP (raw??1~3媛쒖썡, price snapshot? 6~12媛쒖썡 ???뺤콉 遺꾨━ 沅뚯옣):

```sql
CREATE OR REPLACE FUNCTION drop_partitions_older_than(
    p_parent regclass,
    p_keep_months int
) RETURNS void AS $$
DECLARE
    r record;
    v_cutoff date := (date_trunc('month', now()) - (p_keep_months || ' months')::interval)::date;
BEGIN
    FOR r IN
        SELECT c.relname AS child
        FROM pg_inherits
        JOIN pg_class c ON pg_inherits.inhrelid = c.oid
        JOIN pg_class p ON pg_inherits.inhparent = p.oid
        WHERE p.oid = p_parent
    LOOP
        -- ?뚯씠釉붾챸 ??YYYY_MM ?뚯떛 媛??(?? listing_price_snapshots_2025_01)
        -- ?ㅻТ?먯꽌???뚰떚??踰붿쐞瑜?pg_get_expr濡??쎌뼱 ???덉쟾?섍쾶 泥섎━ 媛??
        IF substring(r.child from '(\d{4}_\d{2})$') IS NOT NULL THEN
            IF to_date(substring(r.child from '(\d{4}_\d{2})$'), 'YYYY_MM') < v_cutoff THEN
                EXECUTE format('DROP TABLE IF EXISTS %I;', r.child);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**?ㅽ뻾 ???몃? ?ㅼ?以꾨윭?먯꽌)**:
```sql
SELECT drop_partitions_older_than('raw_documents', 3);
SELECT drop_partitions_older_than('crawl_requests', 6);
SELECT drop_partitions_older_than('listing_price_snapshots', 12);
```

### 以묐났 ?곹뭹 留ㅼ묶(?먮룞/?섎룞 ?뱀씤) ?댁쁺 ?뚯씠釉??ㅺ퀎

#### 3-1) ?듭떖 媛쒕뀗

**?먮룞 留ㅼ묶? 100% ?꾨꼍?섏? ?딆뒿?덈떎.**

**?댁쁺?먯꽌 ?꾩슂??嫄?*:
1. ?먮룞 ?꾨낫 ?앹꽦(rule 湲곕컲 + score)
2. 寃????pending ??approved/rejected)
3. ?뱀씤 ??`product_listing_map` 媛깆떊
4. "??留ㅼ묶?먮뒗吏/?꾧? ?뱀씤?덈뒗吏" 媛먯궗 異붿쟻

#### 3-2) DDL: match_rules / match_queue / match_audit_logs

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 留ㅼ묶 猷??먮룞 留ㅼ묶 濡쒖쭅???ㅼ젙)
CREATE TABLE IF NOT EXISTS match_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL UNIQUE,
    is_enabled boolean NOT NULL DEFAULT true,
    -- 猷?????덉떆:
    -- 'exact_external_id', 'url_normalize', 'title_similarity', 'brand_model', 'embedding'
    rule_type text NOT NULL,
    -- 猷곕퀎 ?ㅼ젙(?꾧퀎媛? 媛以묒튂, ?꾨뱶 留ㅽ븨 ??
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    priority int NOT NULL DEFAULT 100, -- ??쓣?섎줉 癒쇱? ?곸슜
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_rules_enabled_priority
ON match_rules(is_enabled, priority);

-- 2) 留ㅼ묶 ??寃?????
-- listing 1嫄댁뿉 ????щ윭 ?꾨낫(product ?꾨낫)媛 ?ㅼ뼱媛????덉쓬
CREATE TABLE IF NOT EXISTS match_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    candidate_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    rule_id uuid REFERENCES match_rules(id) ON DELETE SET NULL,
    match_score numeric(6,3) NOT NULL DEFAULT 0,
    match_reason text,
    evidence jsonb, -- ?대뼡 ?꾨뱶媛 ?쇱튂?덈뒗吏, ?좎궗??媛???
    status text NOT NULL DEFAULT 'pending', -- pending/approved/rejected/expired
    reviewed_by uuid, -- users.id
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- 媛숈? listing??媛숈? ?꾨낫媛 以묐났 ?앹꽦?섎뒗 寃껋쓣 諛⑹?
    UNIQUE(listing_id, candidate_product_id)
);

CREATE INDEX IF NOT EXISTS idx_match_queue_status_score
ON match_queue(status, match_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_queue_listing
ON match_queue(listing_id);

-- 3) 留ㅼ묶 媛먯궗 濡쒓렇(?꾧? 臾댁뾿???뱀씤/嫄곗젅?덈뒗吏)
CREATE TABLE IF NOT EXISTS match_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'approve','reject','auto_map','unmap'
    actor_id uuid, -- users.id or NULL for system
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_audit_listing_time
ON match_audit_logs(listing_id, created_at DESC);

COMMIT;
```

#### 3-3) ?댁쁺 ?뚮줈???ㅻТ ?ъ씤??

**?먮룞 留ㅼ묶 ?뚯씠?꾨씪??(異붿쿇)**:

1. **?щ·留???product_listings upsert**
2. **?꾨낫 ?앹꽦**: 猷??ㅽ뻾?댁꽌 ?꾨낫(product)瑜?李얘퀬 `match_queue`??pending?쇰줈 ?쎌엯
3. **?꾧퀎移??댁긽? ?먮룞 ?뱀씤**: score ??0.95 媛숈? 寃쎌슦 `product_listing_map`??諛붾줈 諛섏쁺?섍퀬 濡쒓렇 ?④?
4. **?섎㉧吏??寃??UI?먯꽌 ?뱀씤/嫄곗젅**:
   - ?뱀씤 ?? `product_listing_map`(listing_id ??product_id) upsert
   - 嫄곗젅 ?? `match_queue.status='rejected'`
5. **?ы겕濡ㅻ쭅/?곹뭹 蹂寃?媛먯? ??*: listing??content_hash/title/brand 蹂?붽? ?щ㈃ `match_queue`瑜??ъ삤?덊븯嫄곕굹 expired 泥섎━

**DBA媛 諛섎뱶??梨숆만 寃?*:
- **以묐났 諛⑹? ??*: `product_listings UNIQUE(source_id, external_id)`, `match_queue UNIQUE(listing_id, candidate_product_id)`
- **?곹깭 湲곕컲 ?몃뜳??*: `match_queue(status, score DESC)`
- **媛먯궗 濡쒓렇(?꾧? ?뱀씤?덈굹)**: ?댁쁺?먯꽌 遺꾩웳/?덉쭏 ?댁뒋 ?앷린硫??닿쾶 ?앸챸以?
- **?먮룞 留ㅼ묶怨??섎룞 留ㅼ묶??異⑸룎?섏? ?딅룄濡?*: `product_listing_map.match_status`瑜?auto/manual濡?遺꾨━?섍퀬, ?섎룞 ?뱀씤 ??manual??auto瑜???뼱?곌쾶 ?뺤콉??

### ?댁쁺?먯꽌 諛붾줈 泥닿컧?섎뒗 "DBA 泥댄겕由ъ뒪?? (?꾩옣 ?ъ씤??

**1) ?곗씠????쬆 ?뚯씠釉붾????뚰떚??蹂닿??뺤콉??癒쇱? ?뺥빐??*

- `listing_price_snapshots`, `raw_documents`, `crawl_requests`
- "臾댄븳???볦븘?먭린"??100% ?μ븷濡??뚯븘?듬땲??諛깆뾽, vacuum, ?몃뜳?? 鍮꾩슜).

**2) 以묐났 諛⑹? ??UNIQUE) ?놁쑝硫??щ·留곸? 留앺븳??*

- listing? `source_id + external_id` ?좊땲?ш? ?ъ떎???앸챸以?
- price snapshot? 以묐났 諛⑹? ?뺤콉??蹂꾨룄濡??ㅺ퀎(?숈씪 ?쒓컖 以묐났 ?쎌엯 諛⑹?)

**3) ?먮Ц ??μ? "DB vs ?ㅽ넗由ъ?"瑜?議곌린??寃곗젙**

- **DB ???*: 媛쒕컻/?붾쾭源??ъ?, 鍮꾩슜/?⑸웾 ?꾪뿕
- **?ㅽ넗由ъ? ???*: ?댁쁺???좊━, ?ㅻ쭔 議고쉶/沅뚰븳/?뺥빀???ㅺ퀎 ?꾩슂
- **?ㅻТ?먯꽌???먮Ц? ?ㅽ넗由ъ? + DB???댁떆/寃쎈줈留뚯씠 ?ㅻ옒媛묐땲??**

**4) 異붿쿇/援щℓ/?꾪솚 "?뺣떟 ?뚯씠釉????섎굹濡?怨좎젙**

- `recommendations`??援щℓ?щ?瑜??먮㈃ ?명븯吏留? ?대깽??濡쒓렇? 異⑸룎?섍린 ?ъ?
- ?뺣떟? `conversion_events` (?먮뒗 `purchases`)濡?怨좎젙?섍퀬 ?섎㉧吏???뚯깮媛믪쑝濡??댁슜 異붿쿇

**5) ?μ븷/李⑤떒/?ъ떆?꾨뒗 ?좎큹???곗씠??紐⑤뜽???ｌ뼱??*

- `attempt_count`, `next_retry_at`, `error_*` ?놁씠 ?댁쁺?섎㈃ "???꾨씫?먯??"瑜??곸썝??紐??≪뒿?덈떎.

### 留덉?留??뺣━: 異붿쿇 議고빀

**?곌껐 諛⑹떇**: ???A (product 異붿쿇 + listing ?대깽??湲곕줉)

**?щ·留??뺤옣**: 
- `crawl_*` + `product_listings` + `listing_price_snapshots` + `product_listing_map`

**留ㅼ묶 ?댁쁺**: 
- `match_rules` + `match_queue` + `match_audit_logs`

**蹂닿??뺤콉**: 
- raw??1~3媛쒖썡, request??3~6媛쒖썡, price snapshot? 6~12媛쒖썡(?쒕퉬???깆옣??留욎떠 議곗젙)

### 李멸퀬 ?먮즺

- [?곗씠?곕쿋?댁뒪 愿由??먯튃](./database-maintenance-guide.md)
- [ICF 肄붾뱶 ?뺢퇋??媛?대뱶](./icf-codes-normalization-guide.md)

