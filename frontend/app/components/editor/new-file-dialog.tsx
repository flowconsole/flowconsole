import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@flowconsole/ui/components/ui/dialog";
import { Input } from "@flowconsole/ui/components/ui/input";
import { Label } from "@flowconsole/ui/components/ui/label";
import { FilePlus2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  isModelFilePath,
  normalizeRelativePath,
} from "./file-utils";

export interface NewFileDialogProps {
  selectedBranch: string;
  existingPaths: string[];
  disabled?: boolean;
  onCreate?: (relativePath: string) => void;
}

export function NewFileDialog({
  selectedBranch,
  existingPaths,
  disabled,
  onCreate,
}: NewFileDialogProps) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");

  const normalizedPath = useMemo(() => normalizeRelativePath(path), [path]);
  const pathExists = existingPaths.includes(normalizedPath);
  const pathValid = isModelFilePath(path);
  const errorMessage = !path.trim()
    ? ""
    : !pathValid
      ? t("newFileInvalid")
      : pathExists
        ? t("newFileDuplicate")
        : "";

  const handleSubmit = useCallback(() => {
    if (!pathValid || pathExists) {
      return;
    }

    onCreate?.(normalizedPath);
    setPath("");
    setOpen(false);
  }, [normalizedPath, onCreate, pathExists, pathValid]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPath("");
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1.5 px-3 text-xs"
          data-testid="new-file-button"
        >
          <FilePlus2 className="size-3.5" />
          {t("newFile")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        data-testid="new-file-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("newFileTitle")}</DialogTitle>
          <DialogDescription>
            {t("newFileDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-file-branch">{t("branch")}</Label>
          <Input
            id="new-file-branch"
            value={selectedBranch}
            readOnly
            className="font-mono text-xs"
            data-testid="new-file-branch"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-file-path">{t("commitFilePath")}</Label>
          <Input
            id="new-file-path"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("newFilePlaceholder")}
            className="font-mono text-xs"
            autoFocus
            data-testid="new-file-path"
          />
          {errorMessage && (
            <p
              className="text-xs text-destructive"
              data-testid="new-file-error"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            data-testid="new-file-cancel"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!pathValid || pathExists}
            data-testid="new-file-submit"
          >
            {t("createFile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
