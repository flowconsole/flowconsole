import { edge, element, fixture } from './types';

export default fixture({
  id: 'right-to-left-notation-smoke',
  name: 'Right To Left Notation Smoke',
  model: {
    nodes: [
      element('consumer', 'Consumer'),
      element('api', 'API'),
      element('jobs', 'Jobs Queue', { shape: 'queue' }),
      element('worker', 'Worker'),
    ],
    edges: [
      edge('rl-1', 'consumer', 'api', 'calls'),
      edge('rl-2', 'api', 'jobs', 'schedules', { kind: 'async' }),
      edge('rl-3', 'worker', 'jobs', 'polls', { kind: 'async' }),
    ],
  },
  directions: ['RL'],
  expectations: {
    maxOverlapRatio: 0,
    maxEdgeCrossings: 0,
    semanticOrder: [['consumer', 'right-of', 'api']],
    containersMustEnclose: true,
  },
});
