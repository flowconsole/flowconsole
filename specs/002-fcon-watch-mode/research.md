# Research: fcon watch mode

Feature: `specs/002-fcon-watch-mode/spec.md` | Date: 2026-08-26

## R-001 CLI surface (resolved in spec FR-005)

- **Decision**: dedicated `fcon watch [path]` command, sibling of `fcon view`.
- **Rationale**: matches user mental model; leaves `view`/`build` flags and exit codes untouched (COMP-001); watch-only flags (--debounce-ms, --port, --no-open) do not pollute existing commands.
- **Alternatives**: `fcon view --watch` (couples viewer startup semantics to rebuild semantics; muddies exit codes), `fcon build --watch` (no viewer lifecycle home). Rejected.

## R-002 Refresh mechanism: polling vs push

- **Decision**: **polling with a lightweight status endpoint** (`/api/status`), snapshot re-fetch only when a version token changes.
- **Evidence**: `ViewerHost` (`engine/src/FlowConsole.Cli/Hosting/ViewerHost.cs`) is a minimal `HttpListener` with exactly three routes (`/`, `/api/snapshot`, `/assets/*`). Viewer (`packages/viewer/src/api.ts`, `App.tsx`) fetches once on mount; no WebSocket/EventSource infrastructure exists anywhere in the CLI. HttpListener SSE keeps the connection occupied per client and complicates the serial request loop; WebSocket upgrade is not supported by HttpListener without hand-rolled RFC 6455 code.
- **Rationale**: polling a ~100-byte JSON endpoint every 500–1000 ms is well inside NFR-001 (< 2 s propagation), requires no new dependency, no protocol upgrade handling, and degrades gracefully when the host is mid-restart. Version token prevents redundant snapshot re-fetch/render.
- **Alternatives**: SSE (blocked by HttpListener request-loop model — one thread per held connection); WebSocket (no server support in HttpListener; new dependency otherwise); full re-fetch of `/api/snapshot` per poll (wasteful for large snapshots; re-renders diagram unnecessarily).

## R-003 Watch input scope

- **Decision**: watch the **build working directory** recursively for `*.cs`, `*.csproj`, `*.fsproj` (future-proof), and `.flowconsole.yaml` (top-level config changes). The build cwd is resolved exactly as `BuildCommand` resolves it: CLI `--cwd` > config `build.cwd` (relative to config dir) > config dir; config discovery via `ConfigDiscovery.FindConfigFile` walks up to git root.
- **Rationale**: the configured `build.command` (e.g. `dotnet run --project builder`) compiles from sources under cwd; watching those files covers every input the build consumes on this machine. Watching `bin/`/`obj/` output is excluded (filter on extension + directory prefix `bin/`, `obj/`, `.flowconsole/`, `node_modules/`) to avoid feedback loops (build writes → triggers build).
- **Alternatives**: watching only the single input file argument (insufficient — a C# builder project is many files); Roslyn workspace tracking (new dependency, over-engineering for v1). Rejected.

## R-004 Relationship to draft `specs/001-local-csharp-preview`

- **Decision**: this feature supersedes the draft; 001 remains an unfilled draft directory, archived later.
- **Rationale**: intake of run `540c94f0` recorded the supersession; 001 never produced a spec body.

## R-005 Debounce and build serialization semantics

- **Decision**: reuse the `WatchRunner` debounce pattern (200 ms timer swap, `SemaphoreSlim(1,1)` run lock) but replace "skip if lock held" with a **dirty flag + follow-up run**: if an event arrives while a build is running, set `_pending` and run once more after the current build completes. This satisfies FR-003/EDGE-002 exactly (at most one follow-up, never concurrent).
- **Evidence**: current `WatchRunner.OnFileChanged` (`engine/src/FlowConsole.Cli/Watch/WatchRunner.cs:85`) silently drops the change when the lock is held — acceptable for stateless validation, wrong for a build pipeline where the dropped edit is the newest source state.
- **Alternatives**: a `Channel<object>` build queue (unbounded queueing can pile up builds behind a slow `dotnet build`; the latest-state-wins flag is strictly better); dropping events (violates FR-003).

## R-006 Cross-platform atomic-replace watching

- **Decision**: subscribe to `Changed`, `Created`, `Renamed`, `Deleted` on the source watcher; treat any event as a debounced trigger; never treat transient states as fatal. Snapshot reads by the viewer already tolerate absence (`SnapshotStartupValidator` / 404 mapping in `api.ts`); snapshot writes go through `AtomicFileWriter` (temp + `File.Move` overwrite), so the snapshot path only ever transitions old→new atomically. Watch mode additionally notifies the viewer of build *state* (ok/building/error) so the page never renders a corrupt diagram and keeps the last valid one (ERR-002).
- **Evidence**: `AtomicFileWriter.cs` (temp file + rename), `FileSystemWatcher` semantics (replace-style saves surface as Deleted+Created on some platforms).
- **Rationale**: OS notify differences collapse into the same debounce pipeline; no special-casing per OS.

## R-007 Viewer change-indication UX

- **Decision**: extend the viewer SPA (`packages/viewer`) with a `useSnapshotStatus` hook polling `/api/status`; three visual states — building (subtle indicator), ok (clears), error (banner with build error excerpt, diagram area retains last valid snapshot). Design tokens: blue `#58a6ff` accent, minimal motion, no emoji (constitution IV).
- **Alternatives**: terminal-only feedback (violates FR-006 "visible error indication in the viewer"); toast per rebuild (noise). Rejected.
