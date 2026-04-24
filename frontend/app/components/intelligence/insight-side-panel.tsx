
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@flowconsole/ui/components/ui/sheet";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { useTranslation } from "react-i18next";
import type { InsightRef } from "@/lib/intelligence/insight";
import { buildExplorerFocusUrl } from "@/lib/intelligence/insight";

const SOURCE_LABELS: Record<string, string> = {
  query: "Query",
  drift: "Drift",
  validation: "Validation",
  analytics: "Analytics",
};

export interface InsightSidePanelProps {
  insight: InsightRef | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Contextual side panel for intelligence workflows.
 *
 * Displays element details and cross-surface navigation actions without
 * requiring a full page reload. Can be triggered from any intelligence
 * surface (drift, validation, analytics, query results).
 */
export function InsightSidePanel({
  insight,
  open,
  onClose,
}: InsightSidePanelProps) {
  const { t } = useTranslation("insightPanel");

  const explorerUrl = insight
    ? buildExplorerFocusUrl(insight.modelId, insight.entityId)
    : "#";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        data-testid="insight-side-panel"
        className="w-[420px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle data-testid="insight-panel-title">
            {t("title")}
          </SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        {insight && (
          <div className="mt-6 flex flex-col gap-4">
            {/* Entity info block */}
            <div className="rounded-md border bg-muted/40 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-semibold text-sm"
                  data-testid="insight-entity-name"
                >
                  {insight.entityName}
                </span>
                {insight.entityType && (
                  <code
                    className="rounded bg-muted px-1 text-xs"
                    data-testid="insight-entity-type"
                  >
                    {insight.entityType}
                  </code>
                )}
                <Badge
                  variant="secondary"
                  className="text-xs"
                  data-testid="insight-source-badge"
                >
                  {SOURCE_LABELS[insight.source] ?? insight.source}
                </Badge>
              </div>

              {insight.label && (
                <p
                  className="text-xs font-medium text-muted-foreground"
                  data-testid="insight-label"
                >
                  {insight.label}
                </p>
              )}

              {insight.context && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="insight-context"
                >
                  {insight.context}
                </p>
              )}
            </div>

            {/* Cross-surface navigation actions */}
            <div className="flex flex-col gap-2" data-testid="insight-actions">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                asChild
                data-testid="insight-focus-explorer"
              >
                <a href={explorerUrl}>
                  <Icons.explorer className="size-3.5" />
                  {t("focusInExplorer")}
                </a>
              </Button>

            </div>

            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={onClose}
              data-testid="insight-close"
            >
              {t("close")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
