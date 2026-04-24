import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flowconsole/ui/components/ui/card";
import { Trash } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

import {
  DriftStatusChip,
  SourceFreshnessChip,
  ValidationStatusChip,
  type DriftStatus,
  type SourceFreshness,
  type ValidationStatus,
} from "./model-status-chip";

export interface ModelCardStatus {
  sourceFreshness?: SourceFreshness;
  drift?: DriftStatus;
  validation?: ValidationStatus;
}

interface ModelCardProps {
  model: {
    id: string;
    name: string;
    description: string | null;
    metaSchemaId?: string;
  };
  status?: ModelCardStatus;
  onDelete?: (modelId: string) => void;
  className?: string;
}

export function ModelCard({
  model,
  status,
  onDelete,
  className,
}: ModelCardProps) {
  return (
    <div className={cn("relative", className)}>
      <Link
        to={`/models/${model.id}`}
        className="block h-full"
        data-testid={`model-card-${model.id}`}
      >
        <Card className="h-full transition-colors hover:border-foreground/20 hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-base">{model.name}</CardTitle>
              {model.metaSchemaId && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                  {model.metaSchemaId}
                </span>
              )}
            </div>
            {model.description && (
              <CardDescription className="line-clamp-2">
                {model.description}
              </CardDescription>
            )}
            {status && (
              <div className="flex flex-wrap gap-1 pt-1">
                {status.sourceFreshness && (
                  <SourceFreshnessChip status={status.sourceFreshness} />
                )}
                {status.drift && <DriftStatusChip status={status.drift} />}
                {status.validation && (
                  <ValidationStatusChip status={status.validation} />
                )}
              </div>
            )}
          </CardHeader>
        </Card>
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(model.id)}
          data-testid={`model-delete-${model.id}`}
          className="absolute right-2 top-2 shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete model"
        >
          <Trash size={14} />
        </button>
      )}
    </div>
  );
}

interface ModelCardGridProps {
  models: Array<{
    model: {
      id: string;
      name: string;
      description: string | null;
    };
    status?: ModelCardStatus;
  }>;
  className?: string;
}

export function ModelCardGrid({ models, className }: ModelCardGridProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {models.map(({ model, status }) => (
        <ModelCard key={model.id} model={model} status={status} />
      ))}
    </div>
  );
}

interface ModelListRowProps {
  model: {
    id: string;
    name: string;
    description: string | null;
    metaSchemaId?: string;
  };
  status?: ModelCardStatus;
  onDelete?: (modelId: string) => void;
}

export function ModelListRow({ model, status, onDelete }: ModelListRowProps) {
  return (
    <div className="relative">
      <Link
        to={`/models/${model.id}`}
        className="flex min-w-0 items-center justify-between rounded-lg border px-4 py-3 pr-12 transition-colors hover:border-foreground/20 hover:bg-muted/50"
        data-testid={`model-row-${model.id}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate text-sm font-medium">
            {model.name}
            {model.metaSchemaId && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                {model.metaSchemaId}
              </span>
            )}
          </div>
          {model.description && (
            <div className="truncate text-xs text-muted-foreground">
              {model.description}
            </div>
          )}
        </div>
        {status && (
          <div className="ml-3 flex shrink-0 flex-wrap gap-1">
            {status.sourceFreshness && (
              <SourceFreshnessChip status={status.sourceFreshness} />
            )}
            {status.drift && <DriftStatusChip status={status.drift} />}
            {status.validation && (
              <ValidationStatusChip status={status.validation} />
            )}
          </div>
        )}
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(model.id)}
          data-testid={`model-delete-${model.id}`}
          className="absolute right-2 top-2 shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete model"
        >
          <Trash size={14} />
        </button>
      )}
    </div>
  );
}
