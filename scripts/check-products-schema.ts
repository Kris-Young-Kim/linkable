#!/usr/bin/env tsx
/**
 * products 테이블 스키마 확인 스크립트
 * 
 * 사용법:
 *   pnpm tsx scripts/check-products-schema.ts
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

async function checkProductsSchema() {
  console.log('🔍 products 테이블 스키마 확인 중...\n');

  try {
    // 샘플 데이터 조회 (모든 컬럼 확인)
    const { data: sample, error: sampleError } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ 샘플 데이터 조회 오류:', sampleError.message);
      return;
    }

    if (!sample || sample.length === 0) {
      console.log('⚠️  products 테이블에 데이터가 없습니다.');
      return;
    }

    console.log('📋 products 테이블 컬럼 목록:');
    const columns = Object.keys(sample[0]);
    columns.forEach((col, index) => {
      const value = sample[0][col as keyof typeof sample[0]];
      const type = value === null ? 'null' : typeof value;
      console.log(`   ${index + 1}. ${col} (${type})`);
    });

    // ISO 관련 필드 확인
    console.log('\n🔍 ISO 관련 필드 확인:');
    const hasIsoCode = columns.includes('iso_code');
    const hasIsoCodeId = columns.includes('iso_code_id');
    
    console.log(`   iso_code 컬럼 존재: ${hasIsoCode ? '✅' : '❌'}`);
    console.log(`   iso_code_id 컬럼 존재: ${hasIsoCodeId ? '✅' : '❌'}`);

    if (hasIsoCode) {
      const { data: isoCodeData, error: isoError } = await supabase
        .from('products')
        .select('iso_code')
        .not('iso_code', 'is', null)
        .limit(5);

      if (isoError) {
        console.error('   iso_code 데이터 조회 오류:', isoError.message);
      } else {
        const { count: isoCodeCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .not('iso_code', 'is', null);

        console.log(`   iso_code가 있는 상품: ${isoCodeCount || 0}개`);
        if (isoCodeData && isoCodeData.length > 0) {
          console.log(`   샘플 iso_code 값:`);
          isoCodeData.forEach((item, idx) => {
            console.log(`     ${idx + 1}. ${item.iso_code}`);
          });
        }
      }
    }

    if (hasIsoCodeId) {
      const { data: isoCodeIdData, error: isoIdError } = await supabase
        .from('products')
        .select('iso_code_id')
        .not('iso_code_id', 'is', null)
        .limit(5);

      if (isoIdError) {
        console.error('   iso_code_id 데이터 조회 오류:', isoIdError.message);
      } else {
        const { count: isoCodeIdCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .not('iso_code_id', 'is', null);

        console.log(`   iso_code_id가 있는 상품: ${isoCodeIdCount || 0}개`);
      }
    }

    // 샘플 데이터 출력
    console.log('\n📄 샘플 데이터 (첫 번째 레코드):');
    console.log(JSON.stringify(sample[0], null, 2));

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

checkProductsSchema().catch(console.error);


