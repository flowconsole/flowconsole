# ModelSnapshot Contract v1

JSON wire format for exchanging architectural model snapshots between FlowConsole CLI, SDK, and backend.

## Schema versioning policy

The `schemaVersion` field uses semantic versioning:

- **Patch** (1.0.0 → 1.0.1): silent pass — no behavioral difference
- **Minor** (1.0.0 → 1.1.0): additive changes (new optional fields) — consumer emits `SNAPSHOT_VERSION_MINOR_AHEAD` warning but processes the snapshot, preserving unknown fields
- **Major** (1.0.0 → 2.0.0): breaking changes — consumer emits `SNAPSHOT_VERSION_MAJOR_MISMATCH` error and rejects the snapshot

## Required top-level fields

Every valid ModelSnapshot JSON must have:

```json
{
  "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
  "schemaVersion": "1.0.0",
  "source": "CodeScan",
  "elements": [],
  "relationships": []
}
```

## Valid example

```json
{
  "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
  "schemaVersion": "1.0.0",
  "source": "CodeScan",
  "elements": [
    {
      "id": "user-service",
      "kind": "Service",
      "name": "User Service",
      "technology": "ASP.NET Core",
      "tags": ["backend", "core"]
    },
    {
      "id": "user-db",
      "kind": "Database",
      "name": "User Database",
      "technology": "PostgreSQL"
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "sourceId": "user-service",
      "targetId": "user-db",
      "kind": "Calls",
      "technology": "Npgsql"
    }
  ]
}
```

## Invalid examples

Missing `$schema`:
```json
{
  "schemaVersion": "1.0.0",
  "source": "CodeScan",
  "elements": [],
  "relationships": []
}
```
Diagnostic: `SNAPSHOT_SCHEMA_FIELD_MISSING` — top-level `$schema` field is absent.

Unknown element kind:
```json
{
  "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
  "schemaVersion": "1.0.0",
  "source": "CodeScan",
  "elements": [{ "id": "x", "kind": "Microservice", "name": "X" }],
  "relationships": []
}
```
Diagnostic: `SNAPSHOT_SCHEMA_KIND_DISCRIMINATOR_INVALID` — "Microservice" is not a valid ElementKind.

## Validation

```bash
# From oss/ root
pnpm validate:snapshots:all
```

See [`validate.mjs`](validate.mjs) for the Node.js validator and [`conformance/`](conformance/) for test fixtures.

## Related documents

- [`schema.json`](schema.json) — JSON Schema (Draft 2020-12)
- [`diagnostics.md`](diagnostics.md) — all SNAPSHOT_* diagnostic codes
- [`types.md`](types.md) — DTO field descriptions
