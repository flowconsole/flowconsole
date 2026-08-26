# Contract: `fcon watch` CLI command (new)

Feature: `specs/002-fcon-watch-mode/spec.md` | Date: 2026-08-26

## Command surface

```
fcon watch [path] [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `path` (arg) | file/dir | cwd | Project dir containing/above `.flowconsole.yaml`, or explicit `.flowconsole.yaml` path |
| `--command <CMD>` | string | config `build.command` | Build command override (same precedence as `fcon build`) |
| `--cwd <DIR>` | string | config `build.cwd` / config dir | Build working directory override |
| `--port <PORT>` | int | ephemeral | Viewer port (same semantics as `fcon view`) |
| `--no-open` | flag | false | Suppress browser auto-open (same as `fcon view`) |
| `--debounce-ms <MS>` | int | 200 | Source-change debounce window |
| `--max-snapshot-bytes <BYTES>` | long | 200 MB | Size guard (same as `fcon view`) |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Clean shutdown after Ctrl+C/SIGTERM (FR-008) |
| 2 | Usage/config error: no build command configured, bad path |
| 5 | Viewer port bind failure |
| 130 | Interrupted mid-initial-build before viewer started |

Note: a *failed rebuild* during a running session is **not** an exit — the session continues (FR-006). Exit code reflects session termination, not last build result.

## HTTP endpoints (local viewer, 127.0.0.1 only)

| Endpoint | Status | Description |
|---|---|---|
| `GET /`, `/assets/*` | existing | Unchanged |
| `GET /api/snapshot` | existing | Unchanged semantics; returns latest written snapshot |
| `GET /api/status` | **new** | `{ version, state, lastError }` — poll target for the viewer; `Cache-Control: no-store` |

## Compatibility

- `fcon view`, `fcon build`, `fcon validate --watch`: flags and exit codes unchanged (COMP-001).
- Snapshot file schema unchanged.
- `GET /api/status` absent in plain `fcon view` sessions; the viewer treats 404 as "no watch" and disables polling (graceful degradation).
