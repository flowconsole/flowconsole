/**
 * E2E flows — Phase 3 intelligence surfaces.
 *
 * Run with:
 *   pnpm test:e2e
 *
 * These tests verify that all intelligence routes (query lab, drift center,
 * validation center, analytics workspace) redirect unauthenticated visitors
 * to the sign-in page, and that critical route variants (AI mode, snapshot
 * review, drill-down, tab-based handoff) are all auth-gated correctly.
 *
 * Authenticated UX is covered by component tests. E2E tests here focus on
 * route availability, auth gating, and layout integrity across viewports.
 */
import { test, expect } from "@playwright/test";

// Helpers

async function expectRedirectToSignIn(page: import("@playwright/test").Page) {
  const url = page.url();
  const isRedirected =
    url.includes("login") ||
    url.includes("signin") ||
    url.includes("sign-in");
  const signInVisible = await page.locator("text=/sign in|войти/i").count();
  expect(isRedirected || signInVisible > 0).toBe(true);
}

const MODEL_ID = "test-model-id";

// Structured query flow — /models/[modelId]/query

test("query lab route redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/query`);
  await expectRedirectToSignIn(page);
});

test("query lab at tablet viewport redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/models/${MODEL_ID}/query`);
  await expectRedirectToSignIn(page);
});

// AI query fallback flow — /models/[modelId]/query?mode=ai

test("query lab AI mode redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/query?mode=ai`);
  await expectRedirectToSignIn(page);
});

test("query lab command mode redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/query?mode=command`);
  await expectRedirectToSignIn(page);
});

test("query lab with blast_radius command params redirects to sign-in", async ({ page }) => {
  await page.goto(
    `/models/${MODEL_ID}/query?mode=command&cmd=blast_radius&elementId=svc-1`,
  );
  await expectRedirectToSignIn(page);
});

// Drift snapshot review — /models/[modelId]/drift

test("drift center route redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/drift`);
  await expectRedirectToSignIn(page);
});

test("drift center at tablet viewport redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/models/${MODEL_ID}/drift`);
  await expectRedirectToSignIn(page);
});

test("drift snapshot review URL (?snapshot=snap-1) redirects to sign-in", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/drift?snapshot=snap-1`);
  await expectRedirectToSignIn(page);
});

// Validation drill-down — /models/[modelId]/validations

test("validation center route redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/validations`);
  await expectRedirectToSignIn(page);
});

test("validation center at tablet viewport redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/models/${MODEL_ID}/validations`);
  await expectRedirectToSignIn(page);
});

test("validation drill-down URL (?run=run-3) redirects to sign-in", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/validations?run=run-3`);
  await expectRedirectToSignIn(page);
});

// Analytics handoff into explorer — /models/[modelId]/analytics

test("analytics workspace route redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/analytics`);
  await expectRedirectToSignIn(page);
});

test("analytics workspace at tablet viewport redirects to sign-in when unauthenticated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`/models/${MODEL_ID}/analytics`);
  await expectRedirectToSignIn(page);
});

test("analytics with coupling tab (?tab=coupling) redirects to sign-in", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/analytics?tab=coupling`);
  await expectRedirectToSignIn(page);
});

test("analytics with spof tab (?tab=spof) redirects to sign-in", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/analytics?tab=spof`);
  await expectRedirectToSignIn(page);
});

test("analytics with bottlenecks tab (?tab=bottlenecks) redirects to sign-in", async ({
  page,
}) => {
  await page.goto(`/models/${MODEL_ID}/analytics?tab=bottlenecks`);
  await expectRedirectToSignIn(page);
});

// Cross-surface deep links — explorer focus URL

test("explorer focus URL redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto(`/models/${MODEL_ID}/explorer?element=el-api-gw`);
  await expectRedirectToSignIn(page);
});

// Sign-in page is accessible at all relevant viewports

test("sign-in page loads at standard desktop viewport", async ({ page }) => {
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

test("sign-in page is accessible at mobile viewport (375px)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await expect(page).not.toHaveURL(/error/);
  const main = page.locator("main, form, [role=main]");
  await expect(main.first()).toBeVisible({ timeout: 10000 });
});
