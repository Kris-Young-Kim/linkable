const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProducts() {
  try {
    console.log('🔍 데이터베이스 제품 확인');

    // ISO 코드별 제품 수 확인
    const isoCodes = ['15 03', '22 03', '21 06', '12 31'];
    for (const isoCode of isoCodes) {
      const { data, error } = await supabase
        .from('products')
        .select('name, price, category')
        .eq('iso_code', isoCode)
        .limit(2);

      if (error) {
        console.error(`${isoCode} 오류:`, error.message);
      } else {
        console.log(`\n${isoCode} (${data.length}개):`);
        data.forEach(p => console.log(`  ${p.name} - ${p.price}원`));
      }
    }

    // 전체 제품 수 확인
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 전체 제품 수: ${count}`);

  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkProducts();