# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowConsole is an architecture-as-code platform that lets developers model system architecture, track system drift, and generate animated diagrams and system flows. The project uses a pnpm monorepo structure.

## Common Commands

```bash
# Install dependencies (from repo root or any workspace)
pnpm install

# Development (run from apps/docs)
pnpm dev

# Build
pnpm build                              # Build current package
pnpm --filter @flowconsole/web build    # Build core package specifically

# Linting
pnpm lint                     # Run ESLint
pnpm lint:fix                 # ESLint with auto-fix

# Testing
pnpm test:unit                # Run Vitest unit tests across all packages

# Run single test file (in any package)
pnpm --filter @flowconsole/web vitest run tests/unit/<filename>.test.ts
```

## Workspace Structure

- **apps/docs** (`flowconsole-docs`) - Documentation + marketing site (Next.js)
- **packages/web** (`@flowconsole/web`) - React diagram components, layout pipeline, Monaco workbench
- **packages/sdk** (`@flowconsole/sdk` v2.0.0) - Typed architecture-as-code SDK with jsii multi-language support (TypeScript, C#, Java, Python, Go). 13 base element classes, 6 deployment classes, 23 convenience wrappers. Three-layer API: Topology (elements + belongsTo), Flows (fluent interaction chains with automatic relationship inference), Deployment (infrastructure targets). `SoftwareSystem` (not `System`) due to C# reserved name. Key exports: `buildSnapshot()`, `getRuntime()`
- **packages/ui** (`@flowconsole/ui`) - Shared shadcn/Radix UI primitives (consumed by apps/docs)
- **packages/cli** (`@flowconsole/cli`) - npm-wrapper that distributes the .NET self-contained `fcon` CLI binary (source in `engine/src/FlowConsole.Cli/`)

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

## Engine — CLI Rule Engine

Two .NET projects implement the v1alpha1 rule engine:

- **engine/src/FlowConsole.Rules.Core** — domain types, compiled model, ingest pipeline (5 phases: parse → schema → semantic → expression → normalize), abstractions (IRuleFileIngestor, IExpressionCompiler, IExpressionEvaluator, ISubjectResolver, IPathFinder, IRuleExecutor). No external dependencies beyond YamlDotNet.
- **engine/src/FlowConsole.Rules.Engine.Default** — Cel.NET-based expression compiler/evaluator, helper functions (collection, graph, diff, predicate), InMemory subject resolver, path finder, rule executor. Cel.NET types do not leak into the public API surface.

## Engine — Scanners

- **engine/src/FlowConsole.Scanners.Helm** — Helm chart scanner shared library. Parses Chart.yaml + templates/ to produce typed Elements/Relationships (Deployment, Service, Ingress, ConfigMap, etc.). Implements `IInfraScanner`. Used by the CLI (`fcon scan` auto-detects via Chart.yaml).

Rule file contract: `contracts/rules/v1alpha1/` — JSON Schema, expression language spec, types, helpers, diagnostics, conformance suite (50+ fixtures).

```bash
# Engine build and test
cd engine
dotnet build src/FlowConsole.slnx
dotnet test src/FlowConsole.slnx --verbosity quiet

# Contract validation (conformance fixtures)
cd .. && pnpm validate:rules:all
```

## Testing Conventions

- Unit tests: per-package `tests/unit/` using Vitest + React Testing Library (e.g. `packages/web/tests/unit/`)
- Engine tests: `engine/tests/` using xUnit + NSubstitute + FluentAssertions
- Test config: per-package `vitest.config.ts` (no root configs)

## Code Style

- TypeScript/React with functional components and hooks
- UI: shadcn/Radix primitives from `@flowconsole/ui` (`packages/ui/`)
- Linting: ESLint with typescript-eslint, react-hooks, and react-refresh plugins
- Prefer existing patterns in `@flowconsole/core` (`packages/core/`) for state management (useMemo/useCallback)

## Note

Server code (Api, Application, Infrastructure, plugins, web SPA, docker stack) has been moved to the private `src_main` repository.
