# TODO

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

## JsonSchemaValidator — `pattern` keyword mapping

`JsonSchemaValidator.Classify` ([line 197](backend/src/FlowConsole.Schema/ModelSnapshot/JsonSchemaValidator.cs#L197)) lacks a `"pattern"` branch. Pattern violations from the embedded schema fall into the default `_ => SNAPSHOT_SCHEMA_INVALID_TYPE`, but the canonical code is `SNAPSHOT_SCHEMA_INVALID_ID_PATTERN`. Add a `"pattern" =>` branch.
