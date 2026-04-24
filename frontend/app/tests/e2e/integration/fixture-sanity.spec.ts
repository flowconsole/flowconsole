/**
 * Fixture sanity test — verifies that the auth fixture, test-data helpers,
 * and backend connectivity work correctly when the integration stack is up.
 *
 * This test MUST FAIL LOUDLY if the backend is unavailable — no skipping.
 *
 * Run: pnpm --dir app test:e2e:integration
 * Prerequisites: ./scripts/e2e-up.sh
 */
import { BACKEND_URL, expect, test } from "../fixtures/auth";
import {
  createModel,
  createProject,
  deleteModel,
  deleteProject,
} from "../fixtures/test-data";

test.describe("Fixture sanity — integration stack must be running", () => {
  test("backend health endpoint responds 200", async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`);
    expect(
      res.ok(),
      `Backend health check failed with ${res.status()}. Is the stack up? Run: ./scripts/e2e-up.sh`,
    ).toBe(true);
  });

  test("auth fixture registers a unique user and returns a token", async ({
    authToken,
  }) => {
    expect(typeof authToken).toBe("string");
    expect(authToken.length).toBeGreaterThan(20);
  });

  test("auth fixture registers two different users with distinct tokens", async ({
    request,
  }) => {
    const BACKEND_API = `${BACKEND_URL}/api/v1`;
    const { nanoid } = await import("nanoid");
    const id1 = nanoid(8);
    const id2 = nanoid(8);

    const reg1 = await request.post(`${BACKEND_API}/auth/register`, {
      data: {
        email: `sanity-a-${id1}@flowconsole-test.local`,
        password: `Pass@${id1}!1`,
      },
    });
    const reg2 = await request.post(`${BACKEND_API}/auth/register`, {
      data: {
        email: `sanity-b-${id2}@flowconsole-test.local`,
        password: `Pass@${id2}!1`,
      },
    });

    expect(reg1.ok(), "First registration should succeed").toBe(true);
    expect(reg2.ok(), "Second registration should succeed").toBe(true);

    const t1 = (await reg1.json()).accessToken;
    const t2 = (await reg2.json()).accessToken;
    expect(t1).not.toBe(t2);
  });

  test("test-data helper creates and deletes a project", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken);
    expect(project.id).toBeTruthy();
    expect(project.name).toMatch(/Test Project/);

    // Verify it exists
    const getRes = await request.get(
      `${BACKEND_URL}/api/v1/projects/${project.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(getRes.ok(), "Project should be retrievable after creation").toBe(
      true,
    );

    // Clean up
    await deleteProject(request, authToken, project.id);

    // Verify deletion
    const afterRes = await request.get(
      `${BACKEND_URL}/api/v1/projects/${project.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(afterRes.status(), "Project should return 404 after deletion").toBe(
      404,
    );
  });

  test("test-data helper creates and deletes a model inside a project", async ({
    request,
    authToken,
  }) => {
    const project = await createProject(request, authToken);
    const model = await createModel(request, authToken, project.id);

    expect(model.id).toBeTruthy();
    expect(model.name).toMatch(/Test Model/);

    // Verify model exists
    const getRes = await request.get(
      `${BACKEND_URL}/api/v1/models/${model.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(getRes.ok(), "Model should be retrievable after creation").toBe(
      true,
    );

    // Clean up
    await deleteModel(request, authToken, model.id);
    await deleteProject(request, authToken, project.id);
  });
});
