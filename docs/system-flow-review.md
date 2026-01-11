# 시스템 플로우 검토 보고서

## 전체 플로우 개요

```
1. 제품 크롤링 (n8n → Webhook)
   ↓
2. ISO 코드 자동 추론 (없는 경우)
   ↓
3. Division 레벨로 변환
   ↓
4. iso_code_id로 변환하여 products 테이블 저장
   ↓
5. 채팅 → ICF 코드 추출
   ↓
6. ICF → ISO 코드 매칭
   ↓
7. ISO 코드로 제품 추천 (iso_code_id FK 조인)
```

---

## 단계별 검토

### ✅ 1단계: 제품 크롤링 (Webhook)

**파일**: `app/api/admin/products/crawl/webhook/route.ts`

**현재 동작**:
1. 크롤링 데이터 수신
2. `product_listings` 테이블에 원천 데이터 저장
3. ISO 코드 자동 추론 (없는 경우)
4. Division 레벨로 변환
5. `iso_code_id`로 변환하여 `products` 테이블 저장

**✅ 정상 동작**:
- ISO 코드가 없으면 AI 기반 자동 추론
- Division 레벨로 변환
- `iso_code_id` FK 사용

**⚠️ 잠재적 문제**:
- `getIsoCodeId()`가 `null`을 반환하는 경우 (특수 코드 "N999999" 등)
- `iso_code_id`가 `null`인 제품이 저장됨
- `onConflict: 'name, iso_code_id'`에서 `iso_code_id`가 `null`이면 중복 체크가 제대로 안 될 수 있음

---

### ✅ 2단계: ISO 코드 배정

**파일**: `lib/utils/iso-code-converter.ts`

**현재 동작**:
- `convertToDivisionLevel()`: ISO 코드를 Division 레벨로 변환
- `getIsoCodeId()`: ISO 코드 문자열을 `iso_code_id` UUID로 변환

**✅ 정상 동작**:
- Division 레벨 변환 로직 정상
- `iso_codes` 테이블 조회 정상

**⚠️ 잠재적 문제**:
- `getIsoCodeId()`가 `null` 반환 시 제품 저장 문제
- 특수 코드("N999999", "00 00")는 `null` 반환 → 제품은 저장되지만 `iso_code_id`가 `null`

---

### ⚠️ 3단계: 제품 추천 (채팅 결과 기반)

**파일**: 
- `app/api/products/route.ts` (기본 추천)
- `core/matching/iso-product-recommender.ts` (고도화 추천)

**현재 동작**:
1. 채팅 → ICF 코드 추출
2. ICF → ISO 코드 매칭
3. ISO 코드로 제품 검색 (`iso_code_id` FK 조인)

**✅ 정상 동작**:
- `iso_code_id` FK 조인 사용
- Division 레벨 기준 검색

**❌ 발견된 문제**:

#### 문제 1: `iso_code_id`가 `null`인 제품 필터링 누락

**위치**: `core/matching/iso-product-recommender.ts:189-201`

```typescript
let exactQuery = supabase
  .from("products")
  .select(`
    *,
    iso_codes!iso_code_id (
      code,
      name,
      level
    )
  `)
  .eq("is_active", true)
  // ❌ iso_code_id IS NOT NULL 필터가 없음!
```

**문제점**:
- `iso_code_id`가 `null`인 제품도 조회됨
- LEFT JOIN이므로 `iso_codes`가 `null`인 제품도 포함됨
- 추론 실패한 제품("N999999")이 추천될 수 있음

**영향**:
- ISO 코드가 없는 제품이 추천될 수 있음
- 추천 정확도 저하

#### 문제 2: `iso_code_id`가 `null`인 제품 처리

**위치**: `app/api/products/route.ts:535-585`

```typescript
let query = supabase.from("products").select(`
  id,
  name,
  iso_code_id,
  iso_codes!iso_code_id (
    code,
    name,
    level
  ),
  ...
