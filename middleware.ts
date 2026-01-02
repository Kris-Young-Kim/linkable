// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk 권장 형태: 기본 내보내기된 미들웨어
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

