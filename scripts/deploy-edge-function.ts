#!/usr/bin/env tsx
/**
 * Supabase Edge Function 배포 스크립트
 * 
 * 사용법:
 *   pnpm run deploy:edge-function
 * 
 * 또는 환경 변수와 함께:
 *   SUPABASE_PROJECT_REF=your-project-ref pnpm run deploy:edge-function
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// 환경 변수 로드 (.env.local 우선, 없으면 .env)
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
  console.log('📝 .env.local 파일에서 환경 변수 로드');
} else if (fs.existsSync(envPath)) {
  config({ path: envPath });
  console.log('📝 .env 파일에서 환경 변수 로드');
}

const EDGE_FUNCTION_NAME = 'clerk-to-supabase-jwt';
const EDGE_FUNCTION_PATH = path.join(process.cwd(), 'supabase', 'functions', EDGE_FUNCTION_NAME);

// 환경 변수 확인
function checkEnvironmentVariables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !jwtSecret || !anonKey) {
    console.error('❌ 다음 환경 변수가 설정되지 않았습니다:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL');
    if (!jwtSecret) console.error('   - SUPABASE_JWT_SECRET');
    if (!anonKey) console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 SUPABASE_ANON_KEY');
    console.error('\n💡 .env.local 파일에 다음을 추가하세요:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=your-project-url');
    console.error('   SUPABASE_JWT_SECRET=your-jwt-secret');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    console.error('\n⚠️  참고: SUPABASE_JWT_SECRET은 Supabase Dashboard > Settings > API > JWT Settings에서 확인하세요.');
    return false;
  }
  
  console.log('✅ 환경 변수 확인 완료');
  return true;
}

// Supabase CLI 확인 (npx 사용)
function checkSupabaseCLI() {
  try {
    execSync('npx supabase --version', { stdio: 'ignore' });
    console.log('✅ Supabase CLI 확인 (npx 사용)');
    return true;
  } catch (error) {
    try {
      execSync('supabase --version', { stdio: 'ignore' });
      console.log('✅ Supabase CLI 확인');
      return true;
    } catch (error2) {
      console.error('❌ Supabase CLI를 찾을 수 없습니다.');
      console.error('💡 npx supabase를 사용하거나 다음 명령어로 설치하세요:');
      console.error('   npm install -g supabase');
      return false;
    }
  }
}

// Edge Function 파일 확인
function checkEdgeFunctionFile() {
  const indexPath = path.join(EDGE_FUNCTION_PATH, 'index.ts');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ Edge Function 파일을 찾을 수 없습니다: ${indexPath}`);
    return false;
  }
  console.log('✅ Edge Function 파일 확인 완료');
  return true;
}

// Supabase CLI가 직접 설치되어 있는지 확인
function checkSupabaseCLIInstalled(): boolean {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Supabase 프로젝트 연결
function linkSupabaseProject(projectRef: string) {
  const useNpx = !checkSupabaseCLIInstalled();
  const cmd = useNpx ? 'npx supabase' : 'supabase';
  
  try {
    console.log(`🔗 Supabase 프로젝트 연결 중... (${projectRef})`);
    execSync(`${cmd} link --project-ref ${projectRef}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ 프로젝트 연결 완료');
    return true;
  } catch (error) {
    console.error('❌ 프로젝트 연결 실패');
    console.error('💡 수동으로 연결하세요:');
    console.error(`   ${cmd} link --project-ref ${projectRef}`);
    return false;
  }
}

// 환경 변수 설정 안내
function showSecretsSetupGuide() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'your-project-url';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key';
  
  console.log('\n📋 다음 단계: Supabase Dashboard에서 환경 변수 설정');
  console.log('   1. Supabase Dashboard 접속');
  console.log('   2. Settings → Edge Functions → Secrets 이동');
  console.log('   3. 다음 환경 변수 추가:');
  console.log(`      - SUPABASE_URL: ${supabaseUrl}`);
  console.log('      - SUPABASE_JWT_SECRET: Settings > API > JWT Settings에서 확인');
  console.log(`      - SUPABASE_ANON_KEY: ${anonKey}`);
  console.log('\n💡 또는 CLI로 설정:');
  console.log(`   supabase secrets set SUPABASE_URL="${supabaseUrl}"`);
  console.log('   supabase secrets set SUPABASE_JWT_SECRET="your-secret"');
  console.log(`   supabase secrets set SUPABASE_ANON_KEY="${anonKey}"`);
}

// Edge Function 배포
function deployEdgeFunction() {
  const useNpx = !checkSupabaseCLIInstalled();
  const cmd = useNpx ? 'npx supabase' : 'supabase';
  
  try {
    console.log(`\n🚀 Edge Function 배포 중... (${EDGE_FUNCTION_NAME})`);
    execSync(`${cmd} functions deploy ${EDGE_FUNCTION_NAME}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ 배포 완료!');
    return true;
  } catch (error) {
    console.error('❌ 배포 실패');
    console.error('💡 수동으로 배포하세요:');
    console.error(`   ${cmd} functions deploy ${EDGE_FUNCTION_NAME}`);
    return false;
  }
}

// 메인 실행
async function main() {
  console.log('🔧 Supabase Edge Function 배포 준비\n');
  
  // 1. 환경 변수 확인
  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  // 2. Supabase CLI 확인
  if (!checkSupabaseCLI()) {
    process.exit(1);
  }
  
  // 3. Edge Function 파일 확인
  if (!checkEdgeFunctionFile()) {
    process.exit(1);
  }
  
  // 4. 프로젝트 연결
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (projectRef) {
    if (!linkSupabaseProject(projectRef)) {
      console.log('\n⚠️  프로젝트 연결에 실패했지만 계속 진행합니다...');
      console.log('   이미 연결되어 있을 수 있습니다.');
    }
  } else {
    console.log('⚠️  SUPABASE_PROJECT_REF가 설정되지 않았습니다.');
    console.log('   이미 프로젝트가 연결되어 있다면 계속 진행됩니다.');
    console.log('   연결되지 않았다면 수동으로 연결하세요:');
    console.log('   supabase link --project-ref your-project-ref');
  }
  
  // 5. 환경 변수 설정 안내
  showSecretsSetupGuide();
  
  // 6. 배포 실행
  console.log('\n⏳ 배포를 시작합니다...\n');
  if (deployEdgeFunction()) {
    console.log('\n✅ 모든 작업 완료!');
    console.log('📝 다음 단계: 배포 후 테스트 스크립트 실행');
    console.log('   pnpm run test:edge-function');
  } else {
    process.exit(1);
  }
}

main().catch(console.error);

