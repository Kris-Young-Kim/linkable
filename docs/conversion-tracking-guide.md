# ?꾪솚??痢≪젙 ?쒖뒪??媛?대뱶

## 媛쒖슂

?꾪솚??痢≪젙 ?쒖뒪?쒖? 異붿쿇 CTA ?대┃瑜? 臾몄쓽 ?곌껐?? 援щℓ ?꾪솚?⑥쓣 痢≪젙?섍퀬 愿由ъ옄 ??쒕낫?쒖뿉 ?쒖떆?⑸땲??

## 痢≪젙 ??ぉ

### 1. 異붿쿇 CTA ?대┃瑜?(紐⑺몴: 25%)

**?뺤쓽**: ?꾩껜 異붿쿇 以??ъ슜?먭? ?대┃??異붿쿇??鍮꾩쑉

**怨꾩궛??*: `(?대┃??異붿쿇 ??/ ?꾩껜 異붿쿇 ?? 횞 100`

**異붿쟻 諛⑸쾿**:
- ?ъ슜?먭? 異붿쿇 移대뱶??"援щℓ?섍린" ?먮뒗 "???뚯븘蹂닿린" 踰꾪듉 ?대┃
- `/api/recommendations/[id]/click` API ?몄텧
- `recommendations.is_clicked` ?뚮옒洹??낅뜲?댄듃
- `conversion_events` ?뚯씠釉붿뿉 `recommendation_click` ?대깽?????

### 2. 臾몄쓽 ?곌껐??(紐⑺몴: 10%)

**?뺤쓽**: ?대┃??異붿쿇 以??꾨Ц媛 臾몄쓽瑜??대┃??鍮꾩쑉

**怨꾩궛??*: `(?꾨Ц媛 臾몄쓽 ?대┃ ??/ ?대┃??異붿쿇 ?? 횞 100`

**異붿쟻 諛⑸쾿**:
- 異붿쿇 移대뱶??"?꾨Ц媛 臾몄쓽" 踰꾪듉 ?대┃
- `/api/recommendations/[id]/action` API ?몄텧 (action: "expert_inquiry_click")
- `conversion_events` ?뚯씠釉붿뿉 `expert_inquiry_click` ?대깽?????

### 3. 援щℓ ?꾪솚??

**?뺤쓽**: ?대┃??異붿쿇 以??ㅼ젣 援щℓ濡??댁뼱吏?鍮꾩쑉

**怨꾩궛??*: `(援щℓ ?꾨즺 ??/ ?대┃??異붿쿇 ?? 횞 100`

**異붿쟻 諛⑸쾿**:
- 荑좏뙜 ?뚰듃?덉뒪 Postback: `/api/webhooks/naver/purchase`
- Meta Pixel: `/api/webhooks/meta/purchase`
- `conversion_events` ?뚯씠釉붿뿉 `purchase_completed` ?대깽?????
- `recommendations.purchase_completed` ?뚮옒洹??낅뜲?댄듃

## API ?붾뱶?ъ씤??

### GET /api/admin/analytics/conversion-rates

?꾪솚??痢≪젙 ?곗씠?곕? 議고쉶?⑸땲??

**荑쇰━ ?뚮씪誘명꽣**:
- `dateRange`: 痢≪젙 湲곌컙 (7days, 30days, 90days) - 湲곕낯媛? 30days

**?묐떟 ?덉떆**:
```json
{
  "summary": {
    "recommendationClickRate": 23.5,
    "expertInquiryRate": 8.2,
    "supportProgramClickRate": 5.1,
    "purchaseConversionRate": 3.8
  },
  "goals": {
    "recommendationClickRate": {
      "target": 25,
      "current": 23.5,
      "achieved": false,
      "gap": 1.5
    },
    "expertInquiryRate": {
      "target": 10,
      "current": 8.2,
      "achieved": false,
      "gap": 1.8
    }
  },
  "funnel": {
    "consultations": 100,
    "recommendations": 85,
    "clicks": 20,
    "expertInquiries": 2,
    "purchases": 1,
    "rates": {
      "consultationToRecommendation": 85.0,
      "recommendationToClick": 23.5,
      "clickToExpertInquiry": 10.0,
      "clickToPurchase": 5.0,
      "overallConversion": 1.0
    }
  }
}
```

## 愿由ъ옄 ??쒕낫??

愿由ъ옄 ??쒕낫??`/admin/dashboard`)?먯꽌 "?꾪솚??痢≪젙" ?뱀뀡???듯빐 ?ㅼ쓬 ?뺣낫瑜??뺤씤?????덉뒿?덈떎:

1. **紐⑺몴 ?ъ꽦 ?꾪솴**: 媛??꾪솚?⑥쓽 紐⑺몴 ?鍮??꾩옱 ?곹깭
2. **?꾪솚 ?쇰꼸**: ?곷떞 ??異붿쿇 ???대┃ ??臾몄쓽/援щℓ ?④퀎蹂??꾪솚??
3. **?쇰퀎 異붿씠**: 理쒓렐 30?쇨컙???대┃瑜?諛?援щℓ ?꾪솚??異붿씠
4. **援щℓ ?듦퀎**: 珥?援щℓ 嫄댁닔, 湲덉븸, ?됯퇏 援щℓ 湲덉븸, ?섏닔猷?

## 痢≪젙 ?ㅽ겕由쏀듃

### ?ъ슜踰?

```bash
# 理쒓렐 30???꾪솚??痢≪젙
tsx scripts/tests/measure-conversion-rates.ts

# 理쒓렐 7???꾪솚??痢≪젙
tsx scripts/tests/measure-conversion-rates.ts 7days
```

