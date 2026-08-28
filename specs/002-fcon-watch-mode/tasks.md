# Tasks: fcon watch mode — local C# architecture preview

**Input**: Design documents from `/specs/002-fcon-watch-mode/` (spec.md, plan.md, research.md, data-model.md, contracts/cli-watch.md, quickstart.md)

**Prerequisites**: spec.md ✅, plan.md ✅, research/data-model/contracts/quickstart ✅, checklists/requirements.md ✅ (watch-loop.md pending reviewer pass)

**Tests**: Tests are mandatory for changed behavior and regressions per constitution V.

**Organization**: Tasks are grouped by user story (US1 start session P1, US2 live update P2, US3 failure feedback P3) to enable independent implementation and testing.

## Format: `[ID] [P?] [CATEGORY] [Story/Requirement] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[CATEGORY]**: One of `[DEV]`, `[TEST]`, `[DOC]`, `[MIGRATION]`, `[SECURITY]`, `[OPS]`, `[REVIEW]`
- Include requirement/risk IDs, exact current file paths, assigned agent role, dependencies, local verification command, and expected evidence

## FlowConsole Path Conventions

- **OSS TypeScript**: `packages/viewer/` (this feature)
- **OSS .NET**: `engine/src/FlowConsole.Cli/`, `engine/tests/FlowConsole.Cli.Tests/`
- No versioned contract change (snapshot schema unchanged); new local HTTP route documented in `specs/002-fcon-watch-mode/contracts/cli-watch.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new projects or dependencies needed — existing `FlowConsole.Cli` and `packages/viewer` are the homes (plan §Structure Decision). Setup is verification-only.

- [x] T001 [OPS] Confirm baseline green before any change: run `dotnet test engine/src/FlowConsole.Cli` and `pnpm --filter @flowconsole/viewer test` from repo root — Role: Implementer Agent — Verify: both commands exit 0 — Evidence: recorded in verification.md baseline section
- [x] T002 [TEST] [US2/FR-004] Add `fetchStatus()` to `packages/viewer/src/api.ts` mirroring the existing `fetchSnapshot()` error-mapping pattern (404 → `'no-watch'` sentinel; typed `WatchStatus { version, state, lastError }`) — Role: Implementer Agent — Verify: `pnpm --filter @flowconsole/viewer test` — Evidence: unit tests for mapping pass

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: WatchSession aggregate and status route — every user story consumes them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [DEV] Implement `WatchSession` in `engine/src/FlowConsole.Cli/Watch/WatchSession.cs` per data-model.md: states Idle/Building/BuildFailed, monotonic Version, Pending flag, `SemaphoreSlim(1,1)` + pending-follow-up semantics (never drops newest state — unlike `WatchRunner.OnFileChanged`), exposing status snapshot for the host — Role: Implementer Agent — Depends: none — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: WatchSessionTests green
- [x] T004 [DEV] Implement `WatchFileFilter` in `engine/src/FlowConsole.Cli/Watch/WatchFileFilter.cs`: include `*.cs`, `*.csproj` recursive under build cwd + top-level `.flowconsole.yaml`; exclude `bin/`, `obj/`, `.flowconsole/`, `node_modules/` subtrees (plan R-003) — Role: Implementer Agent — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: filter unit tests cover include/exclude/replace-style events
- [x] T005 [TEST] Add `engine/tests/FlowConsole.Cli.Tests/Watch/WatchSessionTests.cs`: debounce coalescing (10 rapid events → ≤2 runs), serialization + pending-flag (event during run → exactly one follow-up), failure → BuildFailed + recovery → Idle, version monotonicity — Role: Test Agent — Depends: T003 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: tests red before T003 lands where written first, green after
- [x] T006 [DEV] Extend `engine/src/FlowConsole.Cli/Hosting/ViewerHost.cs` with `GET /api/status` route: JSON `{version, state, lastError}` from injected status provider delegate, `Cache-Control: no-store`; without provider (plain `fcon view`) route returns 404 — Role: Implementer Agent — Depends: T003 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: ViewerHostStatusTests green; existing ViewerHostTests unchanged
- [x] T007 [TEST] Add `engine/tests/FlowConsole.Cli.Tests/Hosting/ViewerHostStatusTests.cs`: payload per state, no-store header, 404 without provider, `/api/snapshot` and `/` behavior byte-identical to before (COMP-001) — Role: Test Agent — Depends: T006 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: all assertions pass including COMP-001 regression assertions

**Checkpoint**: Foundation ready — user story implementation can begin in parallel.

---

## Phase 3: User Story 1 — Start a watch session, see the diagram (Priority: P1) 🎯 MVP

**Goal**: `fcon watch [path]` builds initial snapshot, starts loopback viewer, opens browser; Ctrl+C exits clean.

**Independent Test**: quickstart.md scenario 1 (single command → diagram in browser) + scenario 5 (Ctrl+C → exit 0, port released) + scenario 7 (loopback-only).

### Implementation for User Story 1

- [x] T008 [DEV] [US1/FR-001,FR-005] Add `WatchSettings` in `engine/src/FlowConsole.Cli/Commands/WatchSettings.cs` (path, --command, --cwd, --port, --no-open, --debounce-ms, --max-snapshot-bytes per contracts/cli-watch.md) — Role: Implementer Agent — Depends: Phase 2 — Verify: `dotnet build engine/src/FlowConsole.slnx` — Evidence: command compiles with expected flag surface
- [x] T009 [DEV] [US1/FR-001] Implement `WatchCommand` in `engine/src/FlowConsole.Cli/Commands/WatchCommand.cs`: resolve config/cwd/command exactly as `BuildCommand.ExecuteAsync` does (ConfigDiscovery → flag > build.command > error+hint exit 2), run initial build via `ShellOutRunner` → `SnapshotSerializer.Normalize` → `OutputRouter`/`AtomicFileWriter`, then start `ViewerHost` with status provider, `BrowserLauncher` open (respect --no-open/CI), await cancellation — Role: Implementer Agent — Depends: T003, T006, T008 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: WatchCommandTests green
- [x] T010 [DEV] [US1/FR-008] Register `fcon watch` in `engine/src/FlowConsole.Cli/Program.cs` next to `AddCommand<ViewCommand>`; ensure SIGINT via existing `CancellationHandler` disposes host, watchers, kills build child process tree (ShellOutRunner registration), exit 0 on first signal — Role: Implementer Agent — Depends: T009 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: shutdown integration test exits 0
- [x] T011 [TEST] [US1/FR-001,FR-005,FR-007,FR-008] Add `engine/tests/FlowConsole.Cli.Tests/Commands/WatchCommandTests.cs` using fake build scripts (pattern of BuildCommandTests): initial build + viewer on 127.0.0.1, exit 2 when no build command configured, port conflict → exit 5, cancellation → exit 0 with port released, loopback binding only — Role: Test Agent — Depends: T009, T010 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: all scenario tests pass

**Checkpoint**: US1 fully functional — MVP demo possible (`fcon watch` → browser diagram).

---

## Phase 4: User Story 2 — Diagram updates as I edit (Priority: P2)

**Goal**: Save a C# source change → debounced rebuild → browser shows new diagram without refresh (< 2 s propagation).

**Independent Test**: quickstart.md scenarios 2 (live update) and 3 (burst coalescing, ≤2 builds, never concurrent).

### Implementation for User Story 2

- [x] T012 [DEV] [US2/FR-002] Wire source watching into `WatchSession`: `FileSystemWatcher` (Changed/Created/Renamed/Deleted) filtered by `WatchFileFilter`, debounced (--debounce-ms, default 200), triggering rebuild pipeline from T009 on settled events (plan R-005/R-006) — Role: Implementer Agent — Depends: Phase 2, T009 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: watcher→rebuild tests green incl. replace-style atomic saves
- [x] T013 [DEV] [US2/FR-004] Implement `useSnapshotStatus` hook in `packages/viewer/src/hooks/useSnapshotStatus.ts`: poll `/api/snapshot`... via `fetchStatus()` every 750 ms; 404 → disable polling (no-watch degradation, COMP-001); on version change → refetch snapshot; expose state for UI — Role: Implementer Agent — Depends: T002, T006 — Verify: `pnpm --filter @flowconsole/viewer test` — Evidence: hook unit tests green
- [x] T014 [DEV] [US2/FR-004] Integrate hook into `packages/viewer/src/App.tsx`: replace single mount-time fetch with status-driven refetch; keep last valid snapshot in state across refetches; no visual change when version unchanged — Role: Implementer Agent — Depends: T013 — Verify: `pnpm --filter @flowconsole/viewer test` + manual quickstart scenario 2 — Evidence: manual browser check transcript in verification.md
- [x] T015 [TEST] [US2/FR-002,FR-003,EDGE-002] Extend `WatchSessionTests` (T005) with end-to-end loop coverage: 10 rapid saves → ≤2 builds, event during running build → exactly one follow-up, never concurrent (assert via serialized execution counter) — Role: Test Agent — Depends: T012 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: AC-003 scenario passes
- [x] T016 [TEST] [US2/FR-004] Add Vitest coverage in `packages/viewer/tests/` for `useSnapshotStatus`: version-change refetch, no-change no-refetch, 404 disables polling, error retained until recovery — Role: Test Agent — Depends: T013 — Verify: `pnpm --filter @flowconsole/viewer test` — Evidence: hook tests green

**Checkpoint**: US1 + US2 independently functional — live loop complete.

---

## Phase 5: User Story 3 — Clear failure feedback mid-edit (Priority: P3)

**Goal**: Broken C# source → session survives, terminal shows error, viewer shows error indication + last valid diagram; auto-recovery on fix.

**Independent Test**: quickstart.md scenario 4 (break → banner + survive; fix → auto-recovery).

### Implementation for User Story 3

- [x] T017 [DEV] [US3/FR-006,ERR-001] Implement build-failure handling in `WatchSession`: non-zero exit / invalid stdout → state BuildFailed + lastError excerpt, session continues, terminal error via `CliConsole.Error`, recovery on next successful build → Idle + version++ — Role: Implementer Agent — Depends: T012 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: failure-injection tests green
- [x] T018 [DEV] [US3/FR-006,ERR-002] Add `StatusIndicator` component in `packages/viewer/src/components/StatusIndicator.tsx`: building indicator (subtle), build-failed banner with error excerpt, auto-clear on recovery; blue `#58a6ff` accent, minimal motion, no emoji (constitution IV) — Role: Implementer Agent — Depends: T013, T017 — Verify: `pnpm --filter @flowconsole/viewer test` — Evidence: component tests + manual scenario 4
- [x] T019 [DEV] [US3/ERR-003,EDGE-001] Handle watched-input deletion/rename in `WatchSession`: diagnostic message, no crash, resume on recreate where the platform permits; atomic replace (delete+create) never treated as fatal — Role: Implementer Agent — Depends: T012 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: ERR-003 unit tests green on replace-style events
- [x] T020 [TEST] [US3/FR-006,ERR-001,ERR-002] Add failure-injection integration coverage to `WatchCommandTests`: fake build script flips to failing output mid-session, assert process alive + status state build-failed + last valid snapshot still served; flip back, assert version++ and fresh snapshot — Role: Test Agent — Depends: T017, T018 — Verify: `dotnet test engine/src/FlowConsole.Cli` — Evidence: AC-004 scenario passes

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, embedded assets, full-profile verification.

