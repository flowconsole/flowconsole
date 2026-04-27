import type { ArchitectureDiagramModel } from '../types';
import type { LayoutConfig } from './types';
import { estimateShapeAwareSize } from './shapeSizing';

type NodeSize = { width: number; height: number };

export function estimateNodeSize(
  node: ArchitectureDiagramModel['nodes'][number],
  config: LayoutConfig
): NodeSize {
  return estimateShapeAwareSize(node, config);
}

export type PositionMap = Map<string, { x: number; y: number; width: number; height: number }>;

/**
 * Assign x,y coordinates to each node based on layer and position within layer.
 * Centers each layer horizontally relative to the widest layer.
 */
export function assignCoordinates(
  layers: ReadonlyArray<ReadonlyArray<string>>,
  model: ArchitectureDiagramModel,
  config: LayoutConfig
): { positions: PositionMap; bounds: { width: number; height: number } } {
  const positions: PositionMap = new Map();

  // Compute sizes for all nodes
  const sizes = new Map<string, NodeSize>();
  for (const node of model.nodes) {
    sizes.set(node.id, estimateNodeSize(node, config));
  }

  const isHorizontal = config.direction === 'RIGHT';

  // Compute layer widths/heights (perpendicular to flow direction)
  const layerDimensions: Array<{ mainSize: number; crossSize: number }> = [];

  for (const layer of layers) {
    let crossSize = 0;
    let maxMain = 0;
    for (const nodeId of layer) {
      const size = sizes.get(nodeId) ?? { width: config.nodeWidth, height: config.nodeHeight };
      const nodeCross = isHorizontal ? size.height : size.width;
      const nodeMain = isHorizontal ? size.width : size.height;
      crossSize += nodeCross;
      maxMain = Math.max(maxMain, nodeMain);
    }
    crossSize += Math.max(0, layer.length - 1) * config.nodeGap;
    layerDimensions.push({ mainSize: maxMain, crossSize });
  }

  const maxCross = Math.max(0, ...layerDimensions.map((d) => d.crossSize));

  // Assign positions
  let mainOffset = config.padding;

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const dim = layerDimensions[layerIdx];
    const crossStart = config.padding + (maxCross - dim.crossSize) / 2;

    let crossOffset = crossStart;
    for (const nodeId of layer) {
      const size = sizes.get(nodeId) ?? { width: config.nodeWidth, height: config.nodeHeight };
      const nodeCross = isHorizontal ? size.height : size.width;

      const x = isHorizontal ? mainOffset : crossOffset;
      const y = isHorizontal ? crossOffset : mainOffset;

      positions.set(nodeId, { x, y, width: size.width, height: size.height });
      crossOffset += nodeCross + config.nodeGap;
    }

    mainOffset += dim.mainSize + config.layerGap;
  }

  const totalMain = mainOffset - config.layerGap + config.padding;
  const totalCross = maxCross + config.padding * 2;

  const bounds = isHorizontal
    ? { width: totalMain, height: totalCross }
    : { width: totalCross, height: totalMain };

  return { positions, bounds };
}
