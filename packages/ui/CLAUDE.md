# CLAUDE.md — frontend/shared

This file provides guidance to Claude Code when working in `frontend/shared/`.

## What `frontend/shared/` Is

`@flowconsole/ui` — shared UI primitives consumed by both the Vite SPA (`frontend/app/`) and the Next.js website (`frontend/website/`).

## Structure

```
components/
├── ui/        — shadcn/ui primitives (Button, Input, Dialog, etc.)
└── shared/    — cross-app components (Icons, EmptyPlaceholder, etc.)
lib/
├── utils.ts   — cn() class composition utility
└── toc.ts     — table-of-contents builder (website-only, uses remark/mdast-util-toc)
```

## How to Import

```ts
import { Button } from "@flowconsole/ui/components/ui/button"
import { cn } from "@flowconsole/ui/lib/utils"
import { Icons } from "@flowconsole/ui/components/shared/icons"
```

## Adding a New shadcn/ui Component

Run `npx shadcn add <component>` inside `frontend/shared/`, **not** inside `frontend/app/` or `frontend/website/`. This ensures the primitive is available to both apps.

## What Belongs Here

- shadcn/ui primitives (Radix-based UI components)
- Cross-app shared components used by both app and website
- The `cn()` utility

## What Does NOT Belong Here

- App-specific product components (workspace, explorer, editor) → `frontend/app/`
- Website-specific marketing/docs components → `frontend/website/`
- Framework-specific logic (Next.js Image, next/navigation, etc.) should not be added to shared — keep it framework-agnostic

## Peer Dependencies

- `react` (required)
- `next-themes` (used by ThemeProvider wrappers — optional, only needed by consumers that use theme switching)
- `next`, `next-intl` (optional — required only when `toc.ts` or Next.js-specific components are used)
