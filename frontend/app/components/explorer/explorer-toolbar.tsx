import { Badge } from "@flowconsole/ui/components/ui/badge";
import { Button } from "@flowconsole/ui/components/ui/button";
import { useTranslation } from "react-i18next";

import { ALL_ELEMENT_SOURCES } from "@/lib/api/view-models";
import type { ElementSource } from "@/lib/api/view-models";

/** Sources representing the model / planned architecture. */
export const PRESET_MODEL: ElementSource[] = ["Git", "Import"];

/** Sources representing code / observed state. */
export const PRESET_CODE: ElementSource[] = [
  "CodeScan",
  "InfraScan",
  "Observability",
];

type Preset = "all" | "model" | "code" | "custom";

function detectPreset(activeSources: Set<ElementSource>): Preset {
  if (activeSources.size === ALL_ELEMENT_SOURCES.length) return "all";
  const matches = (presetSources: ElementSource[]) =>
    activeSources.size === presetSources.length &&
    presetSources.every((s) => activeSources.has(s));
  if (matches(PRESET_MODEL)) return "model";
  if (matches(PRESET_CODE)) return "code";
  return "custom";
}

interface ExplorerToolbarProps {
  activeSources: Set<ElementSource>;
  /** Set to a specific source list, or null to select all sources. */
  onSetSources: (sources: ElementSource[] | null) => void;
  elementCount: number;
  relationshipCount: number;
}

export function ExplorerToolbar({
  activeSources,
  onSetSources,
  elementCount,
  relationshipCount,
}: ExplorerToolbarProps) {
  const { t } = useTranslation("explorer");
  const activePreset = detectPreset(activeSources);

  return (
    <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
      {/* Source filter presets */}
      <div className="flex items-center gap-1">
        <Button
          variant={activePreset === "all" ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={() => onSetSources(null)}
          data-testid="preset-all"
          aria-pressed={activePreset === "all"}
        >
          {t("presetAll")}
        </Button>
        <Button
          variant={activePreset === "model" ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={() => onSetSources(PRESET_MODEL)}
          data-testid="preset-model"
          aria-pressed={activePreset === "model"}
        >
          {t("presetModel")}
        </Button>
        <Button
          variant={activePreset === "code" ? "default" : "outline"}
          size="sm"
          className={
            activePreset === "code"
              ? "h-7 bg-green-600 px-2 text-[11px] text-white hover:bg-green-700"
              : "h-7 border-green-600 px-2 text-[11px] text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
          }
          onClick={() => onSetSources(PRESET_CODE)}
          data-testid="preset-code"
          aria-pressed={activePreset === "code"}
        >
          {t("presetCode")}
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="text-[11px]">
          {t("elementCount", { count: elementCount })}
        </Badge>
        <Badge variant="outline" className="text-[11px]">
          {t("relationshipCount", { count: relationshipCount })}
        </Badge>
      </div>
    </div>
  );
}
