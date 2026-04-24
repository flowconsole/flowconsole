
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/lib/realtime/types";

type Props = {
  state: ConnectionState;
  className?: string;
};

const CONFIG: Record<
  ConnectionState,
  { label: string; dotClass: string; textClass: string }
> = {
  connected: {
    label: "Live",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  connecting: {
    label: "Connecting…",
    dotClass: "bg-amber-400 animate-pulse",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  reconnecting: {
    label: "Reconnecting…",
    dotClass: "bg-amber-500 animate-pulse",
    textClass: "text-amber-700 dark:text-amber-300",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-slate-400",
    textClass: "text-slate-500 dark:text-slate-400",
  },
  disconnected: {
    label: "Disconnected",
    dotClass: "bg-slate-300",
    textClass: "text-slate-400 dark:text-slate-500",
  },
};

export function ConnectionStatus({ state, className }: Props) {
  const { label, dotClass, textClass } = CONFIG[state];

  return (
    <span
      data-testid="connection-status"
      data-state={state}
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      title={`Realtime: ${label}`}
    >
      <span
        className={cn("size-1.5 rounded-full", dotClass)}
        aria-hidden="true"
      />
      <span className={textClass}>{label}</span>
    </span>
  );
}
