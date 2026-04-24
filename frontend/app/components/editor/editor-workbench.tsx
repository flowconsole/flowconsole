import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import {
  ArchitectureDiagram,
  architectureEdgeTypes,
  architectureNodeTypes,
  findLanguage,
} from "@flowconsole/web";
import type {
  ArchitectureDiagramModel,
  EvaluationContext,
} from "@flowconsole/web";
import { Editor, type Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { APP_MONACO_OPTIONS, APP_MONACO_WRAPPER_PROPS } from "@/lib/workbench";

import type { Diagnostic, SplitViewMode } from "./types";

let _diagId = 0;
function nextId() {
  return String(++_diagId);
}

function getLanguageIdFromPath(filePath?: string | null) {
  const extension = filePath?.split(".").at(-1)?.toLowerCase();
  switch (extension) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return "typescript";
    case "py":
      return "python";
    case "cs":
      return "csharp";
    case "java":
      return "java";
    case "go":
      return "go";
    default:
      return null;
  }
}

/**
 * Parse a raw error string into structured Diagnostic objects.
 * Extracts line/column numbers from common formats:
 *   "Error at line 5, column 3: message"
 *   "Line 5: message"
 *   "[parse] line 12 col 4 message"
 */
function parseError(raw: string, source = "parse"): Diagnostic {
  const lineMatch = raw.match(/(?:line|ln)[:\s]+(\d+)/i);
  const colMatch = raw.match(/(?:col(?:umn)?)[:\s]+(\d+)/i);
  return {
    id: nextId(),
    severity: "error",
    message: raw,
    line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
    column: colMatch ? parseInt(colMatch[1], 10) : undefined,
    source,
  };
}

export function EditorWorkbench({
  code,
  filePath,
  onCodeChange,
  viewMode,
  onDiagnosticsChange,
  onEditorReady,
}: {
  code: string;
  filePath?: string | null;
  onCodeChange: (value: string) => void;
  viewMode: SplitViewMode;
  onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
  onEditorReady?: (goToLine: (line: number) => void) => void;
}) {
  const { t } = useTranslation("editor");
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "vs";
  const effectiveScheme = (resolvedTheme === "dark" ? "dark" : "light") as
    | "light"
    | "dark";

  const languageId = useMemo(() => getLanguageIdFromPath(filePath), [filePath]);
  const language = useMemo(
    () => (languageId ? findLanguage(languageId) : null),
    [languageId],
  );
  const previewSupported = language !== null;

  const [diagramModel, setDiagramModel] = useState<ArchitectureDiagramModel>({
    nodes: [],
    edges: [],
  });

  const evaluationCounter = useRef(0);
  const debounceTimer = useRef<number | null>(null);
  const overlayTimer = useRef<number | null>(null);

  const reportDiagnostics = useCallback(
    (raw: string | null) => {
      if (!onDiagnosticsChange) return;
      if (!raw) {
        onDiagnosticsChange([]);
        return;
      }
      const lines = raw.split("\n").filter(Boolean);
      const diagnostics = lines.map((line) => parseError(line));
      onDiagnosticsChange(diagnostics);
    },
    [onDiagnosticsChange],
  );

  const triggerEvaluation = useCallback(
    (source: string) => {
      if (!language) {
        setDiagramModel({ nodes: [], edges: [] });
        reportDiagnostics(null);
        return;
      }

      evaluationCounter.current += 1;
      const currentEval = evaluationCounter.current;

      if (overlayTimer.current !== null) {
        window.clearTimeout(overlayTimer.current);
        overlayTimer.current = null;
      }

      const context: EvaluationContext = { apiBaseUrl: "" };
      void language
        .evaluate(source, context)
        .then((result) => {
          if (currentEval !== evaluationCounter.current) return;
          if (!result.ok) {
            reportDiagnostics(result.error);
            return;
          }

          reportDiagnostics(null);
          overlayTimer.current = window.setTimeout(() => {
            if (currentEval !== evaluationCounter.current) return;
            setDiagramModel(result.model);
            overlayTimer.current = null;
          }, 200);
        })
        .catch((err) => {
          if (currentEval !== evaluationCounter.current) return;
          reportDiagnostics(err instanceof Error ? err.message : String(err));
        });
    },
    [language, reportDiagnostics],
  );

  useEffect(() => {
    if (!previewSupported) {
      setDiagramModel({ nodes: [], edges: [] });
      reportDiagnostics(null);
      return;
    }

    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      triggerEvaluation(code);
    }, 250);

    return () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [code, previewSupported, reportDiagnostics, triggerEvaluation]);

  useEffect(() => {
    return () => {
      if (overlayTimer.current !== null) {
        window.clearTimeout(overlayTimer.current);
      }
    };
  }, []);

  const handleEditorBeforeMount = useCallback(
    (monaco: Monaco) => {
      language?.monacoSetup?.(monaco);
    },
    [language],
  );

  const handleEditorDidMount = useCallback(
    (editor: import("monaco-editor").editor.IStandaloneCodeEditor) => {
      onEditorReady?.((line: number) => {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      });
    },
    [onEditorReady],
  );

  const themeControls = useMemo(
    () => ({
      resolvedScheme: effectiveScheme,
      scheme: effectiveScheme,
      toggleScheme: () => {},
    }),
    [effectiveScheme],
  );

  const showEditor = viewMode === "editor" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  return (
    <div className="flex min-h-0 flex-1" data-testid="editor-workbench">
      {showEditor && (
        <div
          className={cn(
            "relative flex flex-col border-r bg-card",
            viewMode === "split" ? "w-[45%] min-w-[200px]" : "flex-1",
          )}
          data-testid="editor-panel"
        >
          <Editor
            height="100%"
            width="100%"
            theme={editorTheme}
            language={language?.monacoLanguage ?? "plaintext"}
            options={APP_MONACO_OPTIONS}
            wrapperProps={APP_MONACO_WRAPPER_PROPS}
            value={code}
            onChange={(value) => onCodeChange(value ?? "")}
            beforeMount={handleEditorBeforeMount}
            onMount={handleEditorDidMount}
          />
        </div>
      )}

      {showPreview && (
        <div className="min-w-0 flex-1" data-testid="preview-panel">
          {previewSupported ? (
            <ArchitectureDiagram
              model={diagramModel}
              nodeTypes={architectureNodeTypes}
              edgeTypes={architectureEdgeTypes}
              editable
              themeControls={themeControls}
            />
          ) : (
            <div
              className="flex h-full flex-col items-center justify-center gap-3 bg-muted/20 px-6 text-center"
              data-testid="preview-unsupported"
            >
              <Icons.fileCode className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("previewUnsupportedTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("previewUnsupportedDescription")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