`);

// ISO 코드 필터링
if (isoCodes.length) {
  const isoCodeIds: string[] = [];
  for (const isoCode of isoCodes) {
    const isoCodeId = await getIsoCodeId(isoCode, supabase);
    if (isoCodeId) {
      isoCodeIds.push(isoCodeId);
    }
  }
  if (isoCodeIds.length > 0) {
    query = query.in("iso_code_id", isoCodeIds);
  } else {
    return NextResponse.json({ products: [] });
  }
}
```

**✅ 정상 동작**:
- `iso_code_id` 필터링 정상
- `iso_code_id`가 없으면 빈 결과 반환

**⚠️ 잠재적 문제**:
- `iso_code_id`가 `null`인 제품은 자동으로 제외됨 (의도된 동작)
- 하지만 크롤링 시 `iso_code_id`가 `null`인 제품이 저장되는 것은 문제

---

## 발견된 문제 요약

### 🔴 심각한 문제

1. **크롤링 시 `iso_code_id`가 `null`인 제품 저장**
   - 위치: `app/api/admin/products/crawl/webhook/route.ts:131-147`
   - 문제: `getIsoCodeId()`가 `null` 반환 시에도 제품 저장
   - 영향: ISO 코드 없는 제품이 DB에 저장됨
   - 해결: `iso_code_id`가 `null`이면 제품 저장하지 않거나 경고 로그

2. **제품 추천 시 `iso_code_id`가 `null`인 제품 필터링 누락**
   - 위치: `core/matching/iso-product-recommender.ts:189-201`
   - 문제: `iso_code_id IS NOT NULL` 필터 없음
   - 영향: ISO 코드 없는 제품이 추천될 수 있음
   - 해결: `.not("iso_code_id", "is", null)` 필터 추가

### ⚠️ 개선 권장 사항

1. **크롤링 실패 시 재시도 로직**
   - ISO 추론 실패 시 재시도 또는 수동 검토 큐에 추가

2. **로깅 강화**
   - `iso_code_id`가 `null`인 제품 저장 시 경고 로그
   - 추론 실패 원인 추적

3. **데이터 검증**
   - 크롤링 후 `iso_code_id`가 `null`인 제품 모니터링
   - 주기적 검증 스크립트

---

## 권장 수정 사항

### 1. 크롤링 웹훅: `iso_code_id` null 체크 추가

```typescript
// ISO 코드 문자열을 iso_code_id로 변환
const { getIsoCodeId } = await import("@/lib/utils/iso-code-converter");
const isoCodeId = await getIsoCodeId(isoCode, supabase);

// ⚠️ iso_code_id가 null이면 제품 저장하지 않음
if (!isoCodeId) {
    console.warn(`[Crawler Webhook] Skipping product "${p.title}": iso_code_id is null (ISO: ${isoCode})`);
    results.failed++;
    results.errors.push({ 
        title: p.title || 'Unknown', 
        error: `ISO code "${isoCode}" could not be mapped to iso_code_id` 
    });
    continue; // 다음 제품으로
}

// iso_code_id가 있는 경우만 저장
const { error: productError } = await supabase
    .from("products")
    .upsert({
        name: p.title,
        iso_code_id: isoCodeId,
        // ...
    }, {
        onConflict: 'name, iso_code_id'
    });
```

### 2. 제품 추천: `iso_code_id` null 필터 추가

```typescript
// 1. 정확한 ISO 코드 매칭 제품 검색
let exactQuery = supabase
  .from("products")
  .select(`
    *,
    iso_codes!iso_code_id (
      code,
      name,
      level
    )
  `)
  .eq("is_active", true)
  .not("iso_code_id", "is", null)  // ✅ iso_code_id가 null인 제품 제외
  .order("created_at", { ascending: false });
```

---

## 결론

**전체 플로우는 대체로 정상 작동하지만, 다음 문제가 있습니다:**

1. ✅ 크롤링 → ISO 배정: 정상 (단, null 처리 개선 필요)
2. ✅ ISO 배정 → Division 변환: 정상
3. ⚠️ 제품 추천: `iso_code_id` null 필터 누락

**즉시 수정 권장**:
- 크롤링 웹훅에서 `iso_code_id` null 체크
- 제품 추천에서 `iso_code_id` null 필터 추가
