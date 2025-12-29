/**
 * Supabase Edge Function: Clerk JWT를 Supabase JWT로 변환
 * 
 * 이 Edge Function은 Clerk 인증 정보를 받아서 Supabase JWT를 생성합니다.
 * 클라이언트나 다른 서비스에서 호출하여 RLS 정책이 적용된 Supabase 클라이언트를 생성할 수 있습니다.
 * 
 * @example
 * ```typescript
 * const response = await fetch('https://your-project.supabase.co/functions/v1/clerk-to-supabase-jwt', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${clerkSessionToken}`,
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     clerkUserId: 'user_xxx',
 *     email: 'user@example.com',
 *     role: 'user',
 *     name: 'User Name',
 *   }),
 * });
 * ```
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// 환경 변수
// Supabase는 자동으로 SUPABASE_URL과 SUPABASE_ANON_KEY를 제공합니다
// 하지만 명시적으로 설정할 수도 있습니다
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("ANON_KEY") || "";

// 환경 변수 검증
if (!SUPABASE_URL || !SUPABASE_JWT_SECRET || !SUPABASE_ANON_KEY) {
  console.error("[Edge Function] Missing required environment variables");
  console.error(`SUPABASE_URL: ${SUPABASE_URL ? "✓" : "✗"}`);
  console.error(`SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET ? "✓" : "✗"}`);
  console.error(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "✓" : "✗"}`);
  Deno.exit(1);
}

interface ClerkUserInfo {
  clerkUserId: string;
  email?: string;
  role?: string;
  name?: string;
}

interface SupabaseJWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  role?: string;
  clerk_id?: string;
  app_metadata?: {
    clerk_id?: string;
    role?: string;
  };
  user_metadata?: {
    email?: string;
    name?: string;
  };
}

/**
 * JWT 생성 함수 (Deno 표준 crypto 사용)
 */
async function createSupabaseJWT(
  clerkUserId: string,
  options?: {
    email?: string;
    role?: string;
    expiresIn?: number;
    name?: string;
  }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options?.expiresIn || 3600; // 기본 1시간

  // Supabase JWT의 role 필드는 PostgreSQL role과 매핑되므로 항상 "authenticated"로 설정
  // 실제 사용자 역할 정보는 app_metadata.role에 저장
  const jwtRole = "authenticated";
  const userRole = options?.role || "user"; // 실제 사용자 역할

  const payload: SupabaseJWTPayload = {
    aud: "authenticated",
    exp: now + expiresIn,
    iat: now,
    iss: SUPABASE_URL,
    sub: clerkUserId,
    email: options?.email,
    role: jwtRole, // 항상 "authenticated"로 설정 (PostgreSQL role)
    clerk_id: clerkUserId,
    app_metadata: {
      clerk_id: clerkUserId,
      role: userRole, // 실제 사용자 역할 정보 저장
    },
    user_metadata: {
      email: options?.email,
      name: options?.name,
    },
  };

  // JWT 헤더
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Base64 URL 인코딩
  const base64UrlEncode = (str: string): string => {
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // 서명 생성 (HMAC-SHA256)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SUPABASE_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

Deno.serve(async (req: Request) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST 요청만 허용
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 요청 본문 파싱
    const body: ClerkUserInfo = await req.json();

    // 필수 필드 검증
    if (!body.clerkUserId) {
      return new Response(
        JSON.stringify({ error: "clerkUserId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // JWT 생성
    // Supabase JWT의 role은 항상 "authenticated"로 설정되며,
    // 실제 사용자 역할 정보는 app_metadata.role에 저장됩니다.
    const expiresIn = 3600; // 1시간
    const userRole = body.role || "user"; // 실제 사용자 역할 정보
    const token = await createSupabaseJWT(body.clerkUserId, {
      email: body.email,
      role: userRole, // 이 값은 app_metadata.role에 저장됨 (JWT payload의 role은 항상 "authenticated")
      name: body.name,
      expiresIn,
    });

    // 만료 시간 계산
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    return new Response(
      JSON.stringify({
        token,
        expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Edge Function] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate Supabase JWT",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

