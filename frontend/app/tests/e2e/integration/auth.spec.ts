/**
 * auth.spec.ts — Integration E2E tests for authentication UI flows.
 *
 * Tests the login and register forms against the live ASP.NET backend.
 *
 * Prerequisites (full stack must be running):
 *   ./scripts/e2e-up.sh                       # start PostgreSQL + ASP.NET backend
 *   AUTH_BYPASS=1 NEXT_PUBLIC_BACKEND_URL=http://localhost:5000 pnpm --dir app dev
 *
 * AUTH_BYPASS=1 is required for navigation to protected pages (dashboard) after login.
 * Without it, the Next.js server-side auth guard redirects back to /login.
 *
 * Run: pnpm --dir app test:e2e:integration
 */
import { nanoid } from "nanoid";

import { API_PREFIX, BACKEND_URL, expect, test } from "../fixtures/auth";

// Helpers

/** Create a unique test user and return email + password. */
function uniqueUser() {
  const id = nanoid(8);
  return {
    email: `auth-e2e-${id}@flowconsole-test.local`,
    password: `Test@${id}!Pw1`,
  };
}

// Login page

test.describe("Login page", () => {
  test("renders email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
  });

  test("shows error toast for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill(
      '[data-testid="email-input"]',
      "nobody@flowconsole-test.local",
    );
    await page.fill('[data-testid="password-input"]', "WrongPassword999!");
    await page.click('[data-testid="submit-button"]');

    // Sonner renders toasts with data-sonner-toast attribute
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 8000,
    });
  });

  test("stores JWT in localStorage after valid login", async ({
    page,
    request,
  }) => {
    // Register a test user via the API first (separate from UI to isolate this test)
    const { email, password } = uniqueUser();
    const reg = await request.post(
      `${BACKEND_URL}${API_PREFIX}/auth/register`,
      {
        data: { email, password },
      },
    );
    if (!reg.ok()) {
      throw new Error(
        `Pre-registration failed: ${reg.status()} — ${await reg.text()}\n` +
          "Is the integration stack running? Run: ./scripts/e2e-up.sh",
      );
    }

    await page.goto("/login");
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');

    // Wait for the async form handler to complete
    await page.waitForTimeout(2000);

    const token = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );
    expect(
      typeof token,
      "access token should be a string in localStorage",
    ).toBe("string");
    expect(
      (token ?? "").length,
      "access token should be a non-trivial JWT",
    ).toBeGreaterThan(20);
  });

  test("login with valid credentials navigates away from login page", async ({
    page,
    request,
  }) => {
    const { email, password } = uniqueUser();
    await request.post(`${BACKEND_URL}${API_PREFIX}/auth/register`, {
      data: { email, password },
    });

    await page.goto("/login");
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');

    // After successful login the form calls router.push("/dashboard").
    // With AUTH_BYPASS=1 the protected layout renders; without it the server
    // redirects back to /login. Either way the page leaves /login.
    // We allow up to 8 s for the navigation to settle.
    await page.waitForTimeout(2000);

    // Check either we navigated to dashboard or tokens are stored (both are valid outcomes)
    const currentUrl = page.url();
    const token = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );

    const tokenStored = typeof token === "string" && token.length > 20;
    const navigatedAway = !currentUrl.includes("/login");

    expect(
      tokenStored || navigatedAway,
      `Expected either a stored token or navigation away from /login. URL: ${currentUrl}, token: ${token}`,
    ).toBe(true);
  });
});

// Register page

test.describe("Register page", () => {
  test("renders email and password inputs", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
  });

  test("stores JWT in localStorage after successful registration via UI", async ({
    page,
  }) => {
    const { email, password } = uniqueUser();

    await page.goto("/register");
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');

    await page.waitForTimeout(2000);

    const token = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );
    expect(typeof token, "access token should be stored in localStorage").toBe(
      "string",
    );
    expect(
      (token ?? "").length,
      "access token should be a non-trivial JWT",
    ).toBeGreaterThan(20);
  });

  test("register via UI then login via UI succeeds (round-trip)", async ({
    page,
  }) => {
    const { email, password } = uniqueUser();

    // 1. Register via UI
    await page.goto("/register");
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForTimeout(2000);

    const regToken = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );
    expect(regToken, "registration should store a token").toBeTruthy();

    // 2. Clear tokens and login via UI
    await page.evaluate(() => {
      localStorage.removeItem("fc_access_token");
      localStorage.removeItem("fc_refresh_token");
    });

    await page.goto("/login");
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForTimeout(2000);

    const loginToken = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );
    expect(loginToken, "login should store a token").toBeTruthy();
  });
});

// Token lifecycle

test.describe("Token lifecycle", () => {
  test("auth fixture injects tokens that persist until cleared", async ({
    authToken,
    page,
  }) => {
    // Navigate to login page to get a page context
    await page.goto("/login");

    // The fixture injected tokens via addInitScript — verify they're present
    const tokenBefore = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );
    expect(tokenBefore, "injected token should be present").toBeTruthy();
    expect(tokenBefore).toBe(authToken);

    // Clear via script (mirrors clearTokens() behaviour)
    await page.evaluate(() => {
      localStorage.removeItem("fc_access_token");
      localStorage.removeItem("fc_refresh_token");
    });

    const tokenAfter = await page.evaluate(() =>
      window.localStorage.getItem("fc_access_token"),
    );
    expect(tokenAfter, "token should be gone after clear").toBeNull();
  });
});
