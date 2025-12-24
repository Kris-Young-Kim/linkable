"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { fetchWithRetry } from "../api-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase browser client env vars are missing");
}

interface TokenResponse {
  token: string;
  expiresAt: number;
}

/**
 * JWT 토큰 캐시 (메모리 기반)
 */
let tokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * API Route에서 Supabase JWT 토큰을 가져옵니다.
 * 
 * @returns {Promise<TokenResponse>} JWT 토큰과 만료 시간
 */
async function fetchSupabaseToken(): Promise<TokenResponse> {
  const response = await fetchWithRetry("/api/auth/supabase-token", {
    method: "GET",
  }, {
    maxRetries: 3,
    initialDelay: 500,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized: Please sign in");
    }
    throw new Error(`Failed to fetch Supabase token: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * JWT 토큰이 유효한지 확인합니다.
 * 
 * @param expiresAt 토큰 만료 시간 (Unix timestamp)
 * @returns {boolean} 토큰이 유효하면 true
 */
function isTokenValid(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  // 만료 5분 전까지 유효하다고 간주
  return expiresAt > now + 300;
}

/**
 * JWT 토큰을 가져오거나 갱신합니다.
 * 캐시된 토큰이 유효하면 재사용하고, 그렇지 않으면 새로 가져옵니다.
 * 
 * @returns {Promise<string>} Supabase JWT 토큰
 */
async function getSupabaseToken(): Promise<string> {
  // 캐시된 토큰이 있고 유효하면 재사용
  if (tokenCache && isTokenValid(tokenCache.expiresAt)) {
    return tokenCache.token;
  }

  // 새 토큰 가져오기
  const { token, expiresAt } = await fetchSupabaseToken();
  
  // 캐시 업데이트
  tokenCache = { token, expiresAt };
  
  return token;
}

/**
 * 기존 방식: anon key만 사용하는 Supabase 클라이언트
 * RLS 정책이 적용되지 않으므로, 인증이 필요 없는 공개 데이터에만 사용하세요.
 * 
 * @returns {SupabaseClient} Supabase 클라이언트
 */
export const createSupabaseBrowserClient = () =>
  createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: true,
    },
    global: {
      fetch: (url, init) => fetchWithRetry(url as string, init, {
        maxRetries: 3,
        initialDelay: 500
      })
    }
  });

/**
 * Clerk 인증을 사용하는 Supabase 클라이언트를 생성합니다.
 * RLS 정책이 적용됩니다.
 * 
 * @param token Supabase JWT 토큰 (선택적, 제공하지 않으면 자동으로 가져옵니다)
 * @returns {Promise<SupabaseClient>} 인증된 Supabase 클라이언트
 */
export async function createSupabaseClientWithAuth(
  token?: string
): Promise<SupabaseClient> {
  const jwt = token || (await getSupabaseToken());

  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      fetch: (url, init) => fetchWithRetry(url as string, init, {
        maxRetries: 3,
        initialDelay: 500
      })
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * React Hook: Clerk 인증을 사용하는 Supabase 클라이언트
 * 
 * @returns {SupabaseClient | null} 인증된 Supabase 클라이언트 (로딩 중이면 null)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const supabase = useSupabaseClient();
 *   
 *   useEffect(() => {
 *     if (!supabase) return;
 *     
 *     supabase
 *       .from('consultations')
 *       .select('*')
 *       .then(({ data }) => console.log(data));
 *   }, [supabase]);
 * }
 * ```
 */
export function useSupabaseClient(): SupabaseClient | null {
  const { isSignedIn, isLoaded } = useAuth();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshClient = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const newClient = await createSupabaseClientWithAuth();
      setClient(newClient);
    } catch (error) {
      console.error("[useSupabaseClient] Failed to create client:", error);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded]);

  useEffect(() => {
    refreshClient();
  }, [refreshClient]);

  // 토큰 갱신: 만료 5분 전에 자동 갱신
  useEffect(() => {
    if (!client || !isSignedIn) {
      return;
    }

    const checkAndRefreshToken = async () => {
      if (tokenCache && !isTokenValid(tokenCache.expiresAt)) {
        // 토큰이 곧 만료되면 갱신
        try {
          tokenCache = null; // 캐시 무효화
          await refreshClient();
        } catch (error) {
          console.error("[useSupabaseClient] Failed to refresh token:", error);
        }
      }
    };

    // 1분마다 토큰 유효성 확인
    const interval = setInterval(checkAndRefreshToken, 60000);

    return () => clearInterval(interval);
  }, [client, isSignedIn, refreshClient]);

  return isLoading ? null : client;
}
