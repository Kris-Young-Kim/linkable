import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseJWT } from "./jwt-helper";
import { fetchWithRetry } from "../api-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
  throw new Error(`Supabase server client env vars are missing: ${missingVars.join(", ")}`);
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required for user client");
}

// 타입 안전성을 위해 명시적으로 string 타입으로 선언
// 위의 체크를 통과했으므로 undefined가 아님을 보장
const supabaseUrlString: string = supabaseUrl;
const serviceRoleKeyString: string = serviceRoleKey;
const supabaseAnonKeyString: string = supabaseAnonKey;

let cachedClient: SupabaseClient | null = null;

/**
 * Service Role Key를 사용하는 Supabase 클라이언트
 * RLS를 우회하므로 관리자 작업이나 시스템 작업에만 사용해야 합니다.
 */
export const getSupabaseServerClient = () => {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrlString, serviceRoleKeyString, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        // 일시적인 네트워크 오류 시 재시도하도록 커스텀 fetch 주입
        fetch: (url, init) => fetchWithRetry(url as string, init, {
          maxRetries: 3,
          initialDelay: 500
        })
      }
    });
  }

  return cachedClient;
};

/**
 * 사용자 인증 토큰을 사용하는 Supabase 클라이언트
 * Clerk JWT를 Supabase JWT로 변환하여 RLS 정책이 적용됩니다.
 *
 * @returns 사용자 인증이 적용된 Supabase 클라이언트
 * @throws {Error} 사용자가 인증되지 않은 경우
 *
 * @example
 * ```ts
 * const supabase = await getSupabaseUserClient()
 * // 이제 RLS 정책이 적용됩니다
 * const { data } = await supabase.from('consultations').select('*')
 * ```
 */
export async function getSupabaseUserClient(): Promise<SupabaseClient> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized: No Clerk user ID");
  }

  // Clerk 사용자 정보 가져오기
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    undefined;
  const name = user?.fullName ?? user?.username ?? undefined;
  // Supabase의 기본 role은 "authenticated"만 존재합니다.
  // 커스텀 role 정보는 app_metadata에 저장하되, JWT payload의 role은 항상 "authenticated"로 설정합니다.
  const userRole = (user?.publicMetadata?.role as string) || "user"; // 사용자 역할 정보 (app_metadata에 저장용)

  // Clerk 정보를 기반으로 Supabase JWT 생성
  const jwtOptions: {
    email?: string;
    role?: string;
    expiresIn?: number;
    name?: string;
    userRole?: string; // 실제 사용자 역할 (app_metadata에 저장)
  } = {
    email,
    role: "authenticated", // Supabase JWT의 role은 항상 "authenticated"
    userRole, // 실제 사용자 역할은 별도로 전달
    expiresIn: 3600, // 1시간
  };

  if (name) {
    jwtOptions.name = name;
  }

  const supabaseJWT = createSupabaseJWT(userId, jwtOptions);

  // JWT를 사용하여 Supabase 클라이언트 생성
  const client = createClient(supabaseUrlString, supabaseAnonKeyString, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseJWT}`,
      },
      // 일시적인 네트워크 오류 시 재시도하도록 커스텀 fetch 주입
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

  return client;
}
