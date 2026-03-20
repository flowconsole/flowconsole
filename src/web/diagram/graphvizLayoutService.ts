/* eslint-disable @typescript-eslint/no-explicit-any */
import graphviz from 'graphviz-wasm';
import { Position } from '@xyflow/react';
import type { ArchitectureDiagramModel, ArchitectureNode, ArchitectureEdge, AutoLayoutConfig } from './types';
import { defaultAutoLayoutConfig } from './types';

const DPI = 72; // LikeC4-compatible: Graphviz native 72 DPI (1 point = 1 pixel)
const GRAPH_CLUSTER_SPACE = 50.1; // px, same as GraphClusterSpace
const DEFAULT_NODESEP = 110;
const DEFAULT_RANKSEP = 120;
const DEFAULT_PAD = 15;
const CLUSTER_MARGIN = 36;
const CLUSTER_MARGIN_MULTI = 40; // LikeC4 pattern: 40px for clusters with multiple children
const CLUSTER_MARGIN_SINGLE = 32; // LikeC4 pattern: 32px for clusters with single child
const CONTENT_PADDING = 20;

function escapeLabel(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function pxToInch(px: number) {
  return px / DPI;
}

/** Graphviz points to pixels. At DPI=72, 1 point = 1 pixel (identity). */
const pointToPx = (pt: number) => pt;

function inchToPx(inch: number) {
  return inch * DPI;
}

/** Sanitize an ID for use as a Graphviz cluster identifier. @internal Exported for testing */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Shape-specific base dimensions (width, height in px) */
const SHAPE_BASE_SIZES: Record<string, { width: number; height: number }> = {
  person: { width: 180, height: 200 },
  database: { width: 200, height: 160 },
  queue: { width: 240, height: 130 },
  storage: { width: 200, height: 140 },
  service: { width: 240, height: 120 },
  boundary: { width: 280, height: 140 },
  container: { width: 280, height: 140 },
};
const DEFAULT_BASE_SIZE = { width: 240, height: 120 };

/** Extra px added when an icon is present */
const ICON_WIDTH_EXTRA = 36;
const ICON_HEIGHT_EXTRA = 24;

/** Extra padding for special shapes (LikeC4 pattern: queue, mobile get extra) */
const SHAPE_EXTRA_PADDING: Record<string, { width: number; height: number }> = {
  queue: { width: 20, height: 10 },
  person: { width: 0, height: 30 },
  database: { width: 0, height: 20 },
  storage: { width: 10, height: 10 },
};

/** LikeC4 pattern: character limits based on node width category (xs/sm=30, md=40, lg/xl=55) */
function getCharLimit(width: number): number {
  if (width <= 180) return 30;
  if (width <= 240) return 40;
  return 55;
}

/** @internal Exported for testing */
export function estimateSize(
  node: ArchitectureDiagramModel['nodes'][number],
  options?: { allowStyledSize?: boolean }
) {
  const allowStyledSize = options?.allowStyledSize ?? true;
  const data = node.data;
  const title = 'title' in data ? data.title ?? '' : '';
  const subtitle = data?.subtitle ?? '';
  const desc = data?.description ?? '';
  const technology = (data as any)?.technology ?? '';
  const tags = Array.isArray(data?.tags) ? (data?.tags as string[]) : [];
  const badge = data?.badge ?? '';

  // Determine shape from node data
  const shape = ('shape' in data && data.shape) ? String(data.shape) : (node.type === 'container' ? 'container' : 'service');
  const baseSize = SHAPE_BASE_SIZES[shape] ?? DEFAULT_BASE_SIZE;

  // Start from styled/node width or shape-specific base
  const styledWidth = (allowStyledSize && typeof node.style?.width === 'number' && node.style.width) || node.width;
  let width = styledWidth || baseSize.width;
  let height = baseSize.height;

  // Icon awareness: left/right icons add width, top/bottom icons add height
  const hasIcon = 'icon' in data && !!data.icon;
  if (hasIcon) {
    width += ICON_WIDTH_EXTRA;
    height += ICON_HEIGHT_EXTRA;
  }

  // Text wrapping estimation with size-dependent character limits
  const charLimit = getCharLimit(width);
  const lineHeight = 18;

  const titleLines = title ? Math.ceil(title.length / charLimit) : 0;
  const subtitleLines = subtitle ? Math.ceil(subtitle.length / charLimit) : 0;
  const descLines = desc ? Math.ceil(desc.length / charLimit) : 0;
  const techLines = technology ? Math.ceil(technology.length / charLimit) : 0;
  const tagsLines = tags.length ? Math.ceil(tags.length / 3) : 0;

  // Text width consideration
  const titleWidth = title ? Math.min(title.length, charLimit) * 8 : 0;
  const subtitleWidth = subtitle ? Math.min(subtitle.length, charLimit) * 7 : 0;
  const badgeWidth = badge ? Math.max(String(badge).length * 7 + 32, 80) : 0;
  const tagsWidth = tags.length ? Math.max(tags.join(',').length * 5, tags.length * 60) : 0;

  width = Math.max(width, titleWidth + (hasIcon ? ICON_WIDTH_EXTRA : 0), subtitleWidth, tagsWidth, badgeWidth) + CONTENT_PADDING;

  // Height from text content (title is included in base height, so subtract 1)
  const extraTextLines = Math.max(0, titleLines - 1) + subtitleLines + descLines + techLines + tagsLines;
  height += extraTextLines * lineHeight;

  // Badge adds some height
  if (badge) {
    height += lineHeight;
  }

  // Special shape padding (LikeC4 pattern)
  const extraPad = SHAPE_EXTRA_PADDING[shape];
  if (extraPad) {
    width += extraPad.width;
    height += extraPad.height;
  }

  return { width, height };
}

/**
 * Find the first leaf node (non-cluster) inside a cluster, recursing into sub-clusters.
 * LikeC4 pattern: compound edges route through a leaf node with lhead/ltail.
 */
function findLeafNode(
  id: string,
  childrenByParent: Map<string | undefined, string[]>,
  nodeById: Map<string, ArchitectureDiagramModel['nodes'][number]>
): string | undefined {
  const children = childrenByParent.get(id);
  if (!children?.length) return undefined;
  for (const childId of children) {
    const child = nodeById.get(childId);
    if (!child) continue;
    const childChildren = childrenByParent.get(childId)?.length ?? 0;
    const isCluster = child.type === 'container' && childChildren > 0;
    if (!isCluster) return childId;
    // Recurse into sub-cluster
    const leaf = findLeafNode(childId, childrenByParent, nodeById);
    if (leaf) return leaf;
  }
  return undefined;
}

/**
 * Resolve an edge endpoint for compound edge routing.
 * If the endpoint is a cluster, returns the leaf node to physically connect to
 * and the cluster name for lhead/ltail.
 * @internal Exported for testing
 */
export function edgeEndpoint(
  id: string,
  childrenByParent: Map<string | undefined, string[]>,
  nodeById: Map<string, ArchitectureDiagramModel['nodes'][number]>,
  toClusterName: (id: string) => string
): { physicalNode: string; clusterAttr?: string } {
  const node = nodeById.get(id);
  if (!node) return { physicalNode: id };
  const childCount = childrenByParent.get(id)?.length ?? 0;
  const isCluster = node.type === 'container' && childCount > 0;
  if (!isCluster) return { physicalNode: id };

  const leaf = findLeafNode(id, childrenByParent, nodeById);
  if (!leaf) return { physicalNode: id };

  return {
    physicalNode: leaf,
    clusterAttr: `cluster_${toClusterName(id)}`,
  };
}

/**
 * Get the ancestor chain from a node to its root.
 * Returns [id, parentId, grandparentId, ...]
 */
function getAncestorChain(
  id: string,
  nodeById: Map<string, ArchitectureDiagramModel['nodes'][number]>
): string[] {
  const chain: string[] = [id];
  let current = nodeById.get(id);
  while (current?.parentId) {
    chain.push(current.parentId);
    current = nodeById.get(current.parentId);
  }
  return chain;
}

/**
 * Compute hierarchy distance between two nodes via their lowest common ancestor.
 * LikeC4 pattern: count hops through LCA in the parent tree.
 * @internal Exported for testing
 */
export function hierarchyDistance(
  a: string,
  b: string,
  nodeById: Map<string, ArchitectureDiagramModel['nodes'][number]>
): number {
  if (a === b) return 0;
  const chainA = getAncestorChain(a, nodeById);
  const chainB = getAncestorChain(b, nodeById);
  const setA = new Set(chainA);
  let lcaIndexB = -1;
  for (let i = 0; i < chainB.length; i++) {
    if (setA.has(chainB[i])) {
      lcaIndexB = i;
      break;
    }
  }
  if (lcaIndexB === -1) return chainA.length + chainB.length;
  const lca = chainB[lcaIndexB];
  const lcaIndexA = chainA.indexOf(lca);
  return lcaIndexA + lcaIndexB;
}

/**
 * Compute nesting depth of a node (0 = top-level, 1 = inside one cluster, etc.)
 */
function computeDepth(
  id: string,
  nodeById: Map<string, ArchitectureDiagramModel['nodes'][number]>
): number {
  let depth = 0;
  let current = nodeById.get(id);
  while (current?.parentId) {
    depth++;
    current = nodeById.get(current.parentId);
  }
  return depth;
}

/**
 * LikeC4 pattern: depth-based cluster colors.
 * Returns fillcolor and border color adjusted by nesting depth.
 * Deeper clusters get slightly lighter fill and slightly brighter border.
 * @internal Exported for testing
 */
export function clusterColorsByDepth(depth: number): { fillcolor: string; color: string } {
  // Base: fillcolor=#0f1625, color=#1f2a3d
  // Lighten fillcolor and color as depth increases
  const baseFillR = 0x0f, baseFillG = 0x16, baseFillB = 0x25;
  const baseColorR = 0x1f, baseColorG = 0x2a, baseColorB = 0x3d;
  const step = 8; // lightness step per depth level
  const clampC = (v: number) => Math.min(255, v);
  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(c => clampC(c).toString(16).padStart(2, '0')).join('');
  const fillcolor = toHex(
    baseFillR + depth * step,
    baseFillG + depth * step,
    baseFillB + depth * step
  );
  const color = toHex(
    baseColorR + depth * step,
    baseColorG + depth * step,
    baseColorB + depth * step
  );
  return { fillcolor, color };
}

/**
 * LikeC4 pattern: assign group attributes to nodes within clusters.
 * For clusters with 2-8 internal edges, assigns `group` attribute to
 * source and target nodes so Graphviz co-locates related nodes.
 * Max 4 groups per cluster.
 * @internal Exported for testing
 */
export function assignGroups(
  edges: ArchitectureDiagramModel['edges'],
  nodeById: Map<string, ArchitectureDiagramModel['nodes'][number]>
): Map<string, string> {
  const nodeGroups = new Map<string, string>();

  // Collect internal edges per container
  const edgesByContainer = new Map<string, { source: string; target: string }[]>();
  for (const edge of edges) {
    const sn = nodeById.get(edge.source);
    const tn = nodeById.get(edge.target);
    if (sn?.parentId && sn.parentId === tn?.parentId) {
      const list = edgesByContainer.get(sn.parentId) ?? [];
      list.push({ source: edge.source, target: edge.target });
      edgesByContainer.set(sn.parentId, list);
    }
  }

  for (const [containerId, internalEdges] of edgesByContainer) {
    if (internalEdges.length < 2 || internalEdges.length > 8) continue;

    // Build connected components using union-find for grouping
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const union = (a: string, b: string) => {
      parent.set(find(a), find(b));
    };

    for (const { source, target } of internalEdges) {
      union(source, target);
    }

    // Collect groups
    const groups = new Map<string, string[]>();
    const allNodes = new Set<string>();
    for (const { source, target } of internalEdges) {
      allNodes.add(source);
      allNodes.add(target);
    }
    for (const nodeId of allNodes) {
      const root = find(nodeId);
      const list = groups.get(root) ?? [];
      list.push(nodeId);
      groups.set(root, list);
    }

    // Assign group names (max 4 groups per cluster)
    let groupIdx = 0;
    for (const [, members] of groups) {
      if (groupIdx >= 4) break;
      const groupName = `${containerId}_g${groupIdx}`;
      for (const nodeId of members) {
        nodeGroups.set(nodeId, groupName);
      }
      groupIdx++;
    }
  }

  return nodeGroups;
}

/** @internal Exported for testing */
export function buildDot(model: ArchitectureDiagramModel, config: AutoLayoutConfig) {
  const lines: string[] = [];
  const direction = config.direction ?? defaultAutoLayoutConfig.direction;
  const nodeSep = config.nodeSep ?? DEFAULT_NODESEP;
  const rankSep = config.rankSep ?? DEFAULT_RANKSEP;
  const isHorizontal = direction === 'LR' || direction === 'RL';

  // LikeC4 pattern: labeljust/labelloc depend on direction
  const labeljust = isHorizontal ? 'l' : 'c';
  const labelloc = 't';

  lines.push('digraph G {');
  lines.push(
    `  graph [layout=dot, rankdir=${direction}, compound=true, splines=spline, outputorder=nodesfirst, overlap=false, TBbalance=min, newrank=true, clusterrank=global, labeljust=${labeljust}, labelloc=${labelloc}, sep=0.5, esep=0.3, nodesep=${pxToInch(
      nodeSep
    ).toFixed(3)}, ranksep=${pxToInch(rankSep).toFixed(3)}, pad=${pxToInch(
      DEFAULT_PAD
    ).toFixed(3)}, margin=${pxToInch(GRAPH_CLUSTER_SPACE + CLUSTER_MARGIN).toFixed(3)}, fontname="Arial", fontsize=14]`
  );
  lines.push(
    '  node [shape=rect, style="rounded,filled", fillcolor="#0f1625", color="#1f2a3d", penwidth=0, fontname="Arial", fontsize=14];'
  );
  lines.push('  edge [color="#3b82f6", penwidth=2, arrowsize=0.75, fontname="Arial", fontsize=12];');

  // Build parent-children index
  const childrenByParent = new Map<string | undefined, string[]>();
  const nodeById = new Map<string, ArchitectureDiagramModel['nodes'][number]>();
  for (const node of model.nodes) {
    nodeById.set(node.id, node);
    const parent = node.parentId;
    const list = childrenByParent.get(parent) ?? [];
    list.push(node.id);
    childrenByParent.set(parent, list);
  }

  // Compute node groups for edge grouping (LikeC4 pattern)
  const nodeGroups = assignGroups(model.edges, nodeById);

  for (const node of model.nodes) {
    const childCount = childrenByParent.get(node.id)?.length ?? 0;
    const isCluster = (node.type === 'container') && childCount > 0;
    if (isCluster) {
      continue;
    }
    const label = 'title' in node.data ? node.data.title : node.id;
    const allowStyledSize = !(node.type === 'container' && childCount === 0);
    const { width: estW, height: estH } = estimateSize(node, { allowStyledSize });
    const widthIn = pxToInch(estW);
    const heightIn = pxToInch(estH);
    const groupAttr = nodeGroups.has(node.id) ? `, group="${nodeGroups.get(node.id)}"` : '';
    lines.push(
      `  "${node.id}" [label="${escapeLabel(label)}", width=${widthIn.toFixed(
        3
      )}, height=${heightIn.toFixed(3)}${groupAttr}];`
    );
  }

  /**
   * Determine chunk size based on child count (LikeC4 pattern):
   * >11 children → chunks of 4, >4 → chunks of 3, otherwise → chunks of 2
   */
  const getChunkSize = (count: number): number => {
    if (count > 11) return 4;
    if (count > 4) return 3;
    return 2;
  };

  const renderCluster = (id: string) => {
    const children = childrenByParent.get(id) ?? [];
    if (!children.length) return;
    const node = nodeById.get(id);
    const label = node && 'title' in node.data ? escapeLabel(node.data.title) : id;
    const clusterName = sanitizeId(id);

    // LikeC4 pattern: dynamic margin based on child count
    const clusterMargin = children.length > 1 ? CLUSTER_MARGIN_MULTI : CLUSTER_MARGIN_SINGLE;

    // LikeC4 pattern: depth-based cluster colors
    const depth = computeDepth(id, nodeById);
    const colors = clusterColorsByDepth(depth);

    lines.push(`  subgraph cluster_${clusterName} {`);
    lines.push(
      `    label="${label}"; margin=${clusterMargin}; style="rounded,filled"; color="${colors.color}"; fillcolor="${colors.fillcolor}";`
    );

    // Separate sub-clusters from leaf nodes
    const subClusterIds: string[] = [];
    const leafIds: string[] = [];
    for (const childId of children) {
      const child = nodeById.get(childId);
      if (!child) continue;
      const childHasChildren = (childrenByParent.get(childId)?.length ?? 0) > 0;
      const isContainerLike = child.type === 'container';
      if (isContainerLike && childHasChildren) {
        subClusterIds.push(childId);
      } else {
        leafIds.push(childId);
      }
    }

    // Render sub-clusters
    for (const subId of subClusterIds) {
      renderCluster(subId);
    }

    // Apply chunking to leaf nodes for balanced rank placement (LikeC4 pattern)
    if (leafIds.length > 1) {
      const chunkSize = getChunkSize(leafIds.length);
      const chunks: string[][] = [];
      for (let i = 0; i < leafIds.length; i += chunkSize) {
        chunks.push(leafIds.slice(i, i + chunkSize));
      }

      // Create rank=same subgraphs for each chunk
      const chunkHeads: string[] = [];
      chunks.forEach((chunk, idx) => {
        chunkHeads.push(chunk[0]);
        lines.push(`    subgraph chunk_${clusterName}_${idx} {`);
        lines.push('      rank=same;');
        for (const cid of chunk) {
          lines.push(`      "${cid}";`);
        }
        lines.push('    }');
      });

      // Add invisible edges between chunk head nodes for vertical alignment
      for (let i = 0; i < chunkHeads.length - 1; i++) {
        lines.push(`    "${chunkHeads[i]}" -> "${chunkHeads[i + 1]}" [style=invis];`);
      }
    } else {
      // Single or no leaf children — no chunking needed
      for (const cid of leafIds) {
        lines.push(`    "${cid}";`);
      }
    }

    lines.push('  }');
  };

  for (const node of model.nodes) {
    const childCount = childrenByParent.get(node.id)?.length ?? 0;
    const isCluster = (node.type === 'container') && childCount > 0;
    if (isCluster && !node.parentId) {
      renderCluster(node.id);
    }
  }

  // Pre-compute hierarchy distances and max distance for weight calculation (LikeC4 pattern)
  const edgeDistances = new Map<string, number>();
  let maxHierarchyDist = 0;
  for (const edge of model.edges) {
    const dist = hierarchyDistance(edge.source, edge.target, nodeById);
    edgeDistances.set(edge.id, dist);
    maxHierarchyDist = Math.max(maxHierarchyDist, dist);
  }

  // Count edges within each container for minlen optimization
  const edgesPerContainer = new Map<string, number>();
  for (const edge of model.edges) {
    const sn = nodeById.get(edge.source);
    const tn = nodeById.get(edge.target);
    if (sn?.parentId && sn.parentId === tn?.parentId) {
      edgesPerContainer.set(sn.parentId, (edgesPerContainer.get(sn.parentId) ?? 0) + 1);
    }
  }

  // Compound edge routing with weight, direction, and constraint system
  for (const edge of model.edges) {
    const src = edgeEndpoint(edge.source, childrenByParent, nodeById, sanitizeId);
    const tgt = edgeEndpoint(edge.target, childrenByParent, nodeById, sanitizeId);
    const isCompound = !!(src.clusterAttr || tgt.clusterAttr);

    const attrs: string[] = [`id="${escapeLabel(edge.id)}"`];

    // LikeC4 pattern: use xlabel for compound edges to prevent label collision with cluster border
    if (edge.data?.label) {
      const labelAttr = isCompound ? 'xlabel' : 'label';
      attrs.push(`${labelAttr}="${escapeLabel(edge.data.label)}"`);
    }

    if (src.clusterAttr) {
      attrs.push(`ltail="${src.clusterAttr}"`);
    }
    if (tgt.clusterAttr) {
      attrs.push(`lhead="${tgt.clusterAttr}"`);
    }

    // Edge weight based on hierarchy distance (LikeC4 pattern):
    // closer nodes get higher weight, pulling them into same rank
    const dist = edgeDistances.get(edge.id) ?? 0;
    if (maxHierarchyDist > 0) {
      const weight = maxHierarchyDist - dist + 1;
      attrs.push(`weight=${weight}`);
    }

    // Edge direction: dir=back for back edges, dir=both for bidirectional, dir=none for directionless
    const edgeDir = edge.data?.direction ?? 'forward';
    if (edgeDir === 'both') {
      attrs.push('dir=both');
    } else if (edgeDir === 'none') {
      attrs.push('dir=none');
    } else if (edgeDir === 'back') {
      attrs.push('dir=back');
    }

    // Constraint handling (LikeC4 pattern):
    // constraint=false for 'none' direction edges or cross-cluster with no hierarchy
    if (edgeDir === 'none') {
      attrs.push('constraint=false');
    } else {
      const chainA = getAncestorChain(edge.source, nodeById);
      const chainBSet = new Set(getAncestorChain(edge.target, nodeById));
      const hasLCA = chainA.some(id => chainBSet.has(id));
      const sNode = nodeById.get(edge.source);
      const tNode = nodeById.get(edge.target);
      if (!hasLCA && sNode?.parentId !== tNode?.parentId) {
        attrs.push('constraint=false');
      }
    }

    // minlen=0 when edge is the sole connection within a container (LikeC4 optimization)
    const srcNode = nodeById.get(edge.source);
    const tgtNode = nodeById.get(edge.target);
    if (srcNode?.parentId && srcNode.parentId === tgtNode?.parentId) {
      if ((edgesPerContainer.get(srcNode.parentId) ?? 0) === 1) {
        attrs.push('minlen=0');
      }
    }

    lines.push(`  "${src.physicalNode}" -> "${tgt.physicalNode}" [${attrs.join(', ')}];`);
  }

  lines.push('}');
  return lines.join('\n');
}

type LayoutEntry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type EdgeLayoutEntry = {
  points: { x: number; y: number }[];
  label?: { x: number; y: number };
};

type LayoutResult = {
  nodes: Map<string, LayoutEntry>;
  edges: Map<string, EdgeLayoutEntry>;
};

type AnchorData = {
  position: Position;
  offset: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function anchorFromPoint(
  point: { x: number; y: number } | undefined,
  node: LayoutEntry | undefined
): AnchorData | undefined {
  if (!point || !node || !node.width || !node.height) return undefined;
  const relX = point.x - node.x;
  const relY = point.y - node.y;
  const distances = [
    { position: Position.Left, value: Math.abs(relX) },
    { position: Position.Right, value: Math.abs(relX - node.width) },
    { position: Position.Top, value: Math.abs(relY) },
    { position: Position.Bottom, value: Math.abs(relY - node.height) },
  ];
  const nearest = distances.reduce((best, current) =>
    current.value < best.value ? current : best
  );
  let offset = 0.5;
  switch (nearest.position) {
    case Position.Left:
    case Position.Right:
      offset = clamp(node.height ? relY / node.height : 0.5, 0, 1);
      break;
    case Position.Top:
    case Position.Bottom:
      offset = clamp(node.width ? relX / node.width : 0.5, 0, 1);
      break;
  }
  return {
    position: nearest.position,
    offset,
  };
}

/**
 * Recursively extract all objects (nodes and clusters) from Graphviz JSON,
 * handling both flat and potentially nested structures.
 */
function extractAllObjects(json: any): any[] {
  const result: any[] = [];
  const queue: any[] = [...(json?.objects ?? [])];
  while (queue.length > 0) {
    const obj = queue.shift();
    if (!obj || typeof obj !== 'object') continue;
    result.push(obj);
    // Handle nested subgraph objects (non-standard but defensive)
    if (Array.isArray(obj.subgraphs)) {
      for (const sub of obj.subgraphs) {
        if (typeof sub === 'object' && sub !== null && sub.name) {
          queue.push(sub);
        }
      }
    }
    if (Array.isArray(obj.objects)) {
      queue.push(...obj.objects);
    }
  }
  return result;
}

/** @internal Exported for testing */
export function parseJsonLayout(
  json: string,
  options?: { clusterIdMap?: Map<string, string> }
): LayoutResult {
  const j = JSON.parse(json) as any;
  const nodeEntries = new Map<string, LayoutEntry>();
  const edgeEntries = new Map<string, EdgeLayoutEntry>();
  const objects = extractAllObjects(j);
  const edgeObjects: any[] = j?.edges ?? [];
  const graphBb = j.bb ? j.bb.split(',').map((p: string) => pointToPx(parseFloat(p))) : [0, 0, 0, 0];
  const graphHeight = graphBb.length === 4 ? graphBb[3] - graphBb[1] : 0;

  for (const obj of objects) {
    if (obj.name?.startsWith('cluster_')) {
      const id = obj.name.replace(/^cluster_/, '');
      if (!obj.bb) continue;
      const [x1p, y1p, x2p, y2p] = obj.bb.split(',').map((p: string) => pointToPx(parseFloat(p)));
      const width = x2p - x1p;
      const height = y2p - y1p;
      const yTop = graphHeight ? graphHeight - y2p : y1p;
      const entry = { x: x1p, y: yTop, width, height };
      nodeEntries.set(id, entry);
      // Use cluster ID mapping for robust reverse lookup
      const clusterIdMap = options?.clusterIdMap;
      const originalId = clusterIdMap?.get(id);
      if (originalId && originalId !== id) {
        nodeEntries.set(originalId, entry);
      }
      continue;
    }
    if (obj.pos && obj.width && obj.height) {
      const [px, py] = obj.pos.split(',').map((p: string) => pointToPx(parseFloat(p)));
      const w = inchToPx(parseFloat(obj.width));
      const h = inchToPx(parseFloat(obj.height));
      const cx = px;
      const cy = graphHeight ? graphHeight - py : py;
      nodeEntries.set(obj.name, { x: cx - w / 2, y: cy - h / 2, width: w, height: h });
    }
  }

  const toPoint = (x: number, y: number) => {
    const px = pointToPx(x);
    const py = pointToPx(y);
    const invY = graphHeight ? graphHeight - py : py;
    return { x: px, y: invY };
  };

  for (const e of edgeObjects) {
    if (!e.id) continue;
    let pts: { x: number; y: number }[] = [];

    const drawOps: Array<{ op?: string; points?: [number, number][] }> = Array.isArray(e._draw_)
      ? (e._draw_ as Array<{ op?: string; points?: [number, number][] }>)
      : [];
    // Collect ALL Bezier operations for multi-segment edge splines (not just first)
    const bezierOps = drawOps.filter(
      (op) => typeof op.op === 'string' && op.op.toLowerCase() === 'b' && Array.isArray(op.points)
    );
    if (bezierOps.length > 0) {
      pts = bezierOps
        .flatMap((op) => op.points as [number, number][])
        .map(([x, y]) => toPoint(x, y))
        .filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y));
    } else if (typeof e.pos === 'string') {
      const parts = e.pos.split(/\s+/);
      const coords = parts.flatMap((part: string, idx: number) => {
        if (idx === 0 && part.startsWith('e,')) {
          const rest = part.slice(2);
          return rest.length ? rest.split(',') : [];
        }
        return part.includes(',') ? part.split(',') : [part];
      });
      for (let i = 0; i + 1 < coords.length; i += 2) {
        const x = pointToPx(parseFloat(coords[i]));
        const yRaw = pointToPx(parseFloat(coords[i + 1]));
        const y = graphHeight ? graphHeight - yRaw : yRaw;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        pts.push({ x, y });
      }
    }

    let label: { x: number; y: number } | undefined;
    // Parse _ldraw_ ops for more precise label positioning (LikeC4 pattern: iterate text draw ops with font size tracking)
    const ldrawOps: any[] = Array.isArray(e._ldraw_) ? e._ldraw_ : [];
    let fontSize = 14;
    for (const op of ldrawOps) {
      if (op.op === 'F' && typeof op.size === 'number') {
        fontSize = op.size;
      }
      if (op.op === 'T' && Array.isArray(op.pt) && op.pt.length >= 2) {
        const tx = pointToPx(op.pt[0]);
        const rawTy = pointToPx(op.pt[1]);
        const ty = graphHeight ? graphHeight - rawTy : rawTy;
        // Adjust from baseline to approximate center
        label = { x: tx, y: ty - fontSize * 0.5 };
      }
    }
    // Fall back to lp (label position) if _ldraw_ didn't provide a position
    if (!label && typeof e.lp === 'string') {
      const [lx, ly] = e.lp.split(',').map((p: string) => pointToPx(parseFloat(p)));
      const y = graphHeight ? graphHeight - ly : ly;
      label = { x: lx, y };
    }
    edgeEntries.set(e.id as string, { points: pts, label });
  }

  return { nodes: nodeEntries, edges: edgeEntries };
}

