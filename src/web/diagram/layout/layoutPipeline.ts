import type { ArchitectureDiagramModel, AutoLayoutConfig } from '../types';
import { layoutWithGraphviz } from '../graphvizLayoutService';

export async function layoutPipeline(
  model: ArchitectureDiagramModel,
  _config: AutoLayoutConfig = {}
): Promise<ArchitectureDiagramModel> {
  return layoutWithGraphviz(model);
}

