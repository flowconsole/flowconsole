# FlowConsole App

Product SPA for FlowConsole — Vite + React 19 + React Router + shadcn/ui.

See `CLAUDE.md` for architecture, conventions, and development guide.

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # Vitest unit tests
pnpm test:e2e   # Playwright E2E
pnpm build      # Production build → dist/
```

## Environment Variables

Copy `.env.example` to `.env` before running the app locally.

For production, create `.env.local` with:
- `VITE_BACKEND_URL` — backend base URL
- `VITE_APP_URL` — public URL of this SPA
- `VITE_WEBSITE_URL` — public URL of the marketing website (for cross-app links)
