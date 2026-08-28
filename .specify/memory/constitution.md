<!--
Sync Impact Report
- Version: initial ratification -> 1.0.0
- Added principles: evidence precedence; repository boundaries; traceable
  specification; architecture and code quality; behavior-first testing; local
  proof and independent review.
- Added sections: task classification; required artifacts and gates; local
  quality profiles; security and data handling; agent operating protocol;
  source map.
- Templates requiring alignment: spec-template.md, plan-template.md,
  tasks-template.md, checklist-template.md.
- Workflow requiring alignment: agent-workflows/flowconsole-sdd/workflow.yml.
-->

# FlowConsole Agent Development Constitution

This constitution governs work performed by people and coding agents across
the sibling `src_oss` and `src_main` repositories. It is integration-neutral:
Claude, Codex, Gemini, OpenCode, or another compatible agent MAY execute the
workflow, but no integration-specific prompt or command may weaken these rules.
The process is local-first and MUST NOT require GitHub Actions or another hosted
build service to establish that a change is correct.

## Core Principles

### I. Evidence and Source Precedence (NON-NEGOTIABLE)

An agent MUST inspect the relevant code, manifests, tests, contracts, and local
instructions before proposing a solution. When sources disagree, use this
precedence order:

1. Current source code, schemas, build manifests, lockfiles, tests, and license
   files in the repository being changed.
2. The nearest applicable `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, and
   current engineering guideline.
3. Current reference and design documentation.
4. The approved feature brief, specification, and implementation plan.
5. Completed plans, historical designs, release notes, and archived material.

The current filesystem and executable contract beat an obsolete path in an
older document. Historical plans explain intent but are not automatically
normative. A material conflict MUST be recorded in the brief or plan with the
chosen resolution and its evidence. If it affects licensing, public/private
boundaries, security, compatibility, or product behavior, a human owner MUST
resolve it before implementation.

### II. Repository Boundaries and Ownership (NON-NEGOTIABLE)

FlowConsole is split deliberately:

- `src_oss` owns reusable public capabilities: the `fcon` CLI and .NET engine,
  scanners, rules, schemas, graph and shared domain code, TypeScript packages
  (`@flowconsole/core`, `@flowconsole/web`, `@flowconsole/sdk`,
  `@flowconsole/ui`), contracts, public examples, and public documentation.
- `src_main` owns the private product overlay: the Vite product SPA, Next.js
  website, server `Api`/`Application`/`Infrastructure`, private plugins,
  deployment material, business/legal content, and future SaaS modules. Its
  backend consumes reusable engine projects from sibling `src_oss`.

Reusable DSL, diagram, SDK, engine, contract, scanner, and UI-primitives work
MUST be placed in `src_oss`; app-specific composition, hosted API behavior,
authentication, billing, tenancy, and deployment remain in `src_main`. Agents
MUST NOT copy a reusable capability into an app to avoid changing its owner.
Private credentials, SaaS-only code, deployment details, customer data, and
business/legal material MUST NOT enter `src_oss`.

A cross-repository plan MUST list changes and verification separately for each
repository, describe the dependency direction, and include a compatibility
gate for every changed shared contract. Business, legal, and production deploy
directories are out of scope unless the approved brief names them explicitly.

`src_oss` is AGPL-3.0-or-later or commercial under the current repository
license terms; `packages/sdk` is MIT. License decisions MUST follow current
license and contribution files, never stale documents that still say Apache
2.0 or use the former `fc` executable name.

### III. Traceable Specification Before Implementation (NON-NEGOTIABLE)

Implementation MUST NOT begin until the task has an approved intake, brief,
specification, plan, test plan, and executable task list. The artifacts answer
different questions and MUST not be collapsed into a single generated note:

- Intake: request, task type, owner, target repository and component, urgency,
  constraints, risks, and unknowns.
- Brief: why the work matters, current problem, intended outcome, non-goals,
  alternatives, dependencies, and measurable success.
- Specification: observable behavior, user scenarios, functional and
  non-functional requirements, edge/error cases, compatibility, and acceptance
  criteria. It says what, not how.
- Plan: current-state evidence, exact project-standard architecture, ownership
  boundaries, files/modules expected to change, data/contract changes,
  rollout/migration, security, observability, test strategy, and rollback.
- Test plan: risk-based coverage by level, fixtures, environments, required
  commands, manual checks, and evidence to retain.
- Tasks: small ordered units with requirement IDs, exact paths, task category,
  dependencies, agent role, verification command, and completion evidence.

Requirements and acceptance criteria MUST have stable identifiers. Every task
MUST trace to at least one requirement, risk, or acceptance criterion; every
requirement MUST trace to implementation and verification or be marked out of
scope. When implementation changes an approved assumption, the affected
artifacts MUST be updated and re-approved before work continues.

### IV. Architecture and Code Quality

Changes MUST preserve existing architecture and minimize new concepts. Prefer
the smallest cohesive change; justify every new dependency, abstraction,
service, public API, compatibility layer, and duplicated representation.

- TypeScript is strict. Prefer functional components and hooks, `const`,
  readonly data, and immutable updates with spread. `any` requires a written
  reason in the plan or review.
- C# uses `dotnet format`, warnings as errors where configured, immutable
  records and `with` expressions. Expected business failures use `Result<T>`;
  HTTP failures use RFC 7807 problem details.
- The private backend follows Ports and Adapters, CQRS/Wolverine, strongly typed
  identifiers, Git as source of truth, and PostgreSQL/AGE as the materialized
  graph store. Agents MUST not bypass these boundaries for convenience.
- The product SPA is Vite + React Router, not Next.js or SSR. It uses RTK Query
  for API data, the existing SignalR activity feed, synchronized English and
  Russian translations, and shared UI from `@flowconsole/ui`.
- The marketing/docs website is Next.js and contains no authenticated product
  flows, backend implementation, or app state.
- UI changes MUST reuse current tokens and components. FlowConsole uses blue
  `#58a6ff` as an accent, near-black primary CTAs, Lucide icons, minimal motion,
  no purple, no emoji, and short developer-first copy without marketing fluff.

