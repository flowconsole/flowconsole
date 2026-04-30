# TODO

## CLI output — cargo-style aligned action verbs

Add `CliConsole.Action(verb, message)` helper (right-padded green-bold verb, cargo-style: `   Pushed model v3`) and apply only in commands with multi-step output (`scan`, `push` per-source split, `build` build/diff/confirm, `validate` rules+format). Single-result commands keep `✓` glyph form. Skip until a multi-step command actually needs it — avoid cargo-cargo-cult.

## SDK release — enable Maven Central publishing

The "Publish to Maven Central" step in `.github/workflows/release-preview.yml` is currently commented out (also `Setup Java` and the Maven row in the release-notes table). All other targets (npm / PyPI / NuGet / Go) are wired through `publib-*` and ready to ship.

To re-enable:

1. **Verify namespace `io.github.flowconsole`** on https://central.sonatype.com/publishing/namespaces
   - Add Namespace → enter `io.github.flowconsole`
   - Sonatype provides a verification key; create a public GitHub repo with that name in the `flowconsole` org
   - Click "Verify" — it auto-checks and flips to ✅ Verified
2. **Generate Sonatype User Token** at https://central.sonatype.com/account → Generate User Token
   - Add `MAVEN_USERNAME` / `MAVEN_PASSWORD` repo secrets (the `<server><username>`/`<server><password>` values)
3. **Generate GPG keypair** for artifact signing (Sonatype requires it):
   ```bash
   gpg --gen-key
   gpg --list-secret-keys --keyid-format LONG
   gpg --keyserver keys.openpgp.org --send-keys <KEY_ID>
   gpg --armor --export-secret-keys <KEY_ID> | pbcopy   # → MAVEN_GPG_PRIVATE_KEY
   ```
   Add `MAVEN_GPG_PRIVATE_KEY` and `MAVEN_GPG_PASSPHRASE` repo secrets.
4. **Uncomment** in `release-preview.yml`:
   - `Setup Java` step
   - `Publish to Maven Central` step
   - Restore the Maven row in the release-notes table (drop the "(not published — namespace pending verification)" suffix)

Until steps 1–3 are done the workflow returns 403 from `central.sonatype.com/repository/maven-snapshots/` regardless of code.

## `fcon view` enhancements

Items considered during development but intentionally deferred:

- Auto-refresh without F5 — file watcher + SSE push to browser
- Element inspector side panel — click a node to see properties, tags, annotations
- Diff overlay — `fcon view --diff baseline.json` highlights added/removed/changed elements
- Export to PNG/SVG from the viewer
- `fcon view --watch` — restart-free scanner re-run on source file changes
- Auto-migration of v0.x snapshots to current schema version
- ETag/mtime weak validator on `/api/snapshot` for conditional responses

## SDK — align `FlowRuntime._registerScenario` with id-based identity

Currently the internal scenario dict in `packages/sdk/flowconsole-sdk.ts:546` keys by `name`, while flow identity in the wire format (and the schema's uniqueness requirement) is on the derived `id`. Empty/whitespace names also throw, which is harsher than needed.


## SDK — auto-project typed kind-args into `properties` (Topic, Ingress, Endpoint)

Schema requires `properties.<key>` for `Topic` (`partitions`), `Ingress` (`host`) and `Endpoint` (`httpMethod`). The wrapper classes accept these as typed constructor args (e.g. `new Topic({ partitions: 8 })`) but only store them as instance fields — `toDto()` never copies them into the wire-format `properties` dict. Result: snapshot fails schema validation with `KIND_PROPERTIES_REQUIRED_MISSING` even though the user provided the value via the typed API. Current workaround in cli-test/arch/Program.cs is to duplicate the value (`Partitions = 8` AND `Properties = { ["partitions"] = "8" }`) — ugly and bug-prone.

## CLI — schema-validate snapshot in `fcon build` before writing to disk

`BuildCommand.cs:147-156` only checks that the SDK toolchain output is parseable JSON (`SnapshotSerializer.Normalize`). It does not run `JsonSchemaValidator`, so an invalid snapshot is happily written to `.flowconsole/snapshots/latest.json` and `fcon build` exits 0. The schema errors only surface later when the user runs `fcon view`, which is fail-late: the source of the bug is the SDK build step, but it surfaces in an interactive viewer.

## CLI — surface build-command stderr/stdout on failure

`ShellOutRunner.cs:73` reads `StandardError` only to drain the pipe (avoid deadlock) and discards the contents (`_ = await ...`). When the user's build command fails (`dotnet run`, `node main.ts`, ad-hoc shell), `BuildCommand` prints the bare `build command exited with code N.` line and nothing else. The actual diagnostic — compiler error, stack trace, missing dependency, syntax error — is lost. User has to re-run the command manually outside fcon to see what broke.
