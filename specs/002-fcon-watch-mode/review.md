# Review: fcon watch mode

Reviewer: Maintainer Reviewer (fresh context, T025) | Date: 2026-08-28
Scope: all uncommitted changes for `specs/002-fcon-watch-mode` (engine CLI + packages/viewer + docs).

## Verdict: PASS-WITH-CONDITIONS

The feature is functionally complete, well-tested (304/304 engine, 22/22 viewer), and respects COMP-001 and the constitution's architecture rules. Two shutdown/race correctness gaps in the core invariants (FR-003, FR-008) should be fixed before merge; neither invalidates the design.

## Findings

| # | Severity | Location | Description |
|---|---|---|---|
| 1 | HIGH | `engine/src/FlowConsole.Cli/Commands/WatchCommand.cs:79` | Ctrl+C during the **initial build** throws `OperationCanceledException` out of `RunInitialAsync` (WaitAsync on an already-cancelled token, or rethrown from `ExecuteBuildKeepState`), and `ExecuteAsync` has no `catch (OperationCanceledException)` around it. Spectre reports an unhandled exception: stack trace printed, exit code non-zero, `session` not disposed. Violates FR-008 for the initial-build window. All tests cancel only after `host.RunAsync` starts, so the path is untested. Fix: wrap `RunInitialAsync` in try/catch(OCE) returning 0, or catch in the `using`/finally. |
| 2 | MEDIUM | `engine/src/FlowConsole.Cli/Watch/WatchSession.cs:61-78, 96-107` | Dropped-rebuild race: in `RunInitialAsync`'s finally, the pending flag is read under `_statusLock` **before** `_runLock.Release()`. A `RequestRebuild` whose `_runLock.Wait(0)` fails inside that gap sets `_pending = true` after the finally already read it — no build is running and no loop is spawned, so the change is lost until the next file event. Narrow window, self-heals on the next save, but technically breaks FR-003's "MUST trigger exactly one follow-up". Fix: set pending *before* releasing, or re-check pending after release under the status lock. |
| 3 | MEDIUM | `engine/src/FlowConsole.Cli/Watch/WatchSession.cs:61-66` | `RequestRebuild` checks `_disposed` unlocked, then calls `_runLock.Wait(0)`, which throws `ObjectDisposedException` on a disposed semaphore. It is invoked from a debounce `Timer` callback that `WatcherDisposable` does not wait for (`Timer.Dispose()` without `Dispose(WaitHandle)`), so a callback in flight when `WatchCommand` disposes watcher→session can crash the process on shutdown (non-zero exit, FR-008). Fix: wrap the Wait in try/catch(ObjectDisposedException) or check disposal under `_statusLock` before acquiring. |
| 4 | LOW | `engine/src/FlowConsole.Cli/Infrastructure/CancellationHandler.cs` (T027) | SIGTERM now maps to the graceful path for **all** commands: exit code changes from the POSIX-conventional 143 (default termination) to 0 everywhere, not just `fcon watch`. Spec FR-008 asked for this only in watch mode. Acceptable improvement, but record it as an intentional global behavior change (COMP-001 is about flags/exit codes of view/build/validate — SIGTERM exit code was previously unmanaged, so no formal violation). Also `PosixSignalRegistration.Create` result is never stored/disposed — fine for process lifetime, worth a comment. |
| 5 | LOW | `engine/src/FlowConsole.Cli/Watch/WatchFileFilter.cs:31` | `path.StartsWith(root, OrdinalIgnoreCase)` is both over-broad (root `/a/b` matches `/a/bb/...`, relying on the watcher never reporting outside the root) and case-insensitive on Linux. Practically unreachable via `FileSystemWatcher`; harmless as defense-in-depth but the intent ("is under root") is not what the code checks. `Path.GetRelativePath` + a `..` check would be exact. |
| 6 | LOW | `packages/viewer/src/App.tsx` (`refreshSnapshot`) | The callback returns a cleanup function, but `onVersionChange: () => void` in the hook discards it, so `cancelled` is never set — dead code in an otherwise correct stale-response guard. Either type the param as `() => void` and drop the return, or wire the cleanup through. |
| 7 | LOW | `engine/src/FlowConsole.Cli/Commands/WatchCommand.cs:116` | Follow-up rebuilds run with `CancellationToken.None` inside `RunBuildLoopAsync`; cancellation only works because the closure captures the real token. Correct today, but the invariant lives in `WatchCommand` rather than `WatchSession` — a future caller passing `CancellationToken.None` silently loses child-process kill on shutdown. |

## What is good (evidence inspected)

