# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowConsole is an architecture-as-code tool that lets developers model system architecture using a typed API and generates animated diagrams and system flows. The project uses a pnpm monorepo structure.

## Common Commands

```bash
# Install dependencies (from repo root or any workspace)
pnpm install

# Development (run from apps/app or apps/docs)
pnpm dev

# Build
pnpm build                              # Build current package
pnpm --filter @flowconsole/web build    # Build core package specifically

# Linting
pnpm lint                     # Run ESLint
pnpm lint:fix                 # ESLint with auto-fix

# Testing
pnpm test:unit                # Run Vitest unit tests across all packages
pnpm test:e2e                 # Playwright E2E (apps/app)

# Run single test file (in any package)
pnpm --filter @flowconsole/web vitest run tests/unit/<filename>.test.ts
```

## Workspace Structure

- **apps/app** (`app`) - Product SPA (Vite + React 19, the authenticated workspace UI)
- **apps/docs** (`flowconsole-docs`) - Documentation + marketing site (Next.js)
- **packages/web** (`@flowconsole/web`) - React diagram components, layout pipeline, Monaco workbench
- **packages/core** (`@flowconsole/core`) - Core DSL parsers and shared utilities
- **packages/sdk** (`@flowconsole/sdk` v2.0.0) - Typed architecture-as-code SDK with jsii multi-language support (TypeScript, C#, Java, Python, Go). 13 base element classes, 6 deployment classes, 23 convenience wrappers. Three-layer API: Topology (elements + belongsTo), Flows (fluent interaction chains with automatic relationship inference), Deployment (infrastructure targets). `SoftwareSystem` (not `System`) due to C# reserved name. Key exports: `buildSnapshot()`, `getRuntime()`
- **packages/ui** (`@flowconsole/ui`) - Shared shadcn/Radix UI primitives (consumed by apps/app and apps/docs)
- **packages/cli** (`@flowconsole/cli`) - npm-wrapper that distributes the .NET self-contained `fc` CLI binary (source in `backend/src/FlowConsole.Cli/`)

## Architecture

### DSL and Runtime (`packages/web/languages/typescript/`)
- `dsl.ts` - TypeScript type declarations injected into the Monaco editor for autocompletion
- `diagramRuntime.ts` - `DiagramRuntime` class that tracks entities and connections; `FlowBuilder` handles chained flow definitions
- `evaluateDiagramCode.ts` - Evaluates user code with runtime injection to produce `DiagramIntermediateModel`
- `modelToReactflowMapper.ts` - Converts intermediate model to ReactFlow nodes/edges

### Core Components (`packages/web/components/`)
- `Workbench/CodeDiagramWorkbench` - Monaco editor with live preview, debounced code evaluation
- `ArchitectureDiagram.tsx` - ReactFlow-based renderer with graphviz-wasm auto-layout
- `NavigationPanel/` - Flow and scope navigation controls for rendered diagrams

### Diagram Infrastructure (`packages/web/diagram/`, `packages/web/reactflow/`)
- Custom ReactFlow nodes and edges with animation support
- `graphvizLayoutService.ts` — legacy graphviz-wasm layout (used as fallback)
- 10 registered nodeTypes in `diagram/registry.ts`: element (rectangle), person, database, queue, storage, boundary, circle, hexagon, cloud, container
- `BaseElementNode.tsx` — composable base for all element shapes. Accepts `shapeClassName` (CSS shapes) and optional `renderShapeBackground` (SVG layer for circle/hexagon/cloud). Style resolution priority: explicit custom colors > preset > tone > default theme
- SVG-based shapes (circle, hexagon, cloud) render via absolutely-positioned `<svg>` under content; rectangular shapes (service, database, queue, etc.) use CSS only
- Preset styles (`theme.ts`): highlighted, critical, deprecated, new, external — each maps to borderColor/backgroundColor/opacity overrides

### Constraint-Based Auto-Layout Pipeline (`packages/web/diagram/layout/`)

8-stage pipeline: Graph Analysis → Strategy Selection → Semantic Ranking → Constraint Building → Shape Sizing → ELK Positioning → Edge Routing → Cola Refinement → Quality Scoring.

**Dependencies:** `elkjs` (primary positioning), `webcola` (constraint refinement), `graphviz-wasm` (fallback)

**Pipeline stages:**
| Stage | File | Purpose |
|-------|------|---------|
| 1 | `graphAnalyzer.ts` | Analyze graph topology: roles, clusters, SCC, source/sink detection |
| 2 | `strategySelector.ts` | Select layout strategy per container (layered/compact/radial) |
| 3 | `semanticRanker.ts` | Assign semantic lanes (leading/central/trailing) and ranks |
| 4 | `constraintBuilder.ts` | Build semantic constraints (alignment, separation, ordering) |
| 5 | `shapeSizing.ts` | Compute node dimensions from shape registry |
| 6 | `positioningEngine.ts` | ELK positioning with fallback to graphviz |
| 7 | `edgeRouter.ts` | Orthogonal/polyline edge routing with port selection |
| 8 | `constraintRefiner.ts` | Cola stress-majorization: overlap removal, alignment, containment |
| 9 | `qualityScore.ts` | Quality metrics: overlaps, crossings, alignment, symmetry |

**Key design decisions:**
- Constraints instead of heuristics — webcola refinement replaces manual layout adjustment
- Per-container strategy — each container can have its own layout direction
- Double routing — route → cola refine → re-route (first route provides label positions for cola phantom nodes)
- Quality-based fallback — if quality is unacceptable after ELK+cola, try graphviz and compare scores
- Mental map cache — LRU cache preserves positions across scope navigation (`mentalMapCache.ts`)

**Extension points:**
- Add a shape: register in `shapes/builtins.ts` with geometry kind, dimensions, port model
- Add a notation: implement `NotationAdapter` interface in `notation/types.ts`
- LLM enrichment: optional node role classification via `llm/roleEnricher.ts`

**Directory structure:**
```
layout/
├── layoutPipeline.ts      — orchestrator, caching, fallback logic
├── graphAnalyzer.ts       — Stage 1: topology analysis
├── strategySelector.ts    — Stage 2: strategy selection
├── semanticRanker.ts      — Stage 3: semantic ranking
├── constraintBuilder.ts   — Stage 4: constraint generation
├── shapeSizing.ts         — Stage 5: shape-aware sizing
├── positioningEngine.ts   — Stage 6: ELK/graphviz positioning
├── edgeRouter.ts          — Stage 7: edge routing + port selection
├── constraintRefiner.ts   — Stage 8: cola refinement
├── colaAdapter.ts         — cola input/output conversion
├── qualityScore.ts        — Stage 9: quality scoring
├── mentalMapCache.ts      — LRU position cache
├── patternDetector.ts     — subgraph pattern detection
├── portSelector.ts        — port position computation
├── types.ts               — pipeline type definitions
├── utils.ts               — shared utilities
├── fallback.ts            — lazy graphviz fallback loader
├── debug/relayoutLogger.ts — relayout reason tracking
├── notation/              — notation adapters (architectureNotation.ts)
├── shapes/                — shape registry (builtins.ts, shapeRegistry.ts)
├── scope/                 — view state and scoped model builder
└── llm/roleEnricher.ts    — optional LLM node role enrichment
```

## Backend — Rule Engine

Two .NET projects implement the v1alpha1 rule engine:

- **backend/src/FlowConsole.Rules.Core** — domain types, compiled model, ingest pipeline (5 phases: parse → schema → semantic → expression → normalize), abstractions (IRuleFileIngestor, IExpressionCompiler, IExpressionEvaluator, ISubjectResolver, IPathFinder, IRuleExecutor). No external dependencies beyond YamlDotNet.
- **backend/src/FlowConsole.Rules.Engine.Default** — Cel.NET-based expression compiler/evaluator, helper functions (collection, graph, diff, predicate), InMemory subject resolver, path finder, rule executor. Cel.NET types do not leak into the public API surface.

## Backend — Scanners

- **backend/src/FlowConsole.Scanners.Helm** — Helm chart scanner shared library. Parses Chart.yaml + templates/ to produce typed Elements/Relationships (Deployment, Service, Ingress, ConfigMap, etc.). Implements `IInfraScanner`. Used by both backend API and CLI (`fc scan` auto-detects via Chart.yaml).

Rule file contract: `contracts/rules/v1alpha1/` — JSON Schema, expression language spec, types, helpers, diagnostics, conformance suite (50+ fixtures).

```bash
# Backend build and test
cd backend
dotnet build src/FlowConsole.slnx
dotnet test src/FlowConsole.slnx --verbosity quiet

# Contract validation (conformance fixtures)
cd .. && pnpm validate:rules:all
```

## Testing Conventions

- Unit tests: per-package `tests/unit/` using Vitest + React Testing Library (e.g. `packages/web/tests/unit/`, `apps/app/tests/unit/`)
- E2E tests: `apps/app/tests/e2e/` using Playwright
- Backend tests: `backend/tests/` using xUnit + NSubstitute + FluentAssertions
- Test config: per-package `vitest.config.ts` and `playwright.config.ts` (no root configs)

## Code Style

- TypeScript/React with functional components and hooks
- UI: shadcn/Radix primitives from `@flowconsole/ui` (`packages/ui/`)
- Linting: ESLint with typescript-eslint, react-hooks, and react-refresh plugins
- Prefer existing patterns in `@flowconsole/core` (`packages/core/`) for state management (useMemo/useCallback)
