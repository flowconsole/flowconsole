<p align="center">
  <h1 align="center">FlowConsole</h1>
  <p align="center">Architecture as Code platform — define, validate, and visualize software architecture</p>
</p>
<br/>
<p align="center">
  <a href="https://img.shields.io/github/v/release/flowconsole/flowconsole"><img src="https://img.shields.io/github/v/release/flowconsole/flowconsole?include_prereleases&display_name=tag" alt="np"></a>
  <a href="https://discord.gg/23CkhhDz"><img src="https://img.shields.io/badge/Community-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@flowconsole/cli"><img src="https://img.shields.io/npm/v/@flowconsole/core.svg" alt="npm"></a>
</p>
<p align="center">
    <a href="https://slackmaster9999.github.io/flowconsole/?utm_source=gh-hero">Docs</a>
    ·
    <a href="https://dev.flowconsole.pages.dev/?utm_source=gh-hero">Playground</a>
    ·
    <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@flowconsole/cli"><img src="https://img.shields.io/npm/v/@flowconsole/core.svg" alt="npm"></a>
</p>

## What is FlowConsole?

FlowConsole turns your architecture into a **queryable live graph**, not a collection of static pictures. Define architectural models in TypeScript, C#, Go, Java, Python, or YAML. FlowConsole parses the code, builds a graph, detects drift between the model and real infrastructure, runs fitness functions and graph analytics, and validates everything in CI/CD. Diagrams are a byproduct of the model — always accurate, always up to date.

## Key Features

- **Multi-language models** — define architecture in TypeScript, C#, Go, Java, Python, or YAML
- **Queryable graph** — PostgreSQL + Apache AGE for graph queries against the architectural model
- **Drift detection** — compare model snapshots to find unintended changes
- **Fitness functions** — define rules that validate architectural constraints
- **Graph analytics** — analyze dependencies, coupling, and complexity
- **CI/CD validation** — integrate architecture checks into your pipeline
- **MCP server** — expose the architecture model to AI agents and tools

## How FlowConsole Compares

| Capability | FlowConsole | Structurizr | LikeC4 | Mermaid / PlantUML |
|---|---|---|---|---|
| Model in real languages (TS, C#, Go, Java, Python) | SDK | DSL only | DSL only | Markup only |
| Queryable graph database | Yes | No | No | No |
| Drift detection | Yes | No | No | No |
| Fitness functions / rules | Yes | No | No | No |
| CI/CD validation | Yes | Partial | Partial | No |
| Generated diagrams | Yes | Yes | Yes | Yes |
| Self-hosted | Yes | Yes | Yes | N/A |
| Open source | Apache-2.0 | Freemium | MIT | MIT / GPL |

## Quick Start

Install the CLI via npm:

```bash
npm install -g @flowconsole/cli
fc --version
```

See [engine/README.md](engine/README.md) for build-from-source instructions.

## Supported Languages

| Language | Model Definition | SDK |
|---|---|---|
| TypeScript | Yes | `@flowconsole/sdk` |
| C# | Yes | — |
| Go | Yes | — |
| Java | Yes | — |
| Python | Yes | — |
| YAML | WIP | — |

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  FlowConsole                     │
├──────────────┬──────────────┬────────────────────┤
│   Frontend   │   Backend    │       CLI          │
│  (React/Vite)│ (.NET 10)    │  (fc binary)       │
│              │              │                    │
│              │  ASP.NET Core│  scan, validate,   │
│              │  Minimal API │  push, diff        │
│              │              │                    │
├──────────────┴──────────────┴────────────────────┤
│              PostgreSQL + Apache AGE             │
│              (graph queries on the model)        │
└──────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---|---|
| [`@flowconsole/web`](packages/web) | Web UI components for the FlowConsole frontend |
| [`@flowconsole/sdk`](packages/sdk) | SDK for defining architectural models (multi-language via jsii) |
| [`@flowconsole/cli`](packages/cli) | CLI wrapper — installs the `fc` binary(Scanners + rule engine) |
| [`@flowconsole/ui`](packages/ui) | Shared UI component library |

## Project Structure

```
flowconsole/
├── apps/
│   └── docs/         # Documentation site (Next.js)
├── packages/
│   ├── web/          # Web UI components
│   ├── sdk/          # Multi-language SDK
│   ├── cli/          # CLI npm wrapper
│   ├── core/         # TS parsers (csharp/go/java/python/ts)
│   └── ui/           # Shared UI components
├── engine/           # .NET source for the `fc` CLI binary
└── contracts/        # JSON schemas (model-snapshot, rules)
```

## Links

- [Website](https://flowconsole.tech)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE) (Apache-2.0)

## Commercial / Hosted Offering

In addition to the open-source core, the FlowConsole project provides
commercial offerings, such as:
- managed SaaS deployment,
- enterprise features,
- proprietary plugins/extensions,
- commercial support and services.

These offerings are **not part of this open-source repository** and are
provided under separate commercial terms.

Use of the FlowConsole hosted service is governed by its own
Terms of Service and does not change the licensing of the open-source core.

---
## Trademarks

The FlowConsole name, logo, and branding are trademarks of the project
maintainers and may not be used without permission.

This does not affect your rights to use, modify, or distribute the
open-source software itself.
## Disclaimer

This software is provided "as is", without warranty of any kind, express
or implied. See the LICENSE file for details.