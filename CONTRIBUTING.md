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
cd backend/src
dotnet build FlowConsole.slnx

# Run backend stack (PostgreSQL + AGE + Ollama + API)
cd ../../backend/docker
docker compose up
```

### Running tests

```bash
# Frontend unit tests
pnpm test:unit

# Frontend E2E tests (requires running app)
pnpm test:e2e

# Backend tests
cd backend/src
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

- `dotnet format` enforces the style defined in `Directory.Build.props`.
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

### Acceptance is at maintainer discretion

Submitting a pull request does **not guarantee that it will be merged.**
Maintainers may decline a contribution — including a working, well-tested one —
for any of the following reasons (non-exhaustive):

- The change is **out of scope** for the project's stated goals.
- The functionality belongs to the **commercial / SaaS edition** of FlowConsole
  rather than the open-source core. FlowConsole follows an **open-core model**:
  certain capabilities/features are intentionally kept in the closed-source
  product and are not accepted into this repository, even when the
  implementation is technically sound. If you are unsure whether a feature
  falls on the OSS or SaaS side of the line, please open an issue first.
- It conflicts with the **roadmap** or with work already in progress.
- The design **doesn't fit the existing architecture** or would impose ongoing
  maintenance cost we are not prepared to take on.
- **Code quality, test coverage, or documentation** falls below project
  standards and the gap is not addressed during review.
- The change introduces **breaking changes** without sufficient justification
  or migration path.
- It duplicates functionality that exists elsewhere in the codebase or in a
  dependency we already use.
- We cannot reach the contributor for required clarification within a
  reasonable timeframe.

**To reduce the risk of rejection on a substantial change**, please:

1. **Open an issue or discussion first** describing the problem and your
   proposed approach — *before* writing the code. Maintainers will indicate
   whether the direction is likely to be accepted.
2. Keep PRs **small and focused** — one logical change per PR.
3. Reference the related issue in the PR description.

Bug fixes, documentation improvements, and small focused changes can usually
go directly to PR without prior discussion.

If a contribution is declined, the work remains yours under the project's
license — you are welcome to maintain it in a fork.

Maintainers may also **close stale PRs** that have not received a response to
review feedback within a reasonable period (typically 30 days). A closed PR
can always be reopened once the feedback is addressed.

---

## Questions

If you have questions about contributing, licensing, or the CLA,
feel free to open an issue or start a discussion.

---

## Code of Conduct

Please review [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md); by participating you agree to abide by it.
