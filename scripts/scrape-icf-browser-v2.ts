/**
 * WHO ICF Browser 전체 데이터 스크래핑 스크립트 (개선 버전)
 * 
 * B (Body Functions), S (Body Structures), D (Activities and Participation), E (Environmental Factors)
 * 전체 ICF 코드를 수집하여 마크다운 파일로 저장합니다.
 */

import { chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface IcfCode {
  code: string;
  title: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
}

interface IcfCategory {
  category: 'b' | 's' | 'd' | 'e';
  name: string;
  codes: IcfCode[];
}

class IcfBrowserScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private allData: IcfCategory[] = [];

  async init() {
    console.log('🚀 브라우저 초기화 중...');
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 300,
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(120000);
    console.log('✅ 브라우저 초기화 완료');
  }

  async navigateToIcfBrowser() {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');
    
    console.log('🌐 ICF Browser 접속 중...');
    await this.page.goto('https://apps.who.int/classifications/icfbrowser/Default.aspx', {
      waitUntil: 'domcontentloaded',
    });
    await this.page.waitForTimeout(5000);
    console.log('✅ ICF Browser 접속 완료');
  }

  /**
   * 카테고리 확장 및 코드 수집
   */
  async collectCategoryData(
    category: 'b' | 's' | 'd' | 'e',
    categoryName: string
  ): Promise<IcfCode[]> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    console.log(`\n📂 카테고리 처리 시작: ${categoryName}`);

    // 페이지 새로고침하여 깨끗한 상태로 시작
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);

    // 카테고리 확장
    await this.expandCategory(category, categoryName);

    // 모든 코드 수집
    const codes = await this.collectAllCodesInCategory(category);
    
    return codes;
  }

  /**
   * 카테고리 확장
   */
  async expandCategory(category: 'b' | 's' | 'd' | 'e', categoryName: string) {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    try {
      // 확장 이미지 찾기
      const expandImg = await this.page.locator(
        `img[alt*="Expand ${category.toUpperCase()}"]`
      ).first();

      if (await expandImg.count() > 0) {
        // 부모 링크 클릭
        const parentLink = expandImg.locator('xpath=..');
        await parentLink.click();
        await this.page.waitForTimeout(3000);
        console.log(`  ✅ ${categoryName} 확장 완료`);
      } else {
        // JavaScript로 직접 찾아서 클릭
        await this.page.evaluate((cat) => {
          const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
          const expandImg = imgs.find(img => {
            const alt = img.alt || '';
            return alt.includes('Expand') && alt.toUpperCase().includes(cat.toUpperCase());
          });
          if (expandImg && expandImg.parentElement) {
            (expandImg.parentElement as HTMLElement).click();
          }
        }, category);
        await this.page.waitForTimeout(3000);
        console.log(`  ✅ ${categoryName} 확장 완료 (JavaScript)`);
      }

      // 모든 하위 노드도 확장
      await this.expandAllSubNodes(category);
    } catch (error) {
      console.error(`  ⚠️  확장 오류: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 모든 하위 노드 확장
   */
  async expandAllSubNodes(category: 'b' | 's' | 'd' | 'e') {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    let expandedCount = 0;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      const found = await this.page.evaluate((cat) => {
        // 해당 카테고리의 확장 가능한 노드 찾기
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
        const expandImgs = imgs.filter(img => {
          const alt = img.alt || '';
          return alt.includes('Expand') && 
                 alt.toLowerCase().includes(cat.toLowerCase()) &&
                 !alt.includes('Collapse');
        });

        if (expandImgs.length > 0) {
          const firstImg = expandImgs[0];
          if (firstImg.parentElement) {
            (firstImg.parentElement as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, category);

      if (found) {
        expandedCount++;
        await this.page.waitForTimeout(1500);
      } else {
        break;
      }
    }

    console.log(`  📊 하위 노드 확장: ${expandedCount}개`);
  }

  /**
   * 카테고리 내 모든 코드 수집
   */
  async collectAllCodesInCategory(category: 'b' | 's' | 'd' | 'e'): Promise<IcfCode[]> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    const codes: IcfCode[] = [];
    const processedCodes = new Set<string>();

    // DOM에서 모든 코드 링크 추출
    const allLinks = await this.page.evaluate((cat) => {
      const results: Array<{ code: string; title: string; href: string }> = [];
      
      // 모든 링크 찾기
      const allLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="TreeItemSelected"]');
      
      allLinks.forEach((link) => {
        const text = link.textContent?.trim() || '';
        const href = link.getAttribute('href') || '';
        
        if (!text || !href) return;
        
        // 카테고리로 시작하는 항목만
        const lowerText = text.toLowerCase();
        const lowerCat = cat.toLowerCase();
        
        if (lowerText.startsWith(lowerCat)) {
          // 코드 패턴 매칭
          const codeMatch = text.match(/^([bsde]\d+(?:\.\d+)*)/i);
          if (codeMatch) {
            const code = codeMatch[1].toLowerCase();
            results.push({ code, title: text, href });
          }
        }
      });
      
      // 중복 제거 및 정렬
      const unique = Array.from(new Map(results.map(r => [r.code, r])).values());
      unique.sort((a, b) => a.code.localeCompare(b.code));
      
      return unique;
    }, category);

    console.log(`  📋 발견된 코드: ${allLinks.length}개`);

    // 각 코드의 상세 정보 수집
    for (let i = 0; i < allLinks.length; i++) {
      const item = allLinks[i];
      
      if (processedCodes.has(item.code)) continue;
      processedCodes.add(item.code);

      if ((i + 1) % 50 === 0) {
        console.log(`  📊 진행률: ${i + 1}/${allLinks.length} (${Math.round((i + 1) / allLinks.length * 100)}%)`);
      }

      try {
        // 링크 클릭하여 상세 정보 로드
        await this.page.evaluate((href) => {
          const link = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
          if (link) {
            link.click();
          }
        }, item.href);

        await this.page.waitForTimeout(2000);

        // 상세 정보 추출
        const details = await this.extractCodeDetails();
        
        codes.push({
          code: item.code,
          title: item.title,
          ...details,
        });

      } catch (error) {
        console.error(`    ⚠️  ${item.code} 처리 실패:`, error instanceof Error ? error.message : error);
        codes.push({
          code: item.code,
          title: item.title,
        });
      }
    }

    return codes;
  }

  /**
   * 현재 선택된 코드의 상세 정보 추출
   */
  async extractCodeDetails(): Promise<{
    description?: string;
    inclusions?: string[];
    exclusions?: string[];
  }> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    const details: {
      description?: string;
      inclusions?: string[];
      exclusions?: string[];
    } = {};

    try {
      // JavaScript로 직접 DOM에서 추출
      const extracted = await this.page.evaluate(() => {
        const result: any = {};

        // Description 찾기
        const descLabels = Array.from(document.querySelectorAll('td, span, div')).filter(el => {
          const text = el.textContent || '';
          return text.includes('Description') && el.nextElementSibling;
        });
        if (descLabels.length > 0) {
          const descText = descLabels[0].nextElementSibling?.textContent?.trim();
          if (descText && descText.length > 0) {
            result.description = descText;
          }
        }

        // Inclusions 찾기
        const incLabels = Array.from(document.querySelectorAll('td, span, div')).filter(el => {
          const text = el.textContent || '';
          return text.includes('Inclusions') && el.nextElementSibling;
        });
        if (incLabels.length > 0) {
          const incText = incLabels[0].nextElementSibling?.textContent?.trim();
          if (incText && incText.length > 0) {
            result.inclusions = incText.split(/[;\n•]/).map(s => s.trim()).filter(s => s.length > 0);
          }
        }

        // Exclusions 찾기
        const excLabels = Array.from(document.querySelectorAll('td, span, div')).filter(el => {
          const text = el.textContent || '';
          return text.includes('Exclusions') && el.nextElementSibling;
        });
        if (excLabels.length > 0) {
          const excText = excLabels[0].nextElementSibling?.textContent?.trim();
          if (excText && excText.length > 0) {
            result.exclusions = excText.split(/[;\n•]/).map(s => s.trim()).filter(s => s.length > 0);
          }
        }

        return result;
      });

      if (extracted.description) details.description = extracted.description;
      if (extracted.inclusions) details.inclusions = extracted.inclusions;
      if (extracted.exclusions) details.exclusions = extracted.exclusions;

    } catch (error) {
      // 상세 정보 추출 실패는 무시
    }

    return details;
  }

  /**
   * 모든 카테고리 데이터 수집
   */
  async collectAllData() {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    console.log('\n📊 데이터 수집 시작...\n');

    const categories: Array<{ code: 'b' | 's' | 'd' | 'e'; name: string }> = [
      { code: 'b', name: 'BODY FUNCTIONS' },
      { code: 's', name: 'BODY STRUCTURES' },
      { code: 'd', name: 'ACTIVITIES AND PARTICIPATION' },
      { code: 'e', name: 'ENVIRONMENTAL FACTORS' },
    ];

    for (const cat of categories) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 카테고리: ${cat.name} (${cat.code.toUpperCase()})`);
      console.log('='.repeat(80));

      try {
        const codes = await this.collectCategoryData(cat.code, cat.name);
        
        this.allData.push({
          category: cat.code,
          name: cat.name,
          codes,
        });

        console.log(`\n✅ ${cat.name}: ${codes.length}개 코드 수집 완료`);
      } catch (error) {
        console.error(`❌ ${cat.name} 수집 실패:`, error);
        this.allData.push({
          category: cat.code,
          name: cat.name,
          codes: [],
        });
      }
    }
  }

  /**
   * 마크다운 파일 생성
   */
  generateMarkdown(): string {
    let md = `# ICF (International Classification of Functioning, Disability and Health) 전체 코드 목록\n\n`;
    md += `**생성일**: ${new Date().toISOString()}\n`;
    md += `**출처**: [WHO ICF Browser](https://apps.who.int/classifications/icfbrowser/Default.aspx)\n\n`;
    md += `---\n\n`;

    for (const category of this.allData) {
      md += `## ${category.category.toUpperCase()}. ${category.name}\n\n`;
      md += `**총 코드 수**: ${category.codes.length}개\n\n`;

      for (const code of category.codes) {
        md += `### ${code.code.toUpperCase()}: ${code.title}\n\n`;
        
        if (code.description) {
          md += `**설명**: ${code.description}\n\n`;
        }

        if (code.inclusions && code.inclusions.length > 0) {
          md += `**포함 항목 (Inclusions)**:\n`;
          for (const inclusion of code.inclusions) {
            md += `- ${inclusion}\n`;
          }
          md += `\n`;
        }

        if (code.exclusions && code.exclusions.length > 0) {
          md += `**제외 항목 (Exclusions)**:\n`;
          for (const exclusion of code.exclusions) {
            md += `- ${exclusion}\n`;
          }
          md += `\n`;
        }

        md += `---\n\n`;
      }
    }

    return md;
  }

  async saveToMarkdown(outputPath: string) {
    const md = this.generateMarkdown();
    fs.writeFileSync(outputPath, md, 'utf-8');
    console.log(`\n✅ 마크다운 파일 저장 완료: ${outputPath}`);
    console.log(`📄 총 ${this.allData.reduce((sum, cat) => sum + cat.codes.length, 0)}개 코드 수집됨`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 브라우저 종료');
    }
  }
}

async function main() {
  const scraper = new IcfBrowserScraper();

  try {
    await scraper.init();
    await scraper.navigateToIcfBrowser();
    await scraper.collectAllData();
    
    const outputPath = path.join(process.cwd(), 'docs', 'icf-full-catalog.md');
    await scraper.saveToMarkdown(outputPath);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();

