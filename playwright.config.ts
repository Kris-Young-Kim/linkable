import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 테스트 설정
 * E2E 테스트를 위한 구성
 */
export default defineConfig({
  // 테스트 결과 출력 디렉토리
  outputDir: './test-results',
  
  // 테스트 타임아웃 (30초)
  timeout: 30000,
  
  // 테스트 실행 옵션
  use: {
    // 기본 URL (로컬 개발 서버)
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    // 스크린샷 설정 (실패한 테스트만)
    screenshot: 'only-on-failure',
    
    // 비디오 녹화 설정 (실패한 테스트만)
    video: 'retain-on-failure',
    
    // Trace 설정 (실패한 테스트만 저장하여 디스크 공간 절약)
    trace: 'retain-on-failure',
    
    // 네트워크 요청 실패 시 테스트 중단하지 않음
    ignoreHTTPSErrors: true,
  },
  
  // 테스트 프로젝트 설정
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  
  // 웹 서버 설정 (테스트 실행 전 자동 시작)
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
