# Licensing

**Effective 2026-05-01.**

FlowConsole is multi-licensed. The default for the repository is
**AGPL-3.0-or-later OR a commercial license**. One subdirectory is **MIT**.

## Per-path map

| Path                   | License                                |
|------------------------|----------------------------------------|
| _(repository default)_ | AGPL-3.0-or-later OR commercial        |
| `packages/sdk/`        | MIT                                    |

The repository default is governed by the root [`LICENSE`](./LICENSE) file
(AGPL-3.0). Commercial-license terms are described in
[`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md). The MIT exception for the
SDK is in [`packages/sdk/LICENSE`](./packages/sdk/LICENSE).

## Why this split

- **AGPL by default.** The engine, scanners, CLI, web UI, docs, and supporting
  code are AGPL-3.0-or-later. AGPL prevents FlowConsole from being repackaged
  as a proprietary managed service without contributing improvements back.
  Organizations that cannot accept AGPL obligations can purchase a commercial
  license for **internal or embedded use** (see
  [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md)). The commercial license
  **does not** grant the right to offer FlowConsole as a managed/hosted
  service to third parties — that right is reserved by the FlowConsole
  project and is negotiated separately.

- **MIT for the SDK.** `packages/sdk/` is the architecture-as-code library
  that users import directly into their own source files. AGPL would virally
  taint user-authored architecture definitions, which is hostile to adoption.
  MIT keeps the SDK frictionless to use everywhere.

## Third-party dependencies

Third-party dependencies bundled or distributed with FlowConsole retain their
own licenses. See [`NOTICE`](./NOTICE) for the list.

## Contributions

By contributing to this repository you agree to the
[Contributor License Agreement](./CLA.md), which grants the project
maintainers the right to distribute your contribution under the licensing
model described above (including the commercial license).

## Versions before 2026-05-01

Releases dated on or before **2026-04-30** were published under the Apache
License 2.0 (with `packages/sdk` under MIT). Those releases remain governed
by their original licenses for the copies you already have. The licensing
model on this page applies to commits and releases dated **2026-05-01 or
later**.
