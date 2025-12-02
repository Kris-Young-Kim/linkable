# n8n 워크플로우 자동화 설정 가이드

이 문서는 LinkAble 프로젝트에서 n8n을 사용하여 상품 데이터를 자동으로 크롤링하고 Supabase에 등록하는 방법을 실제 화면 기준으로 상세히 설명합니다.

## 목차

1. [n8n 설치 및 기본 설정](#1-n8n-설치-및-기본-설정)
2. [Webhook 기반 수동 등록 워크플로우](#2-webhook-기반-수동-등록-워크플로우)
3. [Schedule Trigger 기반 자동 크롤링 워크플로우](#3-schedule-trigger-기반-자동-크롤링-워크플로우)
4. [웹 스크래핑 설정 (쿠팡 API 키 없이)](#4-웹-스크래핑-설정-쿠팡-api-키-없이)
5. [테스트 및 검증](#5-테스트-및-검증)
6. [문제 해결](#6-문제-해결)

---

## 1. n8n 설치 및 기본 설정

### 1-1. n8n 설치

#### Windows에서 n8n 설치

1. **Node.js 설치 확인**
   ```bash
   node --version
   npm --version
   ```
   - Node.js 18 이상 필요
   - 없으면 [Node.js 공식 사이트](https://nodejs.org/)에서 설치

2. **n8n 전역 설치**
   ```bash
   npm install n8n -g
   ```

3. **n8n 실행**
   ```bash
   n8n start
   ```
   - 기본 포트: `http://localhost:5678`
   - 브라우저에서 자동으로 열림

4. **n8n 계정 생성**
   - 첫 실행 시 계정 생성 화면 표시
   - 이메일과 비밀번호 입력

### 1-2. Supabase Credential 설정

1. **n8n에서 Credential 추가**
   - 왼쪽 사이드바 → Settings (톱니바퀴 아이콘) 클릭
   - "Credentials" 메뉴 클릭
   - "Add Credential" 버튼 클릭

2. **Supabase 선택**
   - 검색창에 "Supabase" 입력
   - "Supabase" 선택

3. **Credential 정보 입력**
   - **Name**: `Supabase account` (원하는 이름)
   - **Host**: `https://xxxxx.supabase.co` (Supabase 프로젝트 URL)
   - **Service Role Secret**: `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY` 값
   - **Database**: `postgres` (기본값)
   - **Port**: `5432` (기본값)

4. **저장**
   - "Save" 버튼 클릭
   - Credential이 목록에 추가됨

---

## 2. Webhook 기반 수동 등록 워크플로우

외부에서 POST 요청으로 상품 데이터를 전송하면 Supabase에 자동으로 등록되는 워크플로우입니다.

### 2-1. 새 워크플로우 생성

1. **워크플로우 생성**
   - 왼쪽 사이드바 "+" 버튼 클릭
   - "New Workflow" 선택
   - 워크플로우 이름: `LinkAble 상품 등록 (Webhook)`

### 2-2. Webhook 노드 추가 및 설정

1. **Webhook 노드 추가**
   - 왼쪽 사이드바 "+" 버튼 클릭
   - 검색창에 "Webhook" 입력
   - "Webhook" 노드 선택
   - 캔버스에 추가됨

2. **Webhook 노드 설정**
   - "Webhook" 노드 클릭
   - 오른쪽 패널에서 "Parameters" 탭 확인
   - 설정:
     - **HTTP Method**: `POST` 선택
     - **Path**: `products` 입력
     - **Authentication**: `None` 선택
     - **Respond**: `Using 'Respond to Webhook' Node` 선택

3. **Webhook URL 확인**
   - "Webhook URLs" 섹션 펼치기 (접혀 있을 수 있음)
   - "Production URL" 버튼 클릭
   - URL 확인: `http://localhost:5678/webhook/products`
   - 이 URL을 복사해두기

### 2-3. 데이터 변환 노드 (Code) 추가

1. **Code 노드 추가**
   - Webhook 노드 옆 "+" 버튼 클릭
   - 검색창에 "Code" 입력
   - "Code" 노드 선택

2. **Code 노드 설정**
   - 노드 이름: `데이터 변환`
   - JavaScript 코드 입력:

```javascript
// Webhook에서 받은 데이터를 Supabase 형식으로 변환
const items = $input.all();

return items.map(item => {
  // Webhook body에서 데이터 추출
  const data = item.json.body || item.json;
  
  // ISO 코드 자동 매핑
  function getIsoCode(keyword) {
    if (!keyword) return "15 09";
    const k = String(keyword).toLowerCase();
    if (k.includes("식기") || k.includes("식사")) return "15 09";
    if (k.includes("휠체어") && !k.includes("전동")) return "12 22";
    if (k.includes("전동") && k.includes("휠체어")) return "12 23";
    if (k.includes("경사로") || k.includes("승강기")) return "18 30";
    if (k.includes("체위") || k.includes("리프트")) return "12 31";
    if (k.includes("청각") || k.includes("보청기")) return "21 06";
    if (k.includes("의사소통")) return "22 30";
    if (k.includes("지팡이") || k.includes("보행기")) return "12 06";
    return "15 09";
  }
  
  // 가격 정규화
  function getPrice(price) {
    if (!price) return null;
    if (typeof price === 'number') return price;
    const num = String(price).replace(/[^0-9]/g, '');
    return num ? parseInt(num) : null;
  }
  
  return {
    json: {
      name: data.name || "상품명 없음",
      iso_code: data.iso_code || data.isoCode || getIsoCode(data.name || data.keyword),
      purchase_link: data.purchase_link || data.purchaseLink || data.url || null,
      image_url: data.image_url || data.imageUrl || data.image || null,
      price: getPrice(data.price || data.productPrice),
      manufacturer: data.manufacturer || data.brand || null,
      category: data.category || data.platform || "coupang",
      description: data.description || null,
      is_active: data.is_active !== undefined ? data.is_active : true
    }
  };
});
```

3. **저장**
   - 코드 입력 후 자동 저장됨

### 2-4. 중복 체크 노드 (Supabase Get) 추가

1. **Supabase 노드 추가**
   - "데이터 변환" 노드 옆 "+" 버튼 클릭
   - 검색창에 "Supabase" 입력
   - "Supabase" 노드 선택

2. **Supabase 노드 설정**
   - 노드 이름: `중복 체크`
   - 설정:
     - **Credential to connect with**: `Supabase account` 선택
     - **Resource**: `Row` 선택
     - **Operation**: `Get a row` 선택
     - **Table Name or ID**: `products` 선택
     - **Select Conditions**:
       - 첫 번째 조건:
         - **Name or ID**: `name` 선택
         - **Condition**: `Equals` 선택
         - **Value**: `={{ $json.name }}` 입력
       - "Add Condition" 버튼 클릭
       - 두 번째 조건:
         - **Name or ID**: `iso_code` 선택
         - **Condition**: `Equals` 선택
         - **Value**: `={{ $json.iso_code }}` 입력

### 2-5. IF 노드 추가

1. **IF 노드 추가**
   - "중복 체크" 노드 옆 "+" 버튼 클릭
   - 검색창에 "IF" 입력
   - "IF" 노드 선택

2. **IF 노드 설정**
   - 노드 이름: `기존 상품 있음?`
   - 조건 설정:
     - **Condition**: `{{ $json.length }}` > `0`
     - 또는 **Condition**: `{{ $json.id }}` exists
   - **True**: 기존 상품 있음 → Update
   - **False**: 기존 상품 없음 → Create

### 2-6. Update 노드 추가 (True 경로)

1. **Supabase 노드 추가**
   - "기존 상품 있음?" 노드의 True 경로 옆 "+" 버튼 클릭
   - "Supabase" 노드 선택

2. **Update 노드 설정**
   - 노드 이름: `Supabase Update`
   - 설정:
     - **Operation**: `Update a row` 선택
     - **Table Name or ID**: `products` 선택
     - **Select Conditions**:
       - **Name or ID**: `id` 선택
       - **Condition**: `Equals` 선택
       - **Value**: `={{ $('중복 체크').first().json.id }}` 입력
     - **Data to Send**: `Define Below for Each Column` 선택
     - **Fields to Send**: "Add Field" 버튼을 9번 클릭하여 다음 필드 추가:
       - **Field Name or ID**: `name` 선택, **Field Value**: `={{ $('데이터 변환').first().json.name }}`
       - **Field Name or ID**: `iso_code` 선택, **Field Value**: `={{ $('데이터 변환').first().json.iso_code }}`
       - **Field Name or ID**: `purchase_link` 선택, **Field Value**: `={{ $('데이터 변환').first().json.purchase_link }}`
       - **Field Name or ID**: `image_url` 선택, **Field Value**: `={{ $('데이터 변환').first().json.image_url }}`
       - **Field Name or ID**: `price` 선택, **Field Value**: `={{ $('데이터 변환').first().json.price }}`
       - **Field Name or ID**: `manufacturer` 선택, **Field Value**: `={{ $('데이터 변환').first().json.manufacturer }}`
       - **Field Name or ID**: `category` 선택, **Field Value**: `={{ $('데이터 변환').first().json.category }}`
       - **Field Name or ID**: `description` 선택, **Field Value**: `={{ $('데이터 변환').first().json.description }}`
       - **Field Name or ID**: `is_active` 선택, **Field Value**: `={{ $('데이터 변환').first().json.is_active }}`

### 2-7. Create 노드 추가 (False 경로)

1. **Supabase 노드 추가**
   - "기존 상품 있음?" 노드의 False 경로 옆 "+" 버튼 클릭
   - "Supabase" 노드 선택

2. **Create 노드 설정**
   - 노드 이름: `Supabase Create`
   - 설정:
     - **Operation**: `Create a row` 선택
     - **Table Name or ID**: `products` 선택
     - **Data to Send**: `Define Below for Each Column` 선택
     - **Fields to Send**: Update 노드와 동일한 필드 추가 (Select Conditions는 필요 없음)

### 2-8. Respond to Webhook 노드 추가

1. **Respond to Webhook 노드 추가**
   - "Supabase Update"와 "Supabase Create" 노드 모두에서 "+" 버튼 클릭
   - 검색창에 "Respond to Webhook" 입력
   - "Respond to Webhook" 노드 선택

2. **Respond 노드 설정**
   - 노드 이름: `응답`
   - 설정:
     - **Respond With**: `JSON` 선택
     - **Response Body**:
       ```json
       {
         "success": true,
         "message": "={{ $json.id ? '상품이 업데이트되었습니다.' : '상품이 등록되었습니다.' }}",
         "product_id": "={{ $json.id || $json[0].id }}"
       }
       ```

### 2-9. 워크플로우 저장 및 활성화

1. **워크플로우 저장**
   - 상단 오른쪽 "Save" 버튼 클릭

2. **워크플로우 활성화**
   - 상단 오른쪽 "Active" 토글을 ON으로 변경 (초록색)
   - "Save" 버튼 다시 클릭

### 2-10. 테스트

#### PowerShell에서 테스트

```powershell
Invoke-RestMethod -Uri "http://localhost:5678/webhook/products" -Method POST -ContentType "application/json" -Body '{"name": "무게조절 식기 세트", "purchase_link": "https://coupang.link/test", "price": 25000, "category": "coupang"}'
```

#### Postman/Thunder Client에서 테스트

- **URL**: `http://localhost:5678/webhook/products`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "무게조절 식기 세트",
    "purchase_link": "https://coupang.link/test",
    "price": 25000,
    "category": "coupang"
  }
  ```

---

## 3. Schedule Trigger 기반 자동 크롤링 워크플로우

주기적으로 자동으로 상품을 크롤링하고 Supabase에 등록하는 워크플로우입니다.

### 3-1. 새 워크플로우 생성

1. **워크플로우 생성**
   - 왼쪽 사이드바 "+" 버튼 클릭
   - "New Workflow" 선택
   - 워크플로우 이름: `LinkAble 상품 자동 등록 (Schedule)`

### 3-2. Schedule Trigger 노드 추가

1. **Schedule Trigger 노드 추가**
   - 왼쪽 사이드바 "+" 버튼 클릭
   - 검색창에 "Schedule" 입력
   - "Schedule Trigger" 노드 선택

2. **Schedule Trigger 설정**
   - "Schedule Trigger" 노드 클릭
   - 오른쪽 패널에서 "Parameters" 탭 확인
   - **Trigger Interval** 설정:
     - 옵션 1: "Every hour" (1시간마다)
     - 옵션 2: "Every day" (매일)
     - 옵션 3: "Cron Expression" (고급)
   - **Cron Expression 사용 시**:
     ```
     0 2 * * *  (매일 오전 2시)
     0 */6 * * *  (6시간마다)
     0 0 * * *  (매일 자정)
     ```

---

## 4. 웹 스크래핑 설정 (쿠팡 API 키 없이)

쿠팡 API 키 없이 웹 스크래핑으로 상품 데이터를 수집하는 방법입니다.

### 4-1. HTTP Request 노드 설정 (쿠팡 검색 페이지)

1. **HTTP Request 노드 추가**
   - Schedule Trigger 노드 옆 "+" 버튼 클릭
   - 검색창에 "HTTP Request" 입력
   - "HTTP Request" 노드 선택

2. **HTTP Request 노드 설정** (실제 화면 기준)

   - 노드 이름: `쿠팡검색페이지` (또는 원하는 이름)
   
   - **Method**: 드롭다운에서 `GET` 선택
   
   - **URL**: 상단 URL 필드에 입력
     ```
     https://www.coupang.com/np/search?q=보조기기&channel=user
     ```
   
   - **Send Query Parameters**: 
     - 토글 OFF (URL에 직접 쿼리 포함) 또는
     - 토글 ON 후 "Add Parameter"로 추가:
       - Name: `q`, Value: `보조기기`
       - Name: `channel`, Value: `user`
   
   - **Send Headers**: 토글 ON (초록색)
   
   - **Specify Headers**: 드롭다운에서 `Using Fields Below` 선택
   
   - **Header Parameters**: "Add Parameter" 버튼 클릭하여 헤더 추가
     
     **첫 번째 헤더**:
     - **Name**: `User-Agent`
     - **Value**: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`
     
     "Add Parameter" 버튼 다시 클릭
     
     **두 번째 헤더**:
     - **Name**: `Accept`
     - **Value**: `text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8`
     
     "Add Parameter" 버튼 다시 클릭
     
     **세 번째 헤더** (선택사항):
     - **Name**: `Accept-Language`
     - **Value**: `ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7`
   
   - **Send Body**: 토글 OFF (GET 요청이므로)
   
   - **Options**: 기본값 유지

3. **테스트 실행**
   - "Execute step" 버튼 클릭
   - OUTPUT 패널에서 HTML 응답 확인

### 4-2. HTML Extract 노드 설정

1. **HTML Extract 노드 추가**
   - "쿠팡검색페이지" 노드 옆 "+" 버튼 클릭
   - 검색창에 "HTML Extract" 입력
   - "HTML Extract" 노드 선택

2. **HTML Extract 노드 설정**
   - 노드 이름: `상품 정보 추출`
   
   - **Source Data**: 
     - 드롭다운에서 `JSON` 선택
     - 또는 Expression 모드에서 `={{ $json.body }}` 입력
     - (HTTP Request의 응답 body를 가져옴)
   
   - **Extraction Values**: "Add Value" 버튼 클릭하여 값 추가
     
     **값 1: 상품명**
     - **Key**: `name`
     - **CSS Selector**: `.name` 또는 `.search-product-wrap-img + .name`
     - **Return Value**: `Text` 선택
     - **Attribute**: (비워둠)
     
     "Add Value" 버튼 다시 클릭
     
     **값 2: 가격**
     - **Key**: `price`
     - **CSS Selector**: `.price-value` 또는 `.price strong`
     - **Return Value**: `Text` 선택
     
     "Add Value" 버튼 다시 클릭
     
     **값 3: 이미지**
     - **Key**: `image`
     - **CSS Selector**: `.search-product-wrap-img img`
     - **Return Value**: `Attribute` 선택
     - **Attribute**: `src` 입력
     
     "Add Value" 버튼 다시 클릭
     
     **값 4: 링크**
     - **Key**: `link`
     - **CSS Selector**: `.search-product-link` 또는 `a[href*="/products/"]`
     - **Return Value**: `Attribute` 선택
     - **Attribute**: `href` 입력

   **주의**: 쿠팡의 실제 셀렉터는 사이트 구조에 따라 다를 수 있습니다. 브라우저 개발자 도구로 확인 필요.

3. **테스트 실행**
   - "Execute step" 버튼 클릭
   - OUTPUT 패널에서 추출된 데이터 확인

### 4-3. 데이터 변환 Code 노드

1. **Code 노드 추가**
   - "상품 정보 추출" 노드 옆 "+" 버튼 클릭
   - "Code" 노드 선택

2. **Code 노드 설정**
   - 노드 이름: `HTML → Supabase 변환`
   - JavaScript 코드 입력:

```javascript
// HTML Extract 결과를 Supabase 형식으로 변환
const items = $input.all();
const results = [];

for (const item of items) {
  const data = item.json;
  
  // 여러 상품이 배열로 반환될 수 있음
  const products = Array.isArray(data) ? data : [data];
  
  for (const product of products) {
    // ISO 코드 자동 매핑
    function getIsoCode(keyword) {
      if (!keyword) return "15 09";
      const k = String(keyword).toLowerCase();
      if (k.includes("식기") || k.includes("식사")) return "15 09";
      if (k.includes("휠체어") && !k.includes("전동")) return "12 22";
      if (k.includes("전동") && k.includes("휠체어")) return "12 23";
      if (k.includes("경사로") || k.includes("승강기")) return "18 30";
      if (k.includes("체위") || k.includes("리프트")) return "12 31";
      if (k.includes("청각") || k.includes("보청기")) return "21 06";
      if (k.includes("의사소통")) return "22 30";
      if (k.includes("지팡이") || k.includes("보행기")) return "12 06";
      return "15 09";
    }
    
    // 가격 정규화 (문자열에서 숫자만 추출)
    function getPrice(priceStr) {
      if (!priceStr) return null;
      const num = String(priceStr).replace(/[^0-9]/g, '');
      return num ? parseInt(num) : null;
    }
    
    // 링크 정규화 (상대 경로를 절대 경로로)
    function normalizeLink(link) {
      if (!link) return null;
      if (link.startsWith('http')) return link;
      if (link.startsWith('/')) return `https://www.coupang.com${link}`;
      return `https://www.coupang.com/${link}`;
    }
    
    // 이미지 URL 정규화
    function normalizeImage(image) {
      if (!image) return null;
      if (image.startsWith('http')) return image;
      if (image.startsWith('//')) return `https:${image}`;
      if (image.startsWith('/')) return `https://www.coupang.com${image}`;
      return image;
    }
    
    if (product.name && product.name.trim()) {
      results.push({
        json: {
          name: product.name.trim(),
          iso_code: getIsoCode(product.name),
          purchase_link: normalizeLink(product.link),
          image_url: normalizeImage(product.image),
          price: getPrice(product.price),
          manufacturer: null, // HTML에서 추출 불가
          category: "coupang",
          description: null,
          is_active: true
        }
      });
    }
  }
}

return results;
```

### 4-4. 나머지 노드 설정

Webhook 워크플로우와 동일하게:
- Split In Batches (Batch Size: 10)
- 중복 체크 (Supabase Get)
- IF 노드
- Update/Create 노드
- Wait 노드 (1초)

### 4-5. 쿠팡 셀렉터 확인 방법

#### 브라우저 개발자 도구 사용

1. **쿠팡 검색 페이지 접속**
   - https://www.coupang.com/np/search?q=보조기기 접속

2. **개발자 도구 열기**
   - F12 키 누르기
   - Elements 탭 선택

3. **상품 요소 검사**
   - 상품 카드에 마우스 오른쪽 클릭
   - "검사" 선택
   - HTML 구조 확인

4. **셀렉터 복사**
   - 요소에 마우스 오른쪽 클릭
   - "Copy" → "Copy selector" 선택
   - n8n HTML Extract 노드에 입력

#### n8n에서 테스트

1. HTTP Request 노드에서 "Execute step" 클릭
2. OUTPUT 패널에서 HTML 확인
3. HTML Extract 노드에서 셀렉터 테스트
4. OUTPUT에서 추출된 데이터 확인

### 4-6. 대안: Playwright 노드 사용

쿠팡이 JavaScript로 동적 로딩을 사용하는 경우 Playwright가 더 안정적입니다.

1. **Playwright 노드 추가**
   - Schedule Trigger 노드 옆 "+" 버튼 클릭
   - 검색창에 "Playwright" 입력
   - "Playwright" 노드 선택

2. **Playwright 설정**
   - 노드 이름: `쿠팡 웹 스크래핑`
   - 설정:
     - **Operation**: `Extract Data from Website` 선택
     - **URL**: `https://www.coupang.com/np/search?q=보조기기&channel=user`
     - **Wait for Selector**: `.search-product` (페이지 로딩 대기)
     - **Wait Time**: `3000` (3초)
     - **Extraction Values**: HTML Extract와 동일한 값들 추가

### 4-7. 대안: 네이버 쇼핑 (더 쉬운 스크래핑)

네이버 쇼핑은 서버 사이드 렌더링을 사용하므로 HTML Extract로 더 쉽게 스크래핑할 수 있습니다.

#### 네이버 쇼핑 설정

1. **HTTP Request 노드**
   - URL: `https://shopping.naver.com/search/all?query=보조기기`

2. **HTML Extract 노드**
   - **상품명**: `.product_title`
   - **가격**: `.price_num`
   - **이미지**: `.product_img img src`
   - **링크**: `.product_title a href`

---

## 5. 테스트 및 검증

### 5-1. 워크플로우 실행 확인

1. **Executions 탭 확인**
   - n8n 상단 "Executions" 탭 클릭
   - 최근 실행 내역 확인
   - 각 노드의 실행 상태 확인:
     - 초록색 체크 = 성공
     - 빨간색 X = 실패

2. **실패한 노드 확인**
   - 실패한 노드 클릭
   - 에러 메시지 확인
   - OUTPUT 패널에서 데이터 확인

### 5-2. Supabase에서 데이터 확인

1. **Supabase Dashboard 접속**
   - Supabase 프로젝트 대시보드 접속
   - 로그인

2. **Table Editor 확인**
   - 왼쪽 메뉴 "Table Editor" 클릭
   - `products` 테이블 클릭
   - 새로 등록된 상품 확인

### 5-3. 관리자 페이지에서 확인

1. **관리자 페이지 접속**
   - https://link-able.vercel.app/admin/products 접속
   - 로그인 (관리자 권한 필요)

2. **상품 목록 확인**
   - 등록된 상품 목록 확인
   - 필터링, 검색, 정렬 기능 테스트

---

## 6. 문제 해결

### 6-1. Webhook이 응답하지 않음

**증상**: Webhook URL로 요청을 보냈는데 응답이 없음

**해결 방법**:
1. 워크플로우가 "Active" 상태인지 확인
2. Webhook URL이 정확한지 확인 (`/webhook/products`)
3. HTTP Method가 POST인지 확인
4. n8n이 실행 중인지 확인 (`http://localhost:5678`)

### 6-2. Supabase 연결 오류

**증상**: Supabase 노드에서 에러 발생

**해결 방법**:
1. Supabase Credential 확인
   - Host가 정확한지 확인
   - Service Role Key가 올바른지 확인
2. 테이블 이름 확인 (`products`)
3. 필드 이름 확인 (name, iso_code 등)

### 6-3. 데이터가 변환되지 않음

**증상**: Code 노드에서 데이터가 제대로 변환되지 않음

**해결 방법**:
1. Code 노드의 OUTPUT 확인
2. 입력 데이터 형식 확인
3. JavaScript 코드 문법 확인
4. 노드 이름이 정확한지 확인 (`$('데이터 변환')`)

### 6-4. 중복 체크가 작동하지 않음

**증상**: 같은 상품이 계속 생성됨

**해결 방법**:
1. "중복 체크" 노드의 Select Conditions 확인
   - `name`과 `iso_code` 필터가 정확한지 확인
2. Update 노드의 Select Conditions 확인
   - `id` 필터가 정확한지 확인
3. IF 노드의 조건 확인

### 6-5. Schedule Trigger가 실행되지 않음

**증상**: 설정한 시간에 워크플로우가 실행되지 않음

**해결 방법**:
1. 워크플로우가 "Active" 상태인지 확인
2. Schedule Trigger 설정 확인
   - Cron Expression이 올바른지 확인
3. n8n이 계속 실행 중인지 확인
4. Executions 탭에서 실행 내역 확인

### 6-6. HTTP Request에서 HTML을 가져오지 못함

**증상**: HTTP Request 노드에서 빈 응답 또는 에러 발생

**해결 방법**:
1. URL이 정확한지 확인
2. Headers 설정 확인 (User-Agent 등)
3. 쿠팡이 봇을 차단했을 수 있음
   - User-Agent 헤더 추가
   - 요청 간격 조절 (Wait 노드 사용)
4. OUTPUT 패널에서 응답 확인

### 6-7. HTML Extract에서 데이터를 추출하지 못함

**증상**: HTML Extract 노드에서 빈 결과 반환

**해결 방법**:
1. Source Data가 올바른지 확인 (`={{ $json.body }}`)
2. CSS Selector가 정확한지 확인
   - 브라우저 개발자 도구로 실제 셀렉터 확인
3. 쿠팡이 JavaScript로 동적 로딩을 사용하는 경우
   - Playwright 노드 사용 권장
4. OUTPUT 패널에서 HTML 확인

---

## 7. 환경 변수 설정

### 7-1. 커서 프로젝트 환경 변수

`.env.local` 파일에 추가:

```env
# n8n Webhook URL
N8N_WEBHOOK_URL=http://localhost:5678/webhook/products

# Supabase (이미 설정되어 있을 수 있음)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 7-2. n8n 환경 변수

n8n 실행 시 환경 변수 설정:

```bash
# Windows PowerShell
$env:N8N_BASIC_AUTH_USER="admin"
$env:N8N_BASIC_AUTH_PASSWORD="password"
n8n start
```

또는 `.env` 파일 생성:

```env
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password
```

---

## 8. 워크플로우 JSON 가져오기/내보내기

### 8-1. 워크플로우 내보내기

1. 워크플로우 편집기에서
2. 상단 오른쪽 "..." 메뉴 클릭
3. "Download" 선택
4. JSON 파일 저장

### 8-2. 워크플로우 가져오기

1. n8n에서
2. 왼쪽 사이드바 "+" 버튼 클릭
3. "Import from File" 선택
4. JSON 파일 업로드
5. Credential 연결 확인

---

## 9. 최종 체크리스트

### Webhook 워크플로우

- [ ] Webhook 노드 설정 완료
- [ ] 데이터 변환 Code 노드 설정 완료
- [ ] 중복 체크 Supabase 노드 설정 완료
- [ ] IF 노드 조건 설정 완료
- [ ] Update/Create 노드 설정 완료
- [ ] Respond 노드 설정 완료
- [ ] 워크플로우 저장 및 활성화
- [ ] 테스트 성공
- [ ] Supabase에서 데이터 확인

### Schedule + HTML Extract 워크플로우

- [ ] Schedule Trigger 설정 완료
- [ ] HTTP Request 노드 설정 완료 (URL, Headers)
- [ ] HTML Extract 노드 설정 완료 (Source, Extraction Values)
- [ ] 데이터 변환 Code 노드 설정 완료
- [ ] Split In Batches 노드 설정 완료
- [ ] 중복 체크 및 Update/Create 노드 설정 완료
- [ ] Wait 노드 설정 완료
- [ ] 워크플로우 저장 및 활성화
- [ ] Executions에서 실행 내역 확인
- [ ] Supabase에서 데이터 확인

---

## 10. 참고 자료

- [n8n 공식 문서](https://docs.n8n.io/)
- [Supabase 공식 문서](https://supabase.com/docs)
- [Cron Expression 생성기](https://crontab.guru/)

---

## 11. 주의사항

### 법적 고려사항

1. **robots.txt 확인**
   - 크롤링 대상 사이트의 robots.txt 확인
   - 크롤링이 허용되는지 확인

2. **이용약관 확인**
   - 쿠팡, 네이버 등 쇼핑몰의 이용약관 확인
   - 자동화 도구 사용 제한 여부 확인

3. **요청 간격 조절**
   - 과도한 요청 방지
   - Wait 노드로 요청 간격 조절

### 기술적 제약사항

1. **쿠팡의 동적 로딩**
   - 쿠팡은 JavaScript로 동적 로딩을 사용
   - HTML Extract만으로는 제한적
   - Playwright 노드 사용 권장

2. **셀렉터 변경**
   - 웹사이트 구조 변경 시 셀렉터 수정 필요
   - 정기적으로 확인 필요

3. **봇 차단**
   - User-Agent 헤더 설정 필요
   - 요청 패턴이 봇처럼 보이면 차단될 수 있음

---

**마지막 업데이트**: 2025-12-01
