import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flowconsole/ui/components/ui/dialog";
import { Input } from "@flowconsole/ui/components/ui/input";
import { Label } from "@flowconsole/ui/components/ui/label";
import { Textarea } from "@flowconsole/ui/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { toApiError } from "@/lib/api/rtk/errors";
import type {
  CreateModelRequest,
  DriftConfig,
  GitConfig,
} from "@/lib/api/rtk/projects-models-api";
import { createModelSchema } from "@/lib/validations/model";

type MetaSchemaOption = {
  id: string;
  name: string;
  isBuiltin?: boolean;
};

type CreateModelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMetaSchemaId?: string;
  metaSchemas: MetaSchemaOption[];
  isSubmitting: boolean;
  onSubmit: (request: CreateModelRequest) => Promise<void>;
};

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createEmptyGitConfig(): GitConfig {
  return {
    repoUrl: "https://github.com/dotnet/eShop.git",
    branch: "main",
    pathPatterns: {
      dsl: [],
      code: [],
      infra: [],
    },
    providerConfig: null,
  };
}

function createEmptyDriftConfig(): DriftConfig {
  return {
    autoEnabled: false,
    sources: [],
    threshold: 80,
    notifyOnScoreBelow: 80,
  };
}

function createInitialFormState(
  defaultMetaSchemaId?: string,
  fallbackMetaSchemaId?: string,
): CreateModelRequest {
  return {
    name: "My Arch Model",
    description: null,
    metaSchemaId: defaultMetaSchemaId ?? fallbackMetaSchemaId ?? "c4",
    gitConfig: createEmptyGitConfig(),
    driftConfig: createEmptyDriftConfig(),
  };
}

function normalizeCreateModelRequest(
  state: CreateModelRequest,
): CreateModelRequest {
  const gitDslPatterns = state.gitConfig?.pathPatterns?.dsl ?? [];
  const gitCodePatterns = state.gitConfig?.pathPatterns?.code ?? [];
  const gitInfraPatterns = state.gitConfig?.pathPatterns?.infra ?? [];
  const driftSources = state.driftConfig?.sources ?? [];
  const driftThreshold =
    typeof state.driftConfig?.threshold === "number"
      ? state.driftConfig.threshold
      : 80;
  const driftNotifyOnScoreBelow = toOptionalNumber(
    String(state.driftConfig?.notifyOnScoreBelow ?? ""),
  );

  return {
    name: state.name.trim(),
    description: state.description?.trim() || null,
    metaSchemaId: state.metaSchemaId || null,
    gitConfig: {
      repoUrl: state.gitConfig?.repoUrl?.trim() ?? "",
      branch: state.gitConfig?.branch?.trim() ?? "",
      pathPatterns: {
        dsl: gitDslPatterns,
        code: gitCodePatterns,
        infra: gitInfraPatterns,
      },
      providerConfig: state.gitConfig?.providerConfig ?? null,
    },
    driftConfig: {
      autoEnabled: state.driftConfig?.autoEnabled ?? false,
      sources: driftSources,
      threshold: driftThreshold,
      notifyOnScoreBelow: driftNotifyOnScoreBelow ?? null,
    },
  };
}

