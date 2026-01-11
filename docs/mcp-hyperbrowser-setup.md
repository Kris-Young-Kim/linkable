# MCP Hyperbrowser 서버 설정 가이드

## 개요

이 프로젝트는 Hyperbrowser MCP 서버를 사용하여 JavaScript로 동적 로드되는 웹페이지(예: 네이버 브랜드 스토어)를 크롤링할 수 있습니다.

## 설정 완료 상태

✅ **MCP 설정 파일 생성**: `.mcp.json` 파일이 생성되었습니다.
✅ **Hyperbrowser SDK 테스트**: `pnpm test:mcp` 명령어로 SDK가 정상 작동하는 것을 확인했습니다.
✅ **환경 변수 설정**: `.env.local`에 `HYPERBROWSER_API_KEY`가 설정되어 있습니다.

## MCP 서버 설정

### 1. 설정 파일 위치
프로젝트 루트에 `.mcp.json` 파일이 있습니다:

```json
{
  "mcpServers": {
    "hyperbrowser": {
      "command": "npx",
      "args": ["-y", "hyperbrowser-mcp"],
      "env": {
        "HYPERBROWSER_API_KEY": "${HYPERBROWSER_API_KEY}"
      }
    }
  }
}
```

### 2. 환경 변수
`.env.local` 파일에 다음이 설정되어 있어야 합니다:

```env
HYPERBROWSER_API_KEY=your_api_key_here
```

## 사용 방법

### MCP 서버 테스트

터미널에서 다음 명령어를 실행하여 Hyperbrowser SDK가 정상 작동하는지 확인할 수 있습니다:

```bash
pnpm test:mcp
```

이 명령어는 다음을 테스트합니다:
- ✅ 환경 변수 로드
- ✅ Hyperbrowser 세션 생성
- ✅ 브라우저 연결
- ✅ 웹페이지 로드
- ✅ 세션 정리

### 실제 크롤링 사용

네이버 브랜드 스토어 URL을 크롤링할 때, API는 자동으로 Hyperbrowser를 사용합니다:

```typescript
// 네이버 브랜드 스토어 URL 감지
const useHyperbrowser = body.url.includes("brand.naver.com");

if (useHyperbrowser && process.env.HYPERBROWSER_API_KEY) {
  // Hyperbrowser 사용
  result = await crawlWithHyperbrowser(body.url, maxProducts);
} else {
  // 일반 크롤러 사용 (fetch + cheerio)
  result = await crawlProducts(body.url, maxProducts);
}
```

## MCP 서버 vs SDK 직접 사용

### 현재 구현 방식
- **코드 레벨**: Hyperbrowser SDK를 직접 사용 (`@hyperbrowser/sdk`)
- **MCP 서버**: Cursor IDE에서 사용 가능 (AI가 MCP 도구를 통해 브라우저 자동화 가능)

### MCP 서버의 장점
1. **Cursor IDE 통합**: AI가 MCP 도구를 직접 사용하여 브라우저 자동화 가능
2. **코드 작성 없이 테스트**: Cursor IDE에서 직접 브라우저 작업 테스트 가능
3. **자동화된 웹 스크래핑**: AI가 웹사이트를 탐색하고 데이터를 추출할 수 있음

### SDK 직접 사용의 장점
1. **프로덕션 코드**: 실제 API 엔드포인트에서 사용 가능
2. **더 많은 제어**: 코드 레벨에서 세밀한 제어 가능
3. **에러 처리**: 자세한 에러 처리 및 로깅 가능

## 문제 해결

### MCP 서버가 작동하지 않는 경우

1. **Cursor IDE 재시작**: MCP 설정 변경 후 Cursor를 재시작하세요.
2. **환경 변수 확인**: `.env.local`에 `HYPERBROWSER_API_KEY`가 올바르게 설정되어 있는지 확인하세요.
3. **SDK 테스트**: `pnpm test:mcp` 명령어로 SDK가 작동하는지 확인하세요.

### Hyperbrowser API 키 발급

1. [Hyperbrowser 공식 웹사이트](https://hyperbrowser.ai)에서 계정 생성
2. API 키 발급
3. `.env.local` 파일에 추가

## 관련 파일

- `.mcp.json`: MCP 서버 설정 파일
- `app/api/admin/products/crawl-browser/route.ts`: 크롤링 API 엔드포인트
- `scripts/test-mcp-hyperbrowser.ts`: MCP 서버 테스트 스크립트

## 참고 사항

- MCP 서버는 Cursor IDE 레벨에서 동작하므로, 코드에서 직접 호출하는 것이 아니라 Cursor가 제공하는 도구를 사용합니다.
- 프로덕션 코드에서는 SDK를 직접 사용하는 것이 더 안정적입니다.
- MCP 서버는 개발 및 테스트 단계에서 유용합니다.
