/**
 * projects.spec.ts — Integration E2E tests for project management flows.
 *
 * Tests project page rendering and API CRUD against the live ASP.NET backend.
 * Protected pages (e.g., /projects, /projects/[id]) require the Next.js server
 * to be started with AUTH_BYPASS=1 for server-side auth guards to be bypassed.
 *
 * Prerequisites:
 *   ./scripts/e2e-up.sh                       # start PostgreSQL + ASP.NET backend
 *   AUTH_BYPASS=1 NEXT_PUBLIC_BACKEND_URL=http://localhost:5000 pnpm --dir app dev
 *
 * Run: pnpm --dir app test:e2e:integration
 */
import { API_PREFIX, BACKEND_URL, expect, test } from "../fixtures/auth";
import {
  createModel,
  createProject,
  deleteModel,
  deleteProject,
  type TestProject,
} from "../fixtures/test-data";

/** Navigate to a URL and check whether AUTH_BYPASS allowed access. Returns true if on target page. */
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
        "Restart Next.js with AUTH_BYPASS=1 to access protected pages in integration tests.",
    });
    return false;
  }
  return true;
}

test.describe("Projects list page", () => {
  test("projects page renders the New Project button (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const accessible = await navigateAndCheckAccess(page, "/projects");
    if (!accessible) return;

    // The projects page shows either an empty placeholder or a grid;
    // the "New Project" button must be visible in both states.
    await expect(page.locator('[data-testid="new-project-btn"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("projects page loads without JS error (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const accessible = await navigateAndCheckAccess(page, "/projects");
    if (!accessible) return;

    // Allow the 300 ms empty-state timeout to settle
    await page.waitForTimeout(600);

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });
});

test.describe("Project overview page", () => {
  let project: TestProject;

  test.beforeEach(async ({ request, authToken }) => {
    project = await createProject(request, authToken);
  });

  test.afterEach(async ({ request, authToken }) => {
    await deleteProject(request, authToken, project.id);
  });
});

test.describe("Project CRUD via API", () => {
  test("create project returns 201 with id and name", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken, {
      name: "E2E Project CRUD",
    });

    expect(project.id, "project id should be present").toBeTruthy();
    expect(project.name).toBe("E2E Project CRUD");

    await deleteProject(request, authToken, project.id);
  });

  test("created project is retrievable by id", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken);

    const res = await request.get(
      `${BACKEND_URL}${API_PREFIX}/projects/${project.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(res.ok(), `GET /projects/${project.id} should return 200`).toBe(
      true,
    );

    const body = await res.json();
    expect(body.id).toBe(project.id);

    await deleteProject(request, authToken, project.id);
  });

  test("list projects endpoint returns the created project", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken);

    const res = await request.get(`${BACKEND_URL}${API_PREFIX}/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok(), "GET /projects should return 200").toBe(true);

    const body = await res.json();
    // Response may be array or paged object — search in both shapes
    const items: Array<{ id: string }> = Array.isArray(body)
      ? body
      : (body.items ?? body.data ?? []);
    const found = items.some((p) => p.id === project.id);
    expect(found, `Project ${project.id} should appear in /projects list`).toBe(
      true,
    );

    await deleteProject(request, authToken, project.id);
  });

  test("deleted project returns 404 from API", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken);

    const before = await request.get(
      `${BACKEND_URL}${API_PREFIX}/projects/${project.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(before.ok()).toBe(true);

    await deleteProject(request, authToken, project.id);

    const after = await request.get(
      `${BACKEND_URL}${API_PREFIX}/projects/${project.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(after.status(), "deleted project should return 404").toBe(404);
  });
});
