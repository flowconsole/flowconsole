
import { useCallback } from "react";
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@flowconsole/ui/components/ui/button";
import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";
import type { Diagnostic, DiagnosticSeverity } from "./types";

const SEVERITY_ICON: Record<DiagnosticSeverity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_COLOR: Record<DiagnosticSeverity, string> = {
  error:
    "text-red-600 dark:text-red-400",
  warning:
    "text-amber-600 dark:text-amber-400",
  info:
    "text-blue-600 dark:text-blue-400",
};

const SEVERITY_BG: Record<DiagnosticSeverity, string> = {
  error:
    "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50",
  warning:
    "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
  info:
    "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50",
};

function DiagnosticRow({
  diagnostic,
  onGoToLine,
}: {
  diagnostic: Diagnostic;
  onGoToLine?: (line: number) => void;
}) {
  const Icon = SEVERITY_ICON[diagnostic.severity];
  const color = SEVERITY_COLOR[diagnostic.severity];

  const handleLineClick = useCallback(() => {
    if (diagnostic.line && onGoToLine) {
      onGoToLine(diagnostic.line);
    }
  }, [diagnostic.line, onGoToLine]);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded border px-3 py-2 text-xs",
        SEVERITY_BG[diagnostic.severity],
      )}
      data-testid={`diagnostic-row-${diagnostic.severity}`}
    >
      <Icon
        className={cn("mt-0.5 size-3.5 shrink-0", color)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <span className="break-words text-foreground">{diagnostic.message}</span>
        {diagnostic.line != null && (
          <button
            onClick={handleLineClick}
            className={cn(
              "mt-0.5 flex items-center gap-1 font-mono hover:underline focus:outline-none",
              color,
            )}
            aria-label={`Go to line ${diagnostic.line}`}
          >
            <span>
              {diagnostic.source ? `[${diagnostic.source}] ` : ""}
              Ln {diagnostic.line}
              {diagnostic.column != null ? `, Col ${diagnostic.column}` : ""}
            </span>
          </button>
        )}
        {diagnostic.line == null && diagnostic.source && (
          <span className={cn("mt-0.5 block opacity-70", color)}>
            [{diagnostic.source}]
          </span>
        )}
      </div>
    </div>
  );
}

function SeverityGroup({
  severity,
  diagnostics,
  onGoToLine,
}: {
  severity: DiagnosticSeverity;
  diagnostics: Diagnostic[];
  onGoToLine?: (line: number) => void;
}) {
  if (diagnostics.length === 0) return null;

  const label =
    severity === "error"
      ? "Errors"
      : severity === "warning"
        ? "Warnings"
        : "Info";

  return (
    <div className="flex flex-col gap-1">
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label} ({diagnostics.length})
      </div>
      {diagnostics.map((d) => (
        <DiagnosticRow key={d.id} diagnostic={d} onGoToLine={onGoToLine} />
      ))}
    </div>
  );
}

export function DiagnosticsPanel({
  diagnostics,
  collapsed,
  onToggle,
  onGoToLine,
}: {
  diagnostics: Diagnostic[];
  collapsed: boolean;
  onToggle: () => void;
  onGoToLine?: (line: number) => void;
}) {
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const infos = diagnostics.filter((d) => d.severity === "info");
  const hasProblems = diagnostics.length > 0;

  return (
    <div
      className="shrink-0 border-t bg-background"
      data-testid="diagnostics-panel"
    >
      {/* Header bar */}
      <div className="flex h-8 items-center gap-2 border-b px-3">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left focus:outline-none"
          aria-expanded={!collapsed}
          aria-controls="diagnostics-content"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Problems
          </span>
          {hasProblems && (
            <span className="flex items-center gap-1">
              {errors.length > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-red-600 dark:text-red-400">
                  <AlertCircle className="size-3" />
                  {errors.length}
                </span>
              )}
              {warnings.length > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3" />
                  {warnings.length}
                </span>
              )}
            </span>
          )}
          {!hasProblems && (
            <span className="text-[11px] text-muted-foreground/60">
              No problems
            </span>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={onToggle}
          aria-label={collapsed ? "Expand problems panel" : "Collapse problems panel"}
        >
          {collapsed ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </Button>
        {hasProblems && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground"
            onClick={onToggle}
            aria-label="Close problems panel"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <ScrollArea
          id="diagnostics-content"
          className="max-h-48"
          data-testid="diagnostics-content"
        >
          {hasProblems ? (
            <div className="flex flex-col gap-2 p-2">
              <SeverityGroup
                severity="error"
                diagnostics={errors}
                onGoToLine={onGoToLine}
              />
              <SeverityGroup
                severity="warning"
                diagnostics={warnings}
                onGoToLine={onGoToLine}
              />
              <SeverityGroup
                severity="info"
                diagnostics={infos}
                onGoToLine={onGoToLine}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              No problems detected
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
