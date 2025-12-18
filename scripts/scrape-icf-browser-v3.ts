/**
 * WHO ICF Browser 전체 데이터 스크래핑 스크립트 (최종 버전)
 * 
 * 네트워크 요청을 모니터링하고 ViewState를 처리하여 데이터 수집
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
  private networkRequests: any[] = [];

  async init() {
    console.log('🚀 브라우저 초기화 중...');
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 500,
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(180000);
    
    // 네트워크 요청 모니터링
    this.page.on('request', (request) => {
      if (request.url().includes('Default.aspx') || request.url().includes('__doPostBack')) {
        this.networkRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
        });
      }
    });
    
    console.log('✅ 브라우저 초기화 완료');
  }

  async navigateToIcfBrowser() {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');
    
    console.log('🌐 ICF Browser 접속 중...');
    await this.page.goto('https://apps.who.int/classifications/icfbrowser/Default.aspx', {
      waitUntil: 'domcontentloaded',
    });
    await this.page.waitForTimeout(5000);
    
    // ICF - English 선택 (ICF 2017 - English가 아닌 ICF - English)
    console.log('🌐 언어 선택: ICF - English');
    try {
      // combobox 찾기
      const combobox = await this.page.locator('[role="combobox"]').first();
      if (await combobox.count() > 0) {
        await combobox.click();
        await this.page.waitForTimeout(1000);
        
        // ICF - English 옵션 선택 (ICF 2017 - English가 아닌)
        const englishOption = await this.page.locator('[role="option"]:has-text("ICF - English")').first();
        if (await englishOption.count() > 0) {
          await englishOption.click();
          await this.page.waitForTimeout(3000);
          console.log('✅ ICF - English 선택 완료');
        } else {
          console.log('⚠️  ICF - English 옵션을 찾을 수 없음, JavaScript로 시도');
          await this.page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
            const englishSelect = selects.find(select => {
              const options = Array.from(select.options);
              return options.some(opt => opt.text.trim() === 'ICF - English');
            });
            if (englishSelect) {
              const options = Array.from(englishSelect.options);
              const englishOption = options.find(opt => opt.text.trim() === 'ICF - English');
              if (englishOption) {
                englishSelect.value = englishOption.value;
                englishSelect.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          });
          await this.page.waitForTimeout(3000);
          console.log('✅ ICF - English 선택 완료 (JavaScript)');
        }
      } else {
        // JavaScript로 직접 선택
        await this.page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
          const englishSelect = selects.find(select => {
            const options = Array.from(select.options);
            return options.some(opt => opt.text.trim() === 'ICF - English');
          });
          if (englishSelect) {
            const options = Array.from(englishSelect.options);
            const englishOption = options.find(opt => opt.text.trim() === 'ICF - English');
            if (englishOption) {
              englishSelect.value = englishOption.value;
              englishSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
        await this.page.waitForTimeout(3000);
        console.log('✅ ICF - English 선택 완료 (JavaScript)');
      }
    } catch (error) {
      console.log('⚠️  언어 선택 실패, 기본값 사용:', error);
    }
    
    console.log('✅ ICF Browser 접속 완료');
  }

  /**
   * 카테고리 확장 및 모든 코드 수집
   */
  async collectCategoryData(
    category: 'b' | 's' | 'd' | 'e',
    categoryName: string
  ): Promise<IcfCode[]> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    console.log(`\n📂 카테고리 처리: ${categoryName}`);

    // 페이지 새로고침
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // ICF - English 다시 선택 (페이지 새로고침 후)
    try {
      const combobox = await this.page.locator('[role="combobox"]').first();
      if (await combobox.count() > 0) {
        await combobox.click();
        await this.page.waitForTimeout(1000);
        const englishOption = await this.page.locator('[role="option"]:has-text("ICF - English")').first();
        if (await englishOption.count() > 0) {
          await englishOption.click();
          await this.page.waitForTimeout(3000);
        }
      }
    } catch (e) {
      // 무시
    }

    // 카테고리 확장
    await this.expandCategoryWithRetry(category, categoryName);

    // 모든 하위 노드 확장
    await this.expandAllNodes(category);

    // 페이지가 안정화될 때까지 대기
    await this.page.waitForTimeout(3000);

    // 코드 수집
    const codes = await this.collectCodes(category);
    
    return codes;
  }

  /**
   * 재시도 로직이 있는 카테고리 확장
   */
  async expandCategoryWithRetry(category: 'b' | 's' | 'd' | 'e', categoryName: string, maxRetries = 5) {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 여러 방법으로 확장 시도
        const expanded = await this.page.evaluate((cat) => {
          // 방법 1: alt 속성으로 찾기
          const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
          let expandImg = imgs.find(img => {
            const alt = (img.alt || '').toUpperCase();
            return alt.includes('EXPAND') && alt.includes(cat.toUpperCase());
          });

          if (expandImg && expandImg.parentElement) {
            (expandImg.parentElement as HTMLElement).click();
            return true;
          }

          // 방법 2: href로 찾기
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="__doPostBack"]'));
          const expandLink = links.find(link => {
            const href = link.getAttribute('href') || '';
            return href.includes(`tICF\\\\${cat}`) || href.includes(`tICF/${cat}`);
          });

          if (expandLink) {
            expandLink.click();
            return true;
          }

          return false;
        }, category);

        if (expanded) {
          await this.page.waitForTimeout(5000); // 확장 대기
          console.log(`  ✅ ${categoryName} 확장 완료 (시도 ${attempt})`);
          return;
        }
      } catch (error) {
        console.log(`  ⚠️  확장 시도 ${attempt} 실패: ${error instanceof Error ? error.message : error}`);
      }

      if (attempt < maxRetries) {
        await this.page.waitForTimeout(2000);
      }
    }

    console.log(`  ⚠️  ${categoryName} 확장 실패 (최대 재시도 횟수 초과)`);
  }

  /**
   * 모든 하위 노드 확장
   */
  async expandAllNodes(category: 'b' | 's' | 'd' | 'e') {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    let expandedCount = 0;
    const maxIterations = 200;

    console.log(`  🔄 하위 노드 확장 중...`);

    for (let i = 0; i < maxIterations; i++) {
      try {
        // 페이지가 여전히 유효한지 확인
        const found = await this.page.evaluate((cat) => {
          const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
          const expandImgs = imgs.filter(img => {
            const alt = (img.alt || '').toUpperCase();
            return alt.includes('EXPAND') && 
                   alt.includes(cat.toUpperCase()) &&
                   !alt.includes('COLLAPSE');
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
          // 네비게이션 대기
          await Promise.race([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null),
            this.page.waitForTimeout(2000)
          ]);
          
          if (expandedCount % 20 === 0) {
            console.log(`    📊 ${expandedCount}개 노드 확장됨...`);
          }
        } else {
          break;
        }
      } catch (error) {
        // Execution context destroyed 오류 처리
        if (error instanceof Error && error.message.includes('Execution context was destroyed')) {
          console.log(`    ⚠️  페이지 네비게이션 발생, 재대기 중...`);
          await this.page.waitForTimeout(3000);
          // 페이지가 다시 로드될 때까지 대기
          try {
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
          } catch (e) {
            // 무시하고 계속
          }
          continue;
        }
        // 다른 오류는 로그만 남기고 계속
        console.log(`    ⚠️  확장 중 오류 (무시하고 계속): ${error instanceof Error ? error.message : error}`);
        break;
      }
    }

    console.log(`  ✅ 총 ${expandedCount}개 하위 노드 확장 완료`);
  }

  /**
   * 모든 코드 수집
   */
  async collectCodes(category: 'b' | 's' | 'd' | 'e'): Promise<IcfCode[]> {
    if (!this.page) throw new Error('페이지가 초기화되지 않았습니다.');

    const codes: IcfCode[] = [];
    const processedCodes = new Set<string>();

    // DOM에서 모든 코드 링크 추출
    const allLinks = await this.page.evaluate((cat) => {
      const results: Array<{ code: string; title: string; href: string }> = [];
      const debug: string[] = [];
      
      // 모든 링크 찾기 (TreeItemSelected가 있거나 없는 경우 모두 포함)
      const allLinks = document.querySelectorAll<HTMLAnchorElement>('a');
      debug.push(`전체 링크 수: ${allLinks.length}`);
      
      let catStartCount = 0;
      let codeMatchCount = 0;
      
      allLinks.forEach((link) => {
        const text = (link.textContent || '').trim();
        const href = link.getAttribute('href') || '';
        
        if (!text) return;
        
        // 카테고리로 시작하는 항목만 (d나 e로 시작)
        const lowerText = text.toLowerCase();
        const lowerCat = cat.toLowerCase();
        
        // e 카테고리의 경우: "e " 또는 "e1" 등으로 시작하는지 확인
        // 공백이 있을 수 있으므로 더 유연하게 처리
        let matches = false;
        if (cat === 'e') {
          // e로 시작하는 경우 (공백 포함/미포함 모두)
          // "e ENVIRONMENTAL FACTORS", "e1", "e110" 등 모두 매칭
          matches = /^e\s*\d/i.test(text) || lowerText.startsWith('e ') || lowerText.startsWith('e1') || lowerText.startsWith('e2') || lowerText.startsWith('e3') || lowerText.startsWith('e4') || lowerText.startsWith('e5');
        } else {
          // 다른 카테고리는 기존 로직
          const normalizedText = lowerText.replace(/\s+/g, '');
          matches = normalizedText.startsWith(lowerCat);
        }
        
        if (matches) {
          catStartCount++;
          // 코드 패턴 매칭 (e1, e110, e1100 등)
          // 공백이 있을 수 있으므로 정규식 개선
          const codeMatch = text.match(/^([bsde]\s*\d+(?:\s*\.\s*\d+)*)/i);
          if (codeMatch) {
            codeMatchCount++;
            const code = codeMatch[1].toLowerCase().replace(/\s+/g, '');
            // href가 없어도 텍스트만으로도 추가
            results.push({ code, title: text, href: href || `javascript:TreeItemSelected('${code}')` });
          }
        }
      });
      
      debug.push(`${cat.toUpperCase()}로 시작하는 링크: ${catStartCount}개`);
      debug.push(`코드 패턴 매칭: ${codeMatchCount}개`);
      
      // 디버그 정보를 console에 출력
      console.log(debug.join(', '));
      
      // 중복 제거 및 정렬
      const unique = Array.from(new Map(results.map(r => [r.code, r])).values());
      unique.sort((a, b) => {
        // 코드를 숫자 부분으로 정렬
        const aParts = a.code.match(/(\d+)/g) || [];
        const bParts = b.code.match(/(\d+)/g) || [];
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aNum = parseInt(aParts[i] || '0');
          const bNum = parseInt(bParts[i] || '0');
          if (aNum !== bNum) return aNum - bNum;
        }
        return a.code.localeCompare(b.code);
      });
      
      return unique;
    }, category);

    console.log(`  📋 발견된 코드: ${allLinks.length}개`);

    if (allLinks.length === 0) {
      console.log(`  ⚠️  코드를 찾을 수 없습니다. 페이지 구조를 확인해주세요.`);
      
      // 디버깅: 페이지의 모든 텍스트 확인
      const pageText = await this.page.evaluate((cat) => {
        const allText = Array.from(document.querySelectorAll('a'))
          .map(a => (a.textContent || '').trim())
          .filter(t => t.length > 0 && t.toLowerCase().startsWith(cat.toLowerCase()))
          .slice(0, 20); // 처음 20개만
        return allText;
      }, category);
      
      console.log(`  🔍 디버깅: ${category.toUpperCase()}로 시작하는 링크 텍스트 샘플:`);
      pageText.forEach((text, i) => {
        console.log(`    ${i + 1}. ${text}`);
      });
      
      return codes;
    }

    // 각 코드의 상세 정보 수집
    for (let i = 0; i < allLinks.length; i++) {
      const item = allLinks[i];
      
      if (processedCodes.has(item.code)) continue;
      processedCodes.add(item.code);

      if ((i + 1) % 10 === 0 || i === 0) {
        console.log(`  📊 진행률: ${i + 1}/${allLinks.length} (${Math.round((i + 1) / allLinks.length * 100)}%) - 현재: ${item.code}`);
      }

      try {
        // 링크 클릭 (여러 방법 시도)
        const clicked = await this.page.evaluate(({ href, code, title }: { href: string; code: string; title: string }) => {
          // 방법 1: href로 찾기
          let link = document.querySelector<HTMLAnchorElement>(`a[href="${href.replace(/"/g, '\\"')}"]`);
          
          // 방법 2: 텍스트로 찾기
          if (!link) {
            const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'));
            link = allLinks.find(a => {
              const text = (a.textContent || '').trim();
              return text === title || text.includes(code);
            }) || null;
          }
          
          // 방법 3: 코드로 시작하는 링크 찾기
          if (!link) {
            const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'));
            link = allLinks.find(a => {
              const text = (a.textContent || '').trim().toLowerCase();
              return text.startsWith(code.toLowerCase());
            }) || null;
          }
          
          if (link) {
            link.click();
            return true;
          }
          return false;
        }, { href: item.href, code: item.code, title: item.title });

        if (!clicked) {
          console.log(`    ⚠️  ${item.code} 링크를 찾을 수 없음`);
        }

        // 네비게이션 대기 또는 타임아웃
        await Promise.race([
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null),
          this.page.waitForTimeout(3000)
        ]);

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
   * 상세 정보 추출
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
      const extracted = await this.page.evaluate(() => {
        const result: any = {};

        // 모든 텍스트 노드에서 정보 찾기
        const allText = document.body.innerText || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Description 찾기
        const descIndex = lines.findIndex(l => l.toLowerCase().includes('description'));
        if (descIndex >= 0 && descIndex < lines.length - 1) {
          result.description = lines[descIndex + 1];
        }

        // Inclusions 찾기
        const incIndex = lines.findIndex(l => l.toLowerCase().includes('inclusions'));
        if (incIndex >= 0) {
          const inclusions: string[] = [];
          for (let i = incIndex + 1; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes('exclusions')) break;
            if (lines[i].length > 0) {
              inclusions.push(lines[i]);
            }
          }
          if (inclusions.length > 0) {
            result.inclusions = inclusions;
          }
        }

        // Exclusions 찾기
        const excIndex = lines.findIndex(l => l.toLowerCase().includes('exclusions'));
        if (excIndex >= 0) {
          const exclusions: string[] = [];
          for (let i = excIndex + 1; i < lines.length; i++) {
            if (lines[i].length > 0) {
              exclusions.push(lines[i]);
            }
          }
          if (exclusions.length > 0) {
            result.exclusions = exclusions;
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

    // E 카테고리만 수집
    const categories: Array<{ code: 'b' | 's' | 'd' | 'e'; name: string }> = [
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
   * 마크다운 파일 생성 (기존 파일에 E 카테고리만 추가/업데이트)
   */
  generateMarkdown(): string {
    // 기존 파일 읽기
    const existingFilePath = path.join(process.cwd(), 'docs', 'icf-full-catalog.md');
    let existingContent = '';
    try {
      existingContent = fs.readFileSync(existingFilePath, 'utf-8');
    } catch (error) {
      // 파일이 없으면 새로 생성
    }

    // E 카테고리 섹션 찾기 및 교체
    const eCategory = this.allData.find(cat => cat.category === 'e');
    if (!eCategory) {
      console.log('⚠️  E 카테고리 데이터가 없습니다.');
      return existingContent;
    }

    let md = '';
    if (existingContent) {
      // 기존 파일에서 E 카테고리 섹션 찾기
      const eSectionRegex = /## E\. ENVIRONMENTAL FACTORS[\s\S]*?(?=## |$)/;
      const eSection = this.generateECategorySection(eCategory);
      
      if (eSectionRegex.test(existingContent)) {
        // 기존 E 섹션 교체
        md = existingContent.replace(eSectionRegex, eSection);
      } else {
        // E 섹션이 없으면 파일 끝에 추가
        md = existingContent.trim() + '\n\n' + eSection;
      }
    } else {
      // 파일이 없으면 전체 생성
      md = `# ICF (International Classification of Functioning, Disability and Health) 전체 코드 목록\n\n`;
      md += `**생성일**: ${new Date().toISOString()}\n`;
      md += `**출처**: [WHO ICF Browser](https://apps.who.int/classifications/icfbrowser/Default.aspx)\n\n`;
      md += `---\n\n`;
      md += this.generateECategorySection(eCategory);
    }

    return md;
  }

  /**
   * E 카테고리 섹션 생성
   */
  generateECategorySection(category: IcfCategory): string {
    let md = `## E. ${category.name}\n\n`;
    md += `**총 코드 수**: ${category.codes.length}개\n\n`;

    if (category.codes.length === 0) {
      md += `*⚠️ 코드를 수집하지 못했습니다.*\n\n`;
      return md;
    }

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

    return md;
  }

  async saveToMarkdown(outputPath: string) {
    const md = this.generateMarkdown();
    fs.writeFileSync(outputPath, md, 'utf-8');
    console.log(`\n✅ 마크다운 파일 저장 완료: ${outputPath}`);
    const totalCodes = this.allData.reduce((sum, cat) => sum + cat.codes.length, 0);
    console.log(`📄 총 ${totalCodes}개 코드 수집됨`);
    
    if (totalCodes === 0) {
      console.log(`\n⚠️  경고: 코드가 수집되지 않았습니다.`);
      console.log(`WHO ICF Browser는 ASP.NET 기반으로 자동화가 어려울 수 있습니다.`);
      console.log(`대안: WHO 공식 데이터 소스나 BioPortal 온톨로지를 확인해보세요.`);
    }
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