Comments explain non-obvious why: an invariant, workaround, standards decision,
ticket, or surprising behavior. Agents MUST NOT add AAA/BDD labels, section or
divider comments, line-by-line narration, commented-out code, context-free
TODOs, or docs on non-public internals. Public API documentation remains
appropriate. Generated code follows its generator and MUST NOT be hand-edited.

### V. Behavior-First Testing and Fail-Loud Execution (NON-NEGOTIABLE)

Tests protect public behavior, risks, boundaries, failure paths, invariants,
and regressions. Coverage percentage alone is not evidence of correctness.
Every bug fix MUST include a test that would have caught the bug unless the test
plan records a concrete technical reason and the Test Lead approves it.

- Tests use Arrange, Act, Assert as three readable blocks without comment
  labels. One Act per test; names describe scenario and expected outcome.
- Use unit tests for isolated behavior, integration tests for real adapter
  boundaries, focused E2E tests for critical user flows, performance tests for
  explicit budgets, and conformance fixtures for versioned contracts.
- Mock nondeterministic or external boundaries, not internal value objects or
  pure collaborators. Persistence integration tests use the real PostgreSQL
  engine through Testcontainers; AGE behavior uses the AGE fixture.
- Tests are independent, deterministic, parallel-safe, and wait for observable
  conditions rather than sleeping.
- Silent skips are forbidden. Missing Docker or another required environment is
  a failing gate, not a passing test. Existing failures and skipped checks MUST
  be reported; agents may not hide, weaken, or delete tests to obtain green.

Tests MAY be written before or alongside implementation according to the
approved plan, but they MUST exist and pass before the implementation gate.

### VI. Local Proof and Independent Review (NON-NEGOTIABLE)

