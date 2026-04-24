/**
 * Shared types for the DSL editor surface.
 */

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  id: string;
  severity: DiagnosticSeverity;
  message: string;
  /** 1-based line number, if available */
  line?: number;
  /** 1-based column number, if available */
  column?: number;
  /** Source label (e.g. "parse", "build") */
  source?: string;
}

export type SplitViewMode = "editor" | "preview" | "split";

export interface EditorWorkbenchProps {
  code: string;
  filePath?: string | null;
  onCodeChange: (value: string) => void;
  viewMode: SplitViewMode;
  onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
  /** Callback with a function to jump the editor to a specific line */
  onEditorReady?: (goToLine: (line: number) => void) => void;
}
