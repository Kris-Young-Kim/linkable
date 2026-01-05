// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Clerk 권장 형태: 기본 내보내기된 미들웨어
export default clerkMiddleware((auth, req: NextRequest) => {
  // Naver 인증 파일은 middleware를 건너뛰고 정적 파일로 서빙
  if (req.nextUrl.pathname === "/naver8a85ed79801e6a2c92dd412755d4999b.html") {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // 정적 파일과 Naver 인증 파일은 제외 (public 디렉토리에서 직접 서빙)
    "/((?!_next|naver8a85ed79801e6a2c92dd412755d4999b\\.html|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