Every completion claim MUST include reproducible local evidence: exact command,
exit status, relevant result, scope, timestamp, and any skipped check with an
approved reason. Hosted CI may repeat the checks but is never the only proof.
An agent may author code or review it, but MUST NOT be the sole approver of its
own output. Review should be performed by a fresh agent context or a different
agent role, followed by the assigned human gate owner for material changes.

A green test run is necessary, not sufficient. Independent review MUST compare
the diff against the brief, specification, plan, repository boundaries,
security requirements, testing guidelines, and this constitution. The reviewer
MUST identify residual risks and produce a pass, pass-with-conditions, or fail
verdict. Fail blocks the workflow; conditions need an owner and due point.

## Task Classification

Intake MUST choose one primary type and MAY add secondary tags:

| Type | Required emphasis beyond the common artifacts |
|---|---|
| `feature` | User outcome, alternatives, full acceptance scenarios, rollout |
| `bug-fix` | Reproduction, root cause, regression test, blast radius |
| `test` | Behavior/risk being protected; no production change unless justified |
| `refactor` | Preserved behavior, structural goal, characterization tests |
| `performance` | Baseline, budget, workload, measurement method, comparison |
| `security` | Threat model, abuse cases, secret/data exposure, security reviewer |
| `documentation` | Audience, source-of-truth check, examples/link validation |
| `maintenance` | Dependency/operational reason, compatibility and rollback |
| `migration` | Old/new state, compatibility window, data recovery and rollback |
| `research-spike` | Question, time box, evidence, decision; no production rollout |

Tasks MUST use one of `[DEV]`, `[TEST]`, `[DOC]`, `[MIGRATION]`, `[SECURITY]`,
`[OPS]`, or `[REVIEW]` so the orchestrator can route work to the right role.

## Required Artifacts and Gates

The workflow MUST persist artifacts under the active Spec Kit feature directory
and preserve them with the change:

| Stage | Artifact | Mandatory gate | Gate owner |
|---|---|---|---|
| Intake | `intake.md` | Type, scope, owner, unknowns, data/security impact | Product Owner |
| Why | `brief.md` | Outcome, non-goals, success, alternatives | Product Owner |
| What | `spec.md`, `checklists/requirements.md` | Complete and testable requirements | Product Owner |
| How | `plan.md` | Architecture, placement, exact standards, risks | Technical Lead |
| Test design | `test-plan.md` | Risk coverage and executable checks | Test Lead |
| Decomposition | `tasks.md` | Traceability, ordering, paths, role, proof | Delivery Lead |
| Implementation | code/tests/docs/migrations | Local focused checks pass | Implementer agent |
| Verification | `verification.md` | Required local quality profile passes | Test/verification agent |
| Review | `review.md` | Independent findings resolved | Maintainer |
| Acceptance | updated traceability in `verification.md` | Outcome and residual risk accepted | Product Owner + Maintainer |

Rejecting a gate returns work to the owning stage or aborts it; it MUST NOT be
treated as approval. An artifact containing unresolved `[NEEDS CLARIFICATION]`,
unowned risk, missing acceptance evidence, or invented path MUST fail its gate.
Agents prepare evidence; named human roles make business, architecture, release,
legal, and exception decisions.

## Local Quality Profiles

The plan selects `focused` during iteration and `full` before final acceptance.
Commands MUST be narrowed only with a documented impact analysis.

### `src_oss`

- TypeScript/package behavior: affected package tests, then `pnpm test:unit`.
- Contracts: `pnpm validate:rules:all` and/or
  `pnpm validate:snapshots:all` when their schemas, fixtures, producers, or
  consumers change.
- .NET engine: focused test project, then
  `dotnet test engine/src/FlowConsole.slnx`.
- Full profile: `pnpm build`, `pnpm test:unit`, applicable contract validation,
  `dotnet build engine/src/FlowConsole.slnx`,
  `dotnet test engine/src/FlowConsole.slnx`, and
  `dotnet format engine/src/FlowConsole.slnx --verify-no-changes`.

### `src_main`

