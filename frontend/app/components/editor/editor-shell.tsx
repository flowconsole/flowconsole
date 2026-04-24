import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@flowconsole/ui/components/ui/tooltip";
import {
  AlertCircle,
  Columns2,
  Eye,
  Loader2,
  PanelLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGetGitFileContentQuery } from "@/lib/api/rtk/git-operations-api";
import { cn } from "@/lib/utils";

import { BranchSelector } from "./branch-selector";
import { CommitDialog } from "./commit-dialog";
import { DiagnosticsPanel } from "./diagnostics-panel";
import { FileSelector } from "./file-selector";
import {
  compareFileRefs,
  normalizeBranchName,
  normalizeEditorFileRef,
  normalizeRelativePath,
  toFileKey,
  type EditorFileOption,
  type EditorFileRef,
} from "./file-utils";
import { NewFileDialog } from "./new-file-dialog";
import type {
  Diagnostic,
  EditorWorkbenchProps,
  SplitViewMode,
} from "./types";

const EditorWorkbenchLazy = lazy(() =>
  import("./editor-workbench").then((m) => ({ default: m.EditorWorkbench })),
);

function EditorWorkbench(props: EditorWorkbenchProps) {
  return (
    <Suspense fallback={null}>
      <EditorWorkbenchLazy {...props} />
    </Suspense>
  );
}

const VIEW_MODE_OPTIONS: {
  mode: SplitViewMode;
  label: string;
  icon: typeof Columns2;
  testId: string;
}[] = [
  {
    mode: "editor",
    label: "Editor only",
    icon: PanelLeft,
    testId: "view-mode-editor",
  },
  {
    mode: "split",
    label: "Editor + Preview",
    icon: Columns2,
    testId: "view-mode-split",
  },
  {
    mode: "preview",
    label: "Preview only",
    icon: Eye,
    testId: "view-mode-preview",
  },
];

function omitKey(values: Record<string, string>, key: string | null) {
  if (!key || !(key in values)) {
    return values;
  }

  const nextValues = { ...values };
  delete nextValues[key];
  return nextValues;
}

