# TODO

## CLI output — cargo-style aligned action verbs

Add `CliConsole.Action(verb, message)` helper (right-padded green-bold verb, cargo-style: `   Pushed model v3`) and apply only in commands with multi-step output (`scan`, `push` per-source split, `synth` build/diff/confirm, `validate` rules+format). Single-result commands keep `✓` glyph form. Skip until a multi-step command actually needs it — avoid cargo-cargo-cult.
