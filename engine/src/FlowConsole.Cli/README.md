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
| `fcon synth [dir]` | Run SDK synthesizer and emit ModelSnapshot |
| `fcon completion <shell>` | Generate shell completion script |

## Known Limitations (v0.2.0-alpha)

- C# and Helm scanners available (additional languages planned)
- `fcon synth --diff-against-live` requires a running backend
- `fcon push` not yet available (Phase 3)
- Binaries are unsigned during alpha
