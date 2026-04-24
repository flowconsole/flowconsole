import type React from "react";
import { useCallback, useState } from "react";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Input } from "@flowconsole/ui/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@flowconsole/ui/components/ui/popover";
import { Check, ChevronsUpDown, GitBranch, Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import {
  useCreateBranchMutation,
  useListBranchesQuery,
} from "@/lib/api/rtk/git-operations-api";
import { normalizeBranchName } from "./file-utils";

export interface BranchSelectorProps {
  modelId: string;
  selectedBranch?: string;
  // eslint-disable-next-line no-unused-vars
  onBranchSelected?: (branch: string) => void;
}

export function BranchSelector({
  modelId,
  selectedBranch,
  onBranchSelected,
}: BranchSelectorProps) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const { data: branches = [], isLoading: branchesLoading } =
    useListBranchesQuery({ id: modelId }, { skip: !open });
  const [createBranch, { isLoading: creating }] = useCreateBranchMutation();

  const branchOptions = branches.reduce<
    Array<{ canonicalName: string; isRemote: boolean }>
  >((options, branch) => {
    const canonicalName = normalizeBranchName(branch.name);
    const existingIndex = options.findIndex(
      (option) => option.canonicalName === canonicalName,
    );

    if (existingIndex === -1) {
      options.push({ canonicalName, isRemote: branch.isRemote });
      return options;
    }

    if (options[existingIndex]?.isRemote && !branch.isRemote) {
      options[existingIndex] = { canonicalName, isRemote: false };
    }

    return options;
  }, []);

  const normalizedSelectedBranch = selectedBranch
    ? normalizeBranchName(selectedBranch)
    : undefined;

  const filteredBranches = branchOptions.filter((branch) =>
    branch.canonicalName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectBranch = useCallback(
    (branchName: string) => {
      const canonicalBranchName = normalizeBranchName(branchName);

      if (canonicalBranchName.toLowerCase() === normalizedSelectedBranch?.toLowerCase()) {
        setOpen(false);
        return;
      }

      onBranchSelected?.(canonicalBranchName);
      setOpen(false);
    },
    [normalizedSelectedBranch, onBranchSelected],
  );

  const handleCreateBranch = useCallback(async () => {
    const name = newBranchName.trim();
    if (!name) return;

    try {
      const created = await createBranch({
        id: modelId,
        createBranchRequest: { name },
      }).unwrap();
      setNewBranchName("");
      setShowNewBranch(false);
      onBranchSelected?.(normalizeBranchName(created.name));
      setOpen(false);
    } catch {
      // error is handled by RTK Query
    }
  }, [modelId, newBranchName, createBranch, onBranchSelected]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleCreateBranch();
      }
    },
    [handleCreateBranch],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs font-normal"
          data-testid="branch-selector-trigger"
        >
          <GitBranch className="size-3" />
          <span className="max-w-[120px] truncate font-mono">
            {normalizedSelectedBranch ?? t("noBranch")}
          </span>
          <ChevronsUpDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        data-testid="branch-selector-popover"
      >
        <div className="p-2">
          <Input
            placeholder={t("searchBranches")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
            data-testid="branch-search-input"
          />
        </div>

        <div className="max-h-48 overflow-y-auto px-1 pb-1">
          {branchesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div
              className="py-3 text-center text-xs text-muted-foreground"
              data-testid="branch-empty-state"
            >
              {t("noBranchesFound")}
            </div>
          ) : (
            filteredBranches.map((branch) => (
              <button
                key={branch.canonicalName}
                onClick={() => handleSelectBranch(branch.canonicalName)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                  branch.canonicalName.toLowerCase() === normalizedSelectedBranch?.toLowerCase() &&
                    "bg-accent/50",
                )}
                data-testid={`branch-item-${branch.canonicalName}`}
              >
                {branch.canonicalName.toLowerCase() === normalizedSelectedBranch?.toLowerCase() ? (
                  <Check className="size-3 shrink-0" />
                ) : (
                  <span className="size-3 shrink-0" />
                )}
                <span className="truncate font-mono">{branch.canonicalName}</span>
                {branch.isRemote && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {t("remote")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="border-t p-1">
          {showNewBranch ? (
            <div className="flex items-center gap-1 p-1" data-testid="new-branch-form">
              <Input
                placeholder={t("newBranchName")}
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 flex-1 text-xs"
                autoFocus
                data-testid="new-branch-input"
              />
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => void handleCreateBranch()}
                disabled={!newBranchName.trim() || creating}
                data-testid="create-branch-submit"
              >
                {creating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  t("create")
                )}
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBranch(true)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
              data-testid="new-branch-button"
            >
              <Plus className="size-3" />
              {t("newBranch")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
