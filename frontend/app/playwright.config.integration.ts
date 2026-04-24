import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

/**
 * Integration Playwright config — full-stack E2E tests against a live backend + local Vite app.
 *
 * Prerequisites (stack must be running before executing tests):
 *   ./scripts/e2e-up.sh
 *
 * Run with:
 *   pnpm --dir app test:e2e:integration
 *
 * Environment variables:
 *   VITE_APP_URL
 *   VITE_BACKEND_URL
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
  testDir: "./tests/e2e/integration",
  fullyParallel: false, // integration tests share DB — run sequentially
  forbidOnly: !!process.env.CI,
  retries: 0, // deterministic — no retries in integration mode
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer — the full stack must already be running via e2e-up.sh
});
