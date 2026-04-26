# @flowconsole/cli

npm wrapper for the FlowConsole CLI (`fc`) — architecture-as-code scanning, validation, diff, and push.

> **Note:** This package (`@flowconsole/cli@2.x`) replaces the legacy TypeScript CLI (`@flowconsole/cli@1.x`). The new CLI is a .NET self-contained binary distributed via this npm wrapper. `@flowconsole/cli@1.x` is deprecated but remains published on npm.

## Installation

```bash
npm install -g @flowconsole/cli
```

After installation, two equivalent commands are available globally:

| Command | When to use |
|---------|-------------|
| `fcon` | Short alias without the shell-builtin conflict. Recommended when scripting in zsh/bash. |
| `flowconsole` | Explicit, fully-qualified name. Best for CI scripts and documentation where readability matters more than brevity. |

All resolve to the same underlying binary.

## Platform Support

| Platform | Architecture | RID |
|----------|-------------|-----|
| Linux | x64 | linux-x64 |
| Linux | arm64 | linux-arm64 |
| macOS | x64 (Intel) | osx-x64 |
| macOS | arm64 (Apple Silicon) | osx-arm64 |
| Windows | x64 | win-x64 |
| Windows | arm64 | win-arm64 |

The `postinstall` script automatically detects your platform and downloads the appropriate binary from GitHub Releases.

## Usage

```bash
# Scan a project directory
fc scan ./my-project

# Validate a snapshot against rules
fc validate snapshot.json rules/

# Compare two snapshots
fc diff before.json after.json --format markdown

# Push snapshot to FlowConsole backend
export FLOWCONSOLE_API_KEY=fcp_your_token_here
fc push snapshot snapshot.json --model <model-id>

# Push validation findings
fc push findings findings.json --model <model-id>

# Manage telemetry
fc telemetry status
fc telemetry off

# CI pipeline example
fc scan ./project -o snapshot.json && \
  fc validate snapshot.json rules/ && \
  fc push snapshot snapshot.json --model <model-id>
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FLOWCONSOLE_API_KEY` | Personal Access Token for `fc push` (required; `--api-key` flag is refused for security) |
| `FLOWCONSOLE_API_URL` | Backend API URL (default from `.flowconsole.yaml`) |
| `FLOWCONSOLE_TELEMETRY` | Set to `off` to disable telemetry |
| `DO_NOT_TRACK` | Set to `1` to disable telemetry (standard) |
| `FLOWCONSOLE_CLI_DOWNLOAD_URL` | Override binary download base URL (for mirrors/air-gap) |
| `FLOWCONSOLE_CLI_SKIP_DOWNLOAD` | Set to `1` to skip binary download in postinstall |

## Troubleshooting

### postinstall fails

- Check your internet connection — the binary is downloaded from GitHub Releases
- If behind a proxy, configure `https_proxy` / `HTTPS_PROXY` environment variable
- If on an unsupported platform, download the binary manually from the [Releases page](https://github.com/flowconsole/flowconsole/releases)
- Set `FLOWCONSOLE_CLI_DOWNLOAD_URL` to point to a mirror if GitHub is blocked

### Binary not found after install

Run `npm rebuild @flowconsole/cli` to re-trigger the download.

### macOS Gatekeeper warning

The alpha binaries are unsigned. On first run, macOS may block execution. To allow:

```bash
xattr -d com.apple.quarantine $(which fc)
```

Or go to System Settings > Privacy & Security and click "Allow Anyway".

### Windows SmartScreen warning

The alpha binaries are unsigned. Windows SmartScreen may show "Windows protected your PC". Click "More info" then "Run anyway".

> Signing and notarization are planned for v1.0.0. Alpha binaries are unsigned.

## Migration from v1

`@flowconsole/cli@1.x` was a TypeScript-based CLI. `@flowconsole/cli@2.x` is a complete rewrite as a .NET self-contained binary, offering:

- Faster scanning via Tree-sitter native parsers
- Built-in rule engine with CEL expressions
- Schema validation against the model-snapshot contract
- `fc push` for CI/CD integration with PAT authentication
- `fc diff` for offline snapshot comparison
- Anonymous telemetry (opt-out via `fc telemetry off`)

To upgrade: `npm install -g @flowconsole/cli@latest`

The v1 package remains published for backward compatibility but receives no updates.

## License

Apache-2.0