export function ModelEditorShell({
  modelId,
  modelName,
  branch,
  modelFiles,
}: {
  modelId: string;
  modelName: string;
  branch?: string;
  modelFiles?: Array<{ branch?: string | null; relativePath?: string | null }>;
}) {
  const { t } = useTranslation("editor");

  const initialBranch = normalizeBranchName(branch) || "main";
  const [viewMode, setViewMode] = useState<SplitViewMode>("split");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [diagnosticsCollapsed, setDiagnosticsCollapsed] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);
  const [loadedContentByKey, setLoadedContentByKey] = useState<
    Record<string, string>
  >({});
  const [draftContentByKey, setDraftContentByKey] = useState<
    Record<string, string>
  >({});
  const [localFilesByKey, setLocalFilesByKey] = useState<
    Record<string, EditorFileRef>
  >({});

  const goToLineRef = useRef<((line: number) => void) | null>(null);
  const previousModelIdRef = useRef(modelId);

  const persistedFiles = useMemo(
    () =>
      (modelFiles ?? [])
        .map((file) => normalizeEditorFileRef(file))
        .filter((file): file is EditorFileRef => file !== null)
        .sort(compareFileRefs),
    [modelFiles],
  );
  const persistedFileKeys = useMemo(
    () => new Set(persistedFiles.map((file) => toFileKey(file))),
    [persistedFiles],
  );

  const branchFiles = useMemo(() => {
    const filesByKey = new Map<string, EditorFileOption>();

    for (const file of persistedFiles) {
      if (file.branch !== selectedBranch) continue;
      filesByKey.set(toFileKey(file), file);
    }

    for (const file of Object.values(localFilesByKey)) {
      if (file.branch !== selectedBranch) continue;
      const key = toFileKey(file);
      if (!filesByKey.has(key)) {
        filesByKey.set(key, { ...file, isLocalOnly: true });
      }
    }

    return Array.from(filesByKey.values()).sort(compareFileRefs);
  }, [localFilesByKey, persistedFiles, selectedBranch]);

  const allFilesByKey = useMemo(() => {
    const filesByKey = new Map<string, EditorFileRef>();
    for (const file of persistedFiles) {
      filesByKey.set(toFileKey(file), file);
    }
    for (const file of Object.values(localFilesByKey)) {
      const key = toFileKey(file);
      if (!filesByKey.has(key)) {
        filesByKey.set(key, file);
      }
    }
    return filesByKey;
  }, [localFilesByKey, persistedFiles]);

  const activeFileRef = activeFileKey
    ? (allFilesByKey.get(activeFileKey) ?? null)
    : null;
  const activeFileIsLocalOnly = activeFileKey
    ? Boolean(localFilesByKey[activeFileKey]) && !persistedFileKeys.has(activeFileKey)
    : false;

  const shouldRequestActiveFileContent =
    activeFileRef !== null &&
    activeFileKey !== null &&
    !activeFileIsLocalOnly &&
    loadedContentByKey[activeFileKey] === undefined;

  const activeFileQueryArg =
    activeFileRef && activeFileKey && shouldRequestActiveFileContent
      ? {
          id: modelId,
          branch: activeFileRef.branch,
          path: activeFileRef.relativePath,
        }
      : skipToken;
  const {
    data: activeFileContent,
    isFetching: isActiveFileContentFetching,
    isLoading: isActiveFileContentLoading,
  } = useGetGitFileContentQuery(activeFileQueryArg);

  useEffect(() => {
    if (!activeFileKey || !activeFileContent) {
      return;
    }

    setLoadedContentByKey((current) => {
      if (current[activeFileKey] === activeFileContent.content) {
        return current;
      }

      return {
        ...current,
        [activeFileKey]: activeFileContent.content,
      };
    });
  }, [activeFileContent, activeFileKey]);

  const activeBaselineContent = activeFileKey
    ? (loadedContentByKey[activeFileKey] ?? activeFileContent?.content ?? "")
    : "";
  const isBlockingFileLoad =
    shouldRequestActiveFileContent &&
    !activeFileContent &&
    (isActiveFileContentLoading || isActiveFileContentFetching);

  useEffect(() => {
    if (previousModelIdRef.current === modelId) {
      return;
    }

    previousModelIdRef.current = modelId;
    setSelectedBranch(normalizeBranchName(branch) || "main");
    setActiveFileKey(null);
    setLoadedContentByKey({});
    setDraftContentByKey({});
    setLocalFilesByKey({});
    setDiagnostics([]);
    setDiagnosticsCollapsed(false);
  }, [branch, modelId]);

  useEffect(() => {
    const hasActiveFileInBranch = activeFileKey
      ? branchFiles.some((file) => toFileKey(file) === activeFileKey)
      : false;

    if (hasActiveFileInBranch) {
      return;
    }

    setActiveFileKey(branchFiles[0] ? toFileKey(branchFiles[0]) : null);
  }, [activeFileKey, branchFiles]);

  const isFileDirty = useCallback(
    (fileKey: string) => {
      if (localFilesByKey[fileKey] && !persistedFileKeys.has(fileKey)) {
        return true;
      }

      if (!(fileKey in draftContentByKey)) {
        return false;
      }

      return draftContentByKey[fileKey] !== (loadedContentByKey[fileKey] ?? "");
    },
    [draftContentByKey, loadedContentByKey, localFilesByKey, persistedFileKeys],
  );

  const isDirty = useMemo(() => {
    const keys = new Set([
      ...Object.keys(draftContentByKey),
      ...Object.keys(localFilesByKey),
    ]);
    return Array.from(keys).some((key) => isFileDirty(key));
  }, [draftContentByKey, isFileDirty, localFilesByKey]);

  const activeFileDirty = activeFileKey ? isFileDirty(activeFileKey) : false;
  const currentCode = activeFileKey
    ? (draftContentByKey[activeFileKey] ?? activeBaselineContent)
    : "";

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter(
    (d) => d.severity === "warning",
  ).length;

  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t("unsavedChangesWarning");
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, t]);

  useEffect(() => {
    if (!isBlockingFileLoad) {
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isBlockingFileLoad]);

  const discardFileChanges = useCallback(
    (fileKey: string | null) => {
      if (!fileKey) {
        return;
      }

      setDraftContentByKey((current) => omitKey(current, fileKey));

      if (localFilesByKey[fileKey] && !persistedFileKeys.has(fileKey)) {
        setLocalFilesByKey((current) => {
          const next = { ...current };
          delete next[fileKey];
          return next;
        });
        setLoadedContentByKey((current) => omitKey(current, fileKey));
      }
    },
    [localFilesByKey, persistedFileKeys],
  );

  const confirmDiscardActiveFile = useCallback(() => {
    if (!activeFileDirty) {
      return true;
    }

    return window.confirm(t("discardFileChangesWarning"));
  }, [activeFileDirty, t]);

  const handleCodeChange = useCallback(
    (value: string) => {
      if (!activeFileKey) {
        return;
      }

      const isLocalOnly =
        Boolean(localFilesByKey[activeFileKey]) && !persistedFileKeys.has(activeFileKey);
      const baseline = isLocalOnly ? "" : activeBaselineContent;

      setDraftContentByKey((current) => {
        if (!isLocalOnly && value === baseline) {
          return omitKey(current, activeFileKey);
        }

        return {
          ...current,
          [activeFileKey]: value,
        };
      });
    },
    [activeBaselineContent, activeFileKey, localFilesByKey, persistedFileKeys],
  );

  const handleBranchSelected = useCallback(
    (nextBranch: string) => {
      const normalizedBranch = normalizeBranchName(nextBranch);
      if (!normalizedBranch || normalizedBranch === selectedBranch) {
        return;
      }

      if (!confirmDiscardActiveFile()) {
        return;
      }

      if (activeFileDirty) {
        discardFileChanges(activeFileKey);
      }

      setSelectedBranch(normalizedBranch);
    },
    [
      activeFileDirty,
      activeFileKey,
      confirmDiscardActiveFile,
      discardFileChanges,
      selectedBranch,
    ],
  );

  const handleFileSelected = useCallback(
    (file: EditorFileRef) => {
      const nextKey = toFileKey(file);
      if (nextKey === activeFileKey) {
        return;
      }

      if (!confirmDiscardActiveFile()) {
        return;
      }

      if (activeFileDirty) {
        discardFileChanges(activeFileKey);
      }

      setActiveFileKey(nextKey);
    },
    [
      activeFileDirty,
      activeFileKey,
      confirmDiscardActiveFile,
      discardFileChanges,
    ],
  );

  const handleCreateFile = useCallback(
    (relativePath: string) => {
      if (!confirmDiscardActiveFile()) {
        return;
      }

      if (activeFileDirty) {
        discardFileChanges(activeFileKey);
      }

      const nextFile = {
        branch: selectedBranch,
        relativePath: normalizeRelativePath(relativePath),
      };
      const nextKey = toFileKey(nextFile);

      setLocalFilesByKey((current) => ({
        ...current,
        [nextKey]: nextFile,
      }));
      setDraftContentByKey((current) => ({
        ...current,
        [nextKey]: current[nextKey] ?? "",
      }));
      setActiveFileKey(nextKey);
    },
    [
      activeFileDirty,
      activeFileKey,
      confirmDiscardActiveFile,
      discardFileChanges,
      selectedBranch,
    ],
  );

  const handleCommitted = useCallback(
    (file: { branch: string; filePath: string; content: string }) => {
      const fileKey = toFileKey({
        branch: file.branch,
        relativePath: file.filePath,
      });

      setLoadedContentByKey((current) => ({
        ...current,
        [fileKey]: file.content,
      }));
      setDraftContentByKey((current) => omitKey(current, fileKey));
      setLocalFilesByKey((current) => {
        if (!(fileKey in current)) {
          return current;
        }

        const next = { ...current };
        delete next[fileKey];
        return next;
      });
    },
    [],
  );

  const handleGoToLine = useCallback((line: number) => {
    goToLineRef.current?.(line);
    setViewMode((current) => (current === "preview" ? "split" : current));
  }, []);

  const handleEditorReady = useCallback((goToLine: (line: number) => void) => {
    goToLineRef.current = goToLine;
  }, []);

  const toggleDiagnostics = useCallback(() => {
    setDiagnosticsCollapsed((value) => !value);
  }, []);

  const branchExistingPaths = useMemo(
    () => branchFiles.map((file) => file.relativePath),
    [branchFiles],
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="relative flex h-full flex-col"
        data-testid="model-editor-shell"
        aria-busy={isBlockingFileLoad}
      >
        <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-background px-3">
          <span
            className="truncate text-sm font-semibold"
            data-testid="editor-model-name"
          >
            {modelName}
          </span>

          <BranchSelector
            modelId={modelId}
            selectedBranch={selectedBranch}
            onBranchSelected={handleBranchSelected}
          />

          <FileSelector
            files={branchFiles}
            selectedFile={activeFileRef}
            onFileSelected={handleFileSelected}
          />

          <NewFileDialog
            selectedBranch={selectedBranch}
            existingPaths={branchExistingPaths}
            onCreate={handleCreateFile}
          />

          {isDirty && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-amber-500"
              title={t("unsavedChanges")}
              data-testid="unsaved-indicator"
            />
          )}

          <div className="flex-1" />

          {(errorCount > 0 || warningCount > 0) && (
            <button
              onClick={toggleDiagnostics}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-muted",
                errorCount > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
              aria-label={t("toggleProblems")}
              data-testid="diagnostics-summary"
            >
              <AlertCircle className="size-3.5" />
              {errorCount > 0 && (
                <span>
                  {errorCount} {errorCount === 1 ? t("error") : t("errors")}
                </span>
              )}
              {warningCount > 0 && errorCount === 0 && (
                <span>
                  {warningCount}{" "}
                  {warningCount === 1 ? t("warning") : t("warnings")}
                </span>
              )}
            </button>
          )}

          <div
            className="flex items-center rounded-md border bg-muted/30 p-0.5"
            role="group"
            aria-label={t("viewModeLabel")}
          >
            {VIEW_MODE_OPTIONS.map(({ mode, label, icon: Icon, testId }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode(mode)}
                    data-testid={testId}
                    aria-pressed={viewMode === mode}
                    className={cn(
                      "flex size-7 items-center justify-center rounded transition-colors",
                      viewMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="sr-only">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <CommitDialog
            modelId={modelId}
            branch={activeFileRef?.branch ?? selectedBranch}
            filePath={activeFileRef?.relativePath}
            content={currentCode}
            disabled={!isDirty || !activeFileRef}
            onCommitted={handleCommitted}
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeFileRef ? (
            <EditorWorkbench
              code={currentCode}
              filePath={activeFileRef.relativePath}
              onCodeChange={handleCodeChange}
              viewMode={viewMode}
              onDiagnosticsChange={setDiagnostics}
              onEditorReady={handleEditorReady}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center px-6"
              data-testid="editor-empty-state"
            >
              <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {t("noFilesForBranchTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("noFilesForBranchDescription")}
                  </p>
                </div>
                <NewFileDialog
                  selectedBranch={selectedBranch}
                  existingPaths={branchExistingPaths}
                  onCreate={handleCreateFile}
                />
              </div>
            </div>
          )}

          <DiagnosticsPanel
            diagnostics={diagnostics}
            collapsed={diagnosticsCollapsed}
            onToggle={toggleDiagnostics}
            onGoToLine={handleGoToLine}
          />
        </div>

        {isBlockingFileLoad && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            data-testid="editor-file-loading-overlay"
          >
            <div className="w-full max-w-md rounded-xl border bg-background/95 p-5 shadow-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>{t("loadingFileTitle")}</span>
              </div>

              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={t("loadingFileTitle")}
                data-testid="editor-file-loading-progress"
              >
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {t("loadingFileDescription")}
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
