/**
 * Auth fixture for integration E2E tests.
 *
 * Creates a unique test user via the backend API, logs in, and injects
 * the JWT into browser localStorage so the SPA can authenticate.
 *
 * Usage:
 *   import { test } from "../fixtures/auth";
 *   test("my test", async ({ page, authToken, testUser }) => { ... });
 *
 * If the backend is unavailable, the fixture fails loudly (no skip).
 */
import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { nanoid } from "nanoid";

const BACKEND_URL = process.env.VITE_BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error(
    "VITE_BACKEND_URL is required. Copy frontend/app/.env.example to frontend/app/.env.",
  );
}
const API_PREFIX = "/api/v1";

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export interface AuthFixtures {
  testUser: TestUser;
  authToken: string;
}

/**
 * Register a unique test user and return credentials + JWT token.
 * Throws immediately if the backend is unreachable — tests must not skip.
 */
async function registerTestUser(
  request: APIRequestContext,
): Promise<{ user: TestUser; accessToken: string; refreshToken: string }> {
  const id = nanoid(8);
  // Append a literal digit so the password always satisfies Identity's
  // PasswordRequiresDigit policy regardless of whether nanoid produced one.
  const user: TestUser = {
    email: `test-${id}@flowconsole-test.local`,
    password: `Test@${id}!Pw1`,
    name: `Test User ${id}`,
  };

  const res = await request.post(`${BACKEND_URL}${API_PREFIX}/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      displayName: user.name,
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `Auth fixture: register failed with ${res.status()} — ${body}\n` +
        `Backend URL: ${BACKEND_URL}\n` +
        `Is the integration stack running? Run: ./scripts/e2e-up.sh`,
    );
  }

  const { accessToken, refreshToken } = await res.json();
  return { user, accessToken, refreshToken };
}

/**
 * Inject the JWT into browser localStorage and sessionStorage so the SPA
 * can pick it up on navigation without requiring a UI login flow.
 *
 * Key names match what token.ts uses for in-memory tokens: we persist
 * them to storage so the Vite SPA hydrates in authenticated state.
 */
async function injectTokens(
  page: import("@playwright/test").Page,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await page.addInitScript(
    ({ access, refresh }: { access: string; refresh: string }) => {
      try {
        window.localStorage.setItem("fc_access_token", access);
        window.localStorage.setItem("fc_refresh_token", refresh);
        // Also set on window for modules that read it directly
        (window as unknown as Record<string, string>).__FC_ACCESS_TOKEN__ =
          access;
      } catch {
        // storage may be blocked in some contexts; tests will catch auth failures
      }
    },
    { access: accessToken, refresh: refreshToken },
  );
}

export const test = base.extend<AuthFixtures>({
  testUser: async ({ request }, use) => {
    const { user } = await registerTestUser(request);
    await use(user);
    // No cleanup here — test-data fixture handles project/model cleanup;
    // users accumulate but that's acceptable in the test DB.
  },

  authToken: async ({ request, page }, use) => {
    const { accessToken, refreshToken } = await registerTestUser(request);
    await injectTokens(page, accessToken, refreshToken);
    await use(accessToken);
  },
});

export { expect };

/**
 * Low-level helper: login an existing user and return tokens.
 * Used by test-data.ts and other helpers that need a raw token.
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await request.post(`${BACKEND_URL}${API_PREFIX}/auth/login`, {
    data: { email, password },
  });

  if (!res.ok()) {
    throw new Error(`loginUser: failed with ${res.status()} for ${email}`);
  }

  return res.json();
}

export { BACKEND_URL, API_PREFIX };
