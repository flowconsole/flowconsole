import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 4173);
const host = '127.0.0.1';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20000,
  fullyParallel: true,
  workers: 20,
  snapshotPathTemplate: '{testDir}/snapshots/{testFilePath}/{arg}{ext}',
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    viewport: { width: 1600, height: 1000 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /layout-visual\.spec/,
    },
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 1000 },
      },
      testMatch: /layout-visual\.spec/,
      timeout: 30000,
      expect: {
        timeout: 10000,
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.01,
          animations: 'disabled',
        },
      },
    },
  ],
  webServer: {
    command: `pnpm --dir src/app preview --host ${host} --port ${port}`,
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
