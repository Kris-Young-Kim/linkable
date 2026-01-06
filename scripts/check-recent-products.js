const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRecent() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('name, iso_code, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('Recent products:');
      data.forEach(p => console.log(`  ${p.name} (${p.iso_code}) - ${p.created_at}`));
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkRecent();