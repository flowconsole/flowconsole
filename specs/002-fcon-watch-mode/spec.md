# Feature Specification: Local C# Watch-Mode Architecture Preview

**Feature Branch**: `002-fcon-watch-mode`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "Я хочу локально описывать архитектуру на C# и просматривать визуализацию прямо в браузере, цикл локальной разработки без сервера (src_main) только через локальный листенер ctl инструмент. То есть я запущу fcon в вотч режиме на каком-то файле и хочу видеть как меняется картинка пока описываю архитектуру"

**Task Type**: feature

**Target**: `src_oss` / full (primarily `engine` — `FlowConsole.Cli` watch/hosting; viewer assets consume the snapshot; `sdk` is only the authoring surface, no changes)

**Brief**: `.specify/workflows/runs/540c94f0/artifacts/intake.md` (supersedes draft `specs/001-local-csharp-preview` / run `0f2f3b0e`)

## Problem, Outcome, and Scope *(mandatory)*

- **Problem**: The current documented iterate flow ("Iterate flow" in `engine/src/FlowConsole.Cli/README.md`) requires two terminals and a manual browser refresh: terminal 1 runs `fcon view --no-open`, terminal 2 re-runs `fcon build`/`fcon scan` after every C# source edit, and the user presses F5 in the browser. There is no single command that keeps the visualization in sync with the architecture source. `WatchRunner` exists but is wired only into `ValidateCommand`.
- **Outcome**: A single `fcon` invocation in watch mode observes the C# architecture source, regenerates the snapshot when it changes, and the already-open browser viewer updates automatically — a fully local loop on localhost with no `src_main` backend.
- **In scope**:
  - A watch mode in the `fcon` CLI that observes architecture source inputs and triggers the configured build/scan to regenerate the snapshot.
  - Serving the local viewer and live-updating the open browser page (refresh mechanism — polling vs. push — is a plan decision).
  - Clear feedback in the viewer when a rebuild fails or the snapshot is temporarily invalid mid-edit.
  - Docs update (`engine/src/FlowConsole.Cli/README.md`) in the same change.
- **Non-goals**:
  - Any `src_main` backend/server dependency, authentication, or remote access (viewer stays 127.0.0.1 loopback, single-user, read-only).
  - `fcon push`, live diff-against-backend, telemetry changes.
  - Changes to the SDK authoring API or the snapshot schema (if proven unavoidable, it escalates to a contract change with its own gate).
  - Monaco/web workbench work in `packages/web` unless the chosen refresh mechanism requires it.
- **Unchanged behavior**:
  - Existing `fcon view` behavior must not regress (flags, exit codes, loopback binding).
  - Snapshot contract (`.flowconsole/snapshots/*.json`) unchanged; viewer keeps consuming the same file format.
  - Existing `validate --watch` behavior unchanged.
- **Dependencies**: .NET 10 SDK; existing `.flowconsole.yaml` build configuration (`build.command`); user-provided C# SDK builder project for authoring; existing `ViewerHost`, `BuildCommand`, `WatchRunner` infrastructure.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a watch session and see the diagram (Priority: P1)

As an architect, I run `fcon` in watch mode on my C# architecture source (or its directory/project config) so that the snapshot is built, the local viewer starts on 127.0.0.1, and my browser opens showing the current diagram — one command, one terminal.

**Why this priority**: This is the minimum viable loop; without a single command that starts both the build and the viewer, nothing else matters.

**Independent Test**: Can be fully tested by running the watch command on a sample C# builder project and observing a browser window with the rendered diagram.

**Acceptance Scenarios**:

1. **Given** a directory with `.flowconsole.yaml` and a working C# builder project, **When** I start watch mode, **Then** the snapshot is built, the viewer serves it on a loopback address, and the browser opens automatically (unless suppressed by an existing no-open flag).
2. **Given** watch mode is running, **When** I press Ctrl+C, **Then** the process shuts down cleanly, releasing the port and file watchers.

---

### User Story 2 - Diagram updates as I edit (Priority: P2)

As an architect editing my C# architecture source, I keep the browser open and see the diagram update automatically after each save, without re-running any command or refreshing the page.

**Why this priority**: This is the core value of the feature — closing the loop that today requires a second terminal and manual F5.

**Independent Test**: With watch mode running, edit the C# source (add an element), save, and observe the new element appear in the browser without manual refresh within the target latency.

**Acceptance Scenarios**:

