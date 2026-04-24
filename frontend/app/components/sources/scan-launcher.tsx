
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Loader2, Code2, Server } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@flowconsole/ui/components/ui/button";
import { Label } from "@flowconsole/ui/components/ui/label";
import { Input } from "@flowconsole/ui/components/ui/input";
import type {
  LaunchableScanType,
  UiScannerType,
  ScanLauncherFormState,
} from "./scan-types";
import {
  SUPPORTED_CODE_SCANNERS_V1,
  SUPPORTED_INFRA_SCANNERS_V1,
} from "./scan-types";

interface ScanLauncherProps {
  onLaunch: (state: ScanLauncherFormState) => Promise<void>;
  isRunning?: boolean;
  className?: string;
}

const SCAN_TYPE_OPTIONS: { value: LaunchableScanType; labelKey: string }[] = [
  { value: "CodeScan", labelKey: "scanTypeCode" },
  { value: "InfraScan", labelKey: "scanTypeInfra" },
];

function scannersForType(scanType: LaunchableScanType): readonly UiScannerType[] {
  return scanType === "CodeScan"
    ? SUPPORTED_CODE_SCANNERS_V1
    : SUPPORTED_INFRA_SCANNERS_V1;
}

/**
 * Launcher form for triggering code or infra scans on a model.
 * V1: supports only csharp (code) and helm (infra).
 */
export function ScanLauncher({ onLaunch, isRunning = false, className }: ScanLauncherProps) {
  const { t } = useTranslation("scans");

  const [scanType, setScanType] = useState<LaunchableScanType>("CodeScan");
  const [scannerType, setScannerType] = useState<UiScannerType>("csharp");
  const [path, setPath] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const handleScanTypeChange = (type: LaunchableScanType) => {
    setScanType(type);
    const scanners = scannersForType(type);
    setScannerType(scanners[0]);
  };

  const handleLaunch = async () => {
    if (launching || isRunning) return;
    setLaunching(true);
    setLaunchError(null);

    try {
      await onLaunch({
        scanType,
        scannerType,
        path: path.trim(),
      });
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : t("launchError"));
    } finally {
      setLaunching(false);
    }
  };

  const availableScanners = scannersForType(scanType);
  const isDisabled = launching || isRunning;

  return (
    <div className={cn("space-y-4", className)} data-testid="scan-launcher">
      {/* Scan type selector */}
      <div className="space-y-1.5">
        <Label className="text-sm">{t("scanType")}</Label>
        <div className="flex gap-2" data-testid="scan-type-selector">
          {SCAN_TYPE_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleScanTypeChange(value)}
              disabled={isDisabled}
              data-testid={`scan-type-${value}`}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                scanType === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                isDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              {value === "CodeScan" ? (
                <Code2 className="size-3.5" aria-hidden />
              ) : (
                <Server className="size-3.5" aria-hidden />
              )}
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Scanner type selector */}
      <div className="space-y-1.5">
        <Label className="text-sm">{t("scannerType")}</Label>
        <div className="flex flex-wrap gap-2" data-testid="scanner-type-selector">
          {availableScanners.map((scanner) => (
            <button
              key={scanner}
              type="button"
              onClick={() => setScannerType(scanner)}
              disabled={isDisabled}
              data-testid={`scanner-type-${scanner}`}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-mono transition-colors",
                scannerType === scanner
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                isDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              {scanner}
            </button>
          ))}
        </div>
      </div>

      {/* Path */}
      <div className="space-y-1.5">
        <Label htmlFor="scan-path" className="text-sm">
          {t("scanPath")}
        </Label>
        <Input
          id="scan-path"
          placeholder={t("scanPathPlaceholder")}
          value={path}
          onChange={(e) => setPath(e.target.value)}
          disabled={isDisabled}
          data-testid="scan-path"
        />
        <p className="text-xs text-muted-foreground">{t("scanPathHint")}</p>
      </div>

      {/* Error */}
      {launchError && (
        <p className="text-sm text-destructive" data-testid="scan-launch-error">
          {launchError}
        </p>
      )}

      {/* Stale/locked warning */}
      {isRunning && (
        <p className="text-sm text-amber-600 dark:text-amber-400" data-testid="scan-locked-message">
          {t("scanLockedMessage")}
        </p>
      )}

      {/* Launch button */}
      <Button
        type="button"
        size="sm"
        onClick={handleLaunch}
        disabled={isDisabled}
        data-testid="scan-launch-button"
      >
        {launching ? (
          <>
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            {t("launching")}
          </>
        ) : (
          <>
            <Play className="mr-1.5 size-3.5" />
            {t("launchScan")}
          </>
        )}
      </Button>
    </div>
  );
}
