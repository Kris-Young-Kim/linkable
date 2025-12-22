# Supabase Edge Function 가이드

## 개요

Supabase Edge Function을 활용하여 Clerk JWT를 Supabase JWT로 변환하는 기능을 구현했습니다.

## 디렉토리 구조

```
supabase/
├── functions/
│   └── clerk-to-supabase-jwt/
│       ├── index.ts          # Edge Function 메인 파일
│       └── README.md         # 사용 가이드
└── migrations/               # 기존 마이그레이션 파일들
```

## 설정 및 배포

### 1. Supabase CLI 설치

```bash
npm install -g supabase
```

또는

```bash
pnpm add -g supabase
```

### 2. Supabase 프로젝트 연결

```bash
# Supabase Dashboard에서 프로젝트 참조 ID 확인
# Settings > General > Reference ID

supabase link --project-ref your-project-ref
```

### 3. 환경 변수 설정

Supabase Dashboard에서 다음 환경 변수를 설정합니다:

1. Supabase Dashboard 접속
2. **Settings** > **Edge Functions** > **Secrets** 이동
3. 다음 환경 변수 추가:
   - `SUPABASE_URL`: Supabase 프로젝트 URL (예: `https://xxx.supabase.co`)
   - `SUPABASE_JWT_SECRET`: Supabase JWT Secret (Settings > API > JWT Settings에서 확인)
   - `SUPABASE_ANON_KEY`: Supabase Anon Key (Settings > API에서 확인)

또는 CLI로 설정:

```bash
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_JWT_SECRET=your-jwt-secret
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### 4. Edge Function 배포

```bash
# Edge Function 배포
supabase functions deploy clerk-to-supabase-jwt

# 특정 프로젝트에 배포
supabase functions deploy clerk-to-supabase-jwt --project-ref your-project-ref
```

### 5. 배포 확인

```bash
# Edge Function 목록 확인
supabase functions list

# Edge Function 로그 확인
supabase functions logs clerk-to-supabase-jwt
```

## 사용 방법

### 방법 1: 클라이언트에서 직접 호출

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const response = await fetch(
  `${supabaseUrl}/functions/v1/clerk-to-supabase-jwt`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clerkUserId: 'user_xxx',
      email: 'user@example.com',
      role: 'user',
      name: 'User Name',
    }),
  }
);

const { token, expiresAt } = await response.json();
```

### 방법 2: Next.js API Route에서 프록시

기존 `app/api/auth/supabase-token/route.ts`를 Edge Function을 호출하도록 수정:

```typescript
// app/api/auth/supabase-token/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Edge Function 호출
    const response = await fetch(
      `${supabaseUrl}/functions/v1/clerk-to-supabase-jwt`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: userId,
          email: user?.primaryEmailAddress?.emailAddress,
          role: (user?.publicMetadata?.role as string) || 'user',
          name: user?.fullName || user?.username,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[Supabase Token API] Edge Function error:", error);
      return NextResponse.json(
        { error: "Failed to generate Supabase token" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Supabase Token API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate Supabase token" },
      { status: 500 }
    );
  }
}
```

## 장점

1. **Edge Network에서 실행**: 전 세계 어디서나 빠른 응답 시간
2. **Next.js 서버 부하 감소**: JWT 생성 로직을 Edge Function으로 분리
3. **중앙화된 인증 로직**: 여러 클라이언트에서 동일한 로직 재사용 가능
4. **확장성**: Supabase의 자동 스케일링 활용
5. **비용 효율성**: 사용량 기반 과금으로 불필요한 리소스 사용 감소

## 주의사항

1. **Deno 런타임**: Edge Function은 Deno 런타임을 사용하므로 Node.js 전용 패키지를 사용할 수 없습니다.
2. **환경 변수**: 환경 변수는 Supabase Dashboard에서 설정해야 합니다.
3. **CORS**: Edge Function은 기본적으로 CORS를 지원하지만, 필요시 추가 설정이 필요할 수 있습니다.
4. **에러 처리**: Edge Function에서 발생한 에러는 Supabase Dashboard의 로그에서 확인할 수 있습니다.

## 트러블슈팅

### Edge Function이 배포되지 않는 경우

1. Supabase CLI가 최신 버전인지 확인:
   ```bash
   supabase --version
   ```

2. 프로젝트가 올바르게 연결되었는지 확인:
   ```bash
   supabase status
   ```

3. 로그 확인:
   ```bash
   supabase functions logs clerk-to-supabase-jwt
   ```

### 환경 변수가 설정되지 않은 경우

1. Supabase Dashboard에서 확인:
   - Settings > Edge Functions > Secrets

2. CLI로 확인:
   ```bash
   supabase secrets list
   ```

### CORS 에러가 발생하는 경우

Edge Function의 `corsHeaders`를 확인하고, 필요시 추가 도메인을 허용하도록 수정합니다.

## 참고 문서

- [Supabase Edge Functions 공식 문서](https://supabase.com/docs/guides/functions)
- [Deno 공식 문서](https://deno.land/manual)
- [JWT 생성 가이드](https://supabase.com/docs/guides/auth/row-level-security)