- Backend: focused tests, then
  `dotnet test backend/src/FlowConsole.slnx --verbosity quiet`.
- Product SPA: from `frontend/app`, run `pnpm test`, `pnpm lint`, and
  `pnpm build`; add `pnpm test:e2e` for affected critical user flows.
- Website: from `frontend/website`, run `pnpm test`, `pnpm lint`, and
  `pnpm build`; add targeted Playwright checks for affected journeys.
- Cross-repository shared-contract changes MUST run the applicable `src_oss`
  full gates and all affected `src_main` consumer gates.

Installation/restore is a prerequisite, not proof. A gate that requires Docker,
credentials, a browser, or a manual environment MUST declare that prerequisite
in `test-plan.md`. Manual checks record steps and observed result; “looks good”
without evidence is not a pass.

## Security and Data Handling

- Never print, commit, or place secrets, tokens, connection strings, private
  customer data, or machine-specific credentials in artifacts or agent prompts.
- Authentication and authorization changes require negative tests for missing,
  invalid, expired, and unauthorized access. MCP tools enforce the same project
  authorization as the REST API and remain read-only unless an approved spec
  explicitly changes the contract.
- Schema/data migrations, destructive commands, public API breaks, telemetry,
  dependency additions, and external network actions require explicit plan
  treatment and the appropriate human gate.
- Telemetry MUST be opt-in where the current contract requires it and MUST NOT
  collect source, paths, host/user identity, secrets, or customer payloads.
- Dependency and generated-file changes MUST be attributable to an approved
  task and reviewed as part of the diff.

## Agent Operating Protocol

1. Read this constitution and the nearest repository/module guidance before
   generating or changing an artifact.
2. Inspect current files; never invent a module, command, API, or test location.
3. State assumptions and evidence in artifacts. Escalate material uncertainty at
   the next gate instead of silently choosing a product or architecture policy.
4. Work only on assigned tasks and preserve unrelated user changes.
5. Keep diffs focused. Update tests and documentation in the same task as the
   behavior they describe.
6. Stop on a failed check, diagnose it, and record whether it is caused by the
   change. Do not suppress, skip, or broaden scope without approval.
7. Produce a handoff containing changed files, requirement coverage, commands
   run, results, unresolved findings, and rollback notes where applicable.

## Authoritative Source Map

Agents MUST consult only the entries relevant to their task, but the following
are the baseline sources used to ratify this constitution:

- `src_oss/CLAUDE.md`, `src_oss/CONTRIBUTING.md`, `src_oss/README.md`,
  `src_oss/package.json`, `src_oss/engine/README.md`, and applicable nested
  `CLAUDE.md` files.
- `src_main/CLAUDE.md`, `src_main/frontend/app/CLAUDE.md`,
  `src_main/frontend/website/CLAUDE.md`, `src_main/backend/README.md`, and
  `src_main/docs/reference/backend-reference.md`.
- `src_main/docs/testing-guidelines.md` for all repositories and languages.
- `src_main/docs/design-system/FlowConsole Design System/README.md` for UI and
  product content.
- `src_main/scripts/RALPHEX.md` and `src_main/docs/plans/README.md` as evidence
  for autonomous execution and plan structure, not as a dependency on RalphEx.

## Governance

This constitution is the default policy for Spec Kit work across FlowConsole.
More local instructions MAY strengthen or specialize it but MUST NOT silently
weaken a non-negotiable rule. An exception requires a written rationale, scope,
risk, approver, expiry or removal condition, and compensating verification in
the plan and review.

Amendments require a human Maintainer, an updated Sync Impact Report, and any
necessary migration of templates and active artifacts. Versions follow semantic
versioning: MAJOR for incompatible governance changes, MINOR for new or
materially expanded rules, PATCH for clarifications. Every plan and review MUST
include a Constitution Check, and final acceptance MUST confirm all gates or
list approved exceptions.

**Version**: 1.0.0 | **Ratified**: 2026-08-26 | **Last Amended**: 2026-08-26
