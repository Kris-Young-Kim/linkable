import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정 파일
 * Next.js 애플리케이션 테스트를 위한 설정
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* 테스트 실행 시 최대 시간 (30분) */
  timeout: 30 * 60 * 1000,
  
  /* 각 테스트의 최대 실행 시간 (30초) */
  expect: {
    timeout: 5000,
  },
  
  /* 테스트를 병렬로 실행 */
  fullyParallel: true,
  
  /* CI에서 실패한 테스트를 재실행하지 않음 */
  forbidOnly: !!process.env.CI,
  
  /* CI에서 실패 시 재시도 */
  retries: process.env.CI ? 2 : 0,
  
  /* CI에서 병렬 실행 수 제한 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 리포트 설정 */
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  /* 공유 설정 */
  use: {
    /* 기본 타임아웃 */
    actionTimeout: 0,
    
    /* Base URL - 개발 서버 주소 */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    /* 테스트 실패 시 스크린샷 저장 */
    screenshot: 'only-on-failure',
    
    /* 테스트 실패 시 비디오 녹화 */
    video: 'retain-on-failure',
    
    /* 트레이스 저장 (실패 시) */
    trace: 'on-first-retry',
  },

  /* 테스트 프로젝트 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 모바일 테스트 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 개발 서버 실행 설정 */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