### 寃곌낵 ???

- `scripts/tests/results/conversion-rates-{timestamp}.json`: ??꾩뒪?ы봽媛 ?ы븿??寃곌낵 ?뚯씪
- `scripts/tests/results/conversion-rates-latest.json`: 理쒖떊 寃곌낵 ?뚯씪

## 援щℓ ?꾪솚??異붿쟻

### 荑좏뙜 ?뚰듃?덉뒪 Postback ?곕룞

1. **Postback URL ?ㅼ젙**
   - 荑좏뙜 ?뚰듃?덉뒪 ??쒕낫?쒖뿉??Postback URL???ㅼ젙
   - URL: `https://your-domain.com/api/webhooks/naver/purchase`

2. **援щℓ ?꾨즺 ???먮룞 ?몄텧**
   - 荑좏뙜?먯꽌 援щℓ ?꾨즺 ??POST ?붿껌 ?꾩넚
   - `orderId`, `productId`, `purchaseAmount` ???ы븿

3. **留ㅼ묶 濡쒖쭅**
   - `linkId` ?먮뒗 `productId`濡?`recommendations` ?뚯씠釉붿뿉??異붿쿇 李얘린
   - `is_clicked = true`??異붿쿇留????
   - 留ㅼ묶 ?깃났 ??`conversion_events`??`purchase_completed` ?대깽?????

### Meta Pixel ?곕룞

1. **Purchase ?대깽??異붿쟻**
   - Meta Pixel?먯꽌 Purchase ?대깽??諛쒖깮 ??`/api/webhooks/meta/purchase` ?몄텧
   - `orderId`, `productIds`, `value` ???ы븿

2. **留ㅼ묶 濡쒖쭅**
   - `productIds`濡?`recommendations` ?뚯씠釉붿뿉??異붿쿇 李얘린
   - `is_clicked = true`??異붿쿇留????

## 媛쒖꽑 諛⑸쾿

### 異붿쿇 CTA ?대┃瑜??μ긽

1. **CTA 踰꾪듉 理쒖쟻??*
   - 踰꾪듉 ?꾩튂: ?곷떒, 以묎컙, ?섎떒 A/B ?뚯뒪??
   - 踰꾪듉 ?띿뒪?? "援щℓ?섍린", "吏?먯젣???뺤씤", "?꾨Ц媛 ?곷떞" ???뚯뒪??
   - 踰꾪듉 ?됱긽/?ш린: ?쒓컖??媛뺤“

2. **異붿쿇 移대뱶 媛쒖꽑**
   - ?곹뭹 ?대?吏 ?덉쭏 ?μ긽
   - 媛寃??뺣낫 紐낇솗???쒖떆
   - 由щ럭/?됱젏 ?쒖떆 (?덈뒗 寃쎌슦)

### 臾몄쓽 ?곌껐???μ긽

1. **?꾨Ц媛 臾몄쓽 踰꾪듉 媛뺤“**
   - 踰꾪듉 ?꾩튂 諛??붿옄??媛쒖꽑
   - "臾대즺 ?곷떞" ???몄꽱?곕툕 ?쒖떆

2. **?꾨Ц媛 ?곷떞 ?꾨줈?몄뒪 媛꾩냼??*
   - ?좎껌 ???⑥닚??
   - 利됱떆 ?곌껐 媛???щ? ?쒖떆

### 援щℓ ?꾪솚???μ긽

1. **由щ쭏?몃뜑 ?쒖뒪??*
   - 7????由щ쭏?몃뜑 (異붿쿇 ?ы솗??
   - 14????由щ쭏?몃뜑 (K-IPPA ?됯?)

2. **?몄꽱?곕툕 ?쒖뒪??*
   - ?ъ씤???곷┰ ?덈궡 媛뺥솕
   - 荑좏룿 諛쒓툒 ?꾨줈?몄뒪 媛꾩냼??

## 愿???뚯씪

- `app/api/admin/analytics/conversion-rates/route.ts`: ?꾪솚??痢≪젙 API
- `components/admin/conversion-rates-dashboard.tsx`: ?꾪솚????쒕낫??而댄룷?뚰듃
- `scripts/tests/measure-conversion-rates.ts`: ?꾪솚??痢≪젙 ?ㅽ겕由쏀듃
- `app/api/webhooks/naver/purchase/route.ts`: 荑좏뙜 Postback ?붾뱶?ъ씤??
- `app/api/webhooks/meta/purchase/route.ts`: Meta Pixel ?붾뱶?ъ씤??
- `app/api/recommendations/[id]/click/route.ts`: 異붿쿇 ?대┃ 異붿쟻
- `app/api/recommendations/[id]/action/route.ts`: 異붽? ?≪뀡 異붿쟻

## ?곗씠?곕쿋?댁뒪 ?ㅽ궎留?

### conversion_events ?뚯씠釉?

```sql
CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL, -- 'recommendation_click', 'expert_inquiry_click', 'support_program_click', 'purchase_completed'
  recommendation_id UUID REFERENCES recommendations(id),
  product_id UUID REFERENCES products(id),
  consultation_id UUID REFERENCES consultations(id),
  purchase_amount NUMERIC,
  commission_amount NUMERIC,
  purchase_date TIMESTAMPTZ,
  tracking_source TEXT, -- 'postback', 'meta_pixel', 'naver_api'
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### recommendations ?뚯씠釉?(愿???꾨뱶)

- `is_clicked`: ?대┃ ?щ?
- `purchase_completed`: 援щℓ ?꾨즺 ?щ?
- `purchase_completed_at`: 援щℓ ?꾨즺 ?쇱떆
- `purchase_amount`: 援щℓ 湲덉븸

