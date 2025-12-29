#!/usr/bin/env tsx
/**
 * iso_codes 테이블 데이터 확인 스크립트
 * 
 * 사용법:
 *   pnpm tsx scripts/check-iso-codes.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// 환경 변수 로드
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Supabase 키가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, supabaseKey);

async function checkIsoCodes() {
  console.log('📊 iso_codes 테이블 확인 중...\n');

  try {
    // 테이블 존재 여부 확인
    const { data: tables, error: tablesError } = await supabase
      .from('iso_codes')
      .select('*', { count: 'exact', head: true });

    if (tablesError) {
      console.error('❌ iso_codes 테이블 접근 오류:', tablesError.message);
      console.error('   테이블이 존재하지 않거나 접근 권한이 없을 수 있습니다.');
      return;
    }

    // 전체 개수
    const { count: totalCount, error: countError } = await supabase
      .from('iso_codes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 개수 조회 오류:', countError.message);
      return;
    }

    console.log(`📈 전체 통계:`);
    console.log(`   총 ISO 코드 수: ${totalCount || 0}개\n`);

    if (totalCount === 0) {
      console.log('⚠️  iso_codes 테이블에 데이터가 없습니다.\n');
      
      // 테이블 구조 확인
      console.log('🔍 테이블 구조 확인 중...');
      const { data: sample, error: sampleError } = await supabase
        .from('iso_codes')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('   테이블 구조 확인 오류:', sampleError.message);
      } else {
        console.log('   테이블은 존재하지만 데이터가 없습니다.');
      }

      // products 테이블에서 iso_code_id 사용 현황 확인
      console.log('\n🔍 products 테이블의 iso_code_id 사용 현황:');
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('iso_code_id');

      if (productsError) {
        console.error('   products 테이블 조회 오류:', productsError.message);
      } else {
        const isoCodeUsage = products?.reduce((acc: Record<string, number>, item) => {
          const code = item.iso_code_id || 'null';
          acc[code] = (acc[code] || 0) + 1;
          return acc;
        }, {}) || {};

        console.log(`   products에서 사용 중인 iso_code_id:`);
        Object.entries(isoCodeUsage).forEach(([code, count]) => {
          console.log(`     - ${code}: ${count}개 상품`);
        });
      }
    } else {
      // 데이터가 있는 경우 샘플 조회
      const { data: samples, error: samplesError } = await supabase
        .from('iso_codes')
        .select('*')
        .limit(10);

      if (samplesError) {
        console.error('❌ 샘플 데이터 조회 오류:', samplesError.message);
      } else {
        console.log('📋 샘플 데이터 (최대 10개):');
        samples?.forEach((item, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(item, null, 2)}`);
        });
      }
    }

    // 관련 테이블 확인
    console.log('\n🔍 관련 테이블 확인:');
    
    // products 테이블에서 iso_code_id 참조 확인
    const { data: productsWithIso, error: productsIsoError } = await supabase
      .from('products')
      .select('iso_code_id')
      .not('iso_code_id', 'is', null)
      .limit(1);

    if (productsIsoError) {
      console.error('   products 테이블 조회 오류:', productsIsoError.message);
    } else {
      const { count: productsWithIsoCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('iso_code_id', 'is', null);

      console.log(`   products에서 iso_code_id를 사용하는 상품: ${productsWithIsoCount || 0}개`);
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

checkIsoCodes().catch(console.error);


