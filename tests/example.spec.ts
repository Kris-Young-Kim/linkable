import { test, expect } from '@playwright/test';

/**
 * 기본 예제 테스트
 * Playwright 테스트 작성을 위한 템플릿
 */
test.describe('LinkAble 기본 테스트', () => {
  test('홈페이지가 정상적으로 로드되는지 확인', async ({ page }) => {
    await page.goto('/');
    
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/LinkAble/);
    
    // 메인 콘텐츠 확인 (첫 번째 h1 또는 h2가 보이는지 확인)
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // 또는 더 구체적으로 Hero 섹션의 h1 확인
    const heroHeading = page.getByRole('heading', { name: /AI로 연결하는 가능성|LinkAble/i }).first();
    await expect(heroHeading).toBeVisible();
  });

  test('네비게이션 메뉴가 정상 작동하는지 확인', async ({ page }) => {
    await page.goto('/');
    
    // 네비게이션 링크 확인 (header 내의 링크만 확인)
    const navLinks = page.locator('header a, nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
    
    // 첫 번째 네비게이션 링크가 보이는지 확인
    await expect(navLinks.first()).toBeVisible();
  });

  test('페이지 로딩 성능 확인', async ({ page }) => {
    const startTime = Date.now();
    
    // 페이지 로드 및 네트워크 유휴 상태까지 대기
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // 페이지 로딩 시간이 10초 이내인지 확인 (개발 환경 고려)
    // 프로덕션 환경에서는 더 짧은 시간을 기대할 수 있음
    expect(loadTime).toBeLessThan(10000);
    
    // 로딩 시간을 콘솔에 출력 (디버깅용)
    console.log(`페이지 로딩 시간: ${loadTime}ms`);
  });
});

