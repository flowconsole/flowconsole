# Verification: fcon watch mode

Feature: `specs/002-fcon-watch-mode/spec.md` | Verified: 2026-08-27/28 | Scope: full profile

## Baseline (T001)

- `dotnet test engine/tests/FlowConsole.Cli.Tests` — 285/285 passed (pre-change baseline)
- `pnpm --filter @flowconsole/viewer test` — 10/10 passed (pre-change baseline)

## Focused commands (per task)

| Task | Command | Result | Evidence |
|---|---|---|---|
| T002 | `pnpm --filter @flowconsole/viewer test` | 15/15 | `fetchStatus()` mapping incl. 404→no-watch, parse-error |
| T003/T005 | `dotnet test --filter WatchSession` | 7/7 | debounce, pending-flag follow-up (SemaphoreFullException fixed), failure/recovery, version monotonicity |
| T006/T007 | `dotnet test --filter ViewerHost` | 8/8 | `/api/status` payload per state, no-store, 404 without provider, COMP-001 assertions |
| T008–T011 | `dotnet test --filter WatchCommand` | 8/8 | exit 2 (no build.command / bad cwd), exit 3 (failing initial build), loopback viewer, Ctrl+C→0, debounced rebuild, bin/obj no-feedback, mid-session failure survival |
| T013/T016/T018 | `pnpm --filter @flowconsole/viewer test` | 22/22 | useSnapshotStatus polling/404-disable/version-bump, StatusIndicator states |

## Full profile (T024, 2026-08-28)

- `dotnet build engine/src/FlowConsole.slnx` — Build succeeded, 0 warnings
- `dotnet test engine/src/FlowConsole.slnx` — **304/304 passed, 0 failed, 0 skipped**
- `dotnet format engine/src/FlowConsole.slnx --verify-no-changes` — exit 0
- `pnpm build` — all packages built (viewer dist refreshed + embedded via `scripts/copy-viewer-dist.mjs`, T022)
- `pnpm test:unit` — 22/22 viewer tests (only package changed)

No checks skipped. No silent skips.

## Manual E2E (T023, live run against /tmp project, port 49121)

| Step | Observed |
|---|---|
| Start `fcon watch <dir> --no-open` | initial build, `Serving snapshot .../latest.json`, `Listening on http://127.0.0.1:49121` |
| `GET /api/status` initial | `{"version":1,"state":"idle"}` |
| Break build (mode flag + touch Builder.cs) | `{"version":1,"state":"build-failed","lastError":"build command exited with code 1."}` — session alive, snapshot still served |
| Fix and touch again | `{"version":2,"state":"idle"}` — automatic recovery |
| `GET /` | 200 (embedded SPA with new hashed assets `index--T0-9uWl.js`) |

Covers quickstart scenarios 1 (single command), 2 (live update via version bump), 4 (failure + recovery); scenarios 5 (Ctrl+C exit 0, port released) and 7 (loopback-only) covered by WatchCommandTests; scenario 3 (burst coalescing) by WatchSessionTests; scenario 6 (regressions) by full suite 304/304.

## Bugs found and fixed during verification

1. `ServeStatus` used reflection-based JSON serialization — disabled in this app; killed every `/api/status` request. Fixed with source-generated `ViewerJsonContext` (camelCase, null-omitting).
2. `WatchSession.RunInitialAsync` double-released the semaphore when a follow-up spawned; restructured to release-then-reacquire.
3. YAML config parser does not handle escaped quotes inside quoted values — worked around in tests with `grep -q ^good` marker instead of `test "$(...)"`.

## Traceability

All FR-001..FR-008, NFR-001/002, COMP-001, ERR-001..003, EDGE-001/002 map to green tests or manual evidence above (see spec.md Requirement Traceability table). T025 (independent review) and T026 (traceability sign-off) remain — reviewer-owned.

## T027 (Convergence Phase 7, 2026-08-28)

- `CancellationHandler.RegisterSigterm` added (PosixSignalRegistration on Linux/macOS, same graceful path as SIGINT; second signal hard-exits 130)
- Live check: `kill <pid>` on a running `fcon watch` session → graceful "Aborted." message, **exit code 0**, port released (rebind succeeds)
- Full suite after change: 304/304 passed; `dotnet format --verify-no-changes` exit 0
