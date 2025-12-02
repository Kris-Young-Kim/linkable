# Analytics & Metrics 요구사항 명세

## 개요

이 문서는 LinkAble 플랫폼의 Analytics 대시보드 요구사항을 정의합니다. 관리자와 사용자가 플랫폼의 성과를 추적하고 이해할 수 있도록 필요한 메트릭, 데이터 수집 전략, 시각화 요구사항을 명시합니다.

## 목적

- 플랫폼의 핵심 성과 지표(KPI) 추적
- 사용자 행동 패턴 분석
- 추천 시스템의 효과성 측정
- K-IPPA 평가 참여율 모니터링
- 데이터 기반 의사결정 지원

## 현재 구현 상태

### 구현된 메트릭

#### 1. 추천 정확도 (클릭률)
- **정의**: 클릭된 추천 수 / 전체 추천 수 × 100
- **데이터 소스**: `recommendations` 테이블 (`is_clicked` 필드)
- **API**: `GET /api/admin/analytics`, `GET /api/analytics`
- **표시 위치**: 관리자 대시보드, 사용자 대시보드

#### 2. K-IPPA 참여율
- **정의**: 평가 제출 수 / 클릭된 추천 수 × 100
- **데이터 소스**: `ippa_evaluations` 테이블
- **API**: `GET /api/admin/analytics`, `GET /api/analytics`
- **표시 위치**: 관리자 대시보드, 사용자 대시보드

#### 3. 상담 완료율
- **정의**: 완료된 상담 수 / 전체 상담 수 × 100
- **데이터 소스**: `consultations` 테이블 (`status` 필드)
- **API**: `GET /api/admin/analytics`, `GET /api/analytics`
- **표시 위치**: 관리자 대시보드, 사용자 대시보드

#### 4. 평균 효과성 점수
- **정의**: 모든 K-IPPA 평가의 평균 `effectiveness_score`
- **데이터 소스**: `ippa_evaluations` 테이블
- **API**: `GET /api/admin/analytics`, `GET /api/analytics`
- **표시 위치**: 관리자 대시보드, 사용자 대시보드

#### 5. 최근 30일 활동
- **정의**: 최근 30일간 생성된 추천 수 및 평가 수
- **데이터 소스**: `recommendations`, `ippa_evaluations` 테이블
- **API**: `GET /api/admin/analytics`, `GET /api/analytics`
- **표시 위치**: 관리자 대시보드, 사용자 대시보드

### 구현된 컴포넌트

- `components/analytics-dashboard.tsx`: 기본 Analytics 대시보드 컴포넌트
- `app/api/admin/analytics/route.ts`: 관리자용 Analytics API
- `app/api/analytics/route.ts`: 사용자용 Analytics API

## 추가 필요한 메트릭

### 1. 시간별 트렌드 분석

#### 1.1 일별/주별/월별 트렌드
- **목적**: 시간에 따른 활동 패턴 파악
- **메트릭**:
  - 일별 추천 생성 수
  - 일별 K-IPPA 평가 제출 수
  - 주별 상담 완료 수
  - 월별 사용자 증가율
- **데이터 소스**: `recommendations.created_at`, `ippa_evaluations.evaluated_at`, `consultations.created_at`
- **시각화**: 라인 차트 또는 바 차트

#### 1.2 시간대별 활동 패턴
- **목적**: 사용자의 활동 시간대 파악
- **메트릭**: 시간대별 상담 시작 수, 추천 클릭 수
- **데이터 소스**: `consultations.created_at`, `recommendations` (클릭 시간 필요)
- **시각화**: 히트맵 또는 바 차트

### 2. 사용자별 상세 통계

#### 2.1 사용자별 활동 요약
- **목적**: 개별 사용자의 활동 패턴 분석
- **메트릭**:
  - 사용자별 상담 수
  - 사용자별 추천 수
  - 사용자별 K-IPPA 평가 수
  - 사용자별 평균 효과성 점수
  - 사용자별 포인트 현황
- **데이터 소스**: `users`, `consultations`, `recommendations`, `ippa_evaluations`
- **표시 위치**: 관리자 대시보드 (`/admin/usersstat`)

#### 2.2 사용자 그룹별 통계
- **목적**: 사용자 세그먼트별 성과 비교
- **메트릭**:
  - 역할별 통계 (user, expert, admin)
  - 활성 사용자 vs 비활성 사용자
  - 신규 사용자 vs 기존 사용자
