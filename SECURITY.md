# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| Latest  | :white_check_mark: |
| < Latest | :x:               |

Only the latest released version receives security updates.
If you are running an older version, please upgrade before reporting.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report vulnerabilities by emailing **v@flowconsole.tech**.

Include as much of the following as possible:

- Description of the vulnerability
- Steps to reproduce or a proof-of-concept
- Affected component (backend, frontend, CLI, SDK, etc.)
- Potential impact

## Response Timeline

| Step | Target |
|------|--------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix or mitigation | Within 90 days |

We will keep you informed of progress toward a fix. Once a fix is available,
we will coordinate disclosure with you before publishing a security advisory.

## Scope

The following are considered in scope:

- Remote code execution
- SQL injection or graph-query injection
- Authentication or authorization bypass
- Cross-site scripting (XSS) or cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Sensitive data exposure (credentials, tokens, PII)
- Path traversal or arbitrary file access
- Dependency vulnerabilities with a known exploit path

The following are out of scope:

- Denial-of-service attacks against self-hosted instances
- Issues requiring physical access to the host
- Social engineering attacks
- Reports from automated scanners without a demonstrated impact
- Vulnerabilities in third-party services not maintained by FlowConsole
- Issues in environments running unsupported or heavily modified versions

## Recognition

We appreciate responsible disclosure. With your permission, we will credit
reporters in the security advisory and release notes.
