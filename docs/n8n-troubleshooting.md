# n8n 워크플로우 문제 해결 가이드

## "No property named 'body' exists!" 에러 해결

### 문제 원인

HTML Extract 노드가 HTTP Request 노드의 출력에서 `body` 속성을 찾지 못할 때 발생합니다.

### 해결 방법

#### 방법 1: HTTP Request 노드의 출력 구조 확인

1. **"쿠팡검색페이지" 노드 클릭**
2. **"Execute step" 버튼 클릭**
3. **OUTPUT 패널 확인**
   - `body` 속성이 있는지 확인
   - 또는 `data` 속성에 HTML이 있는지 확인

#### 방법 2: HTML Extract 노드의 Source Data 설정 수정

**옵션 A: `body` 대신 `data` 사용**

1. **"상품 정보 추출" 노드 클릭**
2. **Parameters 탭에서:**
   - **Source Data**: `JSON` 선택
   - **Data Property Name**: `body` → `data`로 변경
   - 또는 Expression 모드로 변경: `={{ $json.data }}`

**옵션 B: Expression으로 직접 지정**

1. **"상품 정보 추출" 노드 클릭**
2. **Parameters 탭에서:**
   - **Source Data**: `Expression` 선택
   - **Data Property Name**: `={{ $json.body || $json.data || $json }}` 입력

#### 방법 3: 쿠팡 파트너스 페이지 특성 고려

쿠팡 파트너스 페이지(`https://partners.coupang.com`)는 JavaScript로 동적 로딩을 사용하는 SPA입니다. 일반 HTTP Request로는 완전한 HTML을 가져오기 어려울 수 있습니다.

**대안 1: Playwright 노드 사용**

1. **HTTP Request 노드 대신 Playwright 노드 사용**
2. **Playwright 노드 설정:**
   - **Operation**: `Extract Data from Website` 선택
   - **URL**: `https://partners.coupang.com/#affiliate/ws/link/0/%EB%B3%B4%EC%A1%B0%EA%B8%B0%EA%B8%B0`
   - **Wait for Selector**: 페이지 로딩 대기 셀렉터 입력
   - **Wait Time**: `5000` (5초)

**대안 2: 일반 쿠팡 검색 페이지 사용**

쿠팡 파트너스 대신 일반 쿠팡 검색 페이지를 사용:

```
https://www.coupang.com/np/search?q=보조기기&channel=user
```

이 페이지는 서버 사이드 렌더링을 사용하므로 HTTP Request로 HTML을 가져올 수 있습니다.

### 실제 해결 단계 (현재 상황)

1. **"쿠팡검색페이지" 노드에서 OUTPUT 확인**
   - `body` 속성이 있는지 확인
   - 없다면 `data` 속성 확인

2. **"상품 정보 추출" 노드 설정 수정**
   - **Source Data**: `JSON` 선택
   - **Data Property Name**: 
     - 먼저 `data` 시도
     - 안 되면 Expression 모드: `={{ $json.body || $json.data || $json }}`

3. **테스트**
   - "Execute step" 버튼 클릭
   - OUTPUT에서 에러가 사라졌는지 확인

### 쿠팡 파트너스 페이지 스크래핑 제한사항

쿠팡 파트너스 페이지는:
- JavaScript로 동적 로딩
- 로그인 필요할 수 있음
- 봇 차단 가능

**권장 방법**: 일반 쿠팡 검색 페이지(`www.coupang.com/np/search`) 사용

