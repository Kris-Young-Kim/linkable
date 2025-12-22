# AI 매칭 품질 측정 시스템

이 디렉토리는 AI 매칭 시스템(ICF 코드 추출 및 ISO 매칭)의 정확도를 측정하는 스크립트와 테스트 케이스를 포함합니다.

## 파일 구조

```
scripts/tests/
├── README.md                           # 이 파일
├── ai-quality-test-cases.json          # 테스트 케이스 데이터 (50개 시나리오)
├── measure-icf-extraction-accuracy.ts # ICF 코드 추출 정확도 측정 스크립트
├── measure-iso-matching-accuracy.ts   # ISO 매칭 정확도 측정 스크립트
└── results/                            # 측정 결과 저장 디렉토리
    ├── icf-extraction-accuracy-latest.json
    └── iso-matching-accuracy-latest.json
```

## 사용 방법

### 1. ICF 코드 추출 정확도 측정

사용자 입력에서 ICF 코드를 추출하는 Gemini API의 정확도를 측정합니다.

```bash
tsx scripts/tests/measure-icf-extraction-accuracy.ts
```

**측정 항목:**
- Precision (정밀도): 추출된 코드 중 실제로 맞는 코드의 비율
- Recall (재현율): 예상 코드 중 실제로 추출된 코드의 비율
- F1 Score: Precision과 Recall의 조화 평균

**결과:**
- `scripts/tests/results/icf-extraction-accuracy-{timestamp}.json`: 타임스탬프가 포함된 결과 파일
- `scripts/tests/results/icf-extraction-accuracy-latest.json`: 최신 결과 파일

### 2. ISO 매칭 정확도 측정

ICF 코드를 기반으로 ISO 9999 보조기기 코드를 매칭하는 시스템의 정확도를 측정합니다.

```bash
tsx scripts/tests/measure-iso-matching-accuracy.ts
```

**측정 항목:**
- Precision, Recall, F1 Score
- Top-1/3/5 정확도: 상위 N개 추천 중 정답이 포함되는 비율
- 매칭 방법별 비교: 규칙 기반, 키워드 기반, 지식 그래프, 하이브리드

**결과:**
- `scripts/tests/results/iso-matching-accuracy-{timestamp}.json`: 타임스탬프가 포함된 결과 파일
- `scripts/tests/results/iso-matching-accuracy-latest.json`: 최신 결과 파일

## 테스트 케이스

`ai-quality-test-cases.json` 파일에는 50개의 테스트 케이스가 포함되어 있습니다:

- **시각**: 3개
- **청각**: 2개
- **의사소통**: 3개
- **인지**: 6개
- **자세**: 3개
- **이동**: 4개
- **식사**: 2개
- **자가관리**: 4개
- **가정생활**: 3개
- **환경**: 4개
- **여가**: 2개
- **복합**: 14개

각 테스트 케이스는 다음 정보를 포함합니다:
- `id`: 테스트 케이스 ID
- `category`: 카테고리
- `userInput`: 사용자 입력 텍스트
- `expectedIcf`: 예상 ICF 코드 (b, d, e 카테고리별)
- `expectedIso`: 예상 ISO 코드
- `description`: 설명

## 관리자 대시보드에서 결과 확인

측정 결과는 관리자 대시보드(`/admin/dashboard`)에서 확인할 수 있습니다.

1. 관리자 권한으로 로그인
2. `/admin/dashboard` 페이지 접속
3. "AI 매칭 품질 측정" 섹션에서 결과 확인

**표시되는 정보:**
- ICF 추출 정확도 (Precision, Recall, F1 Score)
- ISO 매칭 정확도 (Precision, Recall, F1 Score, Top-1/3/5 정확도)
- 카테고리별 통계
- 매칭 방법별 비교

## 목표 정확도

현재 목표 정확도는 다음과 같습니다:

- **ICF 코드 추출**: F1 Score ≥ 0.7 (70%)
- **ISO 매칭**: F1 Score ≥ 0.7 (70%) 또는 Top-3 정확도 ≥ 0.7

## 주의사항

1. **API 호출 비용**: ICF 추출 정확도 측정은 실제 Gemini API를 호출하므로 비용이 발생할 수 있습니다.
2. **실행 시간**: 50개 테스트 케이스를 모두 실행하는 데 약 5-10분이 소요될 수 있습니다.
3. **Rate Limiting**: API 호출 간 1초 딜레이가 포함되어 있습니다.

## 결과 해석

### ICF 추출 정확도

- **Precision이 낮은 경우**: 잘못된 ICF 코드를 많이 추출하고 있음
- **Recall이 낮은 경우**: 예상된 ICF 코드를 놓치고 있음
- **F1 Score가 낮은 경우**: 전체적인 정확도가 부족함

### ISO 매칭 정확도

- **Top-1 정확도**: 첫 번째 추천이 정답인 비율
- **Top-3 정확도**: 상위 3개 추천 중 정답이 포함되는 비율
- **Top-5 정확도**: 상위 5개 추천 중 정답이 포함되는 비율

## 개선 방법

정확도가 목표에 미치지 못하는 경우:

1. **프롬프트 엔지니어링**: `core/assessment/prompt-engineering.ts`의 프롬프트 개선
2. **ICF Validator 규칙 추가**: `core/assessment/icf-validator.ts`에 키워드 규칙 추가
3. **ISO 매핑 규칙 추가**: `core/matching/iso-mapping.ts`에 매핑 규칙 추가
4. **하이브리드 매칭 가중치 조정**: `core/matching/hybrid-matcher.ts`의 가중치 조정

## 관련 파일

- `core/assessment/prompt-engineering.ts`: Gemini 프롬프트 구성
- `core/assessment/parser.ts`: Gemini 응답 파싱
- `core/assessment/icf-validator.ts`: ICF 코드 검증 및 보강
- `core/matching/iso-mapping.ts`: ISO 매핑 규칙
- `core/matching/hybrid-matcher.ts`: 하이브리드 매칭 시스템
- `app/api/admin/analytics/ai-quality/route.ts`: 관리자 대시보드 API
- `components/admin/ai-quality-metrics.tsx`: 관리자 대시보드 UI 컴포넌트

