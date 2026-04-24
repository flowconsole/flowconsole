import { describe, it, expect } from "vitest";
import { toCreateScanRequest } from "@/lib/api/rtk/lifecycle-api";
import type { ScanLauncherFormState } from "@/components/sources/scan-types";

describe("toCreateScanRequest", () => {
  it("builds code scan request with config.language", () => {
    const state: ScanLauncherFormState = {
      scanType: "CodeScan",
      scannerType: "csharp",
      path: "src/",
    };
    const result = toCreateScanRequest(state);
    expect(result.scanType).toBe("CodeScan");
    expect(result.config).toEqual({ language: "csharp", path: "src/" });
  });

  it("builds infra scan request with config.scannerType", () => {
    const state: ScanLauncherFormState = {
      scanType: "InfraScan",
      scannerType: "helm",
      path: "charts/myapp",
    };
    const result = toCreateScanRequest(state);
    expect(result.scanType).toBe("InfraScan");
    expect(result.config).toEqual({ scannerType: "helm", path: "charts/myapp" });
  });

  it("does not include config.scanner", () => {
    const state: ScanLauncherFormState = {
      scanType: "CodeScan",
      scannerType: "csharp",
      path: "",
    };
    const result = toCreateScanRequest(state);
    expect(result.config).not.toHaveProperty("scanner");
  });

  it("does not include config.scope", () => {
    const state: ScanLauncherFormState = {
      scanType: "InfraScan",
      scannerType: "helm",
      path: "charts/",
    };
    const result = toCreateScanRequest(state);
    expect(result.config).not.toHaveProperty("scope");
  });

  it("includes path in config even when empty", () => {
    const state: ScanLauncherFormState = {
      scanType: "CodeScan",
      scannerType: "csharp",
      path: "",
    };
    const result = toCreateScanRequest(state);
    expect(result.config).toHaveProperty("path", "");
    expect(result.config).toEqual({ language: "csharp", path: "" });
  });
});
