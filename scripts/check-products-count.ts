#!/usr/bin/env tsx
/**
 * products 테이블 데이터 개수 확인 스크립트
 * 
 * 사용법:
 *   pnpm tsx scripts/check-products-count.ts
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
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

// 서비스 롤 키가 있으면 사용 (RLS 우회), 없으면 anon key 사용
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Supabase 키가 설정되지 않았습니다.');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, supabaseKey);

if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log('🔑 서비스 롤 키 사용 (RLS 우회)\n');
} else {
  console.log('⚠️  Anon 키 사용 (RLS 정책 적용됨)\n');
}

async function checkProductsCount() {
  console.log('📊 products 테이블 데이터 확인 중...\n');

  try {
    // 전체 개수
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 활성/비활성 개수
    const { count: activeCount, error: activeError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) throw activeError;

    const { count: inactiveCount, error: inactiveError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    if (inactiveError) throw inactiveError;

    // ISO 코드별 개수 (상위 10개)
    const { data: isoCodeStats, error: isoError } = await supabase
      .from('products')
      .select('iso_code_id')
      .eq('is_active', true);

    if (isoError) throw isoError;

    const isoCodeCounts = isoCodeStats?.reduce((acc: Record<string, number>, item) => {
      const code = item.iso_code_id || 'null';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {}) || {};

    const topIsoCodes = Object.entries(isoCodeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    // 카테고리별 개수
    const { data: categoryStats, error: categoryError } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true);

    if (categoryError) throw categoryError;

    const categoryCounts = categoryStats?.reduce((acc: Record<string, number>, item) => {
      const category = item.category || 'null';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {}) || {};

    // 최신/오래된 레코드 날짜
    const { data: dateRange, error: dateError } = await supabase
      .from('products')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: newestRecord, error: newestError } = await supabase
      .from('products')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    // 결과 출력
    console.log('📈 전체 통계:');
    console.log(`   총 상품 수: ${totalCount?.toLocaleString()}개`);
    console.log(`   활성 상품: ${activeCount?.toLocaleString()}개`);
    console.log(`   비활성 상품: ${inactiveCount?.toLocaleString()}개`);
    console.log(`   활성 비율: ${totalCount ? ((activeCount || 0) / totalCount * 100).toFixed(1) : 0}%`);

    if (dateRange && dateRange.length > 0) {
      console.log(`\n📅 날짜 범위:`);
      console.log(`   가장 오래된 레코드: ${new Date(dateRange[0].created_at).toLocaleString('ko-KR')}`);
    }

    if (newestRecord && newestRecord.length > 0) {
      console.log(`   가장 최신 레코드: ${new Date(newestRecord[0].created_at).toLocaleString('ko-KR')}`);
    }

    console.log(`\n🏷️  ISO 코드 통계:`);
    console.log(`   고유 ISO 코드 수: ${Object.keys(isoCodeCounts).length}개`);
    if (topIsoCodes.length > 0) {
      console.log(`   상위 10개 ISO 코드:`);
      topIsoCodes.forEach(([code, count], index) => {
        console.log(`     ${index + 1}. ${code}: ${count}개`);
      });
    }

    console.log(`\n📂 카테고리 통계:`);
    console.log(`   고유 카테고리 수: ${Object.keys(categoryCounts).length}개`);
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);
    
    if (topCategories.length > 0) {
      console.log(`   상위 10개 카테고리:`);
      topCategories.forEach(([category, count], index) => {
        console.log(`     ${index + 1}. ${category || '(없음)'}: ${count}개`);
      });
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

checkProductsCount().catch(console.error);

