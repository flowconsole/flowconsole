/**
 * models.spec.ts — Integration E2E tests for model management flows.
 *
 * Tests model page rendering (overview + explorer) with API-seeded data
 * against the live ASP.NET backend.
 *
 * Protected pages (e.g., /models/[id]) require the Next.js server to be
 * started with AUTH_BYPASS=1 for server-side auth guards to be bypassed.
 *
 * Prerequisites:
 *   ./scripts/e2e-up.sh                       # start PostgreSQL + ASP.NET backend
 *   AUTH_BYPASS=1 NEXT_PUBLIC_BACKEND_URL=http://localhost:5000 pnpm --dir app dev
 *
 * Run: pnpm --dir app test:e2e:integration
 */
import { API_PREFIX, BACKEND_URL, expect, test } from "../fixtures/auth";
import {
  cleanupProjectWithModel,
  createModel,
  createProject,
  createProjectWithModel,
  deleteModel,
  deleteProject,
  type TestModel,
  type TestProject,
} from "../fixtures/test-data";

// Helpers

/** Navigate to a URL and return false if the server redirected to /login. */
async function navigateAndCheckAccess(
  page: import("@playwright/test").Page,
  url: string,
): Promise<boolean> {
  await page.goto(url);
  const current = page.url();
  if (current.includes("/login")) {
    test.info().annotations.push({
      type: "warning",
      description:
        `Redirected to /login instead of ${url}. ` +
        "Restart Next.js with AUTH_BYPASS=1 to access protected pages.",
    });
    return false;
  }
  return true;
}

// Model CRUD via API (always runs — no UI dependency)

test.describe("Model CRUD via API", () => {
  test("create model returns id and name", async ({ request, authToken }) => {
    const project = await createProject(request, authToken);
    const model = await createModel(request, authToken, project.id, {
      name: "E2E API Model",
    });

    expect(model.id, "model id should be present").toBeTruthy();
    expect(model.name).toBe("E2E API Model");

    await deleteModel(request, authToken, model.id);
    await deleteProject(request, authToken, project.id);
  });

  test("created model is retrievable by id", async ({ request, authToken }) => {
    const { project, model } = await createProjectWithModel(request, authToken);

    const res = await request.get(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.ok(), `GET /models/${model.id} should return 200`).toBe(true);

    const body = await res.json();
    expect(body.id).toBe(model.id);

    await cleanupProjectWithModel(request, authToken, project.id, model.id);
  });

  test("model appears in project model list", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken);
    const model = await createModel(request, authToken, project.id);

    const res = await request.get(
      `${BACKEND_URL}${API_PREFIX}/projects/${project.id}/models`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(
      res.ok(),
      `GET /projects/${project.id}/models should return 200`,
    ).toBe(true);

    const body = await res.json();
    const items: Array<{ id: string }> = Array.isArray(body)
      ? body
      : (body.items ?? body.data ?? []);
    const found = items.some((m) => m.id === model.id);
    expect(found, `Model ${model.id} should appear in project model list`).toBe(
      true,
    );

    await deleteModel(request, authToken, model.id);
    await deleteProject(request, authToken, project.id);
  });

  test("deleted model returns 404", async ({ request, authToken }) => {
    const { project, model } = await createProjectWithModel(request, authToken);

    await deleteModel(request, authToken, model.id);

    const after = await request.get(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(after.status(), "deleted model should return 404").toBe(404);

    await deleteProject(request, authToken, project.id);
  });
});

// Model overview page (UI — AUTH_BYPASS=1 required)

