export { DiagnosticsPanel } from "./diagnostics-panel";
// EditorWorkbench is NOT exported here — it imports @flowconsole/web and must
// only be loaded via next/dynamic inside editor-shell.tsx (ssr: false).
export { ModelEditorShell } from "./editor-shell";
export type { Diagnostic, DiagnosticSeverity, EditorWorkbenchProps, SplitViewMode } from "./types";
