const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkVisualAids() {
  try {
    console.log('Checking 22 03 visual aid products...');

    const { data, error } = await supabase
      .from('products')
      .select('name, iso_code, category')
      .eq('iso_code', '22 03')
      .limit(5);

    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log(`Found ${data.length} products with ISO code 22 03:`);
      data.forEach(p => console.log(`  - ${p.name}`));
    }

    // 화면 낭독 관련 제품 검색
    const { data: readerData, error: readerError } = await supabase
      .from('products')
      .select('name, iso_code, category')
      .ilike('name', '%낭독%')
      .limit(3);

    if (!readerError && readerData.length > 0) {
      console.log('\nScreen reader products found:');
      readerData.forEach(p => console.log(`  - ${p.name} (${p.iso_code})`));
    } else {
      console.log('\nNo screen reader products found in database');
    }

  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkVisualAids();