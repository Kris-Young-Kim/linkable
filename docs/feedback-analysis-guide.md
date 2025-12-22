# 피드백 데이터 분석 시스템 가이드

## 개요

피드백 데이터 분석 시스템은 사용자 피드백, 클릭률, 구매 전환율을 기반으로 AI 매칭 품질을 평가합니다.

## 분석 항목

### 1. 종합 매칭 품질 점수

**목적**: 여러 지표를 종합하여 매칭 품질을 0-100 점수로 평가

**계산식**:
```
종합 점수 = (피드백 점수 × 30%) + (효과성 점수 × 30%) + (클릭률 점수 × 20%) + (구매율 점수 × 20%)
```

**세부 계산**:
- 피드백 점수: `(평균 피드백 점수 / 5.0) × 100` (1-5점을 0-100으로 변환)
- 효과성 점수: `(평균 효과성 점수 / 20) × 100` (최대 20점 기준)
- 클릭률 점수: `클릭률 × 4` (25% 클릭률 = 100점)
- 구매율 점수: `구매 전환율 × 10` (10% 전환율 = 100점)

**등급**:
- 80점 이상: 우수
- 60-79점: 양호
- 40-59점: 보통
- 40점 미만: 개선 필요

### 2. 상담 피드백 분석

**데이터 소스**: `consultation_feedback` 테이블

**측정 항목**:
- 평균 피드백 점수 (1-5점)
- 점수 분포 (1점, 2점, 3점, 4점, 5점별 개수 및 비율)

**의미**:
- 높은 평균 점수: ICF 분석이 정확하다는 사용자 평가
- 낮은 평균 점수: 매칭 품질 개선 필요

### 3. K-IPPA 효과성 점수 분석

**데이터 소스**: `ippa_evaluations` 테이블

**측정 항목**:
- 평균 효과성 점수: `(사전 점수 - 사후 점수) × 중요도`
- 효과성 점수 분포:
  - 높음 (≥10점): 상당한 개선
  - 중간 (5-10점): 적절한 개선
  - 낮음 (0-5점): 미미한 개선
  - 음수 (<0점): 악화

**의미**:
- 높은 효과성 점수: 추천된 보조기기가 실제로 도움이 됨
- 낮은 효과성 점수: 매칭 정확도 개선 필요

### 4. 클릭률 기반 매칭 품질 평가

**데이터 소스**: `recommendations` 테이블

**측정 항목**:
- 클릭률: `(클릭된 추천 수 / 전체 추천 수) × 100`
- 목표: 25% 이상

**의미**:
- 높은 클릭률: 추천이 사용자의 관심을 끔
- 낮은 클릭률: 추천 관련성 개선 필요

### 5. 구매 전환율 기반 매칭 품질 평가

**데이터 소스**: `conversion_events`, `recommendations` 테이블

**측정 항목**:
- 구매 전환율: `(구매 완료 수 / 클릭된 추천 수) × 100`
- 총 구매 금액
- 평균 구매 금액

**의미**:
- 높은 전환율: 추천이 실제 구매로 이어짐
- 낮은 전환율: 추천 품질 또는 가격 경쟁력 개선 필요

### 6. ICF 코드별 피드백 점수 분석

**데이터 소스**: `consultation_icf_codes`, `consultation_feedback` 테이블

**측정 항목**:
- ICF 코드별 평균 피드백 점수
- ICF 코드별 피드백 개수

**의미**:
- 특정 ICF 코드의 피드백이 낮으면 해당 코드의 매칭 로직 개선 필요
- 상위 ICF 코드는 잘 작동하는 매칭 패턴 파악 가능

### 7. ISO 코드별 피드백 점수 분석

**데이터 소스**: `recommendations`, `products`, `consultation_feedback` 테이블

**측정 항목**:
- ISO 코드별 평균 피드백 점수
- ISO 코드별 클릭률
- ISO 코드별 구매 전환율
- ISO 코드별 추천 개수

**의미**:
- 특정 ISO 코드의 성과가 낮으면 해당 코드의 상품 품질 또는 매칭 로직 개선 필요
- 상위 ISO 코드는 성공적인 매칭 패턴 파악 가능

## API 엔드포인트

### GET /api/admin/analytics/feedback-analysis

피드백 데이터 분석 결과를 조회합니다.

**쿼리 파라미터**:
- `dateRange`: 측정 기간 (7days, 30days, 90days) - 기본값: 30days

