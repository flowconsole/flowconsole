# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Brief**: [link to brief.md] | **Task Type**: [type] | **Target**: `src_oss` / [component]

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Current-State Evidence *(mandatory)*

- **Applicable instructions**: [exact CLAUDE.md/CONTRIBUTING/guideline paths]
- **Existing implementation**: [exact current files and behavior inspected]
- **Existing tests/contracts**: [exact paths]
- **Manifests/commands verified**: [exact paths and scripts]
- **Stale/conflicting sources**: [resolution using constitution precedence, or none]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

- [ ] Evidence and source precedence followed; no invented paths or commands.
- [ ] `src_oss`/`src_main` ownership and licensing boundaries preserved.
- [ ] Every requirement and risk has planned implementation and verification.
- [ ] Behavior changes include risk-appropriate tests; silent skips are absent.
- [ ] Local focused/full proof and independent review are planned.
- [ ] Security, compatibility, migration, rollback, and docs are addressed or explicitly N/A.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── brief.md             # Approved problem, why, outcome, and non-goals
├── plan.md              # This file ($speckit-plan command output)
├── test-plan.md         # Risk-based verification design
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
├── verification.md      # Reproducible local evidence and traceability
├── review.md            # Independent maintainer review
├── checklists/          # Requirements, plan, and task quality gates
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Architecture and Ownership Decisions *(mandatory)*

| Decision | Current evidence | Choice and rationale | Alternatives rejected | Requirement/risk IDs |
|---|---|---|---|---|
| | | | | |

For cross-repository work, list `src_oss` and `src_main` changes separately and
state the dependency direction and compatibility gate.

## Contract, Data, and Security Impact

- **Public/API/schema/CLI/SDK contracts**: [change and compatibility, or N/A]
- **Data model/migration**: [old/new state, recovery and rollback, or N/A]
- **Authentication/authorization**: [positive and negative paths, or N/A]
- **Secrets/privacy/telemetry**: [impact and controls, or N/A]
- **Threats/abuse cases**: [security tasks and reviewer, or N/A]

## Test and Verification Strategy *(mandatory)*

- **Risk-based levels**: [unit/integration/E2E/performance/conformance/manual]
- **Regression behavior**: [test that would catch the bug, or N/A]
- **Environments/fixtures**: [Docker, Testcontainers, AGE, browser, credentials]
- **Focused commands**: [exact command and working directory]
- **Full commands**: [exact command and working directory]
- **Evidence**: [what verification.md must retain]

## Rollout, Migration, and Rollback

- **Delivery/compatibility sequence**: [steps or N/A]
- **Observability/manual validation**: [signals and owner]
- **Rollback/recovery**: [safe action and data caveats]
- **Documentation**: [files/audiences to update]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
