// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return clerkMiddleware()(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

