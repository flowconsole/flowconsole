import type { ArchitectureDiagramModel, ArchitectureEdge, ArchitectureNode, AutoLayoutConfig } from '../types';
import { analyzeGraph } from './graphAnalyzer';
import { architectureNotation } from './notation/architectureNotation';
import { rankSemantically } from './semanticRanker';
import { selectStrategy } from './strategySelector';
import { sizeRankedGraph } from './shapeSizing';
import { positionNodes } from './positioningEngine';
import { routeEdges } from './edgeRouter';
import { refineLayout } from './layoutRefiner';
import { computeQualityScore, qualityScoreValue } from './qualityScore';
import type { LayoutDirection, LayoutQualityScore, LayoutStrategyType, RelayoutReason } from './types';
import { logRelayoutRun, toRelayoutReason } from './debug/relayoutLogger';

export type LayoutRunDiagnostics = {
  cacheKey: string;
  cacheHit: boolean;
  reason: RelayoutReason;
  strategy: LayoutStrategyType;
  direction: LayoutDirection;
  notation: string;
  preset: string;
  engine: 'elk' | 'graphviz' | 'analytical';
  fallbackEngineUsed: boolean;
  qualityScore: LayoutQualityScore;
  qualityValue: number;
};

type LayoutPipelineOptions = {
  scopeId?: string;
  cacheKey?: string;
  modelIdentity?: string;
  reason?: RelayoutReason;
  forceRelayout?: boolean;
  onDiagnostics?: (diagnostics: LayoutRunDiagnostics) => void;
  onCacheStatus?: (cacheHit: boolean) => void;
};

type CacheEntry = {
  model: ArchitectureDiagramModel;
  diagnostics: LayoutRunDiagnostics;
};

const MAX_CACHE_ENTRIES = 10;
const layoutCache = new Map<string, CacheEntry>();
let lastModelHash = '';
let lastDirection = '';
let lastNotation = '';
let lastPreset = '';
let lastDiagnostics: LayoutRunDiagnostics | undefined;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${key}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashModel(model: ArchitectureDiagramModel) {
  return stableStringify({
    nodes: model.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      parentId: node.parentId,
      data: node.data,
    })),
    edges: model.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data,
    })),
    flows: model.flows ?? [],
  });
}

function cloneModel(model: ArchitectureDiagramModel): ArchitectureDiagramModel {
  return {
    nodes: model.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data },
      style: { ...node.style },
    })) as ArchitectureNode[],
    edges: model.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        layoutPoints: edge.data?.layoutPoints?.map((point) => ({ ...point })),
        labelPos: edge.data?.labelPos ? { ...edge.data.labelPos } : undefined,
        sourceAnchor: edge.data?.sourceAnchor ? { ...edge.data.sourceAnchor } : undefined,
        targetAnchor: edge.data?.targetAnchor ? { ...edge.data.targetAnchor } : undefined,
      },
    })) as ArchitectureEdge[],
    flows: model.flows?.map((flow) => ({
      ...flow,
      steps: flow.steps.map((step) => ({ ...step })),
    })),
  };
}

function makeCacheKey(
  modelHash: string,
  scopeId: string | undefined,
  direction: string,
  notation: string,
  preset: string
) {
  return stableStringify({ scopeId, modelHash, direction, notation, preset });
}

function cacheGet(key: string) {
  const hit = layoutCache.get(key);
  if (!hit) {
    return undefined;
  }
  layoutCache.delete(key);
  layoutCache.set(key, hit);
  return {
    model: cloneModel(hit.model),
    diagnostics: { ...hit.diagnostics, qualityScore: { ...hit.diagnostics.qualityScore } },
  };
}

function cacheSet(key: string, value: CacheEntry) {
  layoutCache.delete(key);
  layoutCache.set(key, {
    model: cloneModel(value.model),
    diagnostics: { ...value.diagnostics, qualityScore: { ...value.diagnostics.qualityScore } },
  });
  while (layoutCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = layoutCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    layoutCache.delete(oldestKey);
  }
}

