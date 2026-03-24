import type { LayoutFixture } from './types';

import c4DrilldownBasic from './c4-drilldown-basic';
import flowAcrossScopes from './flow-across-scopes';
import gatewayBffTopology from './gateway-bff-topology';
import denseCrossContainer from './dense-cross-container';
import infraSupportingLane from './infra-supporting-lane';
import disconnectedComponentsPack from './disconnected-components-pack';
import searchAndScopeNavigation from './search-and-scope-navigation';
import filterStability from './filter-stability';
import longLabelsAndBadges from './long-labels-and-badges';
import manySiblingsGrid from './many-siblings-grid';
import topToBottomProcess from './top-to-bottom-process';
import rightToLeftNotationSmoke from './right-to-left-notation-smoke';
import shapeRegistryShowcase from './shape-registry-showcase';
import mixedCustomShapes from './mixed-custom-shapes';
import starTopologyRadial from './star-topology-radial';
import chainInsideContainer from './chain-inside-container';
import bipartiteServices from './bipartite-services';

export const layoutFixtures: readonly LayoutFixture[] = [
  c4DrilldownBasic,
  flowAcrossScopes,
  gatewayBffTopology,
  denseCrossContainer,
  infraSupportingLane,
  disconnectedComponentsPack,
  searchAndScopeNavigation,
  filterStability,
  longLabelsAndBadges,
  manySiblingsGrid,
  topToBottomProcess,
  rightToLeftNotationSmoke,
  shapeRegistryShowcase,
  mixedCustomShapes,
  starTopologyRadial,
  chainInsideContainer,
  bipartiteServices,
];

export const layoutFixturesById = new Map(layoutFixtures.map((entry) => [entry.id, entry]));

export type { LayoutFixture } from './types';
