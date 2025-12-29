#!/usr/bin/env tsx
/**
 * iso_codes 테이블 데이터 삽입 스크립트
 * 
 * products 테이블의 iso_code를 기반으로 iso_codes 테이블에 데이터를 삽입합니다.
 * 
 * 사용법:
 *   pnpm tsx scripts/populate-iso-codes.ts
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (필수)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ISO 코드 이름 매핑 함수
function getIsoCodeName(code: string): string {
  if (!code) return '기타 보조기기';
  
  const codePrefix = code.trim().split(' ')[0];
  
  switch (codePrefix) {
    case '15':
      return '식사 보조기기';
    case '12':
      return '보행 보조기기';
    case '18':
      return '의사소통 보조기기';
    case '22':
      return '이동 보조기기';
    case '24':
      return '신체 자세 보조기기';
    case '09':
      return '개인 보호 및 안전 보조기기';
    case '06':
      return '개인 의료 보조기기';
    default:
      return '기타 보조기기';
  }
}

async function populateIsoCodes() {
  console.log('📊 iso_codes 테이블 데이터 삽입 시작...\n');

  try {
    // 1. products 테이블에서 고유한 iso_code 추출
    console.log('🔍 products 테이블에서 ISO 코드 추출 중...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('iso_code')
      .not('iso_code', 'is', null);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      console.log('⚠️  products 테이블에 iso_code가 있는 상품이 없습니다.');
      return;
    }

    // 고유한 ISO 코드 추출
    const uniqueIsoCodes = Array.from(new Set(products.map(p => p.iso_code).filter(Boolean)));
    console.log(`   발견된 고유 ISO 코드: ${uniqueIsoCodes.length}개`);
    console.log(`   ISO 코드 목록: ${uniqueIsoCodes.join(', ')}\n`);

    // 2. 기존 iso_codes 확인
    const { data: existingCodes, error: existingError } = await supabase
      .from('iso_codes')
      .select('code');

    if (existingError) {
      throw existingError;
    }

    const existingCodeSet = new Set(existingCodes?.map(c => c.code) || []);
    console.log(`📋 기존 iso_codes 테이블 데이터: ${existingCodeSet.size}개\n`);

    // 3. 새로운 ISO 코드만 삽입
    const codesToInsert = uniqueIsoCodes.filter(code => !existingCodeSet.has(code));

    if (codesToInsert.length === 0) {
      console.log('✅ 모든 ISO 코드가 이미 iso_codes 테이블에 있습니다.');
      return;
    }

    console.log(`➕ 삽입할 ISO 코드: ${codesToInsert.length}개\n`);

    // 4. ISO 코드 삽입
    const insertData = codesToInsert.map(code => ({
      code: code.trim(),
      name: getIsoCodeName(code),
      description: 'ISO 9999:2022 분류 코드',
      level: 1,
      is_active: true,
      display_order: 0
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('iso_codes')
      .insert(insertData)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ ${inserted?.length || 0}개의 ISO 코드가 삽입되었습니다.\n`);

    // 5. 기본 ISO 코드도 삽입 (마이그레이션에 있던 기본 코드들)
    const defaultCodes = [
      { code: '15 09', name: '식사 보조기기', description: '식사 및 음식 섭취를 위한 보조기기', level: 1, display_order: 1 },
      { code: '12 03', name: '보행 보조기기', description: '보행을 위한 보조기기', level: 1, display_order: 2 },
      { code: '18 03', name: '의사소통 보조기기', description: '의사소통을 위한 보조기기', level: 1, display_order: 3 },
      { code: '22 03', name: '이동 보조기기', description: '이동을 위한 보조기기', level: 1, display_order: 4 },
      { code: '24 03', name: '신체 자세 보조기기', description: '신체 자세 유지를 위한 보조기기', level: 1, display_order: 5 }
    ];

    const defaultCodesToInsert = defaultCodes.filter(dc => !existingCodeSet.has(dc.code) && !codesToInsert.includes(dc.code));
    
    if (defaultCodesToInsert.length > 0) {
      const { data: defaultInserted, error: defaultInsertError } = await supabase
        .from('iso_codes')
        .insert(defaultCodesToInsert.map(dc => ({
          ...dc,
          is_active: true
        })))
        .select();

      if (defaultInsertError) {
        console.error('⚠️  기본 ISO 코드 삽입 오류:', defaultInsertError.message);
      } else {
        console.log(`✅ 기본 ISO 코드 ${defaultInserted?.length || 0}개 삽입 완료\n`);
      }
    }

    // 6. 최종 결과 확인
    const { count: finalCount, error: finalError } = await supabase
      .from('iso_codes')
      .select('*', { count: 'exact', head: true });

    if (finalError) {
      throw finalError;
    }

    console.log('📊 최종 결과:');
    console.log(`   iso_codes 테이블 총 개수: ${finalCount}개\n`);

    // 7. products 테이블의 iso_code_id 업데이트 (선택적)
    console.log('🔗 products 테이블의 iso_code_id 업데이트를 진행하시겠습니까?');
    console.log('   (이 작업은 products 테이블의 iso_code를 기반으로 iso_code_id를 설정합니다)');
    console.log('   자동으로 진행합니다...\n');

    // iso_codes 테이블에서 모든 코드 가져오기
    const { data: allIsoCodes, error: allIsoError } = await supabase
      .from('iso_codes')
      .select('id, code');

    if (allIsoError) {
      throw allIsoError;
    }

    const codeToIdMap = new Map(allIsoCodes?.map(ic => [ic.code, ic.id]) || []);

    // products 테이블 업데이트
    let updatedCount = 0;
    for (const product of products) {
      if (product.iso_code && codeToIdMap.has(product.iso_code.trim())) {
        const isoCodeId = codeToIdMap.get(product.iso_code.trim());
        
        // 해당 상품의 id를 찾아서 업데이트
        const { data: productData, error: findError } = await supabase
          .from('products')
          .select('id')
          .eq('iso_code', product.iso_code)
          .is('iso_code_id', null)
          .limit(1);

        if (!findError && productData && productData.length > 0) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ iso_code_id: isoCodeId })
            .eq('id', productData[0].id)
            .is('iso_code_id', null);

          if (!updateError) {
            updatedCount++;
          }
        }
      }
    }

    // 더 효율적인 방법: 배치 업데이트
    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select('id, iso_code')
      .not('iso_code', 'is', null)
      .is('iso_code_id', null);

    if (!allProductsError && allProducts) {
      for (const product of allProducts) {
        if (product.iso_code && codeToIdMap.has(product.iso_code.trim())) {
          const isoCodeId = codeToIdMap.get(product.iso_code.trim());
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ iso_code_id: isoCodeId })
            .eq('id', product.id)
            .is('iso_code_id', null);

          if (!updateError) {
            updatedCount++;
          }
        }
      }
    }

    console.log(`✅ ${updatedCount}개 상품의 iso_code_id가 업데이트되었습니다.\n`);

    console.log('🎉 작업 완료!');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

populateIsoCodes().catch(console.error);


