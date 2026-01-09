# Division 레벨 마이그레이션 가이드

## 개요

ISO 9999:2022 표준에 따라 모든 제품을 Division 레벨(6자리)로 전환하는 가이드입니다.

## 배경

ISO 9999:2022 표준 구조:
- **Class (대분류)**: 2자리 (예: "12", "15")
- **Subclass (중분류)**: 4자리 (예: "12 23", "15 09")
- **Division (소분류)**: 6자리 (예: "12 23 03", "15 09 13")

**중요**: 모든 제품은 Division 레벨(6자리)에만 분류되어야 합니다. Class와 Subclass는 단지 Division들을 그룹화하는 메타데이터일 뿐입니다.

## 마이그레이션 단계

### 1. 현재 상태 분석

마이그레이션 전 현재 상태를 확인합니다:

```sql
-- Supabase SQL Editor에서 실행
\i scripts/analyze-product-iso-levels.sql
```

또는 직접 실행:

```sql
SELECT 
    CASE 
        WHEN iso_code IS NULL THEN 'NULL'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 2 THEN 'Class (대분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 4 THEN 'Subclass (중분류)'
        WHEN LENGTH(REPLACE(iso_code, ' ', '')) = 6 THEN 'Division (소분류)'
        ELSE '비표준 형식'
    END as code_level,
    COUNT(*) as product_count
FROM products
WHERE iso_code IS NOT NULL
GROUP BY code_level;
```

### 2. 데이터베이스 마이그레이션 실행

Supabase SQL Editor에서 마이그레이션 스크립트를 실행합니다:

```sql
-- 마이그레이션 실행
\i supabase/migrations/20250230000000_migrate_products_to_division_level.sql
```

**주의사항**:
- 마이그레이션 전에 데이터베이스 백업을 권장합니다
- 마이그레이션은 Class/Subclass 레벨 제품을 해당하는 첫 번째 Division으로 변환합니다
- Division이 없는 경우 임시 Division 코드를 생성합니다 (예: "15 09" → "15 09 01")

### 3. 마이그레이션 결과 검증

마이그레이션 후 모든 제품이 Division 레벨인지 확인:

```sql
-- Division 레벨이 아닌 제품 확인 (있으면 안 됨)
SELECT 
    id,
    name,
    iso_code,
    LENGTH(REPLACE(iso_code, ' ', '')) as code_length
FROM products
WHERE iso_code IS NOT NULL
  AND LENGTH(REPLACE(iso_code, ' ', '')) != 6;
```

### 4. 코드 변경 사항

#### 4.1 ICF → ISO 매핑 (Division 확장)

`core/matching/iso-mapping.ts`에 Division 확장 함수가 추가되었습니다:

```typescript
// 기존 (Subclass 레벨)
const matches = getIsoMatches(icfCodes);

// 새로운 (Division 레벨로 확장)
const matches = await getIsoMatchesAsync(icfCodes, {
  expandToDivisions: true,
  supabase,
});
```

#### 4.2 제품 검색 로직

`core/matching/iso-product-recommender.ts`가 수정되었습니다:

- **Division 레벨 검색**: 정확히 일치하는 제품만 검색
- **Subclass 레벨 검색**: 해당 Subclass의 모든 Division 제품 검색 (예: "15 09" → "15 09 13", "15 09 16", ...)
- **Class 레벨 검색**: 해당 Class의 모든 Division 제품 검색

#### 4.3 제품 등록 검증

`lib/integrations/iso-product-manager.ts`에 Division 레벨 강제 검증이 추가되었습니다:

```typescript
// Division 레벨이 아니면 에러 발생
await syncIsoCodeProducts("15 09 13", products); // ✅ OK
await syncIsoCodeProducts("15 09", products);    // ❌ Error: Division 레벨만 허용
```

## 주요 변경 사항

### 제품 등록

**이전**:
```typescript
await syncIsoCodeProducts("15 09", products); // Subclass 레벨
```

**이후**:
```typescript
await syncIsoCodeProducts("15 09 13", products); // Division 레벨만 허용
```

### 제품 검색

**이전**:
```typescript
// "15 09"로 검색하면 정확히 일치하는 제품만 찾음
.eq("iso_code", "15 09")
```

**이후**:
```typescript
// "15 09"로 검색하면 해당 Subclass의 모든 Division 제품을 찾음
.like("iso_code", "15 09 %") // "15 09 13", "15 09 16", ...
```

### ICF → ISO 매핑

**이전**:
```typescript
const matches = getIsoMatches(icfCodes);
// 결과: [{ isoCode: "15 09", ... }] (Subclass 레벨)
```

**이후**:
```typescript
const matches = await getIsoMatchesAsync(icfCodes, {
  expandToDivisions: true,
});
// 결과: [
//   { isoCode: "15 09 13", ... }, // 커트러리, 젓가락 및 빨대
//   { isoCode: "15 09 16", ... }, // 머그, 유리잔, 컵 및 접시
//   ...
// ]
```

## 롤백 방법

마이그레이션을 롤백해야 하는 경우:

```sql
-- 마이그레이션 매핑 테이블이 있다면 (마이그레이션 실행 전 백업 필요)
-- products 테이블을 이전 상태로 복원
```

**주의**: 마이그레이션 전에 반드시 데이터베이스 백업을 수행하세요.

## FAQ

### Q: Division이 없는 Subclass는 어떻게 처리하나요?

A: 마이그레이션 스크립트는 해당 Subclass의 첫 번째 Division을 찾습니다. Division이 없으면 임시 Division 코드를 생성합니다 (예: "15 09" → "15 09 01"). 이후 `iso_codes` 테이블에 올바른 Division을 추가하고 제품을 업데이트해야 합니다.

### Q: 기존 API는 계속 작동하나요?

A: 네, 하위 호환성을 위해 `getIsoMatches` 함수는 그대로 유지됩니다. 하지만 새로운 `getIsoMatchesAsync` 함수를 사용하는 것을 권장합니다.

### Q: 제품을 등록할 때 Division 코드를 어떻게 알 수 있나요?

A: ISO 9999:2022 문서를 참조하거나, `iso_codes` 테이블에서 조회할 수 있습니다:

```sql
SELECT code, name, description
FROM iso_codes
WHERE parent_code = '15 09'
  AND level = 3
ORDER BY code;
```

## 참고 자료

- ISO 9999:2022 표준 문서: `docs/KS_P_ISO_9999_2022.md`
- ISO 코드 구조 참조: `docs/iso-9999-2022-mapping-reference.md`
