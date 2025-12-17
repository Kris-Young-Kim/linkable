/**
 * WHO ICF Browser 전체 데이터 스크래핑 스크립트
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
  children?: IcfCode[];
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
      headless: false, // 디버깅을 위해 헤드리스 모드 비활성화
      slowMo: 200, // 동작 사이에 200ms 지연
    });
    this.page = await this.browser.newPage();
    
    // 페이지 로드 타임아웃 증가
    this.page.setDefaultTimeout(120000);
    
    console.log('✅ 브라우저 초기화 완료');
  }

  async navigateToIcfBrowser() {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');
    
    console.log('🌐 ICF Browser 접속 중...');
    await this.page.goto('https://apps.who.int/classifications/icfbrowser/Default.aspx', {
      waitUntil: 'networkidle',
    });
    
    // 페이지 로드 대기
    await this.page.waitForTimeout(5000);
    console.log('✅ ICF Browser 접속 완료');
  }

  /**
   * 카테고리 확장 및 모든 하위 노드 재귀적으로 수집
   */
  async expandCategoryAndCollectAll(
    category: 'b' | 's' | 'd' | 'e',
    categoryName: string
  ): Promise<IcfCode[]> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    console.log(`\n📂 카테고리 확장 시작: ${categoryName}`);

    // 1. 카테고리 확장 버튼 찾기 및 클릭
    try {
      // 여러 방법으로 확장 버튼 찾기 시도
      const expandSelectors = [
        `img[alt*="Expand ${category.toUpperCase()}"]`,
        `img[alt*="Expand ${categoryName}"]`,
        `a:has(img[alt*="Expand ${category.toUpperCase()}"])`,
        `a:has(img[alt*="Expand ${categoryName}"])`,
      ];

      let expanded = false;
      for (const selector of expandSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.count() > 0) {
            // img인 경우 부모 링크 클릭
            const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
            if (tagName === 'img') {
              await element.locator('xpath=..').click();
            } else {
              await element.click();
            }
            await this.page.waitForTimeout(3000);
            console.log(`  ✅ ${categoryName} 확장 완료`);
            expanded = true;
            break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
          continue;
        }
      }

      if (!expanded) {
        console.log(`  ⚠️  확장 버튼을 찾을 수 없습니다. JavaScript로 직접 확장 시도...`);
        // JavaScript로 직접 확장 시도
        await this.page.evaluate((cat) => {
          const img = Array.from(document.querySelectorAll('img')).find(
            (img) => img.alt && img.alt.includes(`Expand ${cat.toUpperCase()}`)
          );
          if (img && img.parentElement) {
            (img.parentElement as HTMLElement).click();
          }
        }, category);
        await this.page.waitForTimeout(3000);
      }
    } catch (error) {
      console.log(`  ⚠️  확장 시도 중 오류: ${error instanceof Error ? error.message : error}`);
    }

    // 2. JavaScript로 모든 하위 노드 찾기 (재귀적으로)
    const allCodes = await this.collectAllCodesRecursive(category, categoryName);
    
    return allCodes;
  }

  /**
   * 재귀적으로 모든 코드 수집
   */
  async collectAllCodesRecursive(
    category: 'b' | 's' | 'd' | 'e',
    categoryName: string
  ): Promise<IcfCode[]> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    const codes: IcfCode[] = [];
    const processedCodes = new Set<string>();

    // 먼저 모든 노드를 재귀적으로 확장
    console.log(`  🔄 모든 하위 노드 확장 중...`);
    await this.expandAllNodes(category);

    // JavaScript로 DOM에서 모든 코드 링크 추출
    const allLinks = await this.page.evaluate((cat) => {
      const results: Array<{ code: string; title: string; href: string; level: number }> = [];
      
      // 트리 뷰의 모든 링크 찾기
      const treeView = document.querySelector('[id*="ClassificationTreeView1"]');
      if (!treeView) {
        console.log('트리 뷰를 찾을 수 없습니다');
        return results;
      }

      // 모든 링크 찾기
      const allLinks = treeView.querySelectorAll<HTMLAnchorElement>('a');
      
      allLinks.forEach((link) => {
        const text = link.textContent?.trim() || '';
        const href = link.getAttribute('href') || '';
        
        // TreeItemSelected가 포함된 링크만 (실제 코드 링크)
        if (href && href.includes('TreeItemSelected')) {
          // 카테고리 코드로 시작하는 항목만 수집
          if (text.toLowerCase().startsWith(cat.toLowerCase())) {
            // 코드 패턴 매칭 (b1, b110, b1101 등)
            const codeMatch = text.match(/^([bsde]\d+(?:\.\d+)*)/i);
            if (codeMatch) {
              const code = codeMatch[1].toLowerCase();
              // 레벨 계산 (점의 개수로)
              const level = (code.match(/\./g) || []).length;
              
              results.push({
                code,
                title: text,
                href,
                level,
              });
            }
          }
        }
      });
      
      // 중복 제거
      const uniqueResults = Array.from(
        new Map(results.map(item => [item.code, item])).values()
      );
      
      // 레벨과 코드 순서로 정렬
      uniqueResults.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.code.localeCompare(b.code);
      });
      
      return uniqueResults;
    }, category);

    console.log(`  📋 발견된 코드 링크: ${allLinks.length}개`);

    // 각 코드의 상세 정보 수집
    for (let i = 0; i < allLinks.length; i++) {
      const item = allLinks[i];
      
      // 중복 제거
      if (processedCodes.has(item.code)) {
        continue;
      }
      processedCodes.add(item.code);

      console.log(`  [${i + 1}/${allLinks.length}] 처리 중: ${item.code} - ${item.title.substring(0, 50)}...`);

      try {
        // 코드 링크 클릭 (href를 이스케이프하여 사용)
        const escapedHref = item.href.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
        
        // 여러 방법으로 링크 찾기 시도
        let codeLink = await this.page.locator(`a[href*="${item.code}"][href*="TreeItemSelected"]`).first();
        
        if (!(await codeLink.count())) {
          // 대체 방법: JavaScript로 직접 클릭
          await this.page.evaluate((href) => {
            const link = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
            if (link) {
              link.click();
            }
          }, item.href);
        } else {
          await codeLink.click();
        }
        
        await this.page.waitForTimeout(2000);
        
        // 상세 정보 추출
        const details = await this.extractCodeDetails();
        
        codes.push({
          code: item.code,
          title: item.title,
          ...details,
        });

        // 진행 상황 표시 (100개마다)
        if ((i + 1) % 100 === 0) {
          console.log(`    📊 진행률: ${i + 1}/${allLinks.length} (${Math.round((i + 1) / allLinks.length * 100)}%)`);
        }
      } catch (error) {
        console.error(`    ⚠️  ${item.code} 처리 실패:`, error instanceof Error ? error.message : error);
        // 오류가 있어도 기본 정보는 추가
        codes.push({
          code: item.code,
          title: item.title,
        });
      }
    }

    return codes;
  }

  /**
   * 모든 노드를 재귀적으로 확장
   */
  async expandAllNodes(category: 'b' | 's' | 'd' | 'e') {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    let hasMore = true;
    let iterations = 0;
    const maxIterations = 50; // 무한 루프 방지

    while (hasMore && iterations < maxIterations) {
      iterations++;
      
      const expanded = await this.page.evaluate((cat) => {
        // 확장 가능한 모든 노드 찾기 (해당 카테고리 내)
        const expandImgs = Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter(
          (img) => {
            const alt = img.alt || '';
            return alt.includes('Expand') && alt.toLowerCase().includes(cat.toLowerCase());
          }
        );

        if (expandImgs.length === 0) {
          return false;
        }

        // 첫 번째 확장 가능한 노드 클릭
        const firstImg = expandImgs[0];
        if (firstImg.parentElement) {
          (firstImg.parentElement as HTMLElement).click();
          return true;
        }

        return false;
      }, category);

      if (expanded) {
        await this.page.waitForTimeout(2000);
      } else {
        hasMore = false;
      }
    }

    console.log(`  ✅ 노드 확장 완료 (${iterations}회 반복)`);
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
      // 설명 추출 (여러 가능한 셀렉터 시도)
      const descriptionSelectors = [
        '#ContentPlaceHolder1_DescriptionLabel',
        '[id*="DescriptionLabel"]',
        'td:has-text("Description")',
      ];

      for (const selector of descriptionSelectors) {
        const descEl = await this.page.locator(selector).first();
        if (await descEl.count()) {
          const text = (await descEl.textContent())?.trim();
          if (text && text.length > 0 && !text.includes('Description')) {
            details.description = text;
            break;
          }
        }
      }

      // Inclusions 추출
      const inclusionsSelectors = [
        '#ContentPlaceHolder1_InclusionsLabel',
        '[id*="InclusionsLabel"]',
        'td:has-text("Inclusions")',
      ];

      for (const selector of inclusionsSelectors) {
        const incEl = await this.page.locator(selector).first();
        if (await incEl.count()) {
          const text = (await incEl.textContent())?.trim();
          if (text && text.length > 0 && !text.includes('Inclusions')) {
            details.inclusions = text
              .split(/[;\n•]/)
              .map((item) => item.trim())
              .filter((item) => item.length > 0 && !item.toLowerCase().includes('inclusions'));
            break;
          }
        }
      }

      // Exclusions 추출
      const exclusionsSelectors = [
        '#ContentPlaceHolder1_ExclusionsLabel',
        '[id*="ExclusionsLabel"]',
        'td:has-text("Exclusions")',
      ];

      for (const selector of exclusionsSelectors) {
        const excEl = await this.page.locator(selector).first();
        if (await excEl.count()) {
          const text = (await excEl.textContent())?.trim();
          if (text && text.length > 0 && !text.includes('Exclusions')) {
            details.exclusions = text
              .split(/[;\n•]/)
              .map((item) => item.trim())
              .filter((item) => item.length > 0 && !item.toLowerCase().includes('exclusions'));
            break;
          }
        }
      }
    } catch (error) {
      // 상세 정보 추출 실패는 무시 (기본 정보만이라도 저장)
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
        const codes = await this.expandCategoryAndCollectAll(cat.code, cat.name);
        
        this.allData.push({
          category: cat.code,
          name: cat.name,
          codes,
        });

        console.log(`\n✅ ${cat.name}: ${codes.length}개 코드 수집 완료`);
      } catch (error) {
        console.error(`❌ ${cat.name} 수집 실패:`, error);
        // 오류가 있어도 빈 배열이라도 추가
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