function applyLayout(model: ArchitectureDiagramModel, layout: LayoutResult): ArchitectureDiagramModel {
  const nodes: ArchitectureNode[] = model.nodes.map((node) => {
    const l = layout.nodes.get(node.id);
    if (!l) return node;
    let position = { x: l.x, y: l.y };

    if (node.parentId) {
      const parentLayout = layout.nodes.get(node.parentId);
      if (parentLayout) {
        position = { x: l.x - parentLayout.x, y: l.y - parentLayout.y };
      }
    }

    return {
      ...node,
      position,
      style: { ...node.style, width: l.width, height: node.type === "container" ? l.height + 20 : l.height },
    };
  });

  const edges: ArchitectureEdge[] = model.edges.map((edge) => {
    const eLayout = layout.edges.get(edge.id);
    if (!eLayout || !eLayout.points.length) return edge;
    const sourceLayout = layout.nodes.get(edge.source);
    const targetLayout = layout.nodes.get(edge.target);
    const sourceAnchor = anchorFromPoint(eLayout.points[0], sourceLayout);
    const targetAnchor = anchorFromPoint(
      eLayout.points[eLayout.points.length - 1],
      targetLayout
    );
    return {
      ...edge,
      data: {
        ...edge.data,
        layoutPoints: eLayout.points,
        labelPos: eLayout.label,
        ...(sourceAnchor ? { sourceAnchor } : {}),
        ...(targetAnchor ? { targetAnchor } : {}),
      },
    };
  });

  return { ...model, nodes, edges };
}

let wasmPromise: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmPromise) {
    wasmPromise = graphviz.loadWASM().catch((err) => {
      wasmPromise = null;
      throw err;
    });
  }
  await wasmPromise;
}

export async function layoutWithGraphviz(
  model: ArchitectureDiagramModel,
  config?: AutoLayoutConfig
): Promise<ArchitectureDiagramModel> {
  await ensureWasm();
  const effectiveConfig = config ?? model.autoLayoutConfig ?? defaultAutoLayoutConfig;
  const dot = buildDot(model, effectiveConfig);
  const json = graphviz.layout(dot, 'json', 'dot');
  // Build cluster ID mapping for robust reverse lookup during parsing
  const clusterIdMap = new Map<string, string>();
  for (const node of model.nodes) {
    const sanitized = sanitizeId(node.id);
    clusterIdMap.set(sanitized, node.id);
  }
  const parsed = parseJsonLayout(json, { clusterIdMap });
  return applyLayout(model, parsed);
}
