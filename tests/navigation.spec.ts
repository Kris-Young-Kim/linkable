import { test, expect } from '@playwright/test';

/**
 * 네비게이션 테스트
 * 사이트 내 페이지 간 이동과 네비게이션 기능을 테스트
 */
test.describe('네비게이션 테스트', () => {
  test('홈에서 About 페이지로 이동', async ({ page }) => {
    await page.goto('/');
    
    const aboutLink = page.locator('a[href="/about"]').first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*\/about/);
    }
  });

  test('홈에서 Privacy 페이지로 이동', async ({ page }) => {
    await page.goto('/');
    
    // Footer의 Privacy 링크 찾기
    const privacyLink = page.locator('a[href="/privacy"]').last();
    if (await privacyLink.isVisible()) {
      await privacyLink.click();
      await expect(page).toHaveURL(/.*\/privacy/);
    }
  });

  test('홈에서 Terms 페이지로 이동', async ({ page }) => {
    await page.goto('/');
    
    // Footer의 Terms 링크 찾기
    const termsLink = page.locator('a[href="/terms"]').last();
    if (await termsLink.isVisible()) {
      await termsLink.click();
      await expect(page).toHaveURL(/.*\/terms/);
    }
  });

  test('뒤로가기 버튼이 정상 작동하는지 확인', async ({ page }) => {
    await page.goto('/');
    await page.goto('/about');
    
    await page.goBack();
    await expect(page).toHaveURL(/.*\/$/);
  });
});

