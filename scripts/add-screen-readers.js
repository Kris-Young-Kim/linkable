const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addScreenReaders() {
  try {
    const screenReaders = [
      {
        name: '센스리더 (Sense Reader)',
        iso_code: '22 03',
        category: '시각',
        manufacturer: '에이피에스',
        price: 550000,
        description: '국내 대표 화면 낭독 소프트웨어. 한글 TTS 엔진 내장으로 자연스러운 한국어 낭독 지원'
      },
      {
        name: 'NVDA (NonVisual Desktop Access)',
        iso_code: '22 03',
        category: '시각',
        manufacturer: 'NV Access',
        price: 0,
        description: '무료 오픈소스 화면 낭독기. 강력한 기능과 다양한 언어 지원'
      },
      {
        name: 'JAWS (Job Access With Speech)',
        iso_code: '22 03',
        category: '시각',
        manufacturer: 'Freedom Scientific',
        price: 1200000,
        description: '전 세계적으로 가장 많이 사용되는 상용 화면 낭독기. 기업용 기능 강화'
      },
      {
        name: 'VoiceOver (macOS 내장)',
        iso_code: '22 03',
        category: '시각',
        manufacturer: 'Apple',
        price: 0,
        description: 'macOS에 내장된 화면 낭독기. 별도 설치 없이 사용 가능'
      },
      {
        name: 'Narrator (Windows 내장)',
        iso_code: '22 03',
        category: '시각',
        manufacturer: 'Microsoft',
        price: 0,
        description: 'Windows 10/11에 내장된 화면 낭독기. 기본적인 낭독 기능 제공'
      }
    ];

    console.log('Adding screen reader products...');

    for (const product of screenReaders) {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error(`Error adding ${product.name}:`, error.message);
      } else {
        console.log(`✓ Added: ${product.name}`);
      }
    }

    console.log('Screen reader products addition completed.');

  } catch (err) {
    console.error('Exception:', err.message);
  }
}

addScreenReaders();