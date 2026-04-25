<p align="center">
  <h1 align="center">FlowConsole</h1>
  <p align="center">Architecture as Code platform — define, validate, and visualize software architecture using real programming languages</p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@flowconsole/core"><img src="https://img.shields.io/npm/v/@flowconsole/core.svg" alt="npm"></a>
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
- **Local AI queries** — ask questions about your architecture using Ollama (Qwen3-8B by default)

## How FlowConsole Compares

| Capability | FlowConsole | Structurizr | LikeC4 | Mermaid / PlantUML |
|---|---|---|---|---|
| Model in real languages (TS, C#, Go, Java, Python) | Yes | DSL only | DSL only | Markup only |
| Queryable graph database | Yes (Apache AGE) | No | No | No |
| Drift detection | Yes | No | No | No |
| Fitness functions / rules | Yes | No | No | No |
| CI/CD validation | Yes | Partial | Partial | No |
| Generated diagrams | Yes | Yes | Yes | Yes |
| Self-hosted | Yes | Yes | Yes | N/A |
| Open source | Apache-2.0 | Freemium | MIT | MIT / GPL |

## Quick Start

The fastest way to run FlowConsole is with Docker Compose:

```bash
git clone https://github.com/flowconsole/flowconsole.git
cd flowconsole/backend/docker
docker compose up
```

This starts the API server (port 5555), PostgreSQL with Apache AGE, and Ollama for AI features. See [backend/README.md](backend/README.md) for build-from-source instructions and configuration options.

## Supported Languages

| Language | Model Definition | SDK |
|---|---|---|
| TypeScript | Yes | `@flowconsole/sdk` |
| C# | Yes | — |
| Go | Yes | — |
| Java | Yes | — |
| Python | Yes | — |
| YAML | Yes | — |

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  FlowConsole                      │
├──────────────┬──────────────┬────────────────────┤
│   Frontend   │   Backend    │       CLI          │
│  (React/Vite)│ (.NET 10)    │  (fc binary)       │
│              │              │                    │
│  @flowconsole│  ASP.NET Core│  scan, validate,   │
│  /web        │  Minimal API │  push, diff        │
│              │  SignalR      │                    │
├──────────────┴──────────────┴────────────────────┤
│              PostgreSQL + Apache AGE              │
│              (graph queries on the model)         │
└──────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---|---|
| [`@flowconsole/core`](packages/core) | Core parser library for architecture-as-code |
| [`@flowconsole/web`](packages/web) | Web UI components for the FlowConsole frontend |
| [`@flowconsole/sdk`](packages/sdk) | SDK for defining architectural models (multi-language via jsii) |
| [`@flowconsole/cli`](packages/cli) | CLI wrapper — installs the `fc` binary |
| [`@flowconsole/ui`](packages/ui) | Shared UI component library |

## Project Structure

```
flowconsole/
├── apps/
│   ├── app/          # Main frontend application (Vite + React)
│   └── docs/         # Documentation site (Next.js)
├── packages/
│   ├── core/         # Core parser library
│   ├── web/          # Web UI components
│   ├── sdk/          # Multi-language SDK (jsii)
│   ├── cli/          # CLI npm wrapper
│   └── ui/           # Shared UI components
├── backend/          # .NET modular monolith (API, CQRS, graph engine)
└── contracts/        # JSON schemas (model-snapshot, rules)
```

## Links

- [Website](https://flowconsole.tech)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE) (Apache-2.0)
