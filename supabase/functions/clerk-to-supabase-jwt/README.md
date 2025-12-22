# Clerk to Supabase JWT Edge Function

이 Edge Function은 Clerk 인증 정보를 받아서 Supabase JWT를 생성합니다.

## 사용 방법

### 1. 환경 변수 설정

Supabase Dashboard에서 다음 환경 변수를 설정해야 합니다:

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_JWT_SECRET`: Supabase JWT Secret (Settings > API > JWT Settings)
- `SUPABASE_ANON_KEY`: Supabase Anon Key

### 2. Edge Function 배포

```bash
# Supabase CLI 설치 (필요한 경우)
npm install -g supabase

# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# Edge Function 배포
supabase functions deploy clerk-to-supabase-jwt
```

### 3. API 호출 예제

#### 클라이언트에서 호출

```typescript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/clerk-to-supabase-jwt',
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

#### Next.js API Route에서 호출

```typescript
// app/api/auth/supabase-token-edge/route.ts
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
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
        clerkUserId: userId,
        email: user?.primaryEmailAddress?.emailAddress,
        role: (user?.publicMetadata?.role as string) || 'user',
        name: user?.fullName || user?.username,
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
```

## 장점

1. **Edge Network에서 실행**: 전 세계 어디서나 빠른 응답 시간
2. **Next.js 서버 부하 감소**: JWT 생성 로직을 Edge Function으로 분리
3. **중앙화된 인증 로직**: 여러 클라이언트에서 동일한 로직 재사용 가능
4. **확장성**: Supabase의 자동 스케일링 활용

## 주의사항

- Edge Function은 Deno 런타임을 사용하므로 Node.js 전용 패키지를 사용할 수 없습니다.
- 환경 변수는 Supabase Dashboard에서 설정해야 합니다.
- CORS 설정이 필요할 수 있습니다 (이미 포함됨).

