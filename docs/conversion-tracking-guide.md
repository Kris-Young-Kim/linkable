# 전환율 추적 가이드

## 목적

전환율 추적 시스템은 추천 CTA 클릭부터 전문가 상담까지 구매 전환율을 추적하여 관리자 대시보드에 표시합니다.

## 추적 항목

### 1. 추천 CTA 클릭율(목표: 25%)

**정의**: 전체 추천 중 사용자가 클릭한 추천의 비율

**계산식**: `(클릭된 추천 수 / 전체 추천 수) × 100`

**구현 방법**:
- 사용자가 추천 카드에서 "구매하러 가기" 또는 "상세보기" 버튼 클릭
- `/api/recommendations/[id]/click` API 호출
- `recommendations.is_clicked` 필드 업데이트
- `conversion_events` 테이블에 `recommendation_click` 이벤트 기록

### 2. 전문가 상담율(목표: 10%)

**정의**: 클릭된 추천 중 전문가 상담을 클릭한 비율

**계산식**: `(전문가 상담 클릭 수 / 클릭된 추천 수) × 100`

**구현 방법**:
- 추천 카드에서 "전문가 상담" 버튼 클릭
- `/api/recommendations/[id]/action` API 호출 (action: "expert_inquiry_click")
- `conversion_events` 테이블에 `expert_inquiry_click` 이벤트 기록

### 3. 구매 전환율

**정의**: 클릭된 추천 중 실제 구매로 이어졌는지 추적

**계산식**: `(구매 완료 수 / 클릭된 추천 수) × 100`

**구현 방법**:
- 네이버 파트너스 Postback: `/api/webhooks/naver/purchase`
- Meta Pixel: `/api/webhooks/meta/purchase`
- `conversion_events` 테이블에 `purchase_completed` 이벤트 기록
- `recommendations.purchase_completed` 필드 업데이트

## API 엔드포인트

### GET /api/admin/analytics/conversion-rates

전환율 추적 데이터를 조회합니다.

**쿼리 파라미터**:
- `dateRange`: 추적 기간 (7days, 30days, 90days) - 기본값: 30days

**응답 예시**:
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

## 관리자 대시보드

관리자 대시보드(`/admin/dashboard`)에서 "전환율 추적" 섹션을 통해 다음 항목을 확인할 수 있습니다:

1. **목표 달성 전환율**: 각 전환율의 목표 대비 현재 상태
2. **전환 퍼널**: 상담 → 추천 → 클릭 → 상담/구매 단계별 전환율
3. **시간별 추이**: 최근 30일간의 클릭 및 구매 전환율 추이
4. **구매 통계**: 총 구매 건수, 금액, 평균 구매 금액, 수수료

## 추적 테스트 스크립트

### 사용법

```bash
# 최근 30일 전환율 추적
tsx scripts/tests/measure-conversion-rates.ts

# 최근 7일 전환율 추적
tsx scripts/tests/measure-conversion-rates.ts 7days
```

### 결과 파일

- `scripts/tests/results/conversion-rates-{timestamp}.json`: 타임스탬프가 포함된 결과 파일
- `scripts/tests/results/conversion-rates-latest.json`: 최신 결과 파일

## 구매 전환율 구현

### 네이버 파트너스 Postback 연동

1. **Postback URL 설정**
   - 네이버 파트너스 대시보드에 Postback URL을 설정
   - URL: `https://your-domain.com/api/webhooks/naver/purchase`

2. **구매 완료 시 자동 호출**
   - 네이버에서 구매 완료 시 POST 요청 전송
   - `orderId`, `productId`, `purchaseAmount` 등 포함

3. **매칭 로직**
   - `linkId` 또는 `productId`로 `recommendations` 테이블에서 추천 찾기
   - `is_clicked = true`인 추천만 매칭
   - 매칭 성공 시 `conversion_events`에 `purchase_completed` 이벤트 기록

### Meta Pixel 연동

1. **Purchase 이벤트 구현**
   - Meta Pixel에서 Purchase 이벤트 발생 시 `/api/webhooks/meta/purchase` 호출
   - `orderId`, `productIds`, `value` 등 포함

2. **매칭 로직**
   - `productIds`로 `recommendations` 테이블에서 추천 찾기
   - `is_clicked = true`인 추천만 매칭

## 개선 방법

### 추천 CTA 클릭율 개선

1. **CTA 버튼 최적화**
   - 버튼 색상: 밝은, 어두운, 대비 A/B 테스트
   - 버튼 텍스트: "구매하러 가기", "지금 바로 확인", "전문가 상담" 등 테스트
   - 버튼 크기/위치: 눈에 띄는 위치

2. **추천 카드 개선**
   - 제품 이미지 최적화
   - 가격 정보 명확히 표시
   - 리뷰/평점 표시 (가능한 경우)

### 전문가 상담율 개선

1. **전문가 상담 버튼 강조**
   - 버튼 색상 및 아이콘 개선
   - "무료 상담" 같은 문구 추가

2. **전문가 상담 프로세스 간소화**
   - 간단한 폼 작성
   - 즉시 상담 가능 여부 표시

### 구매 전환율 개선

1. **리마케팅 캠페인**
   - 7일 리마케팅 캠페인 (클릭 유도)
   - 14일 리마케팅 캠페인 (K-IPPA 피드백)

2. **알림 기능**
   - 사용자에게 구매 유도 알림
   - 네이버 쿠폰 할인 정보 제공

## 참고 파일

- `app/api/admin/analytics/conversion-rates/route.ts`: 전환율 추적 API
- `components/admin/conversion-rates-dashboard.tsx`: 전환율 대시보드 컴포넌트
- `scripts/tests/measure-conversion-rates.ts`: 전환율 추적 테스트 스크립트
- `app/api/webhooks/naver/purchase/route.ts`: 네이버 Postback 엔드포인트
- `app/api/webhooks/meta/purchase/route.ts`: Meta Pixel 엔드포인트
- `app/api/recommendations/[id]/click/route.ts`: 추천 클릭 구현
- `app/api/recommendations/[id]/action/route.ts`: 액션 이벤트 구현

## 데이터베이스 스키마

### conversion_events 테이블

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

### recommendations 테이블(추가 필드)

- `is_clicked`: 클릭 여부
- `purchase_completed`: 구매 완료 여부
- `purchase_completed_at`: 구매 완료 시각
- `purchase_amount`: 구매 금액
