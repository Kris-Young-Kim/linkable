#!/usr/bin/env tsx
/**
 * Supabase Edge Function 테스트 스크립트
 * 
 * 사용법:
 *   pnpm run test:edge-function
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const EDGE_FUNCTION_NAME = 'clerk-to-supabase-jwt';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 SUPABASE_ANON_KEY');
  console.error('\n💡 .env.local 파일에 환경 변수를 설정하세요.');
  process.exit(1);
}

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`;

interface TestCase {
  name: string;
  data: {
    clerkUserId: string;
    email?: string;
    role?: string;
    name?: string;
  };
  expectedStatus: number;
}

const testCases: TestCase[] = [
  {
    name: '정상 요청 - 모든 필드 포함',
    data: {
      clerkUserId: 'user_test_123',
      email: 'test@example.com',
      role: 'user',
      name: 'Test User',
    },
    expectedStatus: 200,
  },
  {
    name: '정상 요청 - 최소 필드만',
    data: {
      clerkUserId: 'user_test_456',
    },
    expectedStatus: 200,
  },
  {
    name: '실패 케이스 - clerkUserId 누락',
    data: {
      email: 'test@example.com',
    } as any,
    expectedStatus: 400,
  },
];

async function testEdgeFunction() {
  console.log('🧪 Edge Function 테스트 시작\n');
  console.log(`📍 엔드포인트: ${EDGE_FUNCTION_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📝 테스트: ${testCase.name}`);
    
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === testCase.expectedStatus) {
        console.log(`   ✅ 통과 (상태: ${response.status})`);
        if (response.status === 200 && result.token) {
          console.log(`   📦 JWT 토큰 생성됨 (길이: ${result.token.length})`);
          if (result.expiresAt) {
            console.log(`   ⏰ 만료 시간: ${new Date(result.expiresAt * 1000).toISOString()}`);
          }
        }
        passed++;
      } else {
        console.log(`   ❌ 실패 (예상: ${testCase.expectedStatus}, 실제: ${response.status})`);
        console.log(`   📄 응답:`, JSON.stringify(result, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 에러:`, error instanceof Error ? error.message : String(error));
      failed++;
    }
    
    console.log('');
  }

  // CORS 테스트
  console.log('📝 테스트: CORS Preflight (OPTIONS)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
    };

    if (response.status === 200 || response.status === 204) {
      console.log('   ✅ CORS 헤더 확인됨');
      console.log('   📦 CORS 헤더:', JSON.stringify(corsHeaders, null, 2));
      passed++;
    } else {
      console.log(`   ❌ CORS 실패 (상태: ${response.status})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ CORS 에러:`, error instanceof Error ? error.message : String(error));
    failed++;
  }

  // GET 메서드 거부 테스트
  console.log('📝 테스트: GET 메서드 거부');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (response.status === 405) {
      console.log('   ✅ GET 메서드 올바르게 거부됨 (405 Method Not Allowed)');
      passed++;
    } else {
      console.log(`   ❌ 예상: 405, 실제: ${response.status}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ 에러:`, error instanceof Error ? error.message : String(error));
    failed++;
  }

  console.log('\n📊 테스트 결과');
  console.log(`   ✅ 통과: ${passed}`);
  console.log(`   ❌ 실패: ${failed}`);
  console.log(`   📈 성공률: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  일부 테스트가 실패했습니다. Edge Function 배포 및 환경 변수 설정을 확인하세요.');
    process.exit(1);
  } else {
    console.log('\n🎉 모든 테스트 통과!');
  }
}

testEdgeFunction().catch(console.error);

