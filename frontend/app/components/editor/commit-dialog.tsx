import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
import { GitCommitHorizontal, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCommitToGitMutation } from "@/lib/api/rtk/git-operations-api";

export interface CommitDialogProps {
  modelId: string;
  branch?: string;
  filePath?: string;
  content?: string;
  disabled?: boolean;
  onCommitted?: (file: {
    branch: string;
    filePath: string;
    content: string;
  }) => void;
}

export function CommitDialog({
  modelId,
  branch,
  filePath,
  content,
  disabled,
  onCommitted,
}: CommitDialogProps) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [commitToGit, { isLoading: committing }] = useCommitToGitMutation();

  useEffect(() => {
    if (!open) {
      setMessage("");
    }
  }, [filePath, open]);

  const handleSubmit = useCallback(async () => {
    const targetBranch = branch?.trim();
    const msg = message.trim();
    const path = filePath?.trim();
    if (!msg || !path || !targetBranch) return;
    try {
      await commitToGit({
        id: modelId,
        editorCommitRequest: {
          branch: targetBranch,
          message: msg,
          filePath: path,
          content: content ?? "",
        },
      }).unwrap();
      onCommitted?.({
        branch: targetBranch,
        filePath: path,
        content: content ?? "",
      });
      setMessage("");
      setOpen(false);
    } catch {
      // error is handled by RTK Query
    }
  }, [branch, modelId, message, filePath, content, commitToGit, onCommitted]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-3 text-xs"
          disabled={disabled}
          data-testid="commit-button"
        >
          <GitCommitHorizontal className="size-3.5" />
          {t("commit")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        data-testid="commit-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("commitChanges")}</DialogTitle>
          <DialogDescription>{t("commitDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="commit-branch">{t("branch")}</Label>
          <Input
            id="commit-branch"
            value={branch ?? ""}
            readOnly
            className="font-mono text-xs"
            data-testid="commit-branch"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="commit-file-path">{t("commitFilePath")}</Label>
          <Input
            id="commit-file-path"
            value={filePath ?? ""}
            readOnly
            className="font-mono text-xs"
            data-testid="commit-file-path"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="commit-message">{t("commitMessage")}</Label>
          <Input
            id="commit-message"
            placeholder={t("commitMessagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            data-testid="commit-message-input"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            data-testid="commit-cancel"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!branch?.trim() || !message.trim() || !filePath?.trim() || committing}
            data-testid="commit-submit"
          >
            {committing ? (
              <>
                <Loader2 className="mr-1 size-3.5 animate-spin" />
                {t("committing")}
              </>
            ) : (
              t("commitAction")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
