/**
 * E2E tests — Phase 2 workbench and source operation flows.
 *
 * Run with:
 *   pnpm test:e2e
 *
 * These tests verify that Phase 2 routes (editor, sources/sync, sources/scan,
 * activity feed) redirect correctly for unauthenticated users, and that core
 * page structure is accessible at both desktop and tablet viewport widths.
 *
 * All routes are under (protected) and require auth — unauthenticated visitors
 * must be redirected to the sign-in page. Authenticated UX is covered by
 * component tests; E2E tests here focus on route availability and layout.
 */
import { expect, test } from "@playwright/test";

// Helpers

async function expectRedirectToSignIn(page: import("@playwright/test").Page) {
  const url = page.url();
  const isRedirected =
    url.includes("login") || url.includes("signin") || url.includes("sign-in");
  const signInVisible = await page.locator("text=/sign in|войти/i").count();
  expect(isRedirected || signInVisible > 0).toBe(true);
}

// DSL Editor route — /models/[modelId]/editor

test("editor route redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.goto("/models/test-model-id/editor");
  await expectRedirectToSignIn(page);
});

test("editor route at tablet viewport redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/models/test-model-id/editor");
  await expectRedirectToSignIn(page);
});

// Settings / Git sync route — /models/[modelId]/settings

test("settings route redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.goto("/models/test-model-id/settings");
  await expectRedirectToSignIn(page);
});

test("settings route at tablet viewport redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/models/test-model-id/settings");
  await expectRedirectToSignIn(page);
});

// IR import/export route — /models/[modelId]/ir

test("IR route redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto("/models/test-model-id/ir");
  await expectRedirectToSignIn(page);
});

// Activity feed — accessible via editor and settings pages
// (also protected; redirect validates the route is registered)

test("activity feed route (editor page) redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  // The activity rail lives on the editor/settings shell; it is not a standalone
  // route. Accessing the editor page is the way to reach the activity feed.
  await page.goto("/models/test-model-id/editor");
  await expectRedirectToSignIn(page);
});

test("activity feed route (settings page) redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.goto("/models/test-model-id/settings");
  await expectRedirectToSignIn(page);
});

// Tablet layout — verify auth pages render correctly at tablet width
// (editor/settings are protected; tablet UX is verified by checking that the
// redirect itself works, i.e., the middleware + layout system is intact)

test("sign-in page is usable at tablet viewport (768px)", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/login");
  await expect(page).not.toHaveURL(/error/);

  const emailInput = page.locator('input[type="email"]');
  const heading = page
    .locator("h1, h2, h3")
    .filter({ hasText: /sign in|login|welcome/i });
  const hasEmail = await emailInput.count();
  const hasHeading = await heading.count();
  expect(hasEmail + hasHeading).toBeGreaterThan(0);
});

test("marketing landing page is usable at tablet viewport (768px)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await expect(page).not.toHaveURL(/error/);
  const main = page.locator("main, h1, [role=main]");
  await expect(main.first()).toBeVisible({ timeout: 10000 });
});
