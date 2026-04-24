# CLAUDE.md — frontend/app

This file provides guidance to Claude Code when working in `frontend/app/`.

## What `frontend/app/` Is

`frontend/app/` is the product SPA for FlowConsole:

- Vite + React 19
- React Router v7 (client-side routing, no server rendering)
- react-i18next (en + ru)
- shadcn/ui + Tailwind (primitives from `@flowconsole/ui`)
- TypeScript

This is a **pure SPA** — no Next.js, no server components, no SSR. It serves the authenticated product workspace.

## Architecture

### Entry points

- `index.html` — single HTML file with `<div id="root">`
- `main.tsx` — mounts `<App />` with `I18nextProvider` and `AuthProvider`
- `app.tsx` — top-level component mounting `<ProductRouter />`
- `product/router.tsx` — `BrowserRouter` with `basename="/"`, auth guard, all product routes

### Routing

Routes live in `product/router.tsx`. Auth guard wraps all protected routes:

```
/login                     — login page (unauthenticated)
/register                  — register page (unauthenticated)
/projects                  — projects list
/projects/:projectId       — project detail
/models/:modelId           — model shell
/models/:modelId/explorer  — graph explorer
/models/:modelId/editor    — DSL workbench
/models/:modelId/sources   — source management
/models/:modelId/drift     — drift detection
/models/:modelId/analytics — graph analytics
```

Unauthenticated users are redirected to `/login`. `AuthState` has five values: `anonymous`, `loading`, `authorized`, `expired` (token expired / refresh failed), `forbidden` (insufficient role). `RequireAuth`, `RequireRole`, and `AuthSwitch` in `lib/auth/guards.tsx` handle all five states. Route-level guard in `ProtectedLayout` treats all non-`authorized` states as redirect-to-login.

### i18n

- Initialized in `i18n/index.ts` via `react-i18next` / `i18next`
- Translation files: `messages/en.json`, `messages/ru.json`
- Use `useTranslation()` hook in components (not `useTranslations` from next-intl)
- Both locales must be kept in sync

### Auth

Client-side JWT auth. Tokens stored in `localStorage`. `lib/auth/` manages token lifecycle, refresh, and auth state. No server-side session.

### Data access

Backend access goes through RTK Query codegen and enhancement layers in `lib/api/rtk/`.

- `lib/api/rtk/base-api.ts` — shared `fetchBaseQuery` transport
- `lib/api/rtk/*.generated.ts` — OpenAPI-generated endpoint slices
- `lib/api/rtk/*-api.ts` — tag/invalidation and frontend adapter layer

The backend uses `JsonNamingPolicy.CamelCase`. All `Backend*Response` TypeScript interfaces use **camelCase** property names.

Two paged response shapes from the backend:

| Shape | Fields | Used by |
|-------|--------|---------|
| `PagedResponse<T>` | `{ data, total, page, limit, totalPages, hasMore }` | projects, models, elements, relationships |
| `PagedResult<T>` | `{ items, totalCount, page, limit }` | scans, drift snapshots, validation runs |

Critical URL notes:
- `validations.runs` → `GET /validations` (no `/runs` segment)
- `validations.run` → `GET /validations/{runId}` (no `/runs/` segment)
- Backend scan API `scanType` uses the `ElementSource` enum: `"CodeScan"`, `"InfraScan"`, `"Git"`, `"Observability"`, `"Import"`. Frontend uses the same values directly.
- Scanner type and scope go in `config: { scanner: "...", scope: "..." }` dict

**Bottlenecks response:** `{ bottlenecks: string[], singlePointsOfFailure: string[] }`
**Git sync:** `BackendSyncResponse = BackendScanResponse`. Poll `getSync(modelId, sync.id)` checking `status === "completed" | "failed"`.
**If-Match concurrency:** model update mutations send `If-Match` with the current version.
**Error handling:** use `toApiError(...)` / `hasRtkErrorStatus(...)` from `lib/api/rtk/errors` for RTK failures.

### Realtime (SignalR)

`lib/realtime/` wraps `@microsoft/signalr`. Background operations (sync, scan, IR load, graph rebuild) surface in the activity rail.

- `components/activity/activity-rail.tsx` + `hooks/use-activity-feed.ts`
- The rail is injected into `WorkspaceShell` via the `activityRailSlot` prop
- Do not create a second job-feed mechanism — extend `useActivityFeed` instead

### Intelligence navigation

All intelligence surfaces (drift, analytics) share a unified navigation model via `lib/intelligence/insight.ts`:

- `InsightRef` — typed pointer to any architectural entity
- URL builder helpers: `buildExplorerFocusUrl`, `buildDriftUrl`, `buildAnalyticsUrl`

Use these helpers when deep-linking. Explorer reads `?element=` for element selection.

### Workbench / DSL / Diagram

Components for DSL editing, Monaco workbench, architecture diagram rendering, and reusable graph interactions belong to the core packages (`src/core`, `src/web`, `src/sdk`) at the repo root, not to local copies in `app/`.

Packages consumed (via pnpm `workspace:*`):
- `@flowconsole/core` — core DSL types and utilities (at `src/core/`)
- `@flowconsole/web` — `CodeDiagramWorkbench` and visualization primitives (at `src/web/`)
- `@flowconsole/sdk` — typed architecture-as-code SDK (at `src/sdk/`)
- `@flowconsole/ui` — shared shadcn/ui primitives (at `frontend/shared/`)

Development rule:
1. Implement new workbench/DSL/diagram capabilities in `src/web/` or `src/core/`
2. Expose as a reusable package API
3. Consume from `frontend/app/`

Do not fork `CodeDiagramWorkbench` in `app/` or maintain a second implementation.

### Shared UI

shadcn/ui primitives live in `@flowconsole/ui` (`frontend/shared/`). Import via `@flowconsole/ui/...`.

App-specific product composition stays in feature folders under `components/`. Use `cn()` from `@flowconsole/ui/lib/utils` for class composition.

## What Stays in `app/`

- Route pages and layouts
- Page shells around workbench/diagram primitives
- Top bars, inspectors, activity rails, command surfaces
- API bindings to the backend
- Auth gating and workflow composition

## Testing

- **Unit/component:** Vitest + React Testing Library (`tests/unit/`)
- **E2E:** Playwright (`tests/e2e/`) — baseURL `http://localhost:5173`
- Run: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright)

## Commands

```bash
pnpm dev          # Vite dev server on port 5173
pnpm build        # Vite production build → dist/
pnpm preview      # Preview Vite build
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm test:watch   # Vitest watch mode
pnpm test:e2e     # Playwright E2E
```

## Path Aliases

- `@/*` maps to `./` (root of `frontend/app/`)
- `@flowconsole/ui` maps to the shared UI workspace package

## Environment Variables

Vite env vars are prefixed `VITE_`:
- `VITE_BACKEND_URL` — backend base URL for Vite dev proxy (default: `http://localhost:5000`; proxied via `/api` in vite.config.ts)
- `VITE_APP_URL` — public URL of this SPA, used by `absoluteUrl()` in `lib/utils.ts` for cross-app links (default: empty string; set to your deployment URL in production)
- `VITE_WEBSITE_URL` — public URL of the marketing website, used for cross-app links on login/register pages (default: `http://localhost:3001`; set to your deployment URL in production)

## Build Notes

- Vite proxies `/api` to the backend in dev mode (see `vite.config.ts`)
- `resolveOssWebDeps()` plugin resolves peer deps from `src/web` through app's `node_modules`
- Production: `dist/` is a static SPA — deploy behind any web server with SPA fallback routing
