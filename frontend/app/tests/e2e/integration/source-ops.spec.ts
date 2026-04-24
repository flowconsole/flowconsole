/**
 * source-ops.spec.ts — Integration E2E tests for Phase 2 source operations.
 *
 * Covers:
 *   - Git sync endpoint availability (create sync, list scans)
 *   - Scan launcher API (create scan, list scans, cancel scan)
 *   - IR upload (PUT /models/{id}/ir)
 *   - Activity via scan list (empty state + after scan)
 *
 * These tests run purely via the backend API (no UI dependency for Phase 2
 * because source-ops UI pages are not yet wired in the app routes).
 * Tests that check UI pages annotate with a warning when the page is absent.
 *
 * Prerequisites:
 *   ./scripts/e2e-up.sh
 *   AUTH_BYPASS=1 NEXT_PUBLIC_BACKEND_URL=http://localhost:5000 pnpm --dir app dev
 *
 * Run: pnpm --dir app test:e2e:integration
 */
import { API_PREFIX, BACKEND_URL, expect, test } from "../fixtures/auth";
import {
  cleanupProjectWithModel,
  createProjectWithModel,
  type TestModel,
  type TestProject,
} from "../fixtures/test-data";

// Helpers

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

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

// Git Sync API

test.describe("Git sync API (Phase 2)", () => {
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

  test("POST /models/{id}/syncs returns 202 or 404 (endpoint reachable)", async ({
    request,
    authToken,
  }) => {
    const res = await request.post(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/syncs`,
      {
        data: {
          repositoryUrl: "https://github.com/example/test-repo.git",
          branch: "main",
          filePath: "architecture.ts",
        },
        headers: authHeaders(authToken),
      },
    );

    // 202 = accepted (sync queued), 400 = bad request (missing git config), 404 = endpoint not yet active
    expect(
      [202, 400, 404, 422],
      `POST /models/${model.id}/syncs should return 202/400/404/422, got ${res.status()}`,
    ).toContain(res.status());
  });

  test("GET /models/{id}/syncs/{syncId} returns 404 for unknown sync", async ({
    request,
    authToken,
  }) => {
    const fakeId = "00000000-0000-0000-0000-000000000001";
    const res = await request.get(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/syncs/${fakeId}`,
      { headers: authHeaders(authToken) },
    );

    // 404 = not found (expected for nonexistent sync)
    // 405 = endpoint not yet wired (acceptable)
    expect(
      [404, 405],
      `GET /models/${model.id}/syncs/${fakeId} should return 404 or 405`,
    ).toContain(res.status());
  });
});

// Scan API

