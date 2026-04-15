# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowConsole is an architecture-as-code tool that lets developers model system architecture using a typed API and generates animated diagrams and system flows. The project uses a pnpm monorepo structure.

## Common Commands

```bash
# Install dependencies (from repo root or any workspace)
pnpm install

# Development (run from src/app or src/docs)
pnpm dev

# Build
pnpm build                    # Build current package
pnpm --filter flowconsole build  # Build core package specifically

# Linting
pnpm lint                     # Run ESLint
pnpm lint:fix                 # ESLint with auto-fix

# Testing
pnpm test:unit                # Run Vitest unit tests
pnpm test:coverage            # Unit tests with coverage report
pnpm test:e2e                 # Playwright E2E tests (builds app first)

# Run single test file
pnpm --filter flowconsole vitest run --config ../../vitest.config.ts tests/unit/<filename>.test.ts
```

## Workspace Structure

- **src/core** (`flowconsole`) - Core library with DSL, diagram rendering, and React components
- **src/app** (`flowconsole-app`) - Playground/demo application (Vite + React)
- **src/docs** (`flowconsole-docs`) - Documentation site (Next.js)
- **src/sdk** (`@flowconsole/sdk` v2.0.0) - Typed architecture-as-code SDK with jsii multi-language support (TypeScript, C#, Java, Python, Go). 13 base element classes, 6 deployment classes, 23 convenience wrappers. Three-layer API: Topology (elements + belongsTo), Flows (fluent interaction chains with automatic relationship inference), Deployment (infrastructure targets). `SoftwareSystem` (not `System`) due to C# reserved name. Key exports: `buildSnapshot()`, `getRuntime()`
- **src/cli** (`@flowconsole/cli`) - CLI tool for architecture analysis

## Architecture

### DSL and Runtime (`src/web/languages/typescript/`)
- `dsl.ts` - TypeScript type declarations injected into the Monaco editor for autocompletion
- `diagramRuntime.ts` - `DiagramRuntime` class that tracks entities and connections; `FlowBuilder` handles chained flow definitions
- `evaluateDiagramCode.ts` - Evaluates user code with runtime injection to produce `DiagramIntermediateModel`
- `modelToReactflowMapper.ts` - Converts intermediate model to ReactFlow nodes/edges

### Core Components (`src/web/components/`)
- `Workbench/CodeDiagramWorkbench` - Monaco editor with live preview, debounced code evaluation
- `ArchitectureDiagram.tsx` - ReactFlow-based renderer with graphviz-wasm auto-layout
- `NavigationPanel/` - Flow and scope navigation controls for rendered diagrams

### Diagram Infrastructure (`src/web/diagram/`, `src/web/reactflow/`)
- Custom ReactFlow nodes and edges with animation support
- `graphvizLayoutService.ts` — legacy graphviz-wasm layout (used as fallback)

### Constraint-Based Auto-Layout Pipeline (`src/web/diagram/layout/`)

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

## Testing Conventions

- Unit tests: `tests/unit/` using Vitest + React Testing Library
- E2E tests: `tests/e2e/` using Playwright (runs against built app on port 4173)
- Test config: `vitest.config.ts` (root), `playwright.config.ts` (root)

## Code Style

- TypeScript/React with functional components and hooks
- UI: Mantine components + custom CSS variables for theming
- Linting: ESLint with typescript-eslint, react-hooks, and react-refresh plugins
- Prefer existing patterns in `src/core` for state management (useMemo/useCallback)
