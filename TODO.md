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
