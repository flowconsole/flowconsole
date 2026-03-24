import type { ArchitectureDiagramModel, ArchitectureEdge, ArchitectureNode, AutoLayoutConfig } from '../types';
import { analyzeGraph } from './graphAnalyzer';
import { architectureNotation } from './notation/architectureNotation';
import { rankSemantically } from './semanticRanker';
import { selectLayoutPlan, selectStrategy } from './strategySelector';
import { buildConstraints } from './constraintBuilder';
import { sizeRankedGraph } from './shapeSizing';
import { positionNodes } from './positioningEngine';
import { routeEdges } from './edgeRouter';
import { refineWithConstraints } from './constraintRefiner';
import { computeQualityScore, qualityScoreValue } from './qualityScore';
import { isQualityAcceptable } from './qualityScore';
import type { LayoutDirection, LayoutQualityScore, LayoutStrategyType, RelayoutReason } from './types';
import { logRelayoutRun, toRelayoutReason } from './debug/relayoutLogger';
import { stableStringify } from './utils';

export type LayoutRunDiagnostics = {
  cacheKey: string;
  cacheHit: boolean;
  reason: RelayoutReason;
  strategy: LayoutStrategyType;
  direction: LayoutDirection;
  notation: string;
  preset: string;
  engine: 'elk' | 'graphviz' | 'radial';
  fallbackEngineUsed: boolean;
  qualityScore: LayoutQualityScore;
  qualityValue: number;
  nodeRoles?: ReadonlyMap<string, string>;
  containerOverrides?: ReadonlyMap<string, { strategy: LayoutStrategyType; direction: LayoutDirection }>;
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
  preset: string,
  engine: string
) {
  return stableStringify({ scopeId, modelHash, direction, notation, preset, engine });
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
  graph: ReturnType<typeof routeEdges>
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
    options.cacheKey ?? makeCacheKey(modelHash, options.scopeId, strategy.direction, notationId, preset, config.engine ?? 'auto');

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
  const constraints = buildConstraints(ranked, profile);
  const sized = sizeRankedGraph(ranked, notation);
  const positioned = await positionNodes(sized, {
    elkFactory: config.engine === 'graphviz' ? async () => undefined : undefined,
    forceGraphviz: config.engine === 'graphviz',
    constraints,
  });
  // Stage 6 initial: route edges for label positions (needed by cola phantom nodes)
  const initialRouted = routeEdges(positioned);
  // Stage 7: cola constraint refinement using ELK positions + semantic constraints
  const refined = refineWithConstraints(initialRouted, constraints);
  // Stage 6 again: final routing on refined positions
  const routed = routeEdges(refined);
  let qualityScore = computeQualityScore(routed);
  let qualityValue = qualityScoreValue(qualityScore, routed.nodes.length);
  let finalRouted = routed;
  let engine = positioned.engine;
  let fallbackUsed = positioned.usedFallback;

  // Quality-based fallback: if ELK+cola has hard failures, try graphviz
  if (
    !isQualityAcceptable(qualityScore, routed.nodes.length) &&
    config.engine !== 'graphviz' &&
    !positioned.usedFallback
  ) {
    try {
      const graphvizPositioned = await positionNodes(sized, { forceGraphviz: true });
      const gvInitialRouted = routeEdges(graphvizPositioned);
      const gvRefined = refineWithConstraints(gvInitialRouted, constraints);
      const gvRouted = routeEdges(gvRefined);
      const gvScore = computeQualityScore(gvRouted);
      const gvValue = qualityScoreValue(gvScore, gvRouted.nodes.length);
      if (gvValue > qualityValue) {
        finalRouted = gvRouted;
        qualityScore = gvScore;
        qualityValue = gvValue;
        engine = graphvizPositioned.engine;
        fallbackUsed = true;
      }
    } catch {
      // graphviz fallback failed — keep ELK result
    }
  }

  const result = toDiagramModel(model, finalRouted);
  const plan = selectLayoutPlan(profile, config, notation);
  const diagnostics: LayoutRunDiagnostics = {
    cacheKey,
    cacheHit: false,
    reason: toRelayoutReason(options.reason),
    strategy: strategy.type,
    direction: strategy.direction,
    notation: notationId,
    preset,
    engine,
    fallbackEngineUsed: fallbackUsed,
    qualityScore,
    qualityValue,
    nodeRoles: profile.nodeRoles,
    containerOverrides: plan.containerOverrides,
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
