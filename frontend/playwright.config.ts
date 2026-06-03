import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for user-interaction workflows that do not require the FastAPI
 * backend (canvas rendering, toolbar node creation, datamart drill-in,
 * panel resize, fullscreen). Run with `npm run test:e2e`
 * (requires `npx playwright install` once).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
