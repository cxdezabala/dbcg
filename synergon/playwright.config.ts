import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'pnpm dev', url: 'http://localhost:3000/login', reuseExistingServer: true, timeout: 180_000, env: { AI_FALLBACK_LATENCY_MS: '50', ANTHROPIC_API_KEY: '' } },
});