test.describe("Model overview page", () => {
  let project: TestProject;
  let model: TestModel;

  test.beforeEach(async ({ request, authToken }) => {
    const pair = await createProjectWithModel(request, authToken);
    project = pair.project;
    model = pair.model;
  });

  test.afterEach(async ({ request, authToken }) => {
    await cleanupProjectWithModel(request, authToken, project.id, model.id);
  });

  test("model overview page renders without error (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const accessible = await navigateAndCheckAccess(
      page,
      `/models/${model.id}`,
    );
    if (!accessible) return;

    // Allow the 300 ms stub timeout in ModelOverviewPage to settle
    await page.waitForTimeout(600);

    expect(
      errors.filter((e) => !e.includes("ResizeObserver")),
      "no JS errors on model overview page",
    ).toHaveLength(0);
  });

  test("Open Explorer link is visible on model overview (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const accessible = await navigateAndCheckAccess(
      page,
      `/models/${model.id}`,
    );
    if (!accessible) return;

    await page.waitForTimeout(600);

    // DashboardHeader renders an "Open Explorer" link in the model overview
    await expect(page.getByRole("link", { name: /explorer/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("Open Explorer link navigates to explorer page (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const accessible = await navigateAndCheckAccess(
      page,
      `/models/${model.id}`,
    );
    if (!accessible) return;

    await page.waitForTimeout(600);

    const explorerLink = page.getByRole("link", { name: /explorer/i });
    await expect(explorerLink).toBeVisible({ timeout: 5000 });

    await explorerLink.click();

    // Should navigate to /models/[id]/explorer
    await expect(page).toHaveURL(new RegExp(`/models/${model.id}/explorer`), {
      timeout: 8000,
    });
  });
});

// Model explorer page (UI — AUTH_BYPASS=1 required)

test.describe("Model explorer page", () => {
  let project: TestProject;
  let model: TestModel;

  test.beforeEach(async ({ request, authToken }) => {
    const pair = await createProjectWithModel(request, authToken);
    project = pair.project;
    model = pair.model;
  });

  test.afterEach(async ({ request, authToken }) => {
    await cleanupProjectWithModel(request, authToken, project.id, model.id);
  });

  test("model explorer page renders without JS error (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const accessible = await navigateAndCheckAccess(
      page,
      `/models/${model.id}/explorer`,
    );
    if (!accessible) return;

    // Allow React to hydrate and the canvas to mount
    await page.waitForTimeout(1000);

    expect(
      errors.filter((e) => !e.includes("ResizeObserver")),
      "no JS errors on explorer page",
    ).toHaveLength(0);
  });

  test("model explorer canvas is present in the DOM (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const accessible = await navigateAndCheckAccess(
      page,
      `/models/${model.id}/explorer`,
    );
    if (!accessible) return;

    await page.waitForTimeout(1000);

    // The ExplorerCanvas wraps a ReactFlow canvas — look for the RF container
    // or the page canvas element; either confirms the explorer rendered
    const rfContainer = page.locator(
      ".react-flow, [data-testid='explorer-canvas'], canvas",
    );
    await expect(rfContainer.first()).toBeVisible({ timeout: 8000 });
  });
});

// IR load via API then navigate to explorer (plan §6 requirement)

test.describe("Model with seeded IR data", () => {
  test("explorer renders after IR is loaded via API (AUTH_BYPASS=1 required)", async ({
    page,
    request,
    authToken,
  }) => {
    const { project, model } = await createProjectWithModel(request, authToken);

    try {
      // Attempt to load a minimal IR via the backend API.
      // This uses the model-load endpoint if available; gracefully handles 404/405.
      const irPayload = {
        format: "json",
        elements: [
          { canonicalId: "svc-a", name: "Service A", kind: "Service" },
          { canonicalId: "svc-b", name: "Service B", kind: "Service" },
        ],
        relationships: [
          { sourceId: "svc-a", targetId: "svc-b", label: "calls" },
        ],
      };

      const loadRes = await request.post(
        `${BACKEND_URL}${API_PREFIX}/models/${model.id}/ir`,
        {
          data: irPayload,
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // If the endpoint doesn't exist in the current build, skip the IR-seeded assertion
      if (loadRes.status() === 404 || loadRes.status() === 405) {
        test.info().annotations.push({
          type: "info",
          description:
            "IR load endpoint not yet available — skipping IR-seeded explorer test",
        });
        return;
      }

      // Navigate to explorer
      const accessible = await navigateAndCheckAccess(
        page,
        `/models/${model.id}/explorer`,
      );
      if (!accessible) return;

      await page.waitForTimeout(1500);

      // Explorer should render
      const rfContainer = page.locator(
        ".react-flow, [data-testid='explorer-canvas'], canvas",
      );
      await expect(rfContainer.first()).toBeVisible({ timeout: 8000 });
    } finally {
      await cleanupProjectWithModel(request, authToken, project.id, model.id);
    }
  });
});
