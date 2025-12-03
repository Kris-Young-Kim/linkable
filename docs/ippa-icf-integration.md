# K-IPPA ICF 활동 항목 통합 (기존 시스템 기반)

## 개요

기존 시스템의 컨셉을 유지하면서 K-IPPA 평가에 ICF 활동 항목을 통합했습니다. 사용자가 직접 ICF 활동을 선택하는 것이 아니라, **AI가 상담 내용을 분석하여 추출한 ICF 코드(D-Level)를 기반으로** K-IPPA 평가를 진행합니다.

## 핵심 컨셉

```
상담 내용 입력 (채팅)
    ↓
AI가 ICF 코드 추출 (analysis_results.icf_codes)
    ↓
ICF D-Level 코드 기반 K-IPPA 평가
    ↓
ISO 9999 매칭 (기존 시스템 활용)
```

## 구현 내용

### 1. ICF 활동 항목 정의 (참조용)

**파일**: `core/assessment/icf-activities.ts`

- ICF D-Level 활동 항목 전체 정의 (D1~D9)
- 총 150개 이상의 활동 항목 포함
- **용도**: ICF 코드와 매칭하여 설명 표시용

**주요 함수**:
- `getIcfActivityByCode(code: string)`: 코드로 활동 조회
- `getIcfActivitiesByCategory(category)`: 카테고리별 활동 조회

### 2. 상담 단계 - 추출된 ICF 코드 기반 점수 입력

**파일**: `components/ippa-consultation-form.tsx`

**기능**:
- 상담에서 AI가 추출한 ICF D-Level 코드 자동 로드
- 각 코드별 중요도 및 어려운 정도 점수 입력 (1~5점)
- 실시간 점수 계산 미리보기

**API**: `GET /api/consultations/[consultationId]/icf-codes`
- `analysis_results.icf_codes`에서 추출된 ICF 코드 조회
- D-Level 코드만 필터링하여 반환

**데이터 구조**:
```typescript
{
  activities: [
    {
      icfCode: "d450",  // AI가 추출한 코드
      importance: 5,
      currentDifficulty: 5
    }
  ]
}
```

### 3. 사후 평가 단계 - 활동별 사후 점수 입력

**파일**: `components/ippa-form.tsx`

**기능**:
- 상담 단계에서 저장한 활동 점수 자동 로드
- 각 활동별 사후 어려움 점수 입력
- 활동별 개선도 실시간 계산 및 미리보기
- 기존 단일 활동 평가 방식과 호환

**API**: `GET /api/consultations/[consultationId]/ippa-activities`
- `consultations.ippa_activities`에서 저장된 활동 목록 조회

### 4. 데이터베이스 스키마 확장

**마이그레이션**: `supabase/migrations/20250122000000_add_ippa_activities.sql`

**변경 사항**:
1. `consultations` 테이블에 `ippa_activities` JSONB 필드 추가
   - 상담 단계에서 입력한 활동별 점수 저장
2. `ippa_evaluations` 테이블에 `activity_scores` JSONB 필드 추가
   - 사후 평가에서 입력한 활동별 점수 및 개선도 저장

**데이터 구조 예시**:
```json
// consultations.ippa_activities
{
  "activities": [
    {
      "icfCode": "d450",  // AI가 추출한 코드
      "importance": 5,
      "preDifficulty": 5,
      "collectedAt": "2025-01-22T10:00:00Z"
    }
  ],
  "collectedAt": "2025-01-22T10:00:00Z"
}

// ippa_evaluations.activity_scores
{
  "activities": [
    {
      "icfCode": "d450",
      "importance": 5,
      "preDifficulty": 5,
      "postDifficulty": 2,
      "improvement": 15,
      "effectivenessScore": 15
    }
  ],
  "totalPreScore": 114,
  "totalPostScore": 65,
  "totalImprovement": 49,
  "avgPreScore": 16.3,
  "avgPostScore": 9.3,
  "avgImprovement": 7.0
}
```

### 5. API 수정

#### ICF 코드 조회 API
**파일**: `app/api/consultations/[consultationId]/icf-codes/route.ts`

- `GET /api/consultations/[consultationId]/icf-codes`
- `analysis_results.icf_codes`에서 추출된 ICF 코드 반환
- D-Level 코드만 필터링

#### 상담 단계 API
**파일**: `app/api/consultations/ippa/route.ts`

- `POST /api/consultations/ippa`
- 활동 배열을 받아 `consultations.ippa_activities`에 저장

#### 사후 평가 API
**파일**: `app/api/ippa/route.ts`

- `POST /api/ippa`
- 기존 방식 (단일 활동)과 새로운 방식 (활동별 점수) 모두 지원
- 활동별 점수가 있으면 `activity_scores` JSONB 필드에 저장
- 총계 및 평균 자동 계산

#### 활동 목록 조회 API
**파일**: `app/api/consultations/[consultationId]/ippa-activities/route.ts`

- `GET /api/consultations/[consultationId]/ippa-activities`
- 상담 단계에서 저장한 활동 목록 반환

### 6. 통계 페이지 시각화

**파일**: `components/admin/admin-ippa-stats.tsx`, `components/admin/ippa-evaluation-detail.tsx`

**기능**:
1. **활동별 통계**: ICF 활동별 평균 개선도 표시
2. **개별 평가 목록**: 활동별 점수가 있는 평가 목록 표시
3. **평가 상세 보기**: 
   - 활동별 Before/After 바 차트
   - 개선 점수 순위 차트
   - 상세 평가 테이블 (PDF 양식과 동일한 구조)
   - 총계 및 평균 요약 카드

**통계 API 수정**: `app/api/admin/ippa-stats/route.ts`
- 활동별 통계 계산 추가
- 개별 평가 목록 반환

## 사용 흐름

1. **상담 단계**:
   - 사용자가 채팅으로 상담 내용 입력
   - AI가 상담 내용을 분석하여 ICF 코드 추출 (`analysis_results.icf_codes`)
   - ICF 분석 완료 후 K-IPPA 상담 폼 표시
   - **추출된 ICF D-Level 코드를 기반으로** 중요도 및 어려운 정도 점수 입력
   - 데이터는 `consultations.ippa_activities`에 저장

2. **사후 평가 단계**:
   - 사용자가 보조기기 사용 후 평가 페이지 접근
   - 상담 단계에서 저장한 활동 점수 자동 로드
   - 각 활동의 사후 어려움 점수 입력
   - 데이터는 `ippa_evaluations.activity_scores`에 저장

3. **통계 확인**:
   - 관리자가 `/admin/logs` 페이지에서 통계 확인
   - 활동별 통계 및 개별 평가 상세 보기

## 기존 시스템과의 통합

- **ICF 코드 추출**: 기존 `app/api/chat/route.ts`의 AI 분석 로직 활용
- **ISO 매칭**: 기존 `core/matching/iso-mapping.ts` 활용
- **데이터 저장**: 기존 `analysis_results` 테이블 활용

## 주요 특징

1. **기존 컨셉 유지**: 사용자가 직접 ICF 코드를 선택하지 않고, AI가 추출
2. **자동화**: 상담 내용에서 자동으로 ICF 코드 추출 및 매칭
3. **하위 호환성**: 기존 단일 활동 평가 방식과 완전 호환
4. **실시간 계산**: 점수 입력 시 즉시 개선도 계산 및 미리보기
5. **시각화**: 차트와 테이블을 통한 직관적인 결과 표시