**응답 예시**:
```json
{
  "summary": {
    "overallMatchingQuality": 72.5,
    "averageFeedbackRating": 4.2,
    "averageEffectivenessScore": 8.5,
    "clickThroughRate": 23.5,
    "purchaseConversionRate": 5.2
  },
  "metrics": {
    "consultationFeedback": {
      "total": 150,
      "average": 4.2,
      "distribution": {
        "1": 5,
        "2": 10,
        "3": 25,
        "4": 50,
        "5": 60
      }
    },
    "ippaEvaluation": {
      "total": 80,
      "average": 8.5,
      "distribution": {
        "negative": 2,
        "low": 10,
        "medium": 30,
        "high": 38
      }
    },
    "recommendations": {
      "total": 500,
      "clicked": 118,
      "clickRate": 23.5
    },
    "purchases": {
      "total": 6,
      "conversionRate": 5.2,
      "totalAmount": 1200000
    }
  },
  "icfCodeFeedback": [
    {
      "code": "b210",
      "name": "시각 기능",
      "category": "b",
      "averageRating": 4.5,
      "feedbackCount": 20
    }
  ],
  "isoCodeFeedback": [
    {
      "code": "15 09",
      "averageFeedbackRating": 4.3,
      "feedbackCount": 15,
      "clickRate": 25.0,
      "purchaseRate": 6.0,
      "recommendationCount": 60
    }
  ],
  "dailyStats": [
    {
      "date": "2025-02-01",
      "feedbackRating": 4.2,
      "effectivenessScore": 8.5,
      "clickRate": 23.5,
      "purchaseRate": 5.2
    }
  ],
  "dateRange": "30days",
  "timestamp": "2025-02-20T10:00:00Z"
}
```

## 관리자 대시보드

관리자 대시보드(`/admin/dashboard`)에서 "피드백 데이터 분석" 섹션을 통해 다음 정보를 확인할 수 있습니다:

1. **종합 매칭 품질 점수**: 전체 매칭 품질을 한눈에 파악
2. **주요 지표**: 평균 피드백 점수, 효과성 점수, 클릭률, 구매 전환율
3. **피드백 분포**: 상담 피드백 및 효과성 점수 분포 시각화
4. **ICF 코드별 분석**: 상위 20개 ICF 코드의 평균 피드백 점수
5. **ISO 코드별 분석**: ISO 코드별 매칭 품질 통계
6. **일별 추이**: 최근 30일간의 지표 추이

## 측정 스크립트

### 사용법

```bash
# 최근 30일 피드백 분석
tsx scripts/tests/measure-feedback-analysis.ts

# 최근 7일 피드백 분석
tsx scripts/tests/measure-feedback-analysis.ts 7days

# 최근 90일 피드백 분석
tsx scripts/tests/measure-feedback-analysis.ts 90days
```

### 결과 저장

- `scripts/tests/results/feedback-analysis-{timestamp}.json`: 타임스탬프가 포함된 결과 파일
- `scripts/tests/results/feedback-analysis-latest.json`: 최신 결과 파일

### 종료 코드

- `0`: 매칭 품질이 목표 수준 이상 (60점 이상)
- `1`: 매칭 품질이 목표 수준 이하 (60점 미만)

## 개선 전략

### 종합 점수가 낮은 경우

1. **피드백 점수가 낮으면**:
   - ICF 코드 추출 정확도 개선
   - 사용자 입력 분석 로직 개선
   - 피드백 수집 강화

2. **효과성 점수가 낮으면**:
   - ISO 매칭 정확도 개선
   - 상품 추천 로직 개선
   - 사용자 컨텍스트 반영 강화

3. **클릭률이 낮으면**:
   - 추천 카드 UI 개선
   - 추천 사유 명확화
   - CTA 버튼 최적화

4. **구매 전환율이 낮으면**:
   - 가격 경쟁력 개선
   - 상품 정보 품질 향상
   - 구매 프로세스 간소화

## 참고 파일

- `app/api/admin/analytics/feedback-analysis/route.ts`: 피드백 분석 API
- `components/admin/feedback-analysis-dashboard.tsx`: 피드백 분석 대시보드 UI
- `scripts/tests/measure-feedback-analysis.ts`: 피드백 분석 측정 스크립트
- `docs/feedback-analysis-guide.md`: 이 문서

