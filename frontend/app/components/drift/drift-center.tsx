import { useCallback, useEffect, useMemo, useState } from "react";
import { Icons } from "@flowconsole/ui/components/shared/icons";
import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Button } from "@flowconsole/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flowconsole/ui/components/ui/card";
import { Input } from "@flowconsole/ui/components/ui/input";
import { Label } from "@flowconsole/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flowconsole/ui/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@flowconsole/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@flowconsole/ui/components/ui/table";
import { Textarea } from "@flowconsole/ui/components/ui/textarea";
import { skipToken } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  useDetectDriftMutation,
  useGetDriftSnapshotQuery,
  useListDriftSnapshotsQuery,
  useUpdateCanonicalMappingsMutation,
  type DriftItemResponse,
  type DriftSnapshotResponse,
} from "@/lib/api/rtk";
import type {
  CanonicalMappingOverrideRequest,
  DriftFilter,
  DriftItem,
  DriftItemBucket,
  DriftItemChange,
  DriftSeverity,
  DriftSnapshotSummary,
  ElementSource,
} from "@/lib/api/view-models";
import type { InsightRef } from "@/lib/intelligence/insight";
import { cn } from "@/lib/utils";
import { InsightSidePanel } from "@/components/intelligence/insight-side-panel";

function mapSnapshot(backend: DriftSnapshotResponse): DriftSnapshotSummary {
  return {
    id: backend.id,
    modelId: backend.modelId,
    createdAt: backend.computedAt,
    driftScore: Number(backend.driftScore),
    addedCount: Number(backend.addedElements),
    removedCount: Number(backend.removedElements),
    changedCount: Number(backend.changedElements),
    totalDriftCount:
      Number(backend.addedElements) +
      Number(backend.removedElements) +
      Number(backend.changedElements),
  };
}

function mapDriftItem(
  item: DriftItemResponse,
  snapshotId: string,
  bucket: DriftItemBucket,
): DriftItem {
  const changes: DriftItemChange[] = item.diffDescription
    ? [{ field: "description", expected: null, actual: item.diffDescription }]
    : [];
  return {
    id: `${snapshotId}-${bucket}-${item.elementId}`,
    snapshotId,
    canonicalId: item.elementId,
    bucket,
    elementName: item.name,
    elementType: item.kind,
    source: "Git" as ElementSource,
    severity: "medium" as DriftSeverity,
    ownerTags: [],
    changes,
  };
}

function mapSnapshotItems(backend: DriftSnapshotResponse): DriftItem[] {
  if (!backend.details) return [];
  const added = backend.details.added.map((i) =>
    mapDriftItem(i, backend.id, "added"),
  );
  const removed = backend.details.removed.map((i) =>
    mapDriftItem(i, backend.id, "removed"),
  );
  const changed = backend.details.changed.map((i) =>
    mapDriftItem(i, backend.id, "changed"),
  );
  return [...added, ...removed, ...changed];
}

function formatRelativeTime(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Sub-components ---

function DriftScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 50
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      : score >= 20
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  return (
    <Badge variant="outline" className={cn("gap-1 font-mono", cls)}>
      <Icons.drift className="size-3" />
      {score}%
    </Badge>
  );
}

function DriftSeverityChip({ severity }: { severity: DriftSeverity }) {
  const map: Record<DriftSeverity, { label: string; className: string }> = {
    critical: {
      label: "Critical",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
    },
    high: {
      label: "High",
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
    },
    medium: {
      label: "Medium",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
    low: {
      label: "Low",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
    },
  };
  const { label, className } = map[severity];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs", className)}
      data-testid={`severity-${severity}`}
    >
      {label}
    </Badge>
  );
}

function SourceChip({ source }: { source: ElementSource }) {
  const map: Record<string, { label: string; className: string }> = {
    InfraScan: { label: "Infra", className: "text-sky-700 dark:text-sky-300" },
    CodeScan: {
      label: "Code",
      className: "text-violet-700 dark:text-violet-300",
    },
    Git: { label: "Git", className: "text-emerald-700 dark:text-emerald-300" },
    Import: {
      label: "Import",
      className: "text-purple-700 dark:text-purple-300",
    },
    Observability: {
      label: "Obs.",
      className: "text-pink-700 dark:text-pink-300",
    },
  };
  const cfg = map[source] ?? {
    label: source,
    className: "text-muted-foreground",
  };
  return (
    <span
      className={cn("text-xs font-medium", cfg.className)}
      data-testid={`source-chip-${source}`}
    >
      {cfg.label}
    </span>
  );
}

