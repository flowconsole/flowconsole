---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: intake.md, brief.md, spec.md, plan.md, test-plan.md, approved checklists, plus research.md/data-model.md/contracts/ when applicable

**Tests**: Tests are mandatory for changed behavior and regressions. An omission requires a concrete reason and Test Lead approval in test-plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [CATEGORY] [Story/Requirement] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[CATEGORY]**: One of `[DEV]`, `[TEST]`, `[DOC]`, `[MIGRATION]`, `[SECURITY]`, `[OPS]`, `[REVIEW]`
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include requirement/risk IDs, exact current file paths, assigned agent role,
  dependencies, local verification command, and expected evidence

## FlowConsole Path Conventions

- **OSS TypeScript**: `packages/core/`, `packages/web/`, `packages/sdk/`, `packages/ui/`, `apps/docs/`
- **OSS .NET**: `engine/src/`, `engine/tests/`
- **Versioned contracts**: `contracts/<contract>/<version>/` with conformance fixtures
- **Private consumers**: sibling `../src_main/backend/`, `../src_main/frontend/app/`, `../src_main/frontend/website/`
- Use only concrete paths verified by plan.md; do not retain generic sample paths

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The $speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 *(mandatory for changed behavior)*

> **NOTE: Complete the planned tests before accepting the implementation. The
> approved plan decides whether they are written first or alongside the code.**

- [ ] T010 [P] [TEST] [US1/FR-001] Add [level] test for [observable behavior] in [exact path] — Role: Test Agent — Verify: `[exact command]` — Evidence: [expected result]
- [ ] T011 [P] [TEST] [US1/ERR-001] Add failure/regression coverage in [exact path] — Role: Test Agent — Verify: `[exact command]` — Evidence: [expected result]

### Implementation for User Story 1

- [ ] T012 [DEV] [US1/FR-001] Implement [behavior] in [exact path] — Role: Implementer Agent — Depends: T010 — Verify: `[focused command]` — Evidence: [expected result]
- [ ] T013 [DOC] [US1/FR-001] Update [public/project documentation] in [exact path] — Role: Documentation Agent — Verify: [check] — Evidence: [expected result]

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 *(mandatory for changed behavior)*

- [ ] T018 [P] [US2] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T019 [P] [US2] Integration test for [user journey] in tests/integration/test_[name].py

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create [Entity] model in src/models/[entity].py
- [ ] T021 [US2] Implement [Service] in src/services/[service].py
- [ ] T022 [US2] Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T023 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 *(mandatory for changed behavior)*

- [ ] T024 [P] [US3] Contract test for [endpoint] in tests/contract/test_[name].py
- [ ] T025 [P] [US3] Integration test for [user journey] in tests/integration/test_[name].py

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create [Entity] model in src/models/[entity].py
- [ ] T027 [US3] Implement [Service] in src/services/[service].py
- [ ] T028 [US3] Implement [endpoint/feature] in src/[location]/[file].py

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Add risk-appropriate unit/integration/conformance tests in exact project paths
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Final Verification and Review

- [ ] TXXX [TEST] [ALL] Run focused and full commands from test-plan.md — Role: Verification Agent — Evidence: verification.md
- [ ] TXXX [REVIEW] [ALL] Perform independent constitution/spec/plan/diff review — Role: Maintainer Reviewer — Evidence: review.md
- [ ] TXXX [REVIEW] [ALL] Resolve blocking findings and update traceability — Role: Delivery Lead — Evidence: approved verification.md and review.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Test tasks MUST be completed before the behavior they protect is accepted;
  the approved plan may choose test-first or tests alongside implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch independent test tasks for User Story 1 together:
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Preserve unrelated changes and record evidence after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
