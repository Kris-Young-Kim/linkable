#!/usr/bin/env tsx
/**
 * Clerk 설정 확인 스크립트
 * 
 * 이 스크립트는 Clerk 설정이 올바르게 구성되었는지 확인합니다.
 * 
 * 사용 방법:
 *   pnpm tsx scripts/check-clerk-config.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// .env.local 파일 로드
config({ path: resolve(process.cwd(), ".env.local") });

console.log("🔍 Clerk 설정 확인 중...\n");

// 1. 환경변수 확인
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;

console.log("📋 환경변수 확인:");
console.log(`  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${clerkPublishableKey ? "✅ 설정됨" : "❌ 설정되지 않음"}`);
console.log(`  CLERK_SECRET_KEY: ${clerkSecretKey ? "✅ 설정됨" : "❌ 설정되지 않음"}`);
console.log(`  NEXT_PUBLIC_CLERK_FRONTEND_API: ${clerkFrontendApi || "⚠️  설정되지 않음 (기본값 사용)"}`);

// 키 타입 확인 (테스트 vs 프로덕션)
const isTestKey = clerkPublishableKey?.startsWith("pk_test_");
const isProductionKey = clerkPublishableKey?.startsWith("pk_live_");

console.log("\n🔑 키 타입 확인:");
if (isTestKey) {
  console.log("  ✅ 테스트 키 사용 중 (개발 환경용)");
} else if (isProductionKey) {
  console.log("  ⚠️  프로덕션 키 사용 중");
  console.log("  ⚠️  localhost에서 사용 시 오류 발생 가능");
  console.log("  💡 개발 환경에서는 테스트 키(pk_test_...) 사용 권장");
} else {
  console.log("  ❓ 키 형식을 확인할 수 없습니다");
}

if (clerkFrontendApi) {
  // URL에서 프로토콜 제거 (이미 포함되어 있을 수 있음)
  const domain = clerkFrontendApi.replace(/^https?:\/\//, "");
  console.log(`\n🔗 Clerk Frontend API URL: ${clerkFrontendApi}`);
  console.log(`\n📝 OAuth 제공자별 Redirect URI (개발자 콘솔에 등록 필요):`);
  console.log(`   Google: https://${domain}/v1/oauth_callback`);
  console.log(`   Kakao:  https://${domain}/v1/oauth_callback`);
  console.log(`   Naver:  https://${domain}/v1/oauth_callback`);
  console.log(`\n   ⚠️  주의: https://dapi.clerk.com/v1/oauth_debug/callback 같은 디버그 URI는 사용하지 마세요`);
} else {
  console.log(`\n⚠️  NEXT_PUBLIC_CLERK_FRONTEND_API가 설정되지 않았습니다.`);
  console.log(`   Clerk 대시보드에서 Frontend API URL을 확인하고 환경변수에 설정하세요.`);
}

console.log("\n📚 다음 단계:");
console.log("1. Clerk 대시보드에서 소셜 로그인 설정 확인");
console.log("   - https://dashboard.clerk.com");
console.log("   - User & Authentication → Social Connections");
console.log("   - Google: Client ID와 Client Secret 확인");
console.log("   - Kakao: Client ID와 Client Secret 확인");
console.log("   - Naver: Client ID와 Client Secret 확인");
console.log("   - 리다이렉트 URI 확인");
console.log("\n2. OAuth 제공자별 설정 확인:");
console.log("   - Google: Google Cloud Console → APIs & Services → Credentials");
console.log("     → OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI 등록");
console.log("   - Kakao: https://developers.kakao.com");
console.log("     → 내 애플리케이션 → 카카오 로그인 → Redirect URI 등록");
console.log("   - Naver: https://developers.naver.com");
console.log("     → 내 애플리케이션 → API 설정 → 네이버 로그인 → Callback URL 등록");
console.log("     ⚠️  디버그 URI(https://dapi.clerk.com/v1/oauth_debug/callback) 제거 필수");
console.log("\n3. 설정 가이드 참고:");
console.log("   - Google: docs/google-oauth-setup-guide.md");
console.log("   - Kakao: docs/kakao-oauth-setup-guide.md");
console.log("   - Naver: docs/naver-oauth-setup-guide.md");