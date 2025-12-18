# 클라이언트 측 인증 통합 가이드

## 개요

클라이언트 측에서도 Clerk 인증 정보를 Supabase JWT로 변환하여 RLS 정책이 적용되도록 구현했습니다.

## 구현 내용

### 1. API Route: `/api/auth/supabase-token`

**위치**: `app/api/auth/supabase-token/route.ts`

**기능**:
- Clerk 세션을 기반으로 Supabase JWT 생성
- JWT 만료 시간 설정 (기본 1시간)
- 인증되지 않은 사용자에 대한 에러 처리

**사용 예시**:
```typescript
const response = await fetch("/api/auth/supabase-token");
const { token, expiresAt } = await response.json();
```

### 2. 클라이언트 유틸: `lib/supabase/client.ts`

**제공하는 함수 및 Hook**:

#### `createSupabaseBrowserClient()`
- **용도**: 기존 방식, anon key만 사용
- **RLS 적용**: ❌ (공개 데이터에만 사용)
- **사용 시나리오**: 인증이 필요 없는 공개 데이터 조회

```typescript
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();
const { data } = await supabase.from("products").select("*");
```

#### `createSupabaseClientWithAuth(token?)`
- **용도**: Clerk 인증을 사용하는 Supabase 클라이언트 생성
- **RLS 적용**: ✅
- **사용 시나리오**: 서버 컴포넌트나 API Route에서 사용

```typescript
import { createSupabaseClientWithAuth } from "@/lib/supabase/client";

const supabase = await createSupabaseClientWithAuth();
const { data } = await supabase.from("consultations").select("*");
```

#### `useSupabaseClient()` (React Hook)
- **용도**: 클라이언트 컴포넌트에서 사용하는 React Hook
- **RLS 적용**: ✅
- **자동 기능**:
  - Clerk 인증 상태 감지
  - JWT 토큰 자동 갱신 (만료 5분 전)
  - 로딩 상태 관리

```typescript
"use client";

import { useSupabaseClient } from "@/lib/supabase/client";

function MyComponent() {
  const supabase = useSupabaseClient();
  
  useEffect(() => {
    if (!supabase) return;
    
    supabase
      .from("consultations")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error:", error);
          return;
        }
        console.log("Data:", data);
      });
  }, [supabase]);
  
  if (!supabase) {
    return <div>Loading...</div>;
  }
  
  return <div>Content</div>;
}
```

## JWT 토큰 관리

### 토큰 캐싱
- 메모리 기반 캐시 사용
- 유효한 토큰은 재사용하여 API 호출 최소화

### 자동 갱신
- 토큰 만료 5분 전에 자동 갱신
- `useSupabaseClient` Hook에서 자동 처리

### 토큰 유효성 검사
```typescript
function isTokenValid(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  // 만료 5분 전까지 유효하다고 간주
  return expiresAt > now + 300;
}
```

## 사용 시나리오

### 시나리오 1: 클라이언트 컴포넌트에서 사용자 데이터 조회

```typescript
"use client";

import { useSupabaseClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function ConsultationsList() {
  const supabase = useSupabaseClient();
  const [consultations, setConsultations] = useState([]);
  
  useEffect(() => {
    if (!supabase) return;
    
    supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error:", error);
          return;
        }
        setConsultations(data || []);
      });
  }, [supabase]);
  
  if (!supabase) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {consultations.map((consultation) => (
        <div key={consultation.id}>{consultation.title}</div>
      ))}
    </div>
  );
}
```

### 시나리오 2: 서버 컴포넌트에서 사용

서버 컴포넌트에서는 `getSupabaseUserClient()`를 사용하세요:

```typescript
import { getSupabaseUserClient } from "@/lib/supabase/server";

export default async function ServerComponent() {
  const supabase = await getSupabaseUserClient();
  const { data } = await supabase.from("consultations").select("*");
  
  return <div>{/* ... */}</div>;
}
```

### 시나리오 3: 공개 데이터 조회

인증이 필요 없는 공개 데이터는 `createSupabaseBrowserClient()`를 사용:

```typescript
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();
const { data } = await supabase.from("products").select("*");
```

## 보안 고려사항

1. **JWT 만료 시간**: 기본 1시간으로 설정되어 있습니다. 필요에 따라 조정할 수 있습니다.

2. **토큰 저장**: JWT는 메모리에만 저장되며, 브라우저 저장소에 저장되지 않습니다.

3. **RLS 정책**: 클라이언트에서 생성한 Supabase 클라이언트는 RLS 정책이 적용됩니다.

4. **인증 실패 처리**: 인증되지 않은 사용자는 `null`을 반환하거나 에러를 발생시킵니다.

## 문제 해결

### 문제: `useSupabaseClient()`가 `null`을 반환합니다

**원인**:
- 사용자가 로그인하지 않음
- Clerk 인증 상태가 아직 로드되지 않음

**해결**:
```typescript
const supabase = useSupabaseClient();

if (!supabase) {
  return <div>Please sign in</div>;
}
```

### 문제: RLS 정책이 적용되지 않습니다

**원인**:
- `createSupabaseBrowserClient()`를 사용하고 있음
- JWT 토큰이 만료되었고 갱신되지 않음

**해결**:
- `useSupabaseClient()` 또는 `createSupabaseClientWithAuth()` 사용
- 토큰 갱신 로직 확인

### 문제: 토큰 갱신이 작동하지 않습니다

**원인**:
- API Route가 401 에러를 반환
- Clerk 세션이 만료됨

**해결**:
- Clerk 세션 상태 확인
- API Route 로그 확인

## 참고 문서

- `lib/supabase/server.ts`: 서버 측 Supabase 클라이언트
- `lib/supabase/jwt-helper.ts`: JWT 생성 유틸리티
- `docs/rls-activation-guide.md`: RLS 정책 활성화 가이드

