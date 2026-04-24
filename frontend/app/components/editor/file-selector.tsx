import { useMemo, useState } from "react";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Input } from "@flowconsole/ui/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@flowconsole/ui/components/ui/popover";
import { Check, ChevronsUpDown, FileCode2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type { EditorFileOption, EditorFileRef } from "./file-utils";

export interface FileSelectorProps {
  files: EditorFileOption[];
  selectedFile?: EditorFileRef | null;
  disabled?: boolean;
  onFileSelected?: (file: EditorFileRef) => void;
}

export function FileSelector({
  files,
  selectedFile,
  disabled,
  onFileSelected,
}: FileSelectorProps) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredFiles = useMemo(
    () =>
      files.filter((file) =>
        file.relativePath.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [files, search],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 max-w-[280px] gap-1.5 px-2 text-xs font-normal"
          data-testid="file-selector-trigger"
        >
          <FileCode2 className="size-3" />
          <span className="truncate font-mono">
            {selectedFile?.relativePath ?? t("noFile")}
          </span>
          <ChevronsUpDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        data-testid="file-selector-popover"
      >
        <div className="p-2">
          <Input
            placeholder={t("searchFiles")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 text-xs"
            data-testid="file-search-input"
          />
        </div>

        <div className="max-h-56 overflow-y-auto px-1 pb-1">
          {filteredFiles.length === 0 ? (
            <div
              className="py-3 text-center text-xs text-muted-foreground"
              data-testid="file-empty-state"
            >
              {t("noFilesFound")}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isSelected =
                file.branch === selectedFile?.branch &&
                file.relativePath === selectedFile?.relativePath;

              return (
                <button
                  key={`${file.branch}::${file.relativePath}`}
                  onClick={() => {
                    onFileSelected?.({
                      branch: file.branch,
                      relativePath: file.relativePath,
                    });
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                    isSelected && "bg-accent/50",
                  )}
                  data-testid={`file-item-${file.relativePath}`}
                >
                  {isSelected ? (
                    <Check className="size-3 shrink-0" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {file.relativePath}
                  </span>
                  {file.isLocalOnly && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {t("newFileBadge")}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