- **데이터 소스**: `users.role`, `users.created_at`
- **시각화**: 그룹별 비교 차트

### 3. 상품별 통계

#### 3.1 상품별 추천 및 클릭 통계
- **목적**: 인기 상품 파악 및 상품 성과 분석
- **메트릭**:
  - 상품별 추천 횟수
  - 상품별 클릭 횟수
  - 상품별 클릭률
  - 상품별 평균 효과성 점수
- **데이터 소스**: `products`, `recommendations`, `ippa_evaluations`
- **표시 위치**: 관리자 대시보드 (`/admin/products`)

#### 3.2 ISO 코드별 매칭 통계
- **목적**: ISO 코드별 추천 정확도 분석
- **메트릭**:
  - ISO 코드별 추천 횟수
  - ISO 코드별 클릭률
  - ISO 코드별 평균 효과성 점수
- **데이터 소스**: `products.iso_code`, `recommendations`, `ippa_evaluations`
- **시각화**: 테이블 또는 트리맵

### 4. ICF 코드별 매칭 정확도

#### 4.1 ICF 코드별 추천 성과
- **목적**: ICF 코드 추출 및 매칭 품질 평가
- **메트릭**:
  - ICF 코드별 추출 빈도
  - ICF 코드별 추천 생성 수
  - ICF 코드별 클릭률
  - ICF 코드별 평균 효과성 점수
- **데이터 소스**: `analysis_results.icf_codes`, `recommendations`, `ippa_evaluations`
- **시각화**: 히트맵 또는 트리맵

#### 4.2 ICF 카테고리별 통계
- **목적**: 신체기능(b), 활동(d), 환경(e) 카테고리별 분석
- **메트릭**: 각 카테고리별 추출 빈도 및 성과
- **데이터 소스**: `analysis_results.icf_codes`
- **시각화**: 파이 차트 또는 바 차트

### 5. 전환율 분석

#### 5.1 사용자 여정 전환율
- **목적**: 각 단계별 전환율 파악
- **메트릭**:
  - 상담 시작 → 완료 전환율
  - 상담 완료 → 추천 생성 전환율
  - 추천 생성 → 클릭 전환율
  - 클릭 → K-IPPA 평가 전환율
- **데이터 소스**: `consultations`, `recommendations`, `ippa_evaluations`
- **시각화**: 퍼널 차트

#### 5.2 이탈 지점 분석
- **목적**: 사용자가 이탈하는 지점 파악
- **메트릭**: 각 단계별 이탈률
- **데이터 소스**: `consultations`, `recommendations`, `ippa_evaluations`
- **시각화**: 퍼널 차트 또는 바 차트

## 데이터 수집 전략

### 1. 실시간 수집

현재 구현된 메트릭은 실시간으로 계산됩니다:
- API 호출 시점에 데이터베이스에서 직접 집계
- 장점: 최신 데이터 보장
- 단점: 대량 데이터 처리 시 성능 저하 가능

### 2. 배치 집계 (권장)

향후 구현 권장 사항:
- **일별 집계**: 매일 자정에 전날 데이터 집계
- **주별 집계**: 매주 월요일에 전주 데이터 집계
- **월별 집계**: 매월 1일에 전월 데이터 집계

**구현 방법**:
- Supabase Materialized View 사용
- 또는 별도 집계 테이블 생성 (`kpi_daily_stats`, `kpi_weekly_stats`, `kpi_monthly_stats`)
- Vercel Cron Job으로 주기적 갱신

### 3. 데이터 보관 정책

- **원본 데이터**: 무기한 보관
- **집계 데이터**: 최소 1년 보관
- **로그 데이터**: 90일 보관 (선택적)

## 시각화 요구사항

### 1. 차트 타입

#### 1.1 KPI 카드
- **용도**: 주요 메트릭 요약 표시
- **구성**: 제목, 값, 변화율(선택적), 아이콘
- **예시**: 추천 정확도, K-IPPA 참여율

#### 1.2 라인 차트
- **용도**: 시간에 따른 트렌드 표시
- **데이터**: 일별/주별/월별 시계열 데이터
- **예시**: 최근 30일 추천 생성 추이

#### 1.3 바 차트
- **용도**: 카테고리별 비교
- **데이터**: ISO 코드별, ICF 코드별 통계
- **예시**: ISO 코드별 추천 횟수

#### 1.4 파이 차트
- **용도**: 비율 표시
- **데이터**: 카테고리별 분포
- **예시**: ICF 카테고리별 분포

#### 1.5 퍼널 차트
- **용도**: 전환율 표시
- **데이터**: 사용자 여정 단계별 전환율
- **예시**: 상담 시작 → 완료 → 추천 → 클릭 → 평가

#### 1.6 히트맵
- **용도**: 다차원 데이터 시각화
- **데이터**: 시간대별 × 활동 유형
- **예시**: 시간대별 상담 시작 수

### 2. 필터 옵션

#### 2.1 기간 선택
- 오늘
- 최근 7일
- 최근 30일
- 최근 90일
- 최근 1년
- 사용자 지정 (날짜 범위 선택)

#### 2.2 사용자 그룹 필터
- 전체 사용자
- 활성 사용자 (최근 30일 활동)
- K-IPPA 평가 완료 사용자
- 역할별 필터 (user, expert, admin)

#### 2.3 정렬 옵션
- 날짜순 (최신순/오래된순)
- 값순 (높은순/낮은순)
- 이름순

### 3. 인터랙티브 기능

- **드릴다운**: 차트 클릭 시 상세 데이터 표시
- **호버 툴팁**: 데이터 포인트에 마우스 오버 시 상세 정보 표시
- **확대/축소**: 차트 영역 확대 및 축소
- **데이터 내보내기**: CSV/Excel 형식으로 데이터 다운로드

## 성능 최적화

### 1. 데이터베이스 최적화

#### 1.1 인덱스 추가
```sql
-- 추천 조회 성능 향상
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at);
CREATE INDEX idx_recommendations_is_clicked ON recommendations(is_clicked);

-- 평가 조회 성능 향상
CREATE INDEX idx_ippa_evaluations_evaluated_at ON ippa_evaluations(evaluated_at);
CREATE INDEX idx_ippa_evaluations_recommendation_id ON ippa_evaluations(recommendation_id);

-- 상담 조회 성능 향상
CREATE INDEX idx_consultations_created_at ON consultations(created_at);
CREATE INDEX idx_consultations_status ON consultations(status);
```

#### 1.2 Materialized View 생성
- 일별/주별/월별 집계 데이터를 Materialized View로 저장
- 주기적으로 갱신 (매일 자정)
- 쿼리 성능 대폭 향상

### 2. API 최적화

#### 2.1 캐싱
- Redis 또는 메모리 캐시 사용
- 캐시 TTL: 5분 (실시간성 요구)
- 또는 1시간 (배치 집계 사용 시)

#### 2.2 페이지네이션
- 대량 데이터 조회 시 페이지네이션 적용
- 기본 페이지 크기: 50개
- 최대 페이지 크기: 500개

### 3. 프론트엔드 최적화

- **로딩 상태**: 스켈레톤 UI 표시
- **에러 처리**: 사용자 친화적 에러 메시지
- **재시도 로직**: 네트워크 오류 시 자동 재시도

## 보안 및 접근 제어

### 1. 권한 관리

- **관리자 대시보드**: `admin` 또는 `expert` 역할만 접근 가능
- **사용자 대시보드**: 본인 데이터만 조회 가능
- **API 인증**: Clerk 세션 기반 인증

### 2. 데이터 개인정보 보호

- 사용자 개인정보는 익명화하여 표시
- 집계 데이터만 공개
- 개별 사용자 식별 정보는 관리자만 접근 가능

## 구현 우선순위

### Phase 1 (현재 완료)
- ✅ 기본 KPI 메트릭 구현
- ✅ 관리자/사용자 대시보드 기본 UI
- ✅ 실시간 데이터 집계

### Phase 2 (다음 단계)
- [ ] 시간별 트렌드 분석 (일별/주별/월별)
- [ ] 사용자별 상세 통계
- [ ] 상품별 통계
- [ ] 필터 기능 구현

### Phase 3 (향후)
- [ ] ICF 코드별 매칭 정확도
- [ ] 전환율 분석 (퍼널 차트)
- [ ] 배치 집계 시스템
- [ ] 데이터 내보내기 기능

## 참고 자료

- `app/api/admin/analytics/route.ts` - 관리자 Analytics API
- `app/api/analytics/route.ts` - 사용자 Analytics API
- `components/analytics-dashboard.tsx` - Analytics 대시보드 컴포넌트
- `components/admin/admin-dashboard-content.tsx` - 관리자 대시보드
- `docs/TODO.md` - 전체 개발 계획