export function CreateModelDialog({
  open,
  onOpenChange,
  defaultMetaSchemaId,
  metaSchemas,
  isSubmitting,
  onSubmit,
}: CreateModelDialogProps) {
  const { t } = useTranslation("projectOverview");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const resolver = zodResolver(createModelSchema) as ReturnType<
    typeof zodResolver
  >;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CreateModelRequest>({
    resolver,
    defaultValues: createInitialFormState(),
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;
    reset(createInitialFormState(defaultMetaSchemaId, metaSchemas[0]?.id));
    setSubmitError(null);
  }, [defaultMetaSchemaId, metaSchemas, open, reset]);

  const currentMetaSchemaId = watch("metaSchemaId");
  const currentGitDslPatterns = watch("gitConfig.pathPatterns.dsl") ?? [];
  const currentGitCodePatterns = watch("gitConfig.pathPatterns.code") ?? [];
  const currentGitInfraPatterns = watch("gitConfig.pathPatterns.infra") ?? [];
  const currentDriftSources = watch("driftConfig.sources") ?? [];
  const currentDescription = watch("description") ?? "";

  const metaSchemaOptions = useMemo(() => {
    if (
      currentMetaSchemaId &&
      !metaSchemas.some((schema) => schema.id === currentMetaSchemaId)
    ) {
      return [
        {
          id: currentMetaSchemaId,
          name: currentMetaSchemaId,
          isBuiltin: false,
        },
        ...metaSchemas,
      ];
    }

    return metaSchemas;
  }, [currentMetaSchemaId, metaSchemas]);

  const handleCreateModel = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(normalizeCreateModelRequest(values));
      onOpenChange(false);
    } catch (err: unknown) {
      const resolvedError = toApiError(err);
      setSubmitError(
        resolvedError instanceof Error
          ? resolvedError.message
          : "Failed to create model",
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid flex-1 gap-5 overflow-y-auto py-2 pr-2">
          <div className="grid gap-1.5">
            <Label htmlFor="model-name">{t("createNameLabel")}</Label>
            <Input
              id="model-name"
              placeholder={t("createNamePlaceholder")}
              autoFocus
              data-testid="model-name-input"
              {...register("name")}
            />
            {errors.name?.message && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="model-desc">{t("createDescriptionLabel")}</Label>
            <Textarea
              id="model-desc"
              value={currentDescription}
              onChange={(e) =>
                setValue("description", e.target.value, {
                  shouldDirty: true,
                })
              }
              placeholder={t("createDescriptionPlaceholder")}
              rows={3}
              data-testid="model-desc-input"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="model-meta-schema">{t("createMetaSchemaLabel")}</Label>
            <select
              id="model-meta-schema"
              value={currentMetaSchemaId ?? ""}
              data-testid="model-meta-schema-select"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("metaSchemaId")}
            >
              {metaSchemaOptions.map((schema) => (
                <option key={schema.id} value={schema.id}>
                  {schema.name}
                </option>
              ))}
            </select>
            {errors.metaSchemaId?.message && (
              <p className="text-sm text-destructive">
                {errors.metaSchemaId.message}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div>
              <div className="text-sm font-medium">{t("gitSectionTitle")}</div>
              <p className="text-xs text-muted-foreground">
                {t("gitSectionDescription")}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-repo-url">{t("gitRepoUrlLabel")}</Label>
              <Input
                id="model-git-repo-url"
                type="url"
                placeholder="https://github.com/org/repo.git"
                data-testid="model-git-repo-url-input"
                {...register("gitConfig.repoUrl")}
              />
              {errors.gitConfig?.repoUrl?.message && (
                <p className="text-sm text-destructive">
                  {errors.gitConfig.repoUrl.message}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-branch">{t("gitBranchLabel")}</Label>
              <Input
                id="model-git-branch"
                placeholder="main"
                data-testid="model-git-branch-input"
                {...register("gitConfig.branch")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-dsl-patterns">
                {t("gitDslPatternsLabel")}
              </Label>
              <Textarea
                id="model-git-dsl-patterns"
                value={currentGitDslPatterns.join("\n")}
                onChange={(e) =>
                  setValue(
                    "gitConfig.pathPatterns.dsl",
                    splitLines(e.target.value),
                    { shouldDirty: true },
                  )
                }
                placeholder="architecture/**/*.dsl"
                data-testid="model-git-dsl-patterns-input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-code-patterns">
                {t("gitCodePatternsLabel")}
              </Label>
              <Textarea
                id="model-git-code-patterns"
                value={currentGitCodePatterns.join("\n")}
                onChange={(e) =>
                  setValue(
                    "gitConfig.pathPatterns.code",
                    splitLines(e.target.value),
                    { shouldDirty: true },
                  )
                }
                placeholder="src/**/*.cs"
                data-testid="model-git-code-patterns-input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-infra-patterns">
                {t("gitInfraPatternsLabel")}
              </Label>
              <Textarea
                id="model-git-infra-patterns"
                value={currentGitInfraPatterns.join("\n")}
                onChange={(e) =>
                  setValue(
                    "gitConfig.pathPatterns.infra",
                    splitLines(e.target.value),
                    { shouldDirty: true },
                  )
                }
                placeholder="deploy/**/*.yaml"
                data-testid="model-git-infra-patterns-input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-username">
                {t("gitUsernameLabel")}
              </Label>
              <Input
                id="model-git-username"
                value={watch("gitConfig.providerConfig.username") ?? ""}
                onChange={(e) => {
                  const current = watch("gitConfig.providerConfig");
                  setValue(
                    "gitConfig.providerConfig",
                    e.target.value || current?.password
                      ? { type: "direct" as const, ...current, username: e.target.value || undefined }
                      : null,
                    { shouldDirty: true },
                  );
                }}
                placeholder={t("gitUsernamePlaceholder")}
                data-testid="model-git-username-input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-git-password">
                {t("gitPasswordLabel")}
              </Label>
              <Input
                id="model-git-password"
                type="password"
                data-openreplay-obscured
                value={watch("gitConfig.providerConfig.password") ?? ""}
                onChange={(e) => {
                  const current = watch("gitConfig.providerConfig");
                  setValue(
                    "gitConfig.providerConfig",
                    e.target.value || current?.username
                      ? { type: "direct" as const, ...current, password: e.target.value || undefined }
                      : null,
                    { shouldDirty: true },
                  );
                }}
                placeholder={t("gitPasswordPlaceholder")}
                data-testid="model-git-password-input"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div>
              <div className="text-sm font-medium">{t("driftSectionTitle")}</div>
              <p className="text-xs text-muted-foreground">
                {t("driftSectionDescription")}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="model-drift-auto-enabled-input"
                {...register("driftConfig.autoEnabled")}
              />
              <span>{t("driftAutoEnabledLabel")}</span>
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="model-drift-sources">
                {t("driftSourcesLabel")}
              </Label>
              <Textarea
                id="model-drift-sources"
                value={currentDriftSources.join("\n")}
                onChange={(e) =>
                  setValue("driftConfig.sources", splitLines(e.target.value), {
                    shouldDirty: true,
                  })
                }
                placeholder={"CodeScan\nInfraScan"}
                data-testid="model-drift-sources-input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-drift-threshold">
                {t("driftThresholdLabel")}
              </Label>
              <Input
                id="model-drift-threshold"
                type="number"
                min="0"
                max="100"
                data-testid="model-drift-threshold-input"
                {...register("driftConfig.threshold", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
              />
              {errors.driftConfig?.threshold?.message && (
                <p className="text-sm text-destructive">
                  {errors.driftConfig.threshold.message}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model-drift-notify">
                {t("driftNotifyOnScoreBelowLabel")}
              </Label>
              <Input
                id="model-drift-notify"
                type="number"
                min="0"
                max="100"
                data-testid="model-drift-notify-input"
                {...register("driftConfig.notifyOnScoreBelow")}
              />
              {errors.driftConfig?.notifyOnScoreBelow?.message && (
                <p className="text-sm text-destructive">
                  {errors.driftConfig.notifyOnScoreBelow.message}
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t pt-4 sm:justify-between">
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreateModel}
              disabled={isSubmitting || !isValid}
              data-testid="create-model-btn"
            >
              {isSubmitting ? t("creating") : t("create")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
