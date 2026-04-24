
import { cn } from "@/lib/utils";
import { ALL_ELEMENT_SOURCES } from "@/lib/api/view-models";
import type { ElementSource } from "@/lib/api/view-models";

export const SOURCE_LABELS: Record<ElementSource, string> = {
  Git: "Git",
  CodeScan: "Code",
  InfraScan: "Infra",
  Import: "Import",
  Observability: "Traces",
};

/**
 * Tailwind classes for each source type.
 * Full class strings are required so that Tailwind JIT includes them.
 */
export const SOURCE_CLASSES: Record<ElementSource, string> = {
  Git: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  CodeScan:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
  InfraScan:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  Import:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  Observability:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
};

const FALLBACK_CLASSES =
  "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800";

interface SourceBadgeProps {
  source: ElementSource;
  className?: string;
}

/**
 * Colored badge indicating the source layer an element originates from.
 * Colors match the diagram tone mapping in api-to-diagram-mapper.ts.
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        SOURCE_CLASSES[source] ?? FALLBACK_CLASSES,
        className,
      )}
      data-testid={`source-badge-${source}`}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

/**
 * Legend row showing all source types with their colored badges.
 * Use this to explain source origin to users unfamiliar with the color coding.
 */
export function SourceLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-testid="source-legend"
    >
      {ALL_ELEMENT_SOURCES.map((src) => (
        <SourceBadge key={src} source={src} />
      ))}
    </div>
  );
}
