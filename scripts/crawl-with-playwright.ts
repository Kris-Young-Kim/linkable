#!/usr/bin/env tsx
/**
 * Playwright를 사용한 보조기기 크롤링 스크립트
 * 
 * 사용법:
 *   tsx scripts/crawl-with-playwright.ts --url "https://example.com/products" --max 10
 *   tsx scripts/crawl-with-playwright.ts --url "https://example.com/products" --iso-code "12 22" --save
 *   tsx scripts/crawl-with-playwright.ts --site ablelife --category "휠체어" --max 5
 */

// 환경 변수 로드
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';
import { PlaywrightScraper } from './crawlers/playwright-scraper';
import { getSiteConfig, type SiteConfig } from './crawlers/site-config';

interface CliOptions {
  url?: string;
  site?: string; // 사이트 이름 (ablelife, wheelopia 등)
  category?: string; // 카테고리
  isoCode?: string;
  max?: number;
  save?: boolean; // 데이터베이스에 저장
  headless?: boolean;
  useClickNavigation?: boolean; // 목록에서 실제 클릭으로 상세 이동 시도
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    max: 10,
    headless: true,
    useClickNavigation: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      options.url = args[i + 1];
      i++;
    } else if (args[i] === '--site' && args[i + 1]) {
      options.site = args[i + 1];
      i++;
    } else if (args[i] === '--category' && args[i + 1]) {
      options.category = args[i + 1];
      i++;
    } else if (args[i] === '--iso-code' && args[i + 1]) {
      options.isoCode = args[i + 1];
      i++;
    } else if (args[i] === '--max' && args[i + 1]) {
      options.max = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--save') {
      options.save = true;
    } else if (args[i] === '--headed') {
      options.headless = false;
    } else if (args[i] === '--click-nav') {
      options.useClickNavigation = true;
    }
  }

  return options;
}

async function saveToDatabase(products: any[], isoCode?: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.');
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log(`\n💾 데이터베이스에 저장 중... (${products.length}개 제품)`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      const { error } = await supabase.from('products').upsert(
        {
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          purchase_link: product.purchase_link,
          manufacturer: product.manufacturer,
          description: product.description,
          iso_code: isoCode || null,
          is_active: true,
        },
        {
          onConflict: 'purchase_link',
        }
      );

      if (error) {
        console.error(`  ❌ 저장 실패: ${product.name} - ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (error) {
      console.error(`  ❌ 저장 오류: ${product.name} - ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
  }

  console.log(`\n✅ 저장 완료: ${successCount}개 성공, ${errorCount}개 실패\n`);
}

async function main() {
  const options = parseArgs();

  console.log('\n' + '='.repeat(80));
  console.log('🔍 Playwright 크롤러 시작');
  console.log('='.repeat(80) + '\n');

  let url = options.url;
  let siteConfig: SiteConfig | null = null;

  // 사이트 이름으로 URL 결정
  if (options.site && !url) {
    siteConfig = getSiteConfig(options.site) ?? null;
    if (!siteConfig) {
      console.error(`❌ 사이트 설정을 찾을 수 없습니다: ${options.site}`);
      process.exit(1);
    }

    if (options.category && siteConfig.categoryUrls?.[options.category]) {
      url = siteConfig.categoryUrls[options.category];
      console.log(`✅ 카테고리 URL 사용: ${options.category}`);
    } else {
      url = siteConfig.baseUrl;
    }
  }

  if (!url) {
    console.error('❌ URL 또는 사이트 이름이 필요합니다.');
    console.error('사용법: --url "https://example.com" 또는 --site ablelife');
    process.exit(1);
  }

  const scraper = new PlaywrightScraper(siteConfig || undefined);

  try {
    // 브라우저 초기화
    await scraper.init(options.headless);

    // 제품 크롤링
    const products = await scraper.scrapeProducts();

    if (products.length === 0) {
      console.log('⚠️  추출된 제품이 없습니다.');
      process.exit(0);
    }

    // 결과 출력
    console.log('\n' + '='.repeat(80));
    console.log('📦 추출된 제품 정보');
    console.log('='.repeat(80) + '\n');

    products.forEach((product, index) => {
      console.log(`\n[${index + 1}] ${product.name}`);
      // 이하 필드는 stubbed scraper에서는 없으므로 출력 생략
      console.log(`   링크: ${product.purchase_link || ""}`);
    });

    // 데이터베이스에 저장
    if (options.save) {
      const scrapedProducts = products.map((p) => scraper.toScrapedProduct(p));
      await saveToDatabase(scrapedProducts, options.isoCode);
    } else {
      console.log('\n💡 --save 옵션을 추가하면 데이터베이스에 저장됩니다.');
    }

    console.log('\n✅ 크롤링 완료!\n');
  } catch (error) {
    console.error('\n❌ 크롤링 오류:', error);
    if (error instanceof Error) {
      console.error('   메시지:', error.message);
      console.error('   스택:', error.stack);
    }
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main().catch((error) => {
  console.error('❌ 예상치 못한 오류:', error);
  process.exit(1);
});

