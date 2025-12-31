# ICF-ISO-Products 매칭 시스템 고도화 방안

## 현재 시스템 분석

### 문제점
1. **ICF-ISO 매칭 점수만 사용**: 제품 랭킹에 ICF→ISO 점수만 반영되고, 제품 자체의 ICF 연결 강도가 고려되지 않음
2. **ISO 코드 부정확성**: 크롤링 데이터의 ISO 코드가 부정확하거나 누락될 수 있음
3. **ICF 코드 조합 의미 미반영**: 여러 ICF 코드가 함께 나타날 때의 복합적 의미가 제품 선택에 충분히 반영되지 않음
4. **제품-ICF 직접 연결 부재**: 제품명/설명과 ICF 코드의 직접적인 연결이 약함

## 개선 방안

### 1. 제품-ICF 직접 매칭 시스템 (Product-ICF Direct Matching)

**목적**: ISO 코드를 우회하여 제품명/설명에서 직접 ICF 코드를 추론하고 매칭

**구현 방법**:
- 제품명/설명/카테고리에서 ICF 코드 키워드 추출
- AI 기반 의미론적 매칭 (제품 설명 → ICF 코드)
- 제품-ICF 직접 매칭 점수 계산

**점수 계산**:
```
product_icf_score = (
  keyword_match_score * 0.4 +
  semantic_match_score * 0.4 +
  category_match_score * 0.2
)
```

**장점**:
- ISO 코드가 부정확한 제품도 정확히 매칭 가능
- 제품의 실제 기능과 ICF 코드를 직접 연결
- 크롤링 데이터의 품질 문제 보완

### 2. 다층 매칭 점수 시스템 (Multi-Layer Matching Score)

**목적**: ICF→ISO 점수와 제품→ICF 점수를 결합하여 더 정확한 매칭

**점수 계산**:
```
final_match_score = (
  icf_to_iso_score * 0.5 +      // ICF → ISO 매칭 점수
  product_to_icf_score * 0.4 +  // 제품 → ICF 직접 매칭 점수
  product_quality_score * 0.1   // 제품 품질 점수 (가격, 리뷰 등)
)
```

**구현 단계**:
1. ICF→ISO 매칭 점수 (기존)
2. 제품→ICF 직접 매칭 점수 (신규)
3. 두 점수를 가중 평균하여 최종 점수 계산

### 3. ICF 코드 조합 의미 강화 (ICF Combination Semantics)

**목적**: 여러 ICF 코드가 함께 나타날 때의 복합적 의미를 정확히 반영

**예시**:
- `b210` (시각) + `d450` (보행) → 시각 장애인의 보행 보조기기
- `b230` (청각) + `d3` (의사소통) → 청각 장애인의 의사소통 보조기기

**구현 방법**:
- ICF 코드 조합 패턴 학습
- 조합별 우선 ISO 코드 매핑 테이블 구축
- 조합 의미를 반영한 가중치 적용

**점수 보너스**:
```
combination_bonus = (
  combination_frequency * 0.3 +
  combination_success_rate * 0.4 +
  combination_expert_validation * 0.3
)
```

### 4. 제품 검증 시스템 (Product Validation System)

**목적**: 제품의 ISO 코드가 실제 기능과 일치하는지 검증

**검증 항목**:
1. 제품명/설명에서 ISO 코드 관련 키워드 확인
2. 제품 카테고리와 ISO 코드 일치성 확인
3. AI 기반 제품-ISO 코드 일치성 검증

**검증 점수**:
```
validation_score = (
  keyword_match * 0.4 +
  category_match * 0.3 +
  ai_validation * 0.3
)
```

**검증 실패 시**:
- ISO 코드 재추론 시도
- 제품-ICF 직접 매칭으로 폴백
- 관리자 검토 대상으로 표시

### 5. 컨텍스트 기반 필터링 강화 (Context-Based Filtering)

**목적**: 사용자 상황에 맞지 않는 제품을 더 정확히 제거

**필터링 기준**:
1. **장애 유형 불일치**: 시각 장애인에게 청각 보조기기 제거
2. **중증도 불일치**: 중증 시각 장애인에게 저시력 보조기기 제거
3. **연령대 불일치**: 아동용 제품을 성인에게 제거
4. **환경 불일치**: 실내용 제품을 실외 환경에 제거

**구현 방법**:
- 사용자 프로필 기반 하드 필터
- ICF 코드 중증도 정보 활용
- 제품 메타데이터 (연령대, 환경 등) 활용

### 6. 실시간 학습 시스템 강화 (Enhanced Real-Time Learning)

**목적**: 사용자 피드백을 실시간으로 반영하여 매칭 정확도 향상

**학습 데이터**:
- 클릭률 (CTR)
- 구매 전환율
- 사용자 피드백 (좋아요/싫어요)
- 상담 종료 후 설문 결과

**학습 방법**:
- ICF-ISO-Product 조합별 성공률 추적
- 성공률이 높은 조합에 가중치 부여
- 실패한 조합에 페널티 적용

**가중치 조정**:
```
adjusted_score = base_score * (
  1.0 + (success_rate - 0.5) * 0.3
)
```

## 구현 우선순위

### Phase 1: 핵심 개선 (즉시 구현)
1. ✅ 제품-ICF 직접 매칭 시스템
2. ✅ 다층 매칭 점수 시스템
3. ✅ 컨텍스트 기반 필터링 강화

### Phase 2: 고도화 (1-2주 내)
4. ✅ ICF 코드 조합 의미 강화
5. ✅ 제품 검증 시스템

### Phase 3: 최적화 (2-4주 내)
6. ✅ 실시간 학습 시스템 강화
7. ✅ A/B 테스트 및 성능 모니터링

## 예상 효과

1. **매칭 정확도 향상**: 30-50% 개선 예상
2. **부적절한 추천 감소**: 60-80% 감소 예상
3. **사용자 만족도 향상**: 클릭률 및 전환율 20-30% 향상 예상
4. **데이터 품질 개선**: ISO 코드 부정확성 문제 해결

## 기술 스택

- **AI 모델**: Gemini API (의미론적 매칭)
- **벡터 DB**: Supabase pgvector (유사도 검색)
- **학습 시스템**: 실시간 통계 기반 가중치 조정
- **검증 시스템**: 규칙 기반 + AI 기반 하이브리드

## 데이터베이스 스키마 추가

### `product_icf_mappings` 테이블
```sql
CREATE TABLE product_icf_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  icf_code VARCHAR(50) NOT NULL,
  match_score DECIMAL(3, 2) NOT NULL, -- 0.0-1.0
  match_method VARCHAR(50) NOT NULL, -- 'keyword', 'semantic', 'ai', 'manual'
  confidence_score DECIMAL(3, 2) DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, icf_code)
);
```

### `icf_combination_patterns` 테이블
```sql
CREATE TABLE icf_combination_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icf_codes TEXT[] NOT NULL,
  icf_codes_key TEXT NOT NULL, -- 정렬된 코드를 쉼표로 연결
  preferred_iso_codes TEXT[] NOT NULL,
  combination_meaning TEXT,
  frequency INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 4) DEFAULT 0.0,
  expert_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(icf_codes_key)
);
```

## 다음 단계

1. 제품-ICF 직접 매칭 모듈 구현
2. 다층 매칭 점수 시스템 통합
3. 데이터베이스 스키마 추가 및 마이그레이션
4. 테스트 및 검증
5. 프로덕션 배포 및 모니터링
