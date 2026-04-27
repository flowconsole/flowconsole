# FlowConsole Engine

.NET source for the `fc` CLI binary — scanners, rule engine, snapshot schema validation, and contract conformance.

This directory builds the self-contained `fc` executable that powers FlowConsole's architecture-as-code workflow: scanning source repositories, evaluating rules against architecture snapshots, and validating snapshot conformance to the public contract.

## Layout

```
engine/
├── src/
│   ├── FlowConsole.Cli/                    # `fc` entry point (Spectre.Console)
│   ├── FlowConsole.Core/                   # domain types, model
│   ├── FlowConsole.Shared/                 # shared utilities (FluentResults, etc.)
│   ├── FlowConsole.Graph/                  # graph algorithms
│   ├── FlowConsole.Schema/                 # snapshot schema validation
│   ├── FlowConsole.Snapshots.Mapping/      # IR ↔ snapshot mapping
│   ├── FlowConsole.Rules.Core/             # rule pipeline + abstractions
│   ├── FlowConsole.Rules.Engine.Default/   # CEL.NET-based rule executor
│   ├── FlowConsole.Scanners.Core/          # scanner abstractions
│   ├── FlowConsole.Scanners.Helm/          # Helm chart scanner
│   ├── FlowConsole.Scanners.CodeParsing/   # TreeSitter-based parsing
│   ├── FlowConsole.Scanners.CSharp/        # C# project scanner
│   ├── FlowConsole.slnx                    # solution
│   └── FlowConsole.CI.slnf                 # CI filter
├── tests/                                  # xUnit + NSubstitute + FluentAssertions
├── native/linux-musl-arm64/                # TreeSitter binaries for Alpine
├── Directory.Build.props
├── Directory.Build.targets
├── global.json                             # .NET 10 SDK pin
└── coverlet.runsettings
```

## Build and test

```bash
# Restore + build
dotnet restore src/FlowConsole.slnx
dotnet build src/FlowConsole.slnx

# Run all tests
dotnet test src/FlowConsole.slnx --verbosity quiet
```

## Publish a self-contained `fc` binary

```bash
dotnet publish src/FlowConsole.Cli/FlowConsole.Cli.csproj \
  -c Release \
  -r osx-arm64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -o ./publish

./publish/fc --version
```

Supported RIDs: `osx-arm64`, `osx-x64`, `linux-x64`, `linux-arm64`, `linux-musl-arm64`, `win-x64`, `win-arm64`.

The npm wrapper [`packages/cli`](../packages/cli) downloads pre-built binaries from GitHub releases for end users; `packages/cli/scripts/dev-reinstall.sh` rebuilds locally and reinstalls globally for development.

## Contracts

The engine validates against public contracts under [`../contracts/`](../contracts):

- `contracts/model-snapshot/v1/` — JSON Schema + conformance fixtures for snapshot format
- `contracts/rules/v1alpha1/` — JSON Schema + expression language spec + helpers + 50+ conformance fixtures

Run contract validation from the repo root:

```bash
pnpm validate:rules:all
pnpm validate:snapshots:all
```
