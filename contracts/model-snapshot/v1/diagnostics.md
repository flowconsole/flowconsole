# Diagnostics contract for ModelSnapshot v1

## Diagnostic format

Each diagnostic has the following shape:

```json
{
  "code": "SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD",
  "phase": "schema",
  "level": "error",
  "path": "/elements/0/kind",
  "message": "Required field 'kind' is missing.",
  "hint": "Every element must have a kind from the ElementKind enum."
}
```

## Fields

- `code: string` — stable diagnostic code (see catalog below);
- `phase: "schema" | "version" | "reference" | "limit"` — phase where the issue was detected;
- `level: "error" | "warning"` — severity;
- `path: string` — JSON Pointer (RFC 6901) to the problematic node;
- `message: string` — human-readable message;
- `hint?: string` — short remediation suggestion.

## Code namespaces

- `SNAPSHOT_SCHEMA_*` — JSON Schema validation errors;
- `SNAPSHOT_VERSION_*` — schema version compatibility errors/warnings;
- `SNAPSHOT_REF_*` — semantic reference integrity errors;
- `SNAPSHOT_LIMIT_*` — backend security limit violations.

## Diagnostic catalog v1

### Schema phase

| Code | Level | Description | Hint |
|------|-------|-------------|------|
| `SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD` | error | A required field is absent | Check the schema for required fields at this level |
| `SNAPSHOT_SCHEMA_INVALID_TYPE` | error | Field value has wrong JSON type | Verify the expected type in schema.json |
| `SNAPSHOT_SCHEMA_UNKNOWN_FIELD` | error | Object contains a field not defined in schema | Remove the unknown field or check for typos |
| `SNAPSHOT_SCHEMA_INVALID_ENUM_VALUE` | error | Field value is not one of the allowed enum values | Use one of the values defined in the schema |
| `SNAPSHOT_SCHEMA_KIND_DISCRIMINATOR_INVALID` | error | Element.kind is not a valid ElementKind value | Use one of: Class, Interface, Endpoint, Function, Producer, Consumer, Deployment, Database, Queue, Cache, Ingress, Namespace, Broker, Topic, Service, Application, Module, External, Gateway, Worker |
| `SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING` | error | Per-kind required property is missing from Properties dict | E.g. Endpoint requires httpMethod, Topic requires partitions |
| `SNAPSHOT_SCHEMA_FIELD_MISSING` | error | Top-level `$schema` field is absent | Add `"$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json"` |

### Version phase

| Code | Level | Description | Hint |
|------|-------|-------------|------|
| `SNAPSHOT_VERSION_MISSING` | error | Top-level `schemaVersion` field is absent | Add `"schemaVersion": "1.0.0"` |
| `SNAPSHOT_VERSION_MAJOR_MISMATCH` | error | Major version differs from supported (e.g. CLI emits v2, backend supports v1) | Upgrade backend or downgrade CLI to matching major version |
| `SNAPSHOT_VERSION_MINOR_AHEAD` | warning | Minor version is newer than supported — unknown fields preserved | Backend will process the snapshot but may ignore new fields |

### Reference phase

| Code | Level | Description | Hint |
|------|-------|-------------|------|
| `SNAPSHOT_REF_UNRESOLVED` | error | Relationship references an element ID not present in elements array | Ensure all sourceId/targetId values match an element id |
| `SNAPSHOT_REF_DUPLICATE_ID` | error | Two or more elements share the same id | Element IDs must be unique within a snapshot |

### Limit phase (backend security limits)

| Code | Level | Description | Hint |
|------|-------|-------------|------|
| `SNAPSHOT_LIMIT_BODY_TOO_LARGE` | error | Request body exceeds 10 MB (HTTP 413) | Split the snapshot into smaller partitions |
| `SNAPSHOT_LIMIT_TOO_MANY_ELEMENTS` | error | Element count exceeds 50K hard limit (HTTP 422); warning at 10K | Reduce scope or split into multiple snapshots |
| `SNAPSHOT_LIMIT_TOO_MANY_RELATIONSHIPS` | error | Relationship count exceeds 250K hard limit (HTTP 422); warning at 50K | Reduce scope or split into multiple snapshots |
| `SNAPSHOT_LIMIT_RATE_EXCEEDED` | error | Rate-limit bucket exhausted (HTTP 429) | Wait and retry, or reduce push frequency |

## Behavior recommendations

- `schema` errors are blocking — subsequent phases are not executed;
- `version` errors are blocking for major mismatch; minor ahead is a warning only;
- `reference` errors indicate semantic issues detected after successful deserialization;
- `limit` errors are backend-side enforcement, not emitted by CLI validation;
- Multiple diagnostics can be emitted per phase (all errors collected before halting).

## Related documents

- [`schema.json`](schema.json) — the JSON Schema that `SNAPSHOT_SCHEMA_*` codes validate against;
- [`types.md`](types.md) — DTO field descriptions and per-kind required properties;
- [`README.md`](README.md) — versioning policy.