- **Concurrency core is sound where it matters**: single semaphore, latest-state-wins pending flag, no build pile-up; `SemaphoreFullException` bug found and fixed during verification (verification.md). Version increments only after the atomic snapshot write, so the browser can never observe a bumped version with a torn file (EDGE-001 via `AtomicFileWriter` temp+move).
- **COMP-001 holds**: `WatchRunner` untouched; `ViewerHost` change is additive (`statusProvider` optional, `/api/status` → 404 without it, existing routes byte-identical — asserted in `ViewerHostStatusTests.GetSnapshot_AndRoot_BehaveIdentically...` and `GetStatus_WithoutProvider_Returns404`); existing suites unchanged and green (304/304).
- **Security**: listener stays `http://127.0.0.1:{port}/` (constructor, unchanged); status endpoint exposes only version/state/error-excerpt; no secrets, no new dependencies.
- **Constitution IV**: immutable records (`RebuildResult`, `WatchStatus`, `StatusPayload`), source-generated JSON, comments explain why only, no emoji/AAA labels, files small and focused. Viewer uses blue `#58a6ff` accent per design tokens.
- **Constitution V**: tests protect the risky invariants — burst coalescing, pending-flag follow-up, mid-session failure survival + recovery, bin/obj feedback-loop exclusion, exit codes 2/3/0, SIGTERM live check. No skips; `App.test.tsx` default-mock change is a reasonable harness fix, not a weakening.
- **Spec coverage**: FR-001..008, NFR-001/002, ERR-001..003, EDGE-001/002 all map to green tests or recorded manual evidence; AC-001..007 covered (AC-003 burst via WatchSessionTests, AC-005/007 via WatchCommandTests + manual rebind check).

## Constitution check

| Principle | Status |
|---|---|
| I Evidence precedence | Pass — plan's current-state claims match the code inspected |
| II Repository boundaries | Pass — all changes in `src_oss`, no `src_main` dependency |
| III Traceable spec | Pass — tasks trace to FRs; verification.md maps all requirements |
| IV Architecture/code quality | Pass (minor: finding 6 dead code) |
| V Behavior-first testing | Pass with gap — initial-build Ctrl+C path untested (finding 1) |
| VI Local proof & independent review | Pass — full-profile evidence with timestamps; this review is the fresh-context gate |

## Residual risks

1. Watcher `Error` (buffer overflow on very large trees) only logs; events lost until the next save. Acceptable for v1; a "watcher degraded" hint would help.
2. `lastError` may contain local paths / compiler output — accepted in plan (loopback, single user).
3. SIGTERM exit-code change is global (finding 4) — should be one line in the README/release notes.
4. Windows SIGTERM semantics untested (registration is Linux/macOS only); SIGINT path covered by existing tests.

## Conditions for merge (owner: Delivery Lead, T026)

- [ ] Fix finding 1 (catch OCE around initial build; add a test cancelling during initial build asserting exit 0)
- [ ] Fix findings 2 and 3 (WatchSession shutdown/pending races; extend WatchSessionTests if practical)
- [ ] Record finding 4 (global SIGTERM exit-code change) in README and spec traceability notes

---

## Resolution (2026-08-28)

All merge conditions addressed:

| Finding | Severity | Resolution |
|---|---|---|
| Initial-build Ctrl+C escapes as unhandled exception | HIGH | `WatchCommand.ExecuteAsync` catches `OperationCanceledException` around `RunInitialAsync`, disposes session, returns 0. Regression test `Watch_CancelDuringInitialBuild_ExitsZero` added (fails on the old code). |
| Pending flag read before lock release (dropped-request window) | MEDIUM | `WatchSession.TryHandOffToFollowUp` now reads `_pending` and releases the semaphore under the same `_gate` lock that `RequestRebuild` uses, then releases + reacquires for the follow-up loop. |
| `RequestRebuild` could throw `ObjectDisposedException` from the debounce timer on shutdown | MEDIUM | `RequestRebuild` checks `_disposed` under `_gate` before touching the semaphore; `ReleaseRunLock` also guards `SemaphoreFullException`. |
| SIGTERM global exit-code change undocumented | LOW | README "Iterate flow" section now documents SIGINT/SIGTERM graceful shutdown and the 0-instead-of-143 semantics for all commands. |
| `WatchFileFilter.StartsWith` root match imprecise | LOW | Compares against root with trailing separator. |
| Dead cleanup return in viewer `refreshSnapshot` | LOW | Removed. |

Post-fix verification: engine 305/305 passed (+1 regression test), viewer 22/22, `dotnet format --verify-no-changes` exit 0.

**Final verdict: PASS** — conditions resolved; residual risks below remain accepted for v1.
