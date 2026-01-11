# n8n 문제 해결 가이드

## "No property named 'body' exists!" 오류 해결

### 문제 원인

HTML Extract 노드가 HTTP Request 노드의 출력에서 `body` 속성을 찾지 못할 때 발생합니다.

### 해결 방법

#### 방법 1: HTTP Request 노드의 출력 확인

1. **"네이버 쇼핑 검색" 노드 클릭**
2. **"Execute step" 버튼 클릭**
3. **OUTPUT 패널 확인**
   - `body` 속성이 있는지 확인
   - 또는 `data` 속성에 HTML이 있는지 확인

#### 방법 2: HTML Extract 노드의 Source Data 설정 변경

**옵션 A: `body` 또는 `data` 사용**

1. **"제품 정보 추출" 노드 클릭**
2. **Parameters 탭에서**
   - **Source Data**: `JSON` 선택
   - **Data Property Name**: `body` 또는 `data`로 변경
   - 또는 Expression 방식: `={{ $json.data }}`

**옵션 B: Expression으로 유연하게 처리**

1. **"제품 정보 추출" 노드 클릭**
2. **Parameters 탭에서**
   - **Source Data**: `Expression` 선택
   - **Data Property Name**: `={{ $json.body || $json.data || $json }}` 입력

#### 방법 3: 네이버 파트너스 페이지 특성 고려

네이버 파트너스 페이지(`https://partners.naver.com`)는 JavaScript로 동적 로딩을 사용하는 SPA입니다. 일반 HTTP Request로는 완전한 HTML을 가져올 수 없습니다.

**대안 1: Playwright 노드 사용**

1. **HTTP Request 노드 대신 Playwright 노드 사용**
2. **Playwright 노드 설정:**
   - **Operation**: `Extract Data from Website` 선택
   - **URL**: `https://partners.naver.com/#affiliate/ws/link/0/%EB%B3%B4%EC%A1%B0%EA%B8%B0%EA%B8%B0`
   - **Wait for Selector**: 페이지 로딩 완료를 기다릴 선택자 입력
   - **Wait Time**: `5000` (5초)

**대안 2: 일반 네이버 검색 페이지 사용**

네이버 파트너스 대신 일반 네이버 검색 페이지를 사용:

```
https://www.naver.com/np/search?q=보조기기&channel=user
```

이 검색 페이지는 서버 사이드 렌더링을 사용하므로 HTTP Request로 HTML을 가져올 수 있습니다.

### 빠른 해결 순서 (현재 권장)

1. **"네이버 쇼핑 검색" 노드에서 OUTPUT 확인**

   - `body` 속성이 있는지 확인
   - 없다면 `data` 속성 확인

2. **"제품 정보 추출" 노드 설정 변경**

   - **Source Data**: `JSON` 선택
   - **Data Property Name**:
     - 가능하면 `data` 사용
     - 안되면 Expression 방식: `={{ $json.body || $json.data || $json }}`

3. **테스트**
   - "Execute step" 버튼 클릭
   - OUTPUT에서 오류가 해결되었는지 확인

### 네이버 파트너스 페이지 특성 참고

네이버 파트너스 페이지는

- JavaScript로 동적 로딩
- 로그인이 필요할 수 있음
- 복잡한 구조

**권장 방법**: 일반 네이버 검색 페이지(`www.naver.com/np/search`) 사용
