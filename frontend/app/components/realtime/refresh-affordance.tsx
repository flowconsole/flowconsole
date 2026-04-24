
import { cn } from "@/lib/utils";
import type { ModelEvent } from "@/lib/realtime/types";

type Props = {
  event: ModelEvent;
  onRefresh: () => void;
  onDismiss: () => void;
  className?: string;
};

const EVENT_LABELS: Record<string, string> = {
  ModelUpdated: "Model updated",
  IRLoaded: "IR loaded",
  GraphRebuilt: "Graph rebuilt",
};

/**
 * Inline affordance shown when a model event invalidates the current view.
 * Prompts the user to refresh without forcing an automatic reload.
 */
export function RefreshAffordance({ event, onRefresh, onDismiss, className }: Props) {
  const label = EVENT_LABELS[event.type] ?? event.type;

  return (
    <div
      data-testid="refresh-affordance"
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950",
        className,
      )}
    >
      <span className="flex-1 text-amber-800 dark:text-amber-200">
        {label} — view may be out of date.
      </span>
      <button
        onClick={onRefresh}
        className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        aria-label="Refresh to see latest changes"
      >
        Refresh
      </button>
      <button
        onClick={onDismiss}
        className="text-amber-500 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-300"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
