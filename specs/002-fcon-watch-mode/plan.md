# Implementation Plan: fcon watch mode — local C# architecture preview

**Branch**: `002-fcon-watch-mode` | **Date**: 2026-08-26 | **Spec**: `specs/002-fcon-watch-mode/spec.md`

**Input**: Feature specification from `/specs/002-fcon-watch-mode/spec.md`

**Brief**: `.specify/workflows/runs/540c94f0/artifacts/intake.md` | **Task Type**: feature | **Target**: `src_oss` / `engine` (FlowConsole.Cli watch+hosting) + `packages/viewer`

## Summary

Add a dedicated `fcon watch [path]` command that combines the existing build pipeline (`ConfigDiscovery` → `ShellOutRunner` → `SnapshotSerializer` → `AtomicFileWriter`) and viewer (`ViewerHost`) into one long-running local loop: watch C# source files under the build cwd (debounced, serialized builds), regenerate the snapshot on change, and live-update the open browser page via a new lightweight `/api/status` polling endpoint (see `research.md` R-002). Failure states surface in both terminal and viewer without killing the session.

## Technical Context

**Language/Version**: C# / .NET 10 (`engine/src/FlowConsole.Cli`); TypeScript/React for viewer (`packages/viewer`)

**Primary Dependencies**: Spectre.Console.Cli (command wiring), `HttpListener` (existing `ViewerHost`), `FileSystemWatcher` (existing `WatchRunner` pattern), Vite/React/ReactFlow (existing viewer)

**Storage**: files only — `.flowconsole.yaml` (read), `.flowconsole/snapshots/*.json` (write, atomic)

**Testing**: xUnit + NSubstitute + FluentAssertions (`engine/tests/FlowConsole.Cli.Tests`), Vitest (`packages/viewer/tests`)

**Target Platform**: Windows / macOS / Linux (self-contained `fcon` binary)

**Project Type**: CLI + embedded local web viewer

**Performance Goals**: refresh propagation (snapshot ready → diagram visible) < 2 s; debounce 200 ms (NFR-001)

**Constraints**: loopback-only listener; no new NuGet/npm dependencies; no snapshot schema change

**Scale/Scope**: single user, single watch session per directory

## Current-State Evidence

- **Applicable instructions**: `src_oss/CLAUDE.md`, `engine/README.md`, `engine/src/FlowConsole.Cli/README.md`, `.specify/memory/constitution.md`
- **Existing implementation** (all inspected 2026-08-26):
  - `engine/src/FlowConsole.Cli/Watch/WatchRunner.cs` — debounce + serialized-run pattern, wired only into `ValidateCommand` (`--watch`); drops events when a run is in flight (R-005)
  - `engine/src/FlowConsole.Cli/Hosting/ViewerHost.cs` — `HttpListener` with exactly `/`, `/api/snapshot`, `/assets/*`; no push infrastructure (R-002)
  - `engine/src/FlowConsole.Cli/Commands/BuildCommand.cs` — full build pipeline: config discovery (`ConfigDiscovery.FindConfigFile` / `ReadBuildConfig`), command resolution (flag > config > error+hint), `ShellOutRunner.RunAsync` (sh -c / cmd /c, 10 MB cap, tree-kill on cancel), `SnapshotSerializer.Normalize`, `OutputRouter`
  - `engine/src/FlowConsole.Cli/Infrastructure/AtomicFileWriter.cs` — temp + `File.Move` overwrite (EDGE-001)
  - `engine/src/FlowConsole.Cli/Infrastructure/CancellationHandler.cs` — SIGINT: first = graceful cancel, second = exit 130
  - `packages/viewer/src/api.ts`, `App.tsx` — single `fetch('/api/snapshot')` on mount; typed error mapping (404/413/parse)
  - `scripts/copy-viewer-dist.mjs` — viewer dist → `Resources/web` embedded assets pipeline
  - Command registration: `Program.cs` (`AddCommand<ViewCommand>("view")`, `AddCommand<BuildCommand>("build")`)