interface SnapshotHistoryProps {
  snapshots: DriftSnapshotSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function SnapshotHistory({
  snapshots,
  selectedId,
  onSelect,
}: SnapshotHistoryProps) {
  const { t } = useTranslation("drift");
  return (
    <div data-testid="snapshot-history" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("snapshotHistory")}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {snapshots.map((snap) => (
          <button
            key={snap.id}
            data-testid={`snapshot-card-${snap.id}`}
            onClick={() => onSelect(snap.id)}
            className={cn(
              "flex min-w-[160px] flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
              selectedId === snap.id
                ? "border-primary bg-muted"
                : "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <DriftScoreBadge score={snap.driftScore} />
              {selectedId === snap.id && (
                <Icons.check className="size-3 text-primary" />
              )}
            </div>
            <p className="mt-1 text-xs font-medium">
              {formatRelativeTime(snap.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(snap.createdAt)}
            </p>
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              <span className="text-emerald-600">+{snap.addedCount}</span>
              <span className="text-red-500">−{snap.removedCount}</span>
              <span className="text-amber-600">~{snap.changedCount}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface DriftFiltersProps {
  filters: DriftFilter;
  onChange: (f: DriftFilter) => void;
  /** All current drift items — used to derive the element type combobox options. */
  items: DriftItem[];
}

const ALL = "__all__";

const DRIFT_SOURCES: Array<{
  value: ElementSource | typeof ALL;
  label: string;
}> = [
  { value: ALL, label: "All sources" },
  { value: "CodeScan", label: "Code Scan" },
  { value: "InfraScan", label: "Infra Scan" },
];

const DRIFT_SEVERITIES: Array<{
  value: DriftSeverity | typeof ALL;
  label: string;
}> = [
  { value: ALL, label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const DRIFT_BUCKETS: Array<{
  value: DriftItemBucket | typeof ALL;
  label: string;
}> = [
  { value: ALL, label: "All changes" },
  { value: "added", label: "Added" },
  { value: "removed", label: "Removed" },
  { value: "changed", label: "Changed" },
];

function DriftFilters({ filters, onChange, items }: DriftFiltersProps) {
  const { t } = useTranslation("drift");

  const elementTypeOptions = useMemo(() => {
    const types = new Set(items.map((i) => i.elementType));
    return [ALL, ...Array.from(types).sort()] as const;
  }, [items]);

  return (
    <div data-testid="drift-filters" className="flex flex-wrap items-end gap-3">
      {/* Source filter */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          {t("filterSource")}
        </Label>
        <Select
          value={filters.source ?? ALL}
          onValueChange={(v) =>
            onChange({
              ...filters,
              source: v === ALL ? undefined : (v as ElementSource),
            })
          }
        >
          <SelectTrigger
            className="h-8 w-[140px] text-xs"
            data-testid="filter-source"
          >
            <SelectValue placeholder={t("filterSourcePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {DRIFT_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Severity filter */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          {t("filterSeverity")}
        </Label>
        <Select
          value={filters.severity ?? ALL}
          onValueChange={(v) =>
            onChange({
              ...filters,
              severity: v === ALL ? undefined : (v as DriftSeverity),
            })
          }
        >
          <SelectTrigger
            className="h-8 w-[140px] text-xs"
            data-testid="filter-severity"
          >
            <SelectValue placeholder={t("filterSeverityPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {DRIFT_SEVERITIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Element type filter */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          {t("filterType")}
        </Label>
        <Select
          value={filters.elementType ?? ALL}
          onValueChange={(v) =>
            onChange({
              ...filters,
              elementType: v === ALL ? undefined : v,
            })
          }
        >
          <SelectTrigger
            className="h-8 w-[160px] text-xs"
            data-testid="filter-type"
          >
            <SelectValue placeholder={t("filterTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {elementTypeOptions.map((typ) => (
              <SelectItem key={typ} value={typ}>
                {typ === ALL ? "All types" : typ}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bucket filter */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          {t("filterBucket")}
        </Label>
        <Select
          value={filters.bucket ?? ALL}
          onValueChange={(v) =>
            onChange({
              ...filters,
              bucket: v === ALL ? undefined : (v as DriftItemBucket),
            })
          }
        >
          <SelectTrigger
            className="h-8 w-[120px] text-xs"
            data-testid="filter-bucket"
          >
            <SelectValue placeholder={t("filterBucketPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {DRIFT_BUCKETS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {(filters.source ||
        filters.severity ||
        filters.elementType ||
        filters.bucket) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange({})}
          data-testid="clear-filters"
        >
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}

function ChangeDiff({ changes }: { changes: DriftItemChange[] }) {
  return (
    <div className="mt-2 flex flex-col gap-1 rounded-md border bg-muted/40 p-2">
      {changes.map((c, i) => (
        <div key={i} className="flex flex-wrap items-start gap-1 text-xs">
          <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">
            {c.field}
          </code>
          {c.expected !== null && (
            <span className="text-emerald-700 dark:text-emerald-400">
              {c.expected}
            </span>
          )}
          <Icons.arrowRight className="size-3 shrink-0 text-muted-foreground" />
          {c.actual !== null && (
            <span className="text-red-600 dark:text-red-400">{c.actual}</span>
          )}
        </div>
      ))}
    </div>
  );
}

interface CanonicalMappingSheetProps {
  item: DriftItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (req: CanonicalMappingOverrideRequest) => void;
}

function CanonicalMappingSheet({
  item,
  open,
  onClose,
  onSave,
}: CanonicalMappingSheetProps) {
  const { t } = useTranslation("drift");
  const [targetElementId, setTargetElementId] = useState("");
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (!item || !targetElementId.trim()) return;
    onSave({
      canonicalId: item.canonicalId,
      targetElementId: targetElementId.trim(),
      note: note.trim() || undefined,
    });
    setTargetElementId("");
    setNote("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent data-testid="canonical-mapping-sheet">
        <SheetHeader>
          <SheetTitle>{t("canonicalMappingTitle")}</SheetTitle>
          <SheetDescription>
            {t("canonicalMappingDescription")}
          </SheetDescription>
        </SheetHeader>

        {item && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                {t("canonicalId")}
              </p>
              <code
                className="mt-1 font-mono text-sm"
                data-testid="mapping-canonical-id"
              >
                {item.canonicalId}
              </code>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("elementName")}
              </p>
              <p className="mt-0.5 text-sm font-medium">{item.elementName}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target-element-id" className="text-sm">
                {t("targetElementId")}
              </Label>
              <Input
                id="target-element-id"
                placeholder="element ID or canonical ID"
                value={targetElementId}
                onChange={(e) => setTargetElementId(e.target.value)}
                data-testid="mapping-target-id"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mapping-note" className="text-sm">
                {t("mappingNote")}
              </Label>
              <Textarea
                id="mapping-note"
                placeholder={t("mappingNotePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                data-testid="mapping-note"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="mapping-cancel"
              >
                {t("cancel")}
              </Button>
              <Button
                disabled={!targetElementId.trim()}
                onClick={handleSave}
                data-testid="mapping-save"
              >
                {t("saveMapping")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface DriftItemRowProps {
  item: DriftItem;
  modelId: string;
  onMapCanonical: (item: DriftItem) => void;
  onOpenInsight: (item: DriftItem) => void;
}

function DriftItemRow({
  item,
  modelId,
  onMapCanonical,
  onOpenInsight,
}: DriftItemRowProps) {
  const { t } = useTranslation("drift");
  const [expanded, setExpanded] = useState(false);

  const explorerUrl = `/models/${encodeURIComponent(modelId)}/explorer?element=${encodeURIComponent(item.canonicalId)}`;
  const hasChanges = item.changes.length > 0;

  return (
    <TableRow data-testid={`drift-item-${item.id}`}>
      <TableCell className="w-8">
        <DriftSeverityChip severity={item.severity} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.elementName}</span>
          <div className="flex items-center gap-1.5">
            <code className="rounded bg-muted px-1 text-xs">
              {item.elementType}
            </code>
            <SourceChip source={item.source} />
          </div>
          {item.ownerTags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {item.ownerTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-4 px-1 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </TableCell>
      {false && (
        <TableCell className="font-mono text-xs text-muted-foreground">
          {item.canonicalId}
        </TableCell>
      )}
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            asChild
            data-testid={`focus-explorer-${item.id}`}
          >
            <a href={explorerUrl} className="inline-flex items-center gap-1">
              <Icons.explorer className="size-3" />
              {t("focusInExplorer")}
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled
            data-testid={`ask-ai-${item.id}`}
          >
            <Icons.messages className="size-3" />
            {t("askAi")}
          </Button>
          {item.linkedAdrId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              data-testid={`linked-adr-${item.id}`}
              asChild
            >
              <a
                href={`/dashboard/adr?id=${item.linkedAdrId}`}
                className="inline-flex items-center gap-1"
              >
                <Icons.adr className="size-3" />
                ADR
              </a>
            </Button>
          )}
          {/* TODO: re-enable when insight panel is ready
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => onOpenInsight(item)}
            data-testid={`open-insight-panel-${item.id}`}
          >
            <Icons.explorer className="size-3" />
            {t("openInsightPanel")}
          </Button>
          */}
          {/* TODO: re-enable when override mapping is ready
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => onMapCanonical(item)}
            data-testid={`map-canonical-${item.id}`}
          >
            <Icons.gitCommit className="size-3" />
            {t("overrideMapping")}
          </Button>
          */}
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setExpanded((v) => !v)}
              data-testid={`toggle-diff-${item.id}`}
              aria-pressed={expanded}
            >
              <Icons.chevronRight
                className={cn(
                  "size-3 transition-transform",
                  expanded && "rotate-90",
                )}
              />
              {expanded ? t("hideDiff") : t("showDiff")}
            </Button>
          )}
        </div>
        {expanded && hasChanges && <ChangeDiff changes={item.changes} />}
      </TableCell>
    </TableRow>
  );
}

interface DriftBucketSectionProps {
  bucket: DriftItemBucket;
  items: DriftItem[];
  modelId: string;
  onMapCanonical: (item: DriftItem) => void;
  onOpenInsight: (item: DriftItem) => void;
}

const BUCKET_CONFIG: Record<
  DriftItemBucket,
  { label: string; icon: typeof Icons.add; countClass: string }
> = {
  added: {
    label: "Added",
    icon: Icons.add,
    countClass: "text-emerald-600 dark:text-emerald-400",
  },
  removed: {
    label: "Removed",
    icon: Icons.close,
    countClass: "text-red-600 dark:text-red-400",
  },
  changed: {
    label: "Changed",
    icon: Icons.refresh,
    countClass: "text-amber-600 dark:text-amber-400",
  },
};

function DriftBucketSection({
  bucket,
  items,
  modelId,
  onMapCanonical,
  onOpenInsight,
}: DriftBucketSectionProps) {
  const { t } = useTranslation("drift");
  const cfg = BUCKET_CONFIG[bucket];
  const Icon = cfg.icon;

  return (
    <Card data-testid={`bucket-${bucket}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {t(
            `bucket${bucket.charAt(0).toUpperCase()}${bucket.slice(1)}` as
              | "bucketAdded"
              | "bucketRemoved"
              | "bucketChanged",
          )}
          <span className={cn("ml-1 font-mono text-sm", cfg.countClass)}>
            {items.length}
          </span>
        </CardTitle>
        <CardDescription>
          {t(
            `bucket${bucket.charAt(0).toUpperCase()}${bucket.slice(1)}Description` as
              | "bucketAddedDescription"
              | "bucketRemovedDescription"
              | "bucketChangedDescription",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid={`bucket-empty-${bucket}`}
          >
            {t("bucketEmpty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{t("colSeverity")}</TableHead>
                <TableHead>{t("colElement")}</TableHead>
                {false && (
                  <TableHead className="hidden lg:table-cell">
                    {t("colCanonicalId")}
                  </TableHead>
                )}
                <TableHead>{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <DriftItemRow
                  key={item.id}
                  item={item}
                  modelId={modelId}
                  onMapCanonical={onMapCanonical}
                  onOpenInsight={onOpenInsight}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DriftSummaryBar({ snapshot }: { snapshot: DriftSnapshotSummary }) {
  const { t } = useTranslation("drift");
  const cards = [
    {
      title: t("summaryTotalDrift"),
      value: snapshot.totalDriftCount,
      desc: t("summaryTotalDriftDesc"),
      icon: Icons.drift,
      highlight:
        snapshot.totalDriftCount > 5
          ? "text-red-600 dark:text-red-400"
          : undefined,
    },
    {
      title: t("summaryAdded"),
      value: snapshot.addedCount,
      desc: t("summaryAddedDesc"),
      icon: Icons.add,
      highlight: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: t("summaryRemoved"),
      value: snapshot.removedCount,
      desc: t("summaryRemovedDesc"),
      icon: Icons.close,
      highlight:
        snapshot.removedCount > 0
          ? "text-red-600 dark:text-red-400"
          : undefined,
    },
    {
      title: t("summaryChanged"),
      value: snapshot.changedCount,
      desc: t("summaryChangedDesc"),
      icon: Icons.refresh,
      highlight:
        snapshot.changedCount > 0
          ? "text-amber-600 dark:text-amber-400"
          : undefined,
    },
  ];

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="drift-summary-bar"
    >
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", card.highlight)}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export interface DriftCenterProps {
  modelId: string;
  modelName?: string;
}

export function DriftCenter({ modelId, modelName }: DriftCenterProps) {
  const { t } = useTranslation("drift");
  const navigate = useNavigate();

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");
  const [filters, setFilters] = useState<DriftFilter>({});
  const [mappingItem, setMappingItem] = useState<DriftItem | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [insightRef, setInsightRef] = useState<InsightRef | null>(null);
  const [insightPanelOpen, setInsightPanelOpen] = useState(false);
  const {
    data: snapshotsPage,
    error: snapshotsError,
    isLoading: snapshotsLoading,
  } = useListDriftSnapshotsQuery({
    modelId,
    page: 1,
    limit: 50,
  });
  const [detectDrift, { isLoading: isDetecting }] = useDetectDriftMutation();
  const [updateCanonicalMappings] = useUpdateCanonicalMappingsMutation();
  const snapshots = useMemo(
    () => (snapshotsPage?.items ?? []).map(mapSnapshot),
    [snapshotsPage],
  );

  useEffect(() => {
    if (snapshots.length === 0) {
      setSelectedSnapshotId("");
      return;
    }
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const snapshotFromUrl = params.get("snapshot");
    const nextSnapshot =
      snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ??
      snapshots.find((snapshot) => snapshot.id === snapshotFromUrl) ??
      snapshots[0];
    if (nextSnapshot && nextSnapshot.id !== selectedSnapshotId) {
      setSelectedSnapshotId(nextSnapshot.id);
    }
  }, [selectedSnapshotId, snapshots]);

  const { data: snapshotData } = useGetDriftSnapshotQuery(
    selectedSnapshotId
      ? {
          modelId,
          snapshotId: selectedSnapshotId,
        }
      : skipToken,
  );
  const snapshotItems = useMemo(
    () => (snapshotData ? mapSnapshotItems(snapshotData) : []),
    [snapshotData],
  );

  // Sync selected snapshot to URL
  useEffect(() => {
    if (!selectedSnapshotId || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("snapshot", selectedSnapshotId);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedSnapshotId, navigate]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);
  const loadingState =
    snapshotsLoading && snapshots.length === 0
      ? "loading"
      : snapshotsError
        ? "error"
        : snapshots.length === 0
          ? "empty"
          : "ready";

  const handleDetect = useCallback(async () => {
    try {
      const snapshot = await detectDrift({
        modelId,
        detectDriftRequest: {},
      }).unwrap();
      setSelectedSnapshotId(snapshot.id);
    } catch {
      // button re-enables
    }
  }, [detectDrift, modelId]);

  const handleMapCanonical = useCallback((item: DriftItem) => {
    setMappingItem(item);
    setMappingOpen(true);
  }, []);

  const handleMappingSave = useCallback(
    (req: CanonicalMappingOverrideRequest) => {
      updateCanonicalMappings({
        modelId,
        updateCanonicalMappingsRequest: {
          mappings: [
            {
              elementId: req.targetElementId,
              canonicalId: req.canonicalId,
            },
          ],
        },
      })
        .unwrap()
        .catch((err: unknown) => {
          console.error("Failed to save canonical mapping override:", err);
        });
    },
    [modelId, updateCanonicalMappings],
  );

  const handleOpenInsight = useCallback(
    (item: DriftItem) => {
      setInsightRef({
        source: "drift",
        modelId,
        entityId: item.canonicalId,
        entityName: item.elementName,
        entityType: item.elementType,
        label: item.bucket,
        context:
          item.changes.length > 0
            ? `${item.changes.length} property changes detected`
            : undefined,
      });
      setInsightPanelOpen(true);
    },
    [modelId],
  );

  const filteredItems = snapshotItems.filter((item) => {
    if (filters.source && item.source !== filters.source) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    if (filters.elementType && item.elementType !== filters.elementType)
      return false;
    if (filters.bucket && item.bucket !== filters.bucket) return false;
    return true;
  });

  const addedItems = filteredItems.filter((i) => i.bucket === "added");
  const removedItems = filteredItems.filter((i) => i.bucket === "removed");
  const changedItems = filteredItems.filter((i) => i.bucket === "changed");

  // Loading state
  if (loadingState === "loading") {
    return (
      <div data-testid="drift-center" className="flex flex-col gap-6">
        <div
          data-testid="drift-loading"
          className="text-sm text-muted-foreground"
        >
          {t("loading")}
        </div>
      </div>
    );
  }

  // Error state
  if (loadingState === "error") {
    return (
      <div data-testid="drift-center" className="flex flex-col gap-6">
        <div data-testid="drift-error" className="text-sm text-destructive">
          {t("loadError")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="drift-center">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            className="text-2xl font-bold tracking-tight"
            data-testid="drift-heading"
          >
            {modelName ?? t("heading")}
          </h2>
          {selectedSnapshot && (
            <DriftScoreBadge score={selectedSnapshot.driftScore} />
          )}
          {selectedSnapshot && (
            <Badge variant="secondary" className="gap-1 text-muted-foreground">
              <Icons.refresh className="size-3" />
              {t("lastChecked")}{" "}
              {formatRelativeTime(selectedSnapshot.createdAt)}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void handleDetect()}
          disabled={isDetecting}
          data-testid="detect-drift-btn"
        >
          <Icons.refresh className="size-4" />
          {isDetecting ? t("detecting") : t("detectDrift")}
        </Button>
      </div>

      {/* Empty state */}
      {loadingState === "empty" ? (
        <div
          data-testid="drift-empty"
          className="text-sm text-muted-foreground"
        >
          {t("noSnapshots")}
        </div>
      ) : (
        <>
          {/* Snapshot history */}
          <SnapshotHistory
            snapshots={snapshots}
            selectedId={selectedSnapshotId}
            onSelect={setSelectedSnapshotId}
          />

          {/* Summary bar */}
          {selectedSnapshot && <DriftSummaryBar snapshot={selectedSnapshot} />}

          {/* Filters */}
          <DriftFilters
            filters={filters}
            onChange={setFilters}
            items={snapshotItems}
          />

          {/* Buckets */}
          {(filters.bucket === undefined || filters.bucket === "added") && (
            <DriftBucketSection
              bucket="added"
              items={addedItems}
              modelId={modelId}
              onMapCanonical={handleMapCanonical}
              onOpenInsight={handleOpenInsight}
            />
          )}
          {(filters.bucket === undefined || filters.bucket === "removed") && (
            <DriftBucketSection
              bucket="removed"
              items={removedItems}
              modelId={modelId}
              onMapCanonical={handleMapCanonical}
              onOpenInsight={handleOpenInsight}
            />
          )}
          {(filters.bucket === undefined || filters.bucket === "changed") && (
            <DriftBucketSection
              bucket="changed"
              items={changedItems}
              modelId={modelId}
              onMapCanonical={handleMapCanonical}
              onOpenInsight={handleOpenInsight}
            />
          )}
        </>
      )}

      {/* Canonical mapping sheet */}
      <CanonicalMappingSheet
        item={mappingItem}
        open={mappingOpen}
        onClose={() => setMappingOpen(false)}
        onSave={handleMappingSave}
      />

      {/* Shared insight side panel */}
      <InsightSidePanel
        insight={insightRef}
        open={insightPanelOpen}
        onClose={() => setInsightPanelOpen(false)}
      />
    </div>
  );
}
