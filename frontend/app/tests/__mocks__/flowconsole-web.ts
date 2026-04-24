/**
 * Stub for @flowconsole/web used in Vitest tests.
 *
 * The real package requires a built dist/ that is only available when the OSS
 * monorepo is fully built. This stub provides the minimal shape so that unit
 * tests can import modules that depend on @flowconsole/web without needing the
 * real compiled output.
 *
 * Individual tests can override specific exports with vi.mock().
 */
import React from "react";
import { vi } from "vitest";

export const ArchitectureDiagram = (props: { model?: { nodes?: unknown[] } }) =>
  React.createElement("div", { "data-testid": "architecture-diagram" });

export const architectureNodeTypes = {};
export const architectureEdgeTypes = {};

export const DEFAULT_LANGUAGE = {
  id: "typescript",
  label: "TypeScript",
  monacoLanguage: "typescript",
  samples: [],
  defaultSampleId: "",
  monacoSetup: undefined,
  evaluate: vi.fn().mockResolvedValue({ ok: true, model: { nodes: [], edges: [] } }),
};

export const findLanguage = vi.fn().mockReturnValue(DEFAULT_LANGUAGE);

export type CodeSample = {
  id: string;
  title: string;
  description?: string;
  code: string;
};