- **Existing tests/contracts**: `engine/tests/FlowConsole.Cli.Tests/Commands/{ViewCommandTests,BuildCommandTests,ValidateCommandTests}.cs`, `Hosting/ViewerHostTests.cs`; snapshot contract `.flowconsole/snapshots/*.json`
- **Manifests/commands verified**: `engine/src/FlowConsole.slnx`, `engine/src/FlowConsole.Cli/FlowConsole.Cli.csproj` (line 50 embeds `Resources/web/**`), `packages/viewer/package.json`
- **Stale/conflicting sources**: none found; spec assumptions match current code exactly

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Evidence and source precedence followed; no invented paths or commands. (Every decision in the table below cites an inspected file.)
- [x] `src_oss`/`src_main` ownership and licensing boundaries preserved. (All work in `src_oss`: engine CLI + `packages/viewer`. No `src_main` dependency; viewer stays loopback, read-only, no auth — FR-007.)
- [x] Every requirement and risk has planned implementation and verification. (FR-001..008, NFR-001/002, COMP-001, ERR/EDGE mapped below and in test strategy.)
- [x] Behavior changes include risk-appropriate tests; silent skips are absent. (Unit: watcher/debounce/serialization/state; integration: CLI loop + failure injection; manual: browser checks declared in quickstart.)
- [x] Local focused/full proof and independent review are planned. (Focused: CLI test project + viewer vitest; full profile per constitution `src_oss` .NET+TS list.)
- [x] Security, compatibility, migration, rollback, and docs are addressed or explicitly N/A. (Security: loopback-only, no auth surface change; compat: COMP-001 regression suites; migration: N/A — no data/schema change; rollback: revert commit, no state; docs: CLI README in same change.)

## Project Structure

### Documentation (this feature)

```text
specs/002-fcon-watch-mode/
├── spec.md, research.md, data-model.md, contracts/cli-watch.md, quickstart.md (this plan's outputs)
├── test-plan.md, tasks.md, verification.md, review.md, checklists/   (later stages)
```

### Source Code (repository root)

```text
engine/src/FlowConsole.Cli/
├── Commands/WatchCommand.cs          # new: fcon watch entry (WatchSettings)
├── Commands/WatchSettings.cs         # new
├── Watch/WatchSession.cs             # new: rebuild loop aggregate (debounce, run-lock+pending flag, state/version)
├── Watch/WatchFileFilter.cs          # new: *.cs/*.csproj include set, bin/obj/.flowconsole excludes
├── Hosting/ViewerHost.cs             # extend: /api/status route (status provider delegate)
└── Program.cs                        # register command

engine/tests/FlowConsole.Cli.Tests/
├── Commands/WatchCommandTests.cs     # new
├── Watch/WatchSessionTests.cs        # new
└── Hosting/ViewerHostStatusTests.cs  # new: /api/status route

packages/viewer/src/
├── api.ts                            # extend: fetchStatus()
├── hooks/useSnapshotStatus.ts        # new: poll /api/status, refetch snapshot on version change
└── components/StatusIndicator.tsx    # new: building/error banner (last valid diagram retained)

scripts/copy-viewer-dist.mjs          # unchanged; rerun after viewer build to refresh embedded assets
```

**Structure Decision**: reuse the two existing homes — CLI behavior in `FlowConsole.Cli` (`Commands/` + `Watch/` + `Hosting/`), viewer UI in `packages/viewer`; no new projects, no new packages.

## Architecture and Ownership Decisions

| Decision | Current evidence | Choice and rationale | Alternatives rejected | Requirement/risk IDs |
|---|---|---|---|---|
| Dedicated `fcon watch` command | `Program.cs` command tree; FR-005 | Sibling of `view`; watch-specific flags isolated | `view --watch` (exit-code coupling), `build --watch` (no viewer home) | FR-005, R-001 |
| Viewer refresh via `/api/status` polling | `ViewerHost.cs` HttpListener has 3 routes, no WS/SSE; `api.ts` fetch-once | ~100-byte JSON poll every 750 ms; refetch snapshot only on version change; <2 s propagation within NFR-001 | SSE/WS (unsupported by HttpListener without new dep), full snapshot re-poll (wasteful) | FR-004, NFR-001, R-002 |
| Reuse build pipeline as-is | `BuildCommand.cs` lines 70–175 | Same config resolution, runner, normalize, atomic write — extract shared `SnapshotBuildService` only if duplicate logic exceeds trivial call; prefer composition over refactor | Copy-paste build logic (drift risk); refactor BuildCommand to a service in the same change (scope creep; constitution IV minimal change) | FR-002, COMP-001 |
| WatchSession: lock + pending flag | `WatchRunner.cs:85` drops events when lock held | Latest-state-wins follow-up build; never concurrent, never drops newest state | Channel queue (build pile-up), event drop (violates FR-003) | FR-003, EDGE-002, R-005 |
| Watch source set: `*.cs`/`*.csproj` under build cwd + top-level `.flowconsole.yaml`, excluding `bin/ obj/ .flowconsole/ node_modules/` | `ConfigDiscovery.cs` cwd resolution; FileSystemWatcher semantics | Covers all inputs the configured build consumes; exclusion prevents build-output feedback loops | Single file watch (multi-file projects), Roslyn workspace (dependency + over-engineering) | FR-002, R-003 |
| Viewer graceful degradation without watch | `/api/status` absent in plain `view` sessions | Viewer treats 404 on status as "no watch", disables polling — keeps `fcon view` behavior byte-identical | Making viewer always poll (wasted requests in view mode) | COMP-001 |
| Viewer error indication | `App.tsx` single fetch; FR-006 | Status banner (building/failed) + retain last valid snapshot in state; blue accent, minimal motion per design tokens | Terminal-only error (violates FR-006) | FR-006, ERR-001/002, R-007 |