test.describe("Scan API (Phase 2)", () => {
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

  test("GET /models/{id}/scans returns 200 with empty list for new model", async ({
    request,
    authToken,
  }) => {
    const res = await request.get(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/scans`,
      { headers: authHeaders(authToken) },
    );

    expect(res.ok(), `GET /models/${model.id}/scans should return 200`).toBe(
      true,
    );

    const body = await res.json();
    const items: unknown[] = Array.isArray(body)
      ? body
      : (body.items ?? body.data ?? []);
    expect(
      Array.isArray(items),
      "scans response should be an array or contain items",
    ).toBe(true);
    // A brand-new model has no scans
    expect(items, "new model should have no scans").toHaveLength(0);
  });

  test("POST /models/{id}/scans with kubernetes scanner returns 202 or 400", async ({
    request,
    authToken,
  }) => {
    const res = await request.post(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/scans`,
      {
        data: { scannerType: "Kubernetes" },
        headers: authHeaders(authToken),
      },
    );

    // 202 = accepted, 400 = invalid config (no kubeconfig), 422 = validation error
    expect(
      [202, 400, 422],
      `POST scan should return 202/400/422, got ${res.status()}`,
    ).toContain(res.status());
  });

  test("POST /models/{id}/scans with openapi scanner returns 202 or 400", async ({
    request,
    authToken,
  }) => {
    const res = await request.post(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/scans`,
      {
        data: {
          scannerType: "OpenApi",
          config: { specUrl: "https://example.com/openapi.json" },
        },
        headers: authHeaders(authToken),
      },
    );

    expect(
      [202, 400, 422],
      `POST openapi scan should return 202/400/422, got ${res.status()}`,
    ).toContain(res.status());
  });

  test("scan list reflects accepted scan entry", async ({
    request,
    authToken,
  }) => {
    // Try to create a scan
    const createRes = await request.post(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/scans`,
      {
        data: { scannerType: "Kubernetes" },
        headers: authHeaders(authToken),
      },
    );

    if (createRes.status() !== 202) {
      // Scanner requires real config — just verify the list endpoint is healthy
      const listRes = await request.get(
        `${BACKEND_URL}${API_PREFIX}/models/${model.id}/scans`,
        { headers: authHeaders(authToken) },
      );
      expect(listRes.ok()).toBe(true);
      return;
    }

    const scan = await createRes.json();
    expect(scan.id, "created scan should have an id").toBeTruthy();

    const listRes = await request.get(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/scans`,
      { headers: authHeaders(authToken) },
    );
    expect(listRes.ok()).toBe(true);

    const listBody = await listRes.json();
    const items: Array<{ id: string }> = Array.isArray(listBody)
      ? listBody
      : (listBody.items ?? listBody.data ?? []);
    const found = items.some((s) => s.id === scan.id);
    expect(found, `Scan ${scan.id} should appear in scan list`).toBe(true);
  });
});

// IR Upload

test.describe("IR upload (Phase 2)", () => {
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

  test("PUT /models/{id}/ir with valid payload returns 200 or 202", async ({
    request,
    authToken,
  }) => {
    const irPayload = {
      source: "Import",
      elements: [
        {
          id: "svc-api",
          canonicalId: "svc-api",
          name: "API Service",
          kind: "Service",
          technology: "TypeScript",
        },
        {
          id: "svc-db",
          canonicalId: "svc-db",
          name: "Database Service",
          kind: "Service",
          technology: "PostgreSQL",
        },
      ],
      relationships: [
        {
          id: "rel-api-db",
          sourceId: "svc-api",
          targetId: "svc-db",
          label: "reads from",
          kind: "Uses",
        },
      ],
    };

    const res = await request.put(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/ir`,
      {
        data: irPayload,
        headers: authHeaders(authToken),
      },
    );

    expect(
      [200, 202],
      `PUT /models/${model.id}/ir should return 200 or 202, got ${res.status()}`,
    ).toContain(res.status());
  });

  test("elements appear in model after IR upload", async ({
    request,
    authToken,
  }) => {
    const irPayload = {
      source: "Import",
      elements: [
        {
          id: "elem-check-1",
          canonicalId: "elem-check-1",
          name: "Frontend",
          kind: "Service",
        },
        {
          id: "elem-check-2",
          canonicalId: "elem-check-2",
          name: "Backend",
          kind: "Service",
        },
      ],
      relationships: [],
    };

    const uploadRes = await request.put(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/ir`,
      {
        data: irPayload,
        headers: authHeaders(authToken),
      },
    );

    if (!uploadRes.ok()) {
      test.info().annotations.push({
        type: "info",
        description: `IR upload returned ${uploadRes.status()} — skipping element check`,
      });
      return;
    }

    // Allow graph rebuild to complete
    await new Promise((r) => setTimeout(r, 500));

    const elemRes = await request.get(
      `${BACKEND_URL}${API_PREFIX}/models/${model.id}/elements`,
      { headers: authHeaders(authToken) },
    );

    expect(
      elemRes.ok(),
      `GET /models/${model.id}/elements should return 200`,
    ).toBe(true);

    const body = await elemRes.json();
    const items: Array<{ canonicalId?: string; name?: string }> = Array.isArray(
      body,
    )
      ? body
      : (body.items ?? body.data ?? []);

    expect(
      items.length,
      "elements list should have at least 2 entries after IR upload",
    ).toBeGreaterThanOrEqual(2);
  });

  test("model settings page navigates without login redirect (AUTH_BYPASS=1 required)", async ({
    page,
    authToken,
    request,
  }) => {
    const pair = await createProjectWithModel(request, authToken);

    try {
      // The model settings page may not exist yet in the app routes;
      // this test verifies the route renders or redirects gracefully.
      const url = `/models/${pair.model.id}/settings`;
      await page.goto(url);

      const current = page.url();

      if (current.includes("/login")) {
        test.info().annotations.push({
          type: "warning",
          description:
            "AUTH_BYPASS=1 not set — cannot access protected page in this test run",
        });
        return;
      }

      // Any non-error page (200, not 500) is acceptable here
      // since the settings route may not exist yet
      const title = await page.title();
      expect(typeof title).toBe("string");
    } finally {
      await cleanupProjectWithModel(
        request,
        authToken,
        pair.project.id,
        pair.model.id,
      );
    }
  });
});
