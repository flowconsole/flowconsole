# Contributing to FlowConsole

Thank you for your interest in contributing to FlowConsole!
We welcome bug reports, feature requests, documentation improvements,
and code contributions.

---

## License

The FlowConsole open-source core is licensed under the
**Apache License, Version 2.0**.

By contributing to this repository, you agree that your contribution
will be licensed under the Apache License 2.0.

See the [LICENSE](./LICENSE) file for details.

---

## Contributor License Agreement (CLA)

Before we can accept and merge your contribution, you must agree to the
Contributor License Agreement (CLA).

The CLA is required to ensure that the project maintainers have the
necessary rights to:
- maintain and evolve the project,
- distribute the software,
- and offer the project under different licensing models in the future,
  including commercial offerings.

The CLA does **not** transfer ownership of your contribution — you retain
full copyright to your work.

Please read the CLA here:
- [CLA.md](./CLA.md)

By submitting a pull request, you confirm that you have read and agreed
to the CLA.

---

## Development Setup

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 22+ | LTS recommended |
| pnpm | 9+ | `corepack enable` to activate |
| .NET | 10.0 | SDK — [get.dot.net](https://get.dot.net) |
| Docker | 20.10+ | Required for PostgreSQL + Apache AGE |
| Docker Compose | v2 | Bundled with Docker Desktop |

### Clone and build

```bash
git clone https://github.com/flowconsole/flowconsole.git
cd flowconsole

# Frontend / CLI / SDK
pnpm install
pnpm build

# Backend
cd backend
dotnet build FlowConsole.slnx

# Run everything (PostgreSQL + AGE + backend + frontend)
cd ..
docker compose up
```

### Running tests

```bash
# Frontend unit tests
pnpm test:unit

# Frontend E2E tests (requires running app)
pnpm test:e2e

# Backend tests
cd backend
dotnet test FlowConsole.slnx
```

---

## Filing Issues

- For bugs, include reproduction steps, expected vs actual behavior, environment (OS, browser/Node version), and logs/screenshots where helpful.
- For features, describe the use case and any prior art or alternatives considered.

---

## Code Style and Quality

### TypeScript / JavaScript

- ESLint config at [`eslint.config.js`](./eslint.config.js) — run `pnpm lint` to check.
- Prefer `const` over `let`; avoid `var`.
- Use TypeScript strict mode; no `any` unless truly unavoidable.
- Immutability by default — readonly properties, spread over mutation.

### C# / .NET

- `dotnet format` enforces the style defined in `.editorconfig` and `Directory.Build.props`.
- `TreatWarningsAsErrors` and `EnforceCodeStyleInBuild` are enabled project-wide.
- Use records and `with`-expressions for immutable data.
- Business errors use `Result<T>` (FluentResults), not exceptions.

### General

- No obvious or section comments (`// Arrange`, `// Act`, `// Assert`, `#region`, divider lines). Comment only when the *why* is non-obvious.
- Keep changes focused — one logical change per commit.

---

## Pull Request Process

### Branch naming

Use a descriptive prefix:

- `feat/short-description` — new features
- `fix/short-description` — bug fixes
- `docs/short-description` — documentation only
- `refactor/short-description` — code restructuring without behavior change

### How to submit

1. Fork the repository.
2. Create a branch from `main` following the naming convention above.
3. Make your changes, keeping commits focused and well-described.
4. Ensure all tests and linting pass locally (see [Development Setup](#development-setup)).
5. Open a pull request against `main`.

### Review process

- All PRs require at least one maintainer review before merge.
- CI runs automatically — linting, unit tests, and build must pass.
- Address review feedback by pushing new commits (do not force-push during review).
- PRs that do not comply with the CLA requirement will not be merged.

---

## Questions

If you have questions about contributing, licensing, or the CLA,
feel free to open an issue or start a discussion.

---

## Code of Conduct

Please review [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md); by participating you agree to abide by it.
