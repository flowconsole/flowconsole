# Changelog

All notable changes to FlowConsole are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project loosely follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-05-01

### Changed (BREAKING — license change)

- **License changed from Apache-2.0 to AGPL-3.0-or-later** for the project
  default. A **commercial license** is available for organizations that
  cannot accept AGPL terms (internal/embedded use). The commercial license
  does **not** include the right to offer FlowConsole as a managed/hosted
  service to third parties — that right is reserved by the FlowConsole
  project.
- `packages/sdk/` is now consistently licensed under **MIT** (the LICENSE
  file was already MIT; the corresponding `package.json` `license` field
  has been corrected).
- New documentation: [`LICENSING.md`](./LICENSING.md) (per-path map) and
  [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md) (commercial-license
  terms summary and contact).
- `apps/docs/LICENSE` removed — the repository root `LICENSE` governs.

### Why

- AGPL prevents unauthorized re-hosting of FlowConsole as a competing SaaS
  while keeping the source fully open under an OSI-approved license.
- The MIT exception for `packages/sdk/` keeps user-authored architecture
  definitions free of AGPL viral effects, protecting adoption.

### Unaffected

- Releases dated **on or before 2026-04-30** remain under their original
  licenses (Apache-2.0 / MIT). The new licensing model applies to commits
  and releases dated **2026-05-01 or later**.
- The Contributor License Agreement ([`CLA.md`](./CLA.md)) is unchanged —
  it already permits the maintainers to relicense contributions, including
  under the commercial license described above.
