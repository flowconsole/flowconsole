# FlowConsole gated agent development

Local Spec Kit workflow for `src_oss`. It persists decision artifacts and
stops for named human gates between intake, requirements, architecture, test
design, implementation, verification, independent review, and acceptance.

The workflow is integration-neutral, but unattended prompt/command dispatch
requires an integration with a callable agent CLI. `generic` scaffolding is
useful for manual command files but does not provide headless prompt dispatch.

## Install

From the `src_oss` root:

```bash
specify workflow add agent-workflows/flowconsole-sdd --dev
specify workflow info flowconsole-sdd
```

`workflow add` validates the YAML and installs the whole package, including
its templates. Re-run the command after editing the source package.

You can also validate and run the source directly without installing it:

```bash
specify workflow run agent-workflows/flowconsole-sdd/workflow.yml \
  -i request="Describe the task" \
  -i integration=auto \
  -i task_type=auto \
  -i scope=full \
  -i quality_profile=focused
```

## Run an installed workflow

```bash
specify workflow run flowconsole-sdd \
  -i request="Describe the task" \
  -i integration=auto \
  -i task_type=auto \
  -i scope=full \
  -i quality_profile=full
```

At a non-interactive gate the run pauses. Resume it from a terminal:

```bash
specify workflow status <run-id>
specify workflow resume <run-id>
```

Choose `focused` for iteration and `full` for final acceptance. The shell
commands are fixed in the workflow; request text and agent output are never
interpolated into a shell command.

## Roles and artifacts

| Gate owner | Artifact |
|---|---|
| Product Owner | `intake.md`, `brief.md`, `spec.md` |
| Requirements Reviewer | `checklists/requirements.md` |
| Technical Lead | `plan.md`, `checklists/plan.md` |
| Test Lead | `test-plan.md`, `verification.md` |
| Delivery Lead | `tasks.md`, `checklists/tasks.md` |
| Maintainer | `review.md` |
| Product Owner + Maintainer | final acceptance |

The intake artifact is created under the workflow run, then copied into the
active Spec Kit feature directory returned by `.specify/feature.json`. All
approved feature artifacts therefore remain together and can be reviewed with
the implementation.
