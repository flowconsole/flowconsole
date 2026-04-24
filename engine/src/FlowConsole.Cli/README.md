# FlowConsole CLI (`fc`)

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
fc init

# Scan a C# project
fc scan ./src/MyProject.csproj

# Scan a Helm chart (auto-detected via Chart.yaml)
fc scan ./charts/my-chart

# Scan a mixed directory (C# + Helm auto-merge)
fc scan ./project-root

# Force a specific scanner
fc scan ./path --scanner helm

# Validate against built-in rules
fc validate .flowconsole/snapshots/latest.json

# Pipeline: scan and validate
fc scan ./src | fc validate -

# Format a snapshot
fc fmt snapshot.json

# List available rules
fc rules list

# Explain a rule
fc explain <rule-id>

# Check environment
fc doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `fc scan <input>` | Scan C# projects and Helm charts, emit ModelSnapshot JSON |
| `fc validate [snapshot] [rules-dir]` | Validate snapshot against rules |
| `fc fmt <snapshot>` | Normalize and format snapshot JSON |
| `fc init [dir]` | Initialize `.flowconsole/` project structure |
| `fc doctor` | Check environment and tool versions |
| `fc rules list` | List available validation rules |
| `fc rules export <dir>` | Export built-in rules for customization |
| `fc explain <rule-id>` | Show rule details and examples |
| `fc synth [dir]` | Run SDK synthesizer and emit ModelSnapshot |
| `fc completion <shell>` | Generate shell completion script |

## Known Limitations (v0.2.0-alpha)

- C# and Helm scanners available (additional languages planned)
- `fc synth --diff-against-live` requires a running backend
- `fc push` not yet available (Phase 3)
- Binaries are unsigned during alpha
