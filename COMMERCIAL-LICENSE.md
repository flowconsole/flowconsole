# Commercial License

**Effective 2026-05-01.**

FlowConsole is offered under a **dual-license** model:

1. **Open source.** The default license for this repository is the **GNU Affero
   General Public License version 3.0 or later (AGPL-3.0-or-later)**. See the
   [LICENSE](./LICENSE) file for the full text. This license is suitable if
   you can comply with its terms — in particular, if you make modifications
   available to your users, including users who interact with the software
   over a network.

2. **Commercial.** A separate **commercial license** is available for
   organizations that cannot or do not wish to comply with the AGPL. The
   commercial license is intended for:

   - **Internal enterprise use** where AGPL terms are incompatible with
     company policy (e.g. engineers cannot accept network-use disclosure
     obligations on internal architecture documents)
   - **Embedding FlowConsole into a proprietary product** that the licensee
     ships to its own users, without the AGPL source-disclosure obligations
     applying to the licensee's surrounding product
   - Engagements requiring **warranty, indemnification, or commercial
     support**

The commercial license is granted by the FlowConsole project maintainers
under the rights assigned by contributors via the
[Contributor License Agreement](./CLA.md).

### What the commercial license does NOT grant

The commercial license is **not** a "do anything" grant. In particular,
the standard commercial license **does not include** the right to:

- **Offer FlowConsole, or a substantially similar product derived from it,
  as a managed/hosted/cloud service to third parties.** The right to run
  FlowConsole as a multi-tenant SaaS or to provide "FlowConsole as a
  Service" (under any name) to third-party customers is **expressly
  reserved by the FlowConsole project**. AGPL-licensed use that complies
  with AGPL §13 (full source disclosure to all network users) is
  permitted; commercial-licensed use is for internal or embedded
  deployments only.
- Re-distribute or sub-license FlowConsole to third parties as a
  standalone product.
- Remove or alter FlowConsole branding, copyright notices, or licensing
  metadata.

If your intended use is to operate a hosted service based on FlowConsole,
contact us — such arrangements are negotiated separately and are **not**
covered by the standard commercial license described here.

## Exception: `packages/sdk`

The `packages/sdk/` subdirectory is licensed under the **MIT License** (see
[`packages/sdk/LICENSE`](./packages/sdk/LICENSE)). Importing or using the SDK
in your own code does **not** require a commercial license and does **not**
trigger AGPL obligations on your code. The SDK is intentionally permissive
because architecture-as-code definitions are end-user code that should not be
licensed by the tool that loads them.

## How to obtain a commercial license

Contact: **slack.master99@gmail.com**

Include in your inquiry:

- Your organization name and primary contact
- A short description of intended use (embedded product, internal tool,
  hosted service, etc.)
- Approximate scale (team size, number of deployments, end-users)
- Required deliverables (license certificate, support SLA, indemnity, etc.)

We will respond with terms tailored to your use case. Pricing and exact
contract terms are negotiated individually and are not published.

## Versions before 2026-05-01

Versions of this software released on or before **2026-04-30** were published
under the Apache License 2.0 (with `packages/sdk` under MIT). Those releases
remain governed by their original licenses. The dual-license model described
in this document applies to commits and releases dated **2026-05-01 or later**.
