<p align="center">
  <img src="https://raw.githubusercontent.com/flowconsole/flowconsole/main/apps/docs/public/banner.png" alt="FlowConsole" />
</p>
<p align="center">define, validate, and visualize software architecture</p>
<br/>
<p align="center">
  <a href="https://discord.gg/23CkhhDz"><img src="https://img.shields.io/badge/Community-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@flowconsole/cli"><img src="https://img.shields.io/npm/v/@flowconsole/cli.svg" alt="npm cli"></a>
</p>
<p align="center">
    <a href="https://dev.flowconsole.pages.dev/docs?utm_source=gh-hero">Docs</a>
    ·
    <a href="https://dev.flowconsole.pages.dev/?utm_source=gh-hero">Playground</a>
</p>


## What is FlowConsole?

FlowConsole is a CLI and SDK for **Architecture as Code**: author your architectural model in real programming languages, scan source code into a structured snapshot, validate it against rules, and run those checks locally or in CI/CD. The model is plain JSON conforming to a public schema, so anything that reads JSON can produce or consume it.

This repository ships the open-source CLI, SDK, scanners, rule engine, and JSON schemas. It is designed to run on a developer machine or inside a CI pipeline — no server required.

## Key Features

- **Multi-language SDK** — author models in TypeScript natively, or in C#, Java, or Python via jsii-generated bindings
- **Source code scanners** — extract architectural snapshots from C# projects and Helm charts(other sources are comming)
- **Fitness functions** — Rule engine for architectural constraints
- **CI/CD validation** — `fcon validate` enforces schema and rules; ships as a self-contained binary for  linux/macOS/windows × x64/arm64
- **Public JSON schemas** — `model-snapshot/v1` and `rules/v1alpha1` with conformance fixtures, so any tool can integrate

## How FlowConsole Compares

| Capability | FlowConsole | Structurizr | LikeC4 | Mermaid / PlantUML |
|---|---|---|---|---|
| Model in real languages (TS, C#, Java, Python) | SDK (jsii) | DSL only | DSL only | Markup only |
| Source code scanner (extract model from code) | C# + Helm | No | No | No |
| Snapshot diff between model versions | Yes | No | No | No |
| Fitness functions / rule engine | Yes | No | No | No |
| CI/CD validation via CLI | Yes | Partial | Partial | No |
| Generated diagrams | Yes | Yes | Yes | Yes |
| Open source license | Apache-2.0 | Freemium | MIT | MIT / GPL |

## Quick Start

Install the CLI via npm:

```bash
npm install -g @flowconsole/cli
fcon --version
```

See [engine/README.md](engine/README.md) for build-from-source instructions.

## Supported Languages

| Language | Model Definition | SDK package |
|---|---|---|
| TypeScript | Yes | `@flowconsole/sdk` (npm) |
| C# | Yes | `FlowConsole.Sdk` (NuGet, jsii) |
| Java | Yes | `io.github.flowconsole:flowconsole-sdk` (Maven, jsii) |
| Python | Yes | `flowconsole-sdk` (PyPI, jsii) |
| Go | Roadmap | — |
| YAML | WIP | — |

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  FlowConsole OSS                 │
├───────────────────┬──────────────────────────────┤
│   fcon CLI (.NET)   │   SDK (jsii)                 │
│   scan / validate │   TS, C#, Java, Python       │
│   diff / fmt      │                              │
│   push / rules    │   author the model in code   │
├───────────────────┼──────────────────────────────┤
│   Scanners        │   Rule engine                │
│   C# + Helm       │   fitness functions  │
│   Tree-sitter     │                              │
├───────────────────┴──────────────────────────────┤
│   model-snapshot/v1  +  rules/v1alpha1 schemas   │
└──────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---|---|
| [`@flowconsole/cli`](packages/cli) | npm wrapper that installs the `fcon` binary (scanners + rule engine + validation) |
| [`@flowconsole/sdk`](packages/sdk) | SDK for authoring architectural models (jsii: TS / C# / Java / Python) |
| [`@flowconsole/web`](packages/web) | React components for rendering architecture diagrams |
| [`@flowconsole/ui`](packages/ui) | Shared UI primitives (private) |

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
├── engine/           # CLI & Rule engine
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