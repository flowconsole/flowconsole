import { useMemo } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { ScrollArea } from "@flowconsole/ui/components/ui/scroll-area";
import { Separator } from "@flowconsole/ui/components/ui/separator";
import type { ArchitectureEdge, ArchitectureNode } from "@flowconsole/web";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ElementSource } from "@/lib/api/view-models";

import { SourceBadge } from "./source-badge";

type Selection =
  | { kind: "node"; item: ArchitectureNode }
  | { kind: "edge"; item: ArchitectureEdge }
  | null;

interface ElementInspectorProps {
  selection: Selection;
  /** All diagram edges — used to show relationships for the selected node. */
  edges?: ArchitectureEdge[];
  /** Map from node id to its display title — used to resolve relationship endpoints. */
  nodeTitles?: ReadonlyMap<string, string>;
  /**
   * Set of canonicalIds that appear across more than one element.
   * Elements with a canonicalId in this set are flagged as potential conflicts
   * pending canonical matching in Phase 3.
   */
  conflictingCanonicalIds?: Set<string>;
}

const HIDDEN_PROPERTIES = new Set(["inferenceConfidence"]);

function PropertyTable({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([k, v]) =>
      v !== null && v !== undefined && v !== "" && !HIDDEN_PROPERTIES.has(k),
  );
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-2 gap-2 text-sm">
          <span className="truncate font-medium text-muted-foreground">
            {key}
          </span>
          <span className="break-all text-foreground">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function edgeKind(edge: ArchitectureEdge): string | undefined {
  const d = edge.data as Record<string, unknown> | undefined;
  const k = d?.kind;
  return typeof k === "string" ? k : undefined;
}

function RelationshipsList({
  nodeId,
  edges,
  nodeTitles,
  t,
}: {
  nodeId: string;
  edges: ArchitectureEdge[];
  nodeTitles: ReadonlyMap<string, string>;
  t: (key: string) => string;
}) {
  const { incoming, outgoing } = useMemo(() => {
    const inc: ArchitectureEdge[] = [];
    const out: ArchitectureEdge[] = [];
    for (const edge of edges) {
      if (edge.target === nodeId) inc.push(edge);
      else if (edge.source === nodeId) out.push(edge);
    }
    return { incoming: inc, outgoing: out };
  }, [edges, nodeId]);

  if (incoming.length === 0 && outgoing.length === 0) return null;

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("relationships")}
        </p>

        {incoming.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("incomingRelationships")}
            </p>
            {incoming.map((edge) => (
              <div key={edge.id} className="flex items-center gap-1.5 text-sm">
                <ArrowDownLeft className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {nodeTitles.get(edge.source) ?? edge.source}
                </span>
                {edgeKind(edge) && (
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 text-[10px]"
                  >
                    {edgeKind(edge)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("outgoingRelationships")}
            </p>
            {outgoing.map((edge) => (
              <div key={edge.id} className="flex items-center gap-1.5 text-sm">
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {nodeTitles.get(edge.target) ?? edge.target}
                </span>
                {edgeKind(edge) && (
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 text-[10px]"
                  >
                    {edgeKind(edge)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ElementInspector({
  selection,
  edges = [],
  nodeTitles = new Map(),
  conflictingCanonicalIds,
}: ElementInspectorProps) {
  const { t } = useTranslation("explorer");

  if (!selection) {
    return (
      <EmptyPlaceholder className="h-full border-0 shadow-none">
        <EmptyPlaceholder.Icon name="explorer" className="size-6" />
        <EmptyPlaceholder.Title className="text-sm font-medium">
          {t("noSelectionTitle")}
        </EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description className="text-xs">
          {t("noSelectionDescription")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  if (selection.kind === "node") {
    const { data } = selection.item;
    const tags = (data.tags as string[] | undefined) ?? [];
    const source = data.source as ElementSource | undefined;
    const canonicalId = data.canonicalId as string | null | undefined;
    const properties =
      (data.properties as Record<string, unknown> | undefined) ?? {};

    const isConflicting =
      canonicalId != null &&
      conflictingCanonicalIds != null &&
      conflictingCanonicalIds.has(canonicalId);

    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("elementDetails")}
            </p>
            <h3 className="mt-1 text-base font-semibold">{data.title}</h3>
            {data.subtitle && (
              <p className="text-sm text-muted-foreground">
                {data.subtitle as string}
              </p>
            )}
          </div>

          {data.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground">
                {data.description as string}
              </p>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            {source && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("source")}</span>
                <SourceBadge source={source} />
              </div>
            )}

            {/* Conflict indicator: multiple sources discovered this element */}
            {isConflicting && (
              <div
                className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                data-testid="conflict-indicator"
              >
                <span>⚠</span>
                <span>{t("conflictHint")}</span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("tags")}</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[11px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {Object.keys(properties).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("properties")}
                </p>
                <PropertyTable data={properties} />
              </div>
            </>
          )}

          <RelationshipsList
            nodeId={selection.item.id}
            edges={edges}
            nodeTitles={nodeTitles}
            t={t}
          />
        </div>
      </ScrollArea>
    );
  }

  // Edge / relationship — cast to allow extra keys added by the mapper
  const data = selection.item.data as Record<string, unknown> | undefined;
  const kind = data?.kind as string | undefined;
  const source = data?.source as ElementSource | undefined;
  const properties =
    (data?.properties as Record<string, unknown> | undefined) ?? {};

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("relationshipDetails")}
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {kind ?? "Relationship"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {selection.item.source} → {selection.item.target}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          {kind && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("type")}</span>
              <Badge variant="outline" className="text-[11px]">
                {kind}
              </Badge>
            </div>
          )}
          {source && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("source")}</span>
              <SourceBadge source={source} />
            </div>
          )}
        </div>

        {Object.keys(properties).length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("properties")}
              </p>
              <PropertyTable data={properties} />
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
