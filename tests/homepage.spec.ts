import { test, expect } from '@playwright/test';

/**
 * 홈페이지 테스트
 * 메인 페이지의 주요 기능과 UI 요소를 테스트
 */
test.describe('홈페이지 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Hero 섹션이 표시되는지 확인', async ({ page }) => {
    // Hero 섹션의 주요 요소 확인
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });

  test('Features 섹션이 표시되는지 확인', async ({ page }) => {
    // Features 섹션으로 스크롤
    await page.locator('#features').scrollIntoViewIfNeeded();
    
    // Features 섹션이 보이는지 확인
    const featuresSection = page.locator('#features');
    await expect(featuresSection).toBeVisible();
  });

  test('How It Works 섹션이 표시되는지 확인', async ({ page }) => {
    // How It Works 섹션으로 스크롤
    await page.locator('#how-it-works').scrollIntoViewIfNeeded();
    
    const howItWorksSection = page.locator('#how-it-works');
    await expect(howItWorksSection).toBeVisible();
  });

  test('CTA 버튼이 정상 작동하는지 확인', async ({ page }) => {
    // CTA 섹션으로 스크롤
    await page.locator('#consultation').scrollIntoViewIfNeeded();
    
    // 채팅 시작 버튼 확인
    const chatButton = page.locator('a[href="/chat"]').first();
    await expect(chatButton).toBeVisible();
    
    // 버튼 클릭 시 채팅 페이지로 이동하는지 확인
    await chatButton.click();
    await expect(page).toHaveURL(/.*\/chat/);
  });

  test('Footer가 표시되는지 확인', async ({ page }) => {
    // Footer로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

