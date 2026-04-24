/**
 * E2E smoke tests — requires a running dev server (`pnpm dev`).
 *
 * Run with:
 *   pnpm test:e2e
 *
 * These tests verify that the critical page shells load, redirect, or render
 * the expected structure. They do not exercise the full auth/backend flow;
 * they only confirm that each route resolves without a 5xx error and that
 * at least one structural landmark is present.
 */
import { expect, test } from "@playwright/test";

// Sign-in / auth pages

test("sign-in page loads and shows email input", async ({ page }) => {
  await page.goto("/login");

  // The page should not 500
  await expect(page).not.toHaveURL(/error/);

  // Expect an email-related input or heading
  const emailInput = page.locator('input[type="email"]');
  const heading = page
    .locator("h1, h2, h3")
    .filter({ hasText: /sign in|login|welcome/i });
  const hasEmail = await emailInput.count();
  const hasHeading = await heading.count();
  expect(hasEmail + hasHeading).toBeGreaterThan(0);
});

// Protected pages — unauthenticated visitors should be redirected to login

test("dashboard redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.goto("/dashboard");
  // Either we're redirected to login or see a sign-in CTA
  const url = page.url();
  const isRedirected =
    url.includes("login") || url.includes("signin") || url.includes("sign-in");
  const signInVisible = await page.locator("text=/sign in|войти/i").count();
  expect(isRedirected || signInVisible > 0).toBe(true);
});

test("projects page redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.goto("/projects");
  const url = page.url();
  const isRedirected =
    url.includes("login") || url.includes("signin") || url.includes("sign-in");
  const signInVisible = await page.locator("text=/sign in|войти/i").count();
  expect(isRedirected || signInVisible > 0).toBe(true);
});

test("model explorer redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.goto("/models/test-model-id/explorer");
  const url = page.url();
  const isRedirected =
    url.includes("login") || url.includes("signin") || url.includes("sign-in");
  const signInVisible = await page.locator("text=/sign in|войти/i").count();
  expect(isRedirected || signInVisible > 0).toBe(true);
});

// Landing / marketing

test("marketing landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveURL(/error/);
  // Should have a main landmark or recognizable FlowConsole content
  const main = page.locator("main, h1, [role=main]");
  await expect(main.first()).toBeVisible({ timeout: 10000 });
});
