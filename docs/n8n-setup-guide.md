# n8n 워크플로우 자동화 설정 가이드

이 문서는 LinkAble 프로젝트에서 n8n을 사용하여 상품 데이터를 자동으로 크롤링하고 Supabase에 등록하는 방법을 상세히 설명합니다.

## 목차

1. [n8n 설치 및 기본 설정](#1-n8n-설치-및-기본-설정)
2. [Webhook 기반 수동 등록 워크플로우](#2-webhook-기반-수동-등록-워크플로우)
3. [Schedule Trigger 기반 자동 크롤링 워크플로우](#3-schedule-trigger-기반-자동-크롤링-워크플로우)
4. [쿠팡 파트너스 API 연동](#4-쿠팡-파트너스-api-연동)
5. [웹 스크래핑 설정](#5-웹-스크래핑-설정)
6. [테스트 및 검증](#6-테스트-및-검증)
7. [문제 해결](#7-문제-해결)

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
   - "Code" 노드 클릭
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
     - **Fields to Send**: "Add Field" 버튼을 9번 클릭하여 다음 필드 추가:
       - `name`: `={{ $('데이터 변환').first().json.name }}`
       - `iso_code`: `={{ $('데이터 변환').first().json.iso_code }}`
       - `purchase_link`: `={{ $('데이터 변환').first().json.purchase_link }}`
       - `image_url`: `={{ $('데이터 변환').first().json.image_url }}`
       - `price`: `={{ $('데이터 변환').first().json.price }}`
       - `manufacturer`: `={{ $('데이터 변환').first().json.manufacturer }}`
       - `category`: `={{ $('데이터 변환').first().json.category }}`
       - `description`: `={{ $('데이터 변환').first().json.description }}`
       - `is_active`: `={{ $('데이터 변환').first().json.is_active }}`

### 2-7. Create 노드 추가 (False 경로)

1. **Supabase 노드 추가**
   - "기존 상품 있음?" 노드의 False 경로 옆 "+" 버튼 클릭
   - "Supabase" 노드 선택

2. **Create 노드 설정**
   - 노드 이름: `Supabase Create`
   - 설정:
     - **Operation**: `Create a row` 선택
     - **Table Name or ID**: `products` 선택
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

### 3-3. HTTP Request 노드 추가 (쿠팡 API)

1. **HTTP Request 노드 추가**
   - Schedule Trigger 노드 옆 "+" 버튼 클릭
   - 검색창에 "HTTP Request" 입력
   - "HTTP Request" 노드 선택

2. **HTTP Request 노드 설정**
   - 노드 이름: `쿠팡 API 호출`
   - 설정:
     - **Method**: `GET` 선택
     - **URL**: `https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/products/search`
     - **Authentication**: "Generic Credential Type" 선택
     - **Generic Auth Type**: "HTTP Header Auth" 선택
     - **Send Query**: `true` 선택
     - **Query Parameters**:
       - `keyword`: `보조기기`
       - `limit`: `20`

3. **쿠팡 API Credential 설정** (선택사항)
   - Settings → Credentials → Add Credential
   - "HTTP Header Auth" 선택
   - 설정:
     - **Name**: `Coupang API`
     - **Header Name**: `Authorization`
     - **Header Value**: `Bearer YOUR_ACCESS_KEY`

### 3-4. 데이터 변환 노드 (Code) 추가

1. **Code 노드 추가**
   - "쿠팡 API 호출" 노드 옆 "+" 버튼 클릭
   - "Code" 노드 선택

2. **Code 노드 설정**
   - 노드 이름: `쿠팡 → Supabase 변환`
   - JavaScript 코드 입력:

```javascript
// 쿠팡 API 응답을 Supabase 형식으로 변환
const items = $input.all();
const results = [];

for (const item of items) {
  const data = item.json;
  
  // 쿠팡 API 응답 구조에 따라 조정 필요
  if (data.data && Array.isArray(data.data)) {
    for (const product of data.data) {
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
      
      function getPrice(price) {
        if (!price) return null;
        if (typeof price === 'number') return price;
        const num = String(price).replace(/[^0-9]/g, '');
        return num ? parseInt(num) : null;
      }
      
      results.push({
        json: {
          name: product.productName || product.name || "상품명 없음",
          iso_code: getIsoCode(product.productName || product.keyword),
          purchase_link: product.productUrl || product.link || null,
          image_url: product.productImage || product.image || null,
          price: getPrice(product.productPrice || product.price),
          manufacturer: product.brand || product.vendor || null,
          category: "coupang",
          description: product.description || null,
          is_active: true
        }
      });
    }
  }
}

return results;
```

### 3-5. Split In Batches 노드 추가

1. **Split In Batches 노드 추가**
   - "쿠팡 → Supabase 변환" 노드 옆 "+" 버튼 클릭
   - 검색창에 "Split In Batches" 입력
   - "Split In Batches" 노드 선택

2. **Split In Batches 설정**
   - 노드 이름: `배치 처리`
   - 설정:
     - **Batch Size**: `10` 입력

### 3-6. 중복 체크 및 Update/Create 노드 추가

Webhook 워크플로우와 동일하게 설정:
- 중복 체크 (Supabase Get)
- IF 노드
- Update 노드
- Create 노드

### 3-7. Wait 노드 추가

1. **Wait 노드 추가**
   - "Supabase Update"와 "Supabase Create" 노드 다음에 추가
   - 검색창에 "Wait" 입력
   - "Wait" 노드 선택

2. **Wait 노드 설정**
   - 노드 이름: `대기 (Rate Limit)`
   - 설정:
     - **Amount**: `1` 입력
     - **Unit**: `seconds` 선택

3. **Wait 노드를 배치 처리로 연결**
   - Wait 노드에서 "배치 처리" 노드로 연결
   - 다음 배치를 처리하기 전에 1초 대기

### 3-8. 워크플로우 저장 및 활성화

1. **워크플로우 저장**
   - 상단 오른쪽 "Save" 버튼 클릭

2. **워크플로우 활성화**
   - 상단 오른쪽 "Active" 토글을 ON으로 변경
   - "Save" 버튼 다시 클릭

---

## 4. 쿠팡 파트너스 API 연동

### 4-1. 쿠팡 파트너스 API 키 발급

1. **쿠팡 파트너스 사이트 접속**
   - https://partners.coupang.com/ 접속
   - 로그인

2. **API 키 발급**
   - 마이페이지 → API 관리
   - "API 키 발급" 클릭
   - Access Key와 Secret Key 복사

### 4-2. n8n에 쿠팡 API Credential 추가

1. **Credential 추가**
   - Settings → Credentials → Add Credential
   - "HTTP Header Auth" 선택

2. **Credential 설정**
   - **Name**: `Coupang API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_ACCESS_KEY` (발급받은 Access Key 입력)

3. **저장**
   - "Save" 버튼 클릭

### 4-3. HTTP Request 노드에 Credential 연결

1. **HTTP Request 노드 설정**
   - "쿠팡 API 호출" 노드 클릭
   - **Authentication**: "Generic Credential Type" 선택
   - **Credential**: `Coupang API` 선택

---

## 5. 웹 스크래핑 설정

쿠팡 API 대신 웹 스크래핑을 사용하는 방법입니다.

### 5-1. Playwright 노드 추가

1. **Playwright 노드 추가**
   - 왼쪽 사이드바 "+" 버튼 클릭
   - 검색창에 "Playwright" 입력
   - "Playwright" 노드 선택

2. **Playwright 설정**
   - 노드 이름: `웹 스크래핑`
   - 설정:
     - **Operation**: `Extract Data from Website` 선택
     - **URL**: 크롤링할 웹페이지 URL 입력
     - **Selectors**:
       - 상품명: `.product-name`
       - 가격: `.product-price`
       - 이미지: `.product-image img`
       - 링크: `.product-link`

### 5-2. HTML Extract 노드 사용 (대안)

1. **HTML Extract 노드 추가**
   - "HTTP Request" 노드로 웹페이지 HTML 가져오기
   - "HTML Extract" 노드 추가

2. **HTML Extract 설정**
   - **Source**: `={{ $json.html }}`
   - **Extraction Values**:
     - `name`: `.product-title`
     - `price`: `.price`
     - `image`: `.product-image img src`
     - `link`: `.product-link href`

---

## 6. 테스트 및 검증

### 6-1. 워크플로우 실행 확인

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

### 6-2. Supabase에서 데이터 확인

1. **Supabase Dashboard 접속**
   - Supabase 프로젝트 대시보드 접속
   - 로그인

2. **Table Editor 확인**
   - 왼쪽 메뉴 "Table Editor" 클릭
   - `products` 테이블 클릭
   - 새로 등록된 상품 확인

### 6-3. 관리자 페이지에서 확인

1. **관리자 페이지 접속**
   - https://link-able.vercel.app/admin/products 접속
   - 로그인 (관리자 권한 필요)

2. **상품 목록 확인**
   - 등록된 상품 목록 확인
   - 필터링, 검색, 정렬 기능 테스트

---

## 7. 문제 해결

### 7-1. Webhook이 응답하지 않음

**증상**: Webhook URL로 요청을 보냈는데 응답이 없음

**해결 방법**:
1. 워크플로우가 "Active" 상태인지 확인
2. Webhook URL이 정확한지 확인 (`/webhook/products`)
3. HTTP Method가 POST인지 확인
4. n8n이 실행 중인지 확인 (`http://localhost:5678`)

### 7-2. Supabase 연결 오류

**증상**: Supabase 노드에서 에러 발생

**해결 방법**:
1. Supabase Credential 확인
   - Host가 정확한지 확인
   - Service Role Key가 올바른지 확인
2. 테이블 이름 확인 (`products`)
3. 필드 이름 확인 (name, iso_code 등)

### 7-3. 데이터가 변환되지 않음

**증상**: Code 노드에서 데이터가 제대로 변환되지 않음

**해결 방법**:
1. Code 노드의 OUTPUT 확인
2. 입력 데이터 형식 확인
3. JavaScript 코드 문법 확인
4. 노드 이름이 정확한지 확인 (`$('데이터 변환')`)

### 7-4. 중복 체크가 작동하지 않음

**증상**: 같은 상품이 계속 생성됨

**해결 방법**:
1. "중복 체크" 노드의 Filters 확인
   - `name`과 `iso_code` 필터가 정확한지 확인
2. Update 노드의 Select Conditions 확인
   - `id` 필터가 정확한지 확인
3. IF 노드의 조건 확인

### 7-5. Schedule Trigger가 실행되지 않음

**증상**: 설정한 시간에 워크플로우가 실행되지 않음

**해결 방법**:
1. 워크플로우가 "Active" 상태인지 확인
2. Schedule Trigger 설정 확인
   - Cron Expression이 올바른지 확인
3. n8n이 계속 실행 중인지 확인
4. Executions 탭에서 실행 내역 확인

### 7-6. 쿠팡 API 호출 실패

**증상**: HTTP Request 노드에서 에러 발생

**해결 방법**:
1. API 키가 올바른지 확인
2. API Credential 설정 확인
3. URL이 정확한지 확인
4. Query Parameters 확인
5. API 사용량 제한 확인

---

## 8. 환경 변수 설정

### 8-1. 커서 프로젝트 환경 변수

`.env.local` 파일에 추가:

```env
# n8n Webhook URL
N8N_WEBHOOK_URL=http://localhost:5678/webhook/products

# Supabase (이미 설정되어 있을 수 있음)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 쿠팡 파트너스 API (선택사항)
COUPANG_ACCESS_KEY=your_access_key
COUPANG_SECRET_KEY=your_secret_key
```

### 8-2. n8n 환경 변수

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

## 9. 워크플로우 JSON 가져오기

### 9-1. 워크플로우 내보내기

1. 워크플로우 편집기에서
2. 상단 오른쪽 "..." 메뉴 클릭
3. "Download" 선택
4. JSON 파일 저장

### 9-2. 워크플로우 가져오기

1. n8n에서
2. 왼쪽 사이드바 "+" 버튼 클릭
3. "Import from File" 선택
4. JSON 파일 업로드
5. Credential 연결 확인

---

## 10. 최종 체크리스트

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

### Schedule 워크플로우

- [ ] Schedule Trigger 설정 완료
- [ ] HTTP Request 노드 설정 완료
- [ ] 데이터 변환 Code 노드 설정 완료
- [ ] Split In Batches 노드 설정 완료
- [ ] 중복 체크 및 Update/Create 노드 설정 완료
- [ ] Wait 노드 설정 완료
- [ ] 워크플로우 저장 및 활성화
- [ ] Executions에서 실행 내역 확인
- [ ] Supabase에서 데이터 확인

---

## 11. 참고 자료

- [n8n 공식 문서](https://docs.n8n.io/)
- [Supabase 공식 문서](https://supabase.com/docs)
- [쿠팡 파트너스 API 문서](https://developers.coupang.com/)
- [Cron Expression 생성기](https://crontab.guru/)

---

## 12. 문의 및 지원

문제가 발생하거나 추가 도움이 필요한 경우:
1. n8n Executions 탭에서 에러 로그 확인
2. 각 노드의 OUTPUT 확인
3. Supabase Dashboard에서 데이터 확인
4. 이 문서의 "문제 해결" 섹션 참고

---

**마지막 업데이트**: 2025-12-01

