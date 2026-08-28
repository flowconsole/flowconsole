# Data Model: fcon watch mode

Feature: `specs/002-fcon-watch-mode/spec.md` | Date: 2026-08-26

No persistent data model changes. The snapshot file contract (`.flowconsole/snapshots/*.json`) is unchanged (COMP-001). This feature adds one transient in-memory aggregate and two HTTP response DTOs.

## WatchSession (in-memory aggregate, CLI side)

Owns the whole loop; created per `fcon watch` invocation, disposed on shutdown (FR-008).

| Field | Type | Notes |
|---|---|---|
| BuildCwd | string | Resolved as BuildCommand resolves it (CLI flag > `build.cwd` > config dir) |
| BuildCommand | string | CLI flag > `build.command`; error exit 2 if neither (reuse BuildCommand hint text) |
| SnapshotPath | string | From build output routing (default `.flowconsole/snapshots/latest.json`) |
| WatchFilter | FileSet | `*.cs`, `*.csproj` recursive under BuildCwd, plus top-level `.flowconsole.yaml`; excludes `bin/`, `obj/`, `.flowconsole/`, `node_modules/` |
| State | enum `Idle \| Building \| BuildFailed` | Drives `/api/status` and viewer indication |
| Version | long (monotonic) | Incremented on every successful snapshot write; the viewer's poll token |
| LastBuildError | string? | Terminal + viewer error excerpt when State = BuildFailed |
| Pending | bool | Dirty flag set during a running build → exactly one follow-up build (FR-003) |

### State transitions

```text
Idle --(source event, debounce 200ms elapsed)--> Building
Building --(build exit 0, snapshot written)--> Idle        (Version++)
Building --(build exit != 0 / invalid output)--> BuildFailed
Building --(event during build)--> Building [Pending=true] --> follow-up build
BuildFailed --(source event → build succeeds)--> Idle       (recovery, ERR-001/AC-004)
```

Invariants: never two concurrent builds (SemaphoreSlim(1,1)); Version strictly increases; viewer never sees a partially written snapshot (AtomicFileWriter temp+rename, EDGE-001).

## Viewer status DTO (`GET /api/status`, new)

```json
{
  "version": 42,
  "state": "idle" | "building" | "build-failed",
  "lastError": "string | null"
}
```

## Existing contracts (unchanged, restated)

- `GET /api/snapshot` — full snapshot; 404/413 semantics unchanged (`packages/viewer/src/api.ts`).
- Snapshot JSON schema — unchanged; `SnapshotSerializer.Normalize` pipeline reused by watch rebuilds.
- `.flowconsole.yaml` `build:` section — consumed read-only via `ConfigDiscovery.ReadBuildConfig`.
