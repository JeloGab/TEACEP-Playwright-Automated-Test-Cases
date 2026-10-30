import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './config';

export default defineConfig({
  testDir: './tests',

  // Tests never share state, so they can all run at once.
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    // Failures keep their evidence. Open one with
    //   npx playwright show-trace test-results/<folder>/trace.zip
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