- [x] T021 [P] [DOC] [ALL/FR-001] Update `engine/src/FlowConsole.Cli/README.md`: add `fcon watch` section (single-command iterate flow, flags, exit codes) replacing the two-terminal iterate flow description — Role: Documentation Agent — Verify: manual review — Evidence: README section merged
- [x] T022 [OPS] [ALL] Rebuild viewer and refresh embedded assets: `pnpm --filter @flowconsole/viewer build && node scripts/copy-viewer-dist.mjs`, then `dotnet build engine/src/FlowConsole.Cli` so `Resources/web` contains the new viewer — Role: Implementer Agent — Depends: T014, T018 — Verify: embedded `index.html`/assets hashes updated in build output — Evidence: build artifact check
- [x] T023 [P] [TEST] [ALL] Run quickstart.md scenarios 1–7 end-to-end on a real sample project; retain transcripts, `/api/status` curls, exit codes in verification.md — Role: Verification Agent — Depends: all stories — Verify: manual per quickstart — Evidence: verification.md filled

---

## Final Verification and Review

- [x] T024 [TEST] [ALL] Run full profile from plan.md: `pnpm build && pnpm test:unit`, `dotnet build engine/src/FlowConsole.slnx`, `dotnet test engine/src/FlowConsole.slnx`, `dotnet format engine/src/FlowConsole.slnx --verify-no-changes` — Role: Verification Agent — Evidence: verification.md
- [x] T025 [REVIEW] [ALL] Independent review: diff vs spec/plan/constitution, checklists/watch-loop.md reviewer pass, residual risks, verdict — Role: Maintainer Reviewer (fresh context) — Evidence: review.md
- [x] T026 [REVIEW] [ALL] Resolve blocking findings, update traceability table in spec.md if assumptions changed — Role: Delivery Lead — Evidence: approved verification.md + review.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: immediate
- **Phase 2**: after Phase 1 — **blocks all stories**
- **US1 (Phase 3)**: after Phase 2
- **US2 (Phase 4)**: after Phase 2 + T009 (rebuild pipeline); viewer side (T013/T014) needs T002/T006 only
- **US3 (Phase 5)**: after T012 (watching) and T013 (status hook)
- **Polish/Verification**: after all desired stories

### Parallel Opportunities

- T002 (viewer api) ∥ T003/T004 (engine) — different repos/languages, no shared files
- T005 ∥ T007 once T003/T006 land; T008 parallel to T003–T007
- T013 (viewer hook) ∥ T012 (engine watcher) after T006
- T021 (docs) parallel to any story phase

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + 2 → foundation
2. Phase 3 (US1) → **STOP, validate quickstart scenarios 1/5/7** — demo-able
3. US2 → live loop; US3 → resilience
4. Phase 6 + Final Verification → full profile + review

### Notes

- [P] = different files, no dependencies
- Verify tests fail before implementing where test-first is natural (T005, T007, T015, T016)
- Preserve unrelated changes; record evidence after each task
- Existing suites (`ViewCommandTests`, `BuildCommandTests`, `ValidateCommandTests`, `ViewerHostTests`) must stay green throughout — COMP-001

---

## Phase 7: Convergence

- [x] T027 Register SIGTERM handling alongside SIGINT in engine/src/FlowConsole.Cli/Infrastructure/CancellationHandler.cs (PosixSignalRegistration.SIGTERM → same graceful cancellation path) so `fcon watch` exits 0 with watchers disposed and build child tree killed on `kill <pid>` per FR-008 (partial)
