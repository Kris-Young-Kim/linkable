/**
 * Clerk JWT를 Supabase JWT로 변환하는 유틸리티
 * 
 * 이 모듈은 Clerk 인증 정보를 기반으로 Supabase JWT를 생성합니다.
 * 생성된 JWT는 RLS 정책에서 사용자 식별에 사용됩니다.
 */

import jwt from "jsonwebtoken"

/**
 * 환경변수 가져오기 (지연 로딩)
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required")
  }
  return url
}

function getSupabaseJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is required. Get it from Supabase Dashboard > Settings > API > JWT Settings")
  }
  return secret
}

interface SupabaseJWTPayload {
  aud: string
  exp: number
  iat: number
  iss: string
  sub: string
  email?: string
  role?: string
  clerk_id?: string
  app_metadata?: {
    clerk_id?: string
    role?: string
  }
  user_metadata?: {
    email?: string
    name?: string
  }
}

/**
 * Clerk 사용자 정보를 기반으로 Supabase JWT 생성
 * 
 * @param clerkUserId - Clerk 사용자 ID
 * @param options - 추가 옵션 (email, role, expiresIn)
 * @returns Supabase JWT 토큰 문자열
 * 
 * @example
 * ```ts
 * const token = createSupabaseJWT('user_123', {
 *   email: 'user@example.com',
 *   role: 'user',
 *   expiresIn: 3600 // 1시간
 * })
 * ```
 */
export function createSupabaseJWT(
  clerkUserId: string,
  options?: {
    email?: string
    role?: string
    expiresIn?: number
    name?: string | undefined
    userRole?: string // 실제 사용자 역할 (app_metadata에 저장)
  }
): string {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = options?.expiresIn || 3600 // 기본 1시간

  // Supabase JWT의 role 필드는 PostgreSQL role과 매핑되므로 항상 "authenticated"로 설정
  // 실제 사용자 역할 정보는 app_metadata.role에 저장
  const jwtRole = "authenticated"
  const userRole = options?.userRole || options?.role || "user" // 실제 사용자 역할

  const supabaseUrl = getSupabaseUrl()
  const supabaseJwtSecret = getSupabaseJwtSecret()

  const payload: SupabaseJWTPayload = {
    aud: "authenticated",
    exp: now + expiresIn,
    iat: now,
    iss: supabaseUrl,
    sub: clerkUserId, // Supabase user ID 대신 clerk_id 사용
    email: options?.email,
    role: jwtRole, // 항상 "authenticated"로 설정 (PostgreSQL role)
    clerk_id: clerkUserId, // 커스텀 클레임 - RLS 정책에서 사용
    app_metadata: {
      clerk_id: clerkUserId,
      role: userRole, // 실제 사용자 역할 정보 저장
    },
    user_metadata: {
      email: options?.email,
      name: options?.name,
    },
  }

  return jwt.sign(payload, supabaseJwtSecret, {
    algorithm: "HS256",
  })
}

/**
 * JWT 토큰 검증 (디버깅/테스트용)
 * 
 * @param token - 검증할 JWT 토큰
 * @returns 디코딩된 페이로드 또는 null
 */
export function verifySupabaseJWT(token: string): SupabaseJWTPayload | null {
  try {
    const supabaseJwtSecret = getSupabaseJwtSecret()
    const decoded = jwt.verify(token, supabaseJwtSecret, {
      algorithms: ["HS256"],
    }) as SupabaseJWTPayload

    return decoded
  } catch (error) {
    console.error("[JWT Helper] Token verification failed:", error)
    return null
  }
}

