/**
 * login-redirect.spec.ts — E2E test for post-login redirect.
 *
 * Verifies that after successful login the user is redirected to the
 * dashboard (or the callbackUrl) and is NOT stuck on /login.
 *
 * Prerequisites (full stack must be running):
 *   ./scripts/e2e-up.sh
 *   pnpm --dir frontend/app dev
 *
 * Run: pnpm --dir frontend/app test:e2e
 */
import { nanoid } from "nanoid";

import { API_PREFIX, BACKEND_URL, expect, test } from "./fixtures/auth";

function uniqueUser() {
  const id = nanoid(8);
  return {
    email: `redirect-e2e-${id}@flowconsole-test.local`,
    password: `Test@${id}!Pw1`,
  };
}

test.describe("Post-login redirect", () => {
  test("login redirects to /dashboard and renders protected content", async ({
    page,
    request,
  }) => {
    // 1. Register a test user via the API
    const { email, password } = uniqueUser();
    const reg = await request.post(
      `${BACKEND_URL}${API_PREFIX}/auth/register`,
      { data: { email, password } },
    );
    if (!reg.ok()) {
      throw new Error(
        `Pre-registration failed: ${reg.status()} — ${await reg.text()}\n` +
          "Is the integration stack running? Run: ./scripts/e2e-up.sh",
      );
    }

    // 2. Navigate to login page
    await page.goto("/login");
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();

    // 3. Fill in credentials and submit
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');

    // 4. Assert: URL must leave /login and arrive at /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 5. Assert: the page shows protected content (WorkspaceShell renders)
    const protectedContent = page.locator(
      "main, [data-testid='workspace-shell']",
    );
    await expect(protectedContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("login with callbackUrl redirects to the specified path", async ({
    page,
    request,
  }) => {
    const { email, password } = uniqueUser();
    await request.post(`${BACKEND_URL}${API_PREFIX}/auth/register`, {
      data: { email, password },
    });

    // Navigate to login with a callbackUrl pointing to /projects
    await page.goto("/login?callbackUrl=%2Fprojects");
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();

    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');

    // Should arrive at /projects, not /dashboard
    await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  });

  test("register redirects to /dashboard after successful registration", async ({
    page,
  }) => {
    const { email, password } = uniqueUser();

    await page.goto("/register");
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();

    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');

    // Should redirect to /dashboard after registration
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const protectedContent = page.locator(
      "main, [data-testid='workspace-shell']",
    );
    await expect(protectedContent.first()).toBeVisible({ timeout: 5000 });
  });
});
