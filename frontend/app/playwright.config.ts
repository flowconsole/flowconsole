import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

/**
 * Playwright E2E configuration for FlowConsole frontend.
 *
 * Run E2E tests:
 *   pnpm test:e2e
 *
 * The tests target a locally running Vite dev server.
 * For CI: set `VITE_APP_URL` to the deployed preview URL.
 */
const loadedEnv = loadEnv(process.env.NODE_ENV ?? "development", __dirname, "");
for (const [key, value] of Object.entries(loadedEnv)) {
  process.env[key] ??= value;
}
const BASE_URL = process.env.VITE_APP_URL;
if (!BASE_URL) {
  throw new Error(
    "VITE_APP_URL is required. Copy frontend/app/.env.example to frontend/app/.env.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter */
  reporter: [["html", { open: "never" }], ["list"]],
  /* Shared settings for all the projects below. */
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  /* Start the Vite dev server before running tests */
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120000,
      },
});