function invalidateAllCache() {
  layoutCache.clear();
}

function toDiagramModel(
  originalModel: ArchitectureDiagramModel,
  graph: ReturnType<typeof refineLayout>
): ArchitectureDiagramModel {
  return {
    nodes: graph.nodes.map((node) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { absolutePosition: _absolutePosition, size, layout: _layout, ...baseNode } = node;
      return {
        ...baseNode,
        position: { ...node.position },
        width: size.width,
        height: size.height,
        style: {
          ...node.style,
          width: size.width,
          height: size.height,
        },
      };
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    edges: graph.edges.map(({ routing: _routing, ...edge }) => ({
      ...edge,
      data: { ...edge.data },
    })),
    flows: originalModel.flows?.map((flow) => ({
      ...flow,
      steps: flow.steps.map((step) => ({ ...step })),
    })),
  };
}

export async function layoutPipeline(
  model: ArchitectureDiagramModel,
  config: AutoLayoutConfig = {},
  options: LayoutPipelineOptions = {}
): Promise<ArchitectureDiagramModel> {
  const notation = architectureNotation;
  const notationId = config.notation ?? notation.notationId;
  const preset = config.preset ?? notation.defaultPreset;
  const modelHash = hashModel(model);
  const modelIdentity = options.modelIdentity ?? modelHash;

  if (
    lastModelHash &&
    (lastModelHash !== modelIdentity ||
      lastDirection !== (config.direction ?? '') ||
      lastNotation !== notationId ||
      lastPreset !== preset)
  ) {
    invalidateAllCache();
  }

  lastModelHash = modelIdentity;
  lastDirection = config.direction ?? '';
  lastNotation = notationId;
  lastPreset = preset;

  const profile = analyzeGraph(model);
  const strategy = selectStrategy(profile, config, notation);
  const cacheKey =
    options.cacheKey ?? makeCacheKey(modelHash, options.scopeId, strategy.direction, notationId, preset);

  if (!options.forceRelayout) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      const diagnostics = {
        ...cached.diagnostics,
        cacheHit: true,
        reason: toRelayoutReason(options.reason ?? cached.diagnostics.reason),
      };
      lastDiagnostics = diagnostics;
      options.onDiagnostics?.(diagnostics);
      options.onCacheStatus?.(true);
      logRelayoutRun(diagnostics, config.debug);
      return cached.model;
    }
  }

  const ranked = rankSemantically(model, profile, strategy, notation, {
    ...config,
    notation: notationId,
    preset,
  });
  const sized = sizeRankedGraph(ranked, notation);
  const positioned = await positionNodes(sized, {
    elkFactory: config.engine === 'graphviz' ? async () => undefined : undefined,
    forceGraphviz: config.engine === 'graphviz',
  });
  const routed = routeEdges(positioned);
  const refined = refineLayout(routed);
  const qualityScore = computeQualityScore(refined);
  const qualityValue = qualityScoreValue(qualityScore, refined.nodes.length);
  const result = toDiagramModel(model, refined);
  const diagnostics: LayoutRunDiagnostics = {
    cacheKey,
    cacheHit: false,
    reason: toRelayoutReason(options.reason),
    strategy: strategy.type,
    direction: strategy.direction,
    notation: notationId,
    preset,
    engine: positioned.engine,
    fallbackEngineUsed: positioned.usedFallback,
    qualityScore,
    qualityValue,
  };

  cacheSet(cacheKey, { model: result, diagnostics });
  lastDiagnostics = diagnostics;
  options.onDiagnostics?.(diagnostics);
  options.onCacheStatus?.(false);
  logRelayoutRun(diagnostics, config.debug);
  return cloneModel(result);
}

export function getLastLayoutDiagnostics() {
  return lastDiagnostics;
}

export function clearLayoutPipelineCache() {
  invalidateAllCache();
  lastDiagnostics = undefined;
}
