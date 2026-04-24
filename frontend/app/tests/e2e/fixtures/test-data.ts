/**
 * Test data helpers for integration E2E tests.
 *
 * Provides functions to seed and clean up test entities (projects, models)
 * via the backend REST API directly, using a Playwright APIRequestContext.
 * This keeps individual tests isolated — each test creates its own data and
 * tears it down in the fixture cleanup phase.
 *
 * Usage (in a test file):
 *   import { test } from "../fixtures/auth";
 *   import { withProject, withModel } from "../fixtures/test-data";
 *
 *   test("...", async ({ request, authToken }) => {
 *     const project = await withProject(request, authToken);
 *     const model   = await withModel(request, authToken, project.id);
 *     // ... test ...
 *     await cleanupModel(request, authToken, model.id);
 *     await cleanupProject(request, authToken, project.id);
 *   });
 */
import type { APIRequestContext } from "@playwright/test";
import { nanoid } from "nanoid";
import { BACKEND_URL, API_PREFIX } from "./auth";

// --- Types (inline mirrors of current frontend API/view-model shapes) ---

export interface TestProject {
  id: string;
  name: string;
  slug: string;
}

export interface TestModel {
  id: string;
  name: string;
  slug: string;
  version: number;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function assertOk(
  res: Awaited<ReturnType<APIRequestContext["post"]>>,
  context: string
): Promise<void> {
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`${context}: HTTP ${res.status()} — ${body}`);
  }
}

/**
 * Create a test project. Returns the created project object.
 */
export async function createProject(
  request: APIRequestContext,
  token: string,
  overrides?: { name?: string; description?: string }
): Promise<TestProject> {
  const id = nanoid(6);
  const body = {
    name: overrides?.name ?? `Test Project ${id}`,
    slug: `test-proj-${id}`,
    description: overrides?.description ?? "Integration test project",
  };

  const res = await request.post(`${BACKEND_URL}${API_PREFIX}/projects`, {
    data: body,
    headers: authHeaders(token),
  });
  await assertOk(res, "createProject");
  return res.json();
}

/**
 * Delete a test project (best-effort — used in teardown).
 */
export async function deleteProject(
  request: APIRequestContext,
  token: string,
  projectId: string
): Promise<void> {
  await request.delete(`${BACKEND_URL}${API_PREFIX}/projects/${projectId}`, {
    headers: authHeaders(token),
  });
  // ignore errors in teardown
}

/**
 * Create a test model inside a project.
 */
export async function createModel(
  request: APIRequestContext,
  token: string,
  projectId: string,
  overrides?: { name?: string; description?: string }
): Promise<TestModel> {
  const id = nanoid(6);
  const body = {
    name: overrides?.name ?? `Test Model ${id}`,
    slug: `test-model-${id}`,
    description: overrides?.description ?? "Integration test model",
  };

  const res = await request.post(
    `${BACKEND_URL}${API_PREFIX}/projects/${projectId}/models`,
    { data: body, headers: authHeaders(token) }
  );
  await assertOk(res, "createModel");
  return res.json();
}

/**
 * Delete a test model (best-effort — used in teardown).
 */
export async function deleteModel(
  request: APIRequestContext,
  token: string,
  modelId: string
): Promise<void> {
  await request.delete(`${BACKEND_URL}${API_PREFIX}/models/${modelId}`, {
    headers: authHeaders(token),
  });
  // ignore errors in teardown
}

// --- Convenience: scoped resource pairs ---

/**
 * Create a project AND a model inside it.
 * Returns both so the caller can navigate or assert against either.
 */
export async function createProjectWithModel(
  request: APIRequestContext,
  token: string
): Promise<{ project: TestProject; model: TestModel }> {
  const project = await createProject(request, token);
  const model = await createModel(request, token, project.id);
  return { project, model };
}

/**
 * Clean up a project+model pair (model first, then project).
 */
export async function cleanupProjectWithModel(
  request: APIRequestContext,
  token: string,
  projectId: string,
  modelId: string
): Promise<void> {
  await deleteModel(request, token, modelId);
  await deleteProject(request, token, projectId);
}