**Cross-repository**: none. All changes in `src_oss`.

## Contract, Data, and Security Impact

- **Public/API/schema/CLI/SDK contracts**: new CLI command + new local HTTP endpoint `/api/status` (see `contracts/cli-watch.md`); snapshot schema and existing commands unchanged. `fcon view` sessions don't serve `/api/status` → viewer degrades gracefully.
- **Data model/migration**: N/A — no persisted data; snapshot file format unchanged.
- **Authentication/authorization**: N/A — loopback-only, single-user, read-only (FR-007); no new auth surface.
- **Secrets/privacy/telemetry**: no telemetry added; build command output stays local; no secrets handling change.
- **Threats/abuse cases**: binding remains `http://127.0.0.1:{port}/` only (`ViewerHost.cs:21`) — non-loopback unreachable (AC-007 verified by curl check in quickstart). Build error excerpts passed to `/api/status` may contain local paths — acceptable: local-only, single user.

## Test and Verification Strategy

- **Risk-based levels**:
  - Unit (`WatchSessionTests`): debounce coalescing (10 rapid events → ≤2 builds), serialization + pending-flag semantics, build-failure state transition and recovery, version monotonicity, file filter include/exclude rules
  - Unit (`ViewerHostStatusTests`): `/api/status` payload per state, no-store header, 404 in non-watch mode unchanged
  - Unit (viewer, Vitest): `useSnapshotStatus` polling, version-change refetch, 404 → polling disabled, error banner renders with last valid snapshot retained
  - Integration (`WatchCommandTests`): full loop with a fake build command (script writing a snapshot), Ctrl+C clean shutdown exit 0, port release, child-process termination on cancel
  - Manual/browser: quickstart scenarios 1–6 (single command, live update, failure/recovery, loopback) — evidence retained for `verification.md`
- **Regression behavior**: existing `ViewCommandTests`, `BuildCommandTests`, `ValidateCommandTests`, `ViewerHostTests` must pass unchanged (COMP-001/AC-006).
- **Environments/fixtures**: no Docker; fake build scripts (existing pattern in `BuildCommandTests`); manual browser check declared as prerequisite.
- **Focused commands**: `dotnet test engine/src/FlowConsole.Cli` ; `pnpm --filter @flowconsole/viewer test` (from repo root)
- **Full commands**: `dotnet build engine/src/FlowConsole.slnx` && `dotnet test engine/src/FlowConsole.slnx` && `dotnet format engine/src/FlowConsole.slnx --verify-no-changes`; `pnpm build && pnpm test:unit` + `node scripts/copy-viewer-dist.mjs` before engine build (embedded assets)
- **Evidence**: `verification.md` retains quickstart transcripts, status-endpoint curls, exit codes, full-profile outputs with timestamps.

## Rollout, Migration, and Rollback

- **Delivery/compatibility sequence**: (1) viewer status polling + degradation, (2) `/api/status` in ViewerHost, (3) WatchSession + `fcon watch` command, (4) README docs + embedded asset refresh. Each step lands green independently.
- **Observability/manual validation**: `--verbose` build output (existing pattern); `/api/status` is itself the observability surface; quickstart scenarios are the owner validation checklist.
- **Rollback/recovery**: single revert; no persisted state, no schema, no config format change.
- **Documentation**: `engine/src/FlowConsole.Cli/README.md` (watch section replacing the two-terminal iterate flow note); spec traceability table already lists evidence per FR.

## Complexity Tracking

No constitution violations to justify. No new projects, packages, or abstractions beyond `WatchSession` (the aggregate the spec's Key Entities section requires).