1. **Given** watch mode running with the viewer open, **When** I save a change to a watched C# source file, **Then** the snapshot is rebuilt (debounced) and the browser shows the updated diagram without a manual refresh.
2. **Given** rapid successive saves, **When** edits occur within the debounce window, **Then** only one rebuild is triggered after edits settle, and no rebuilds are dropped or run concurrently.
3. **Given** watch mode running, **When** a rebuild starts while a previous one is still running, **Then** rebuilds are serialized (never concurrent), and the viewer always shows a complete, coherent snapshot.

---

### User Story 3 - Clear failure feedback mid-edit (Priority: P3)

As an architect, when my C# source or generated snapshot is temporarily broken mid-edit, the viewer tells me clearly what happened instead of silently showing stale content or the process dying.

**Why this priority**: A dev-loop tool that crashes or lies on broken intermediate states destroys trust; today `fcon view` exits with code 7 on an invalid snapshot, which is unacceptable for a long-running session.

**Independent Test**: Introduce a compile error in the C# source while watch mode is running and observe an error indication in the browser and/or terminal; fix it and observe recovery.

**Acceptance Scenarios**:

1. **Given** watch mode running, **When** the configured build fails (e.g., C# compile error), **Then** the watch process keeps running, the last valid diagram remains visible with an explicit "build failed" indication, and the build error is reported in the terminal.
2. **Given** watch mode running, **When** the snapshot file is momentarily invalid or mid-write (atomic-write race), **Then** the viewer never renders a corrupted diagram; it either shows the previous snapshot or a clear error, and recovers on the next successful build.
3. **Given** a failed build followed by a corrected save, **When** the rebuild succeeds, **Then** the viewer automatically returns to showing the fresh valid diagram.

### Edge Cases

- What happens when the watched file is deleted or renamed mid-session? (Watcher should not crash; a clear diagnostic is shown; behavior on recreate is defined.)
- What happens when the auto-allocated port is already in use? (Existing port allocation behavior applies; a clear error or fallback, no silent failure.)
- What happens when the snapshot exceeds the existing size guard (`--max-snapshot-bytes`, default 200 MB)? (Existing guard semantics apply and are surfaced in watch mode.)
- What happens on cross-platform file-watch quirks (win/osx/linux notify differences, atomic-replace appearing as delete+create)? (Watcher must handle replace-style atomic writes on all three OSes.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST provide a watch mode that, from a single invocation, builds the initial snapshot, starts the local viewer bound to 127.0.0.1, and keeps running until the user interrupts it.
- **FR-002**: Watch mode MUST detect changes to the architecture source inputs (per R-003 scope decision recorded in the plan) and re-run the configured build/scan to regenerate the snapshot, debounced to coalesce rapid successive edits.
- **FR-003**: Rebuilds triggered by watch mode MUST be serialized — never more than one build running concurrently — and a pending change arriving during a running build MUST trigger exactly one follow-up build.
- **FR-004**: The open browser viewer MUST update to the newly generated diagram without user-initiated page refresh, within the latency target set in NFR-001.
- **FR-005**: The CLI surface MUST be a dedicated `fcon watch` command, taking the input path (file, project, or directory with `.flowconsole.yaml`) as its argument. (Resolves intake R-001: dedicated command chosen — it matches the user's mental model "я запущу fcon в вотч режиме", keeps `view`/`build` flag definitions untouched, and leaves room for watch-specific flags.)
- **FR-006**: When a rebuild fails, watch mode MUST keep running, surface the build error in the terminal, and present a visible error indication in the viewer while retaining the last valid diagram.
- **FR-007**: Watch mode MUST bind its listener to loopback only (127.0.0.1) and remain single-user, read-only, with no authentication requirement.
- **FR-008**: Ctrl+C (SIGINT) and SIGTERM MUST shut down watch mode cleanly: listener released, watchers disposed, child build processes terminated, exit code 0.

### Non-Functional and Compatibility Requirements

- **NFR-001**: From the moment a source save settles (debounce elapsed) to the browser showing the updated diagram, latency should be no worse than: debounce (~200 ms, matching existing WatchRunner) + one build run + refresh propagation; the refresh propagation itself (snapshot ready → diagram visible) MUST be under 2 seconds for snapshots within the existing size guard. A full `dotnet build` per change is acceptable for v1 (resolves intake R-003 part 2); debounce must prevent redundant builds during burst editing.
- **NFR-002**: Watch mode MUST be resilient: no crash from watcher errors, mid-write snapshot reads, or child build process failures across Windows, macOS, and Linux.
- **COMP-001**: Existing `fcon view`, `fcon build`, `fcon validate --watch` commands, their flags, and exit codes MUST remain unchanged. The snapshot file contract is unchanged.

### Failure and Boundary Behavior

- **ERR-001**: Build failure (non-zero exit / compile error) — process continues, terminal shows the build error, viewer shows error indication + last valid diagram (per FR-006).
- **ERR-002**: Invalid or mid-write snapshot encountered by the viewer — never render a corrupt diagram; show previous valid state or clear error; recover automatically on next valid snapshot (per User Story 3, scenario 2).
- **ERR-003**: Watched input deleted/renamed — diagnostic message, no crash; resume when the input reappears if the platform/implementation permits, otherwise instruct the user to restart.
- **EDGE-001**: Atomic snapshot writes (replace-style) MUST be handled without treating the transient absence of the file as a fatal error, on all supported OSes (intake R-006).
- **EDGE-002**: Burst edits within the debounce window produce exactly one rebuild; edits arriving during a running build are queued as at most one follow-up rebuild.

### Acceptance Criteria

- **AC-001**: Running the watch command on a sample project opens a browser showing the diagram, matching FR-001, FR-005.
- **AC-002**: Saving a source change results in the updated diagram appearing in the browser without manual refresh, within NFR-001 latency, matching FR-002, FR-004.
- **AC-003**: Ten rapid saves produce at most two builds (one immediate, one coalesced follow-up), and never concurrent builds, matching FR-003, EDGE-002.
- **AC-004**: A deliberately broken source file yields a visible error state and a surviving process; fixing it yields automatic recovery, matching FR-006, ERR-001.
- **AC-005**: Ctrl+C exits cleanly (port released, exit 0), matching FR-008.
- **AC-006**: `fcon view` and `fcon build` behave exactly as before the change (regression check), matching COMP-001.
- **AC-007**: The listener is unreachable from non-loopback interfaces, matching FR-007.

### Key Entities

- **WatchSession**: A long-running CLI session comprising input watchers, the rebuild pipeline (debounce → serialized build → atomic snapshot write), and the local viewer host; owns lifecycle and shutdown.
- **Snapshot**: The existing generated architecture model artifact consumed by the viewer; produced by the configured build/scan; unchanged contract.
- **Viewer**: The existing localhost-served read-only diagram page; extended with change notification and error indication.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An architect can go from "project on disk" to "live diagram in browser" with a single command and zero additional terminals (vs. two terminals + manual refresh today).
- **SC-002**: A saved source edit is reflected in the browser without any user action other than the save, with refresh propagation under 2 seconds after the snapshot is ready.
- **SC-003**: A one-hour editing session with mixed valid and broken intermediate states completes without the watch process crashing or the browser silently showing stale content.
- **SC-004**: All pre-existing CLI behaviors pass their existing test suites unchanged after the feature lands.

## Assumptions

- Users author architecture with the existing C# SDK builder project pattern and configure `build.command` in `.flowconsole.yaml`; watch mode reuses this configuration rather than introducing a new build configuration format.
- A full `dotnet build` per change (via the configured build command) is acceptable latency for v1; incremental-build optimizations are future work.
- The viewer refresh mechanism (polling vs. push over the existing HttpListener host) will be decided at plan stage (intake R-002); either is compatible with this spec's requirements.
- This run supersedes the draft spec `specs/001-local-csharp-preview` / run `0f2f3b0e` (intake R-004) — that directory remains as an unfilled draft and can be removed or archived.
- Single-user local usage; no concurrent watch sessions on the same directory need to be supported for v1 (though a second session must fail with a clear port/message rather than misbehave).
- Browser auto-open behavior follows existing `fcon view` conventions (opens by default, suppressible).

## Requirement Traceability

| Requirement | Scenario/acceptance criteria | Risk | Planned evidence |
|---|---|---|---|
| FR-001 | US1 / AC-001 | R-001 | integration test (CLI invocation) |
| FR-002 | US2 / AC-002 | R-003 | unit (watcher+debounce), integration |
| FR-003 | US2 / AC-003 | R-003 | unit (run-lock/queue), integration |
| FR-004 | US2 / AC-002 | R-002 | integration (viewer update), manual browser check |
| FR-005 | US1 / AC-001 | R-001 | unit (command wiring), docs |
| FR-006 | US3 / AC-004 | R-005 | unit + integration (failure injection) |
| FR-007 | AC-007 | N/A | unit (binding), manual |
| FR-008 | US1 / AC-005 | N/A | integration (signal handling) |
| NFR-002 / EDGE-001 | Edge Cases | R-006 | unit (atomic-write race), cross-platform CI |
| COMP-001 | AC-006 | N/A | existing engine test suite |
