# TODO

## SDK ↔ scanner output — canonical-id matching gap

`CanonicalMatcher` ([line 53-57](backend/src/FlowConsole.Application/Canonical/CanonicalMatcher.cs#L53-L57)) requires `kind` parity for strategies 1–3. SDK convenience classes pick architecture-level kinds (`RestApi` → `Application`, `Rabbit` → `Queue`) while the scanner emits runtime/infra kinds (`Service` for web apps, `Broker` for RabbitMQ). End result: SDK's Git-source elements never match scanner's CodeScan-source elements — drift on the backend stays split. Workarounds: (a) populate `Aliases` in the SDK model with scanner ids (e.g. `["csharp:Basket.API"]`) so strategy #4 catches it, or (b) loosen the matcher to consider kind-class equivalence (Service ≡ Application for runtime web apps). Pick (a) for the eShop demo, (b) for general fix.

## SDK — `buildSnapshot` ergonomics

Today users must hand-collect every component into a `Component[]` and pass it to `Sdk.BuildSnapshot(entities)`. Add a no-arg / roots-only mode that auto-discovers descendants by walking the `belongsTo` tree from the supplied roots (matching the CDK/Pulumi pattern). Stand-alone elements (free `User`, `External`) still need to be passed when they have no `belongsTo` parent. Affects [`packages/sdk/flowconsole-sdk.ts`](packages/sdk/flowconsole-sdk.ts) — `buildSnapshot` signature + tree walk; remember to bump SDK version + repack jsii bindings.

## SDK — `Sdk.Emit` is broken in C# (jsii async-static)

`Sdk.emit()` is `public static async` ([`flowconsole-sdk.ts:1685`](packages/sdk/flowconsole-sdk.ts#L1685)). jsii's .NET runtime throws `Async static methods are currently not supported` when invoked from C#. Workaround used in [`cli-test/arch/Program.cs`](cli-test/arch/Program.cs): call `snapshot.ToJson(2)` and `Console.Out.WriteLine` directly. Fix: rewrite the wrapper as sync (`process.stdout.write` is sync anyway; only the file-write branch is async, push that off to a separate `EmitToFile` method).

## Re-enable domain validation in `ModelSnapshotValidator.Validate`

`Validate(snapshot, schema)` currently skips `ValidateDomain(...)` and only runs `ValidateStructural`. This was disabled because scanner output uses kinds (`Endpoint`, `Database`, `Cache`, `Broker`, `Gateway`) and relations (`Exposes`) that the only built-in meta-schema (C4) does not model — every push hit `DOMAIN_001` / `DOMAIN_010` / `DOMAIN_012` / `DOMAIN_014`.

To restore: ship a permissive built-in meta-schema (covering all 20 ElementKinds and 11 RelationKinds), set it as the default for new models/projects, then revert [`ModelSnapshotValidator.Validate`](backend/src/FlowConsole.Schema/ModelSnapshotValidator.cs) to call `ValidateDomain` again. Re-enable the two skipped tests in [`IRHandlerTests.cs`](backend/tests/FlowConsole.Tests.Unit/Application/IRHandlerTests.cs) (`LoadSnapshot_ParentIdCycle_*`, `LoadSnapshot_MissingRequiredProperty_*`).


## Diagnostic codes — align `ModelSnapshotValidator` with the contract

`backend/src/FlowConsole.Schema/ModelSnapshotValidator.cs` emits a parallel `STRUCT_010..STRUCT_031` code namespace that is not declared in `contracts/model-snapshot/v1/diagnostics.md` and not present in `SnapshotDiagnosticCodes.cs`. The drift test (`SnapshotDiagnosticCodesCompletenessTests`) does not catch this because it only checks parity between `diagnostics.md` and `SnapshotDiagnosticCodes`.

Mapping to canonical `SNAPSHOT_*` codes:

| STRUCT_* | Canonical |
|---|---|
| STRUCT_010 (element id required) | `SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD` |
| STRUCT_011 (element id pattern) | `SNAPSHOT_SCHEMA_INVALID_ID_PATTERN` |
| STRUCT_012 (duplicate element id) | `SNAPSHOT_REF_DUPLICATE_ID` |
| STRUCT_015..018 (length limits on element name/description/technology) | needs new `SNAPSHOT_LIMIT_*` codes (or shared `SNAPSHOT_SCHEMA_FIELD_TOO_LONG`) |
| STRUCT_019 (tag pattern) | `SNAPSHOT_SCHEMA_INVALID_ID_PATTERN` |
| STRUCT_020 (relationship id required) | `SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD` |
| STRUCT_021 (relationship id pattern) | `SNAPSHOT_SCHEMA_INVALID_ID_PATTERN` |
| STRUCT_022 (duplicate relationship id) | `SNAPSHOT_REF_DUPLICATE_RELATIONSHIP_ID` |
| STRUCT_023, 024 (sourceId/targetId required) | `SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD` |
| STRUCT_027, 028 (length limits on relationship label/technology) | needs new code |
| STRUCT_030, 031 | needs review |

Steps:
1. Add missing `SNAPSHOT_*` codes to `diagnostics.md` and `SnapshotDiagnosticCodes.cs`.
2. Migrate every `errors.Add(new("STRUCT_xxx", ...))` in `ModelSnapshotValidator.cs` to canonical codes.
3. Update `IRValidatorTests` (currently asserts on `STRUCT_012`, `STRUCT_015`, `STRUCT_016`, `STRUCT_022`, `STRUCT_023`).
4. Extend `SnapshotDiagnosticCodesCompletenessTests` to also scan `ModelSnapshotValidator.cs` (or a per-validator catalog) so future drift is caught.

### JsonSchemaValidator — `pattern` keyword mapping

`JsonSchemaValidator.Classify` ([line 197](backend/src/FlowConsole.Schema/ModelSnapshot/JsonSchemaValidator.cs#L197)) lacks a `"pattern"` branch. Pattern violations from the embedded schema fall into the default `_ => SNAPSHOT_SCHEMA_INVALID_TYPE`, but the canonical code is `SNAPSHOT_SCHEMA_INVALID_ID_PATTERN`. Add a `"pattern" =>` branch.

## CLI output — cargo-style aligned action verbs

Add `CliConsole.Action(verb, message)` helper (right-padded green-bold verb, cargo-style: `   Pushed model v3`) and apply only in commands with multi-step output (`scan`, `push` per-source split, `synth` build/diff/confirm, `validate` rules+format). Single-result commands keep `✓` glyph form. Skip until a multi-step command actually needs it — avoid cargo-cargo-cult.
