# TODO

## CLI output — cargo-style aligned action verbs

Add `CliConsole.Action(verb, message)` helper (right-padded green-bold verb, cargo-style: `   Pushed model v3`) and apply only in commands with multi-step output (`scan`, `push` per-source split, `synth` build/diff/confirm, `validate` rules+format). Single-result commands keep `✓` glyph form. Skip until a multi-step command actually needs it — avoid cargo-cargo-cult.

## SDK release — migrate publish steps to AWS `publib`

Both `.github/workflows/release-preview.yml` (and the future stable SDK release workflow) currently publish jsii artifacts to every registry (npm / PyPI / NuGet / Maven Central / Go) via hand-rolled scripts: `pnpm publish`, `pypa/gh-action-pypi-publish`, `dotnet nuget push`, a `mvn deploy:deploy-file` loop over `dist/java/**.pom`, and a manual `git init`/`git push` for the Go module.

`publib` (formerly `jsii-release`) from AWS is the de-facto standard tool for the jsii ecosystem (CDK, Projen, and friends). It knows the full publishing stack, including the new Sonatype Central Portal (not the legacy OSSRH), GPG signing, Go module repo force-push, and npm provenance.

**Replacement:**

```yaml
- run: cd packages/sdk && npx -y publib-npm
- run: cd packages/sdk && npx -y publib-pypi
- run: cd packages/sdk && npx -y publib-nuget
- run: cd packages/sdk && npx -y publib-maven
- run: cd packages/sdk && npx -y publib-golang
```

Each step reads env vars: `NPM_TOKEN`, `TWINE_USERNAME` / `TWINE_PASSWORD`, `NUGET_API_KEY`, `MAVEN_USERNAME` / `MAVEN_PASSWORD` / `MAVEN_GPG_*` / `MAVEN_ENDPOINT`, `GITHUB_REPO` / `GITHUB_TOKEN`. Should shrink the workflow by roughly 3x and drop the hand-rolled `dist/java/**.pom` loop plus the `git init` for the Go repo.

**When to do it:** after the current hand-rolled workflow has succeeded at least once (so we know credentials and registries are correctly configured). Until then the hand-rolled workflow is easier to debug step by step.
