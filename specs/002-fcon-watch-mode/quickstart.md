# Quickstart: fcon watch mode

Feature: `specs/002-fcon-watch-mode/spec.md` | Date: 2026-08-26

Validation guide — proves the feature end-to-end. Implementation detail lives in `tasks.md`.

## Prerequisites

- .NET 10 SDK; repo root = `src_oss`
- Built engine: `dotnet build engine/src/FlowConsole.slnx`
- A sample project with a C# SDK builder and `.flowconsole.yaml` containing `build.command` (the existing engine test fixtures / README example project serve)

## Scenarios

### 1. Single-command loop (AC-001, FR-001/FR-005)

```bash
fcon watch ./sample-project     # or: dotnet run --project engine/src/FlowConsole.Cli -- watch ./sample-project
```

Expected: initial build runs, snapshot written, viewer serves on `http://127.0.0.1:<port>`, browser opens with the rendered diagram. One terminal, one command.

### 2. Live update on save (AC-002, FR-002/FR-004)

Edit a C# source file in the builder project (add an element), save.

Expected: within debounce (200 ms) + build time, the browser shows the new element **without manual refresh**; snapshot-to-diagram propagation < 2 s. `GET /api/status` shows `state: "building"` during the rebuild, then `version` increments.

### 3. Burst edits coalesce (AC-003, FR-003/EDGE-002)

Save 10 rapid edits within the debounce window.

Expected: at most one immediate build + one coalesced follow-up; never concurrent builds (observable: no interleaved build output; `/api/status` version increments at most twice).

### 4. Failure feedback and recovery (AC-004, FR-006/ERR-001)

Introduce a C# compile error, save. Then fix it, save.

Expected: process stays alive; terminal shows the build error; viewer shows an error banner while retaining the last valid diagram; after the fix, the diagram auto-updates back to valid.

### 5. Clean shutdown (AC-005, FR-008)

Press Ctrl+C.

Expected: exit code 0, port released (re-running watch on the same `--port` succeeds immediately), no orphaned build child processes.

### 6. Loopback-only binding (AC-007, FR-007)

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:<port>/api/status   # 200
curl -s -m 2 http://<lan-ip>:<port>/api/status                               # connection refused/timeout
```

### 7. No regressions (AC-006, COMP-001)

```bash
dotnet test engine/src/FlowConsole.slnx
```

Expected: existing CLI suites (`ViewCommandTests`, `BuildCommandTests`, `ValidateCommandTests`) pass unchanged.

## Evidence to retain (for verification.md)

- Terminal transcript of scenario 1–5 with timestamps
- `curl /api/status` outputs before/during/after a rebuild
- Exit code check after Ctrl+C (`echo $?` → 0)
