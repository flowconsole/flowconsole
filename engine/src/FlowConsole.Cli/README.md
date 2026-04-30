# FlowConsole CLI (`fcon`)

Architecture-as-code scanner and validator for FlowConsole.

## Installation

### Self-contained binary (recommended)

Download the platform-specific binary from [Releases](https://github.com/flowconsole/flowconsole/releases).

Available platforms: `linux-x64`, `linux-arm64`, `osx-x64`, `osx-arm64`, `win-x64`, `win-arm64`.

### .NET tool (framework-dependent)

```bash
dotnet tool install -g FlowConsole.Cli --prerelease
```

## Quick Start

```bash
# Initialize project
fcon init

# Scan a C# project
fcon scan ./src/MyProject.csproj

# Scan a Helm chart (auto-detected via Chart.yaml)
fcon scan ./charts/my-chart

# Scan a mixed directory (C# + Helm auto-merge)
fcon scan ./project-root

# Force a specific scanner
fcon scan ./path --scanner helm

# Validate against built-in rules
fcon validate .flowconsole/snapshots/latest.json

# Pipeline: scan and validate
fcon scan ./src | fcon validate -

# Format a snapshot
fcon fmt snapshot.json

# List available rules
fcon rules list

# Explain a rule
fcon explain <rule-id>

# Check environment
fcon doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `fcon scan <input>` | Scan C# projects and Helm charts, emit ModelSnapshot JSON |
| `fcon validate [snapshot] [rules-dir]` | Validate snapshot against rules |
| `fcon fmt <snapshot>` | Normalize and format snapshot JSON |
| `fcon init [dir]` | Initialize `.flowconsole/` project structure |
| `fcon doctor` | Check environment and tool versions |
| `fcon rules list` | List available validation rules |
| `fcon rules export <dir>` | Export built-in rules for customization |
| `fcon explain <rule-id>` | Show rule details and examples |
| `fcon build [dir]` | Run SDK builder and emit ModelSnapshot |
| `fcon view [path]` | Open a local web viewer for an architectural snapshot |
| `fcon completion <shell>` | Generate shell completion script |

## `fcon view`

Launch a local-only web viewer for an architectural snapshot. The viewer is
read-only, single-user, and bound exclusively to `127.0.0.1` — no
authentication, no remote access.

```bash
# Auto-discover the latest snapshot
fcon view

# View a specific snapshot file
fcon view .flowconsole/snapshots/latest.json

# Skip browser auto-open
fcon view --no-open

# Bind to a specific port
fcon view --port 3200

# Filter by source
fcon view --source scan
```

### Options

| Option | Description |
|--------|-------------|
| `[path]` | Path to snapshot JSON file. If omitted, auto-discovers from `.flowconsole/snapshots/` |
| `--port <PORT>` | Explicit port to bind (default: auto-select ephemeral) |
| `--no-open` | Do not open the browser automatically |
| `--source <SOURCE>` | Filter snapshots by source: `scan` (matches CodeScan, InfraScan), `build`, or `auto` (default: `auto`). Also accepts exact source names like `CodeScan`. |
| `--max-snapshot-bytes <BYTES>` | Maximum snapshot file size in bytes (default: 200 MB) |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Graceful shutdown (Ctrl-C) |
| 2 | Snapshot file not found |
| 4 | Invalid port number (must be between 1 and 65535) |
| 5 | Port already in use or access denied |
| 6 | No snapshots discovered / source filter matched nothing |
| 7 | Snapshot validation failed (schema or integrity error) |

### Iterate flow

The viewer re-reads the snapshot from disk on every request — no restart
needed after `fcon scan` or `fcon build`:

```bash
# Terminal 1: start the viewer
fcon view .flowconsole/snapshots/latest.json --no-open

# Terminal 2: re-scan whenever you change code
fcon scan ./src

# Browser: press F5 to see the updated diagram
```

### .NET tool users

`fcon view` works with the framework-dependent `dotnet tool install` channel.
It does **not** require the ASP.NET Core runtime — the embedded HTTP server
uses a lightweight `System.Net.HttpListener` — no ASP.NET Core dependency.

## Known Limitations (v0.2.0-alpha)

- C# and Helm scanners available (additional languages planned)
- `fcon build --diff-against-live` requires a running backend
- `fcon push` not yet available (Phase 3)
- Binaries are unsigned during alpha
