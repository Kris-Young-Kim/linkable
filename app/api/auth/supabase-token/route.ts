import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseJWT } from "@/lib/supabase/jwt-helper";

/**
 * GET /api/auth/supabase-token
 * 
 * Clerk 세션을 기반으로 Supabase JWT를 생성하여 반환합니다.
 * 클라이언트 측에서 Supabase 클라이언트를 생성할 때 사용됩니다.
 * 
 * @returns {Object} { token: string, expiresAt: number }
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    // JWT 옵션 설정
    const expiresIn = 3600; // 1시간
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
      expiresIn,
    };

    if (name) {
      jwtOptions.name = name;
    }

    // Supabase JWT 생성
    const supabaseJWT = createSupabaseJWT(userId, jwtOptions);

    // 만료 시간 계산 (현재 시간 + expiresIn 초)
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    return NextResponse.json({
      token: supabaseJWT,
      expiresAt,
    });
  } catch (error) {
    console.error("[Supabase Token API] Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate Supabase token" },
      { status: 500 }
    );
  }
}

