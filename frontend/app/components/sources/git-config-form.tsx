import { useState } from "react";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Input } from "@flowconsole/ui/components/ui/input";
import { Label } from "@flowconsole/ui/components/ui/label";
import {
  FolderSearch,
  GitBranch,
  KeyRound,
  Link2,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  GitConfig,
  GitProviderType,
  UpdateGitConfigRequest,
} from "@/lib/api/view-models";
import { cn } from "@/lib/utils";

interface GitConfigFormProps {
  config: GitConfig | null;
  onSave: (req: UpdateGitConfigRequest) => Promise<void>;
  className?: string;
}

const PROVIDER_OPTIONS: {
  value: GitProviderType | string;
  labelKey: string;
  disabled: boolean;
}[] = [
  { value: "direct", labelKey: "providerDirect", disabled: false },
  { value: "github", labelKey: "providerGitHub", disabled: true },
  { value: "gitlab", labelKey: "providerGitLab", disabled: true },
  { value: "bitbucket", labelKey: "providerBitbucket", disabled: true },
];

/**
 * Form for configuring a Git source connection on a model.
 * Covers: repo URL, branch, path patterns, provider selection, and credentials.
 */
export function GitConfigForm({
  config,
  onSave,
  className,
}: GitConfigFormProps) {
  const { t } = useTranslation("modelSettings");

  const [repoUrl, setRepoUrl] = useState(config?.repoUrl ?? "");
  const [branch, setBranch] = useState(config?.branch ?? "main");
  const dslPatterns = config?.pathPatterns?.dsl ?? [];
  const [pathPatterns, setPathPatterns] = useState(dslPatterns.join("\n"));
  const [provider, setProvider] = useState<GitProviderType>(
    (config?.providerConfig?.type as GitProviderType) ?? "direct",
  );
  const [username, setUsername] = useState(
    config?.providerConfig?.type === "direct"
      ? (config.providerConfig.username ?? "")
      : "",
  );
  const [password, setPassword] = useState(
    config?.providerConfig?.type === "direct"
      ? (config.providerConfig.password ?? "")
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currentUsername =
    config?.providerConfig?.type === "direct"
      ? (config.providerConfig.username ?? "")
      : "";
  const currentPassword =
    config?.providerConfig?.type === "direct"
      ? (config.providerConfig.password ?? "")
      : "";

  const isDirty =
    repoUrl !== (config?.repoUrl ?? "") ||
    branch !== (config?.branch ?? "main") ||
    pathPatterns !== dslPatterns.join("\n") ||
    provider !== ((config?.providerConfig?.type as GitProviderType) ?? "direct") ||
    username !== currentUsername ||
    password !== currentPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const lines = pathPatterns
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const providerConfig =
        provider === "direct"
          ? {
              type: "direct" as const,
              username: username.trim() || undefined,
              password: password.trim() || undefined,
            }
          : null;

      await onSave({
        repoUrl: repoUrl.trim() || undefined,
        branch: branch.trim() || undefined,
        pathPatterns: {
          dsl: lines,
          code: config?.pathPatterns?.code ?? [],
          infra: config?.pathPatterns?.infra ?? [],
        },
        providerConfig,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
      data-testid="git-config-form"
    >
      {/* Repo URL */}
      <div className="space-y-1.5">
        <Label htmlFor="git-repo-url" className="flex items-center gap-1.5">
          <Link2 className="size-3.5 text-muted-foreground" />
          {t("repoUrl")}
        </Label>
        <Input
          id="git-repo-url"
          type="url"
          placeholder="https://github.com/org/repo.git"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          data-testid="git-repo-url"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">{t("repoUrlHint")}</p>
      </div>

      {/* Branch */}
      <div className="space-y-1.5">
        <Label htmlFor="git-branch" className="flex items-center gap-1.5">
          <GitBranch className="size-3.5 text-muted-foreground" />
          {t("branch")}
        </Label>
        <Input
          id="git-branch"
          placeholder="main"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          data-testid="git-branch"
        />
      </div>

      {/* Path patterns */}
      <div className="space-y-1.5">
        <Label
          htmlFor="git-path-patterns"
          className="flex items-center gap-1.5"
        >
          <FolderSearch className="size-3.5 text-muted-foreground" />
          {t("pathPatterns")}
        </Label>
        <textarea
          id="git-path-patterns"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={"src/**/*.ts\narchitecture/**"}
          value={pathPatterns}
          onChange={(e) => setPathPatterns(e.target.value)}
          data-testid="git-path-patterns"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{t("pathPatternsHint")}</p>
      </div>

      {/* Provider selector */}
      <div className="space-y-1.5">
        <Label htmlFor="git-provider" className="flex items-center gap-1.5">
          <KeyRound className="size-3.5 text-muted-foreground" />
          {t("provider")}
        </Label>
        <select
          id="git-provider"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={provider}
          onChange={(e) => setProvider(e.target.value as GitProviderType)}
          data-testid="git-provider"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {t(opt.labelKey)}
              {opt.disabled ? ` (${t("comingSoon")})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Direct provider credentials */}
      {provider === "direct" && (
        <>
          <div className="space-y-1.5">
            <Label
              htmlFor="git-username"
              className="flex items-center gap-1.5"
            >
              <User className="size-3.5 text-muted-foreground" />
              {t("username")}
            </Label>
            <Input
              id="git-username"
              placeholder={t("usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="git-username"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="git-password"
              className="flex items-center gap-1.5"
            >
              <KeyRound className="size-3.5 text-muted-foreground" />
              {t("password")}
            </Label>
            <Input
              id="git-password"
              type="password"
              data-openreplay-obscured
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="git-password"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t("passwordHint")}
            </p>
          </div>
        </>
      )}

      {/* Error */}
      {saveError && (
        <p className="text-sm text-destructive" data-testid="git-config-error">
          {saveError}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={saving || !isDirty}
          data-testid="git-config-save"
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              {t("saving")}
            </>
          ) : saved ? (
            t("saved")
          ) : (
            <>
              <Save className="mr-1.5 size-3.5" />
              {t("saveConfig")}
            </>
          )}
        </Button>
        {saved && (
          <span
            className="text-sm text-green-600 dark:text-green-400"
            data-testid="git-config-saved"
          >
            {t("configSaved")}
          </span>
        )}
      </div>
    </form>
  );
}
