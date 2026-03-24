import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { selectPorts, portToAnchorPoint } from '../../../src/web/diagram/layout/portSelector';

describe('selectPorts', () => {
  describe('card (default)', () => {
    it('LR: source=Right, target=Left', () => {
      const { sourcePort, targetPort } = selectPorts('card', 'card', 'LR');
      expect(sourcePort.side).toBe(Position.Right);
      expect(targetPort.side).toBe(Position.Left);
    });

    it('RL: source=Left, target=Right', () => {
      const { sourcePort, targetPort } = selectPorts('card', 'card', 'RL');
      expect(sourcePort.side).toBe(Position.Left);
      expect(targetPort.side).toBe(Position.Right);
    });

    it('TB: source=Bottom, target=Top', () => {
      const { sourcePort, targetPort } = selectPorts('card', 'card', 'TB');
      expect(sourcePort.side).toBe(Position.Bottom);
      expect(targetPort.side).toBe(Position.Top);
    });

    it('BT: source=Top, target=Bottom', () => {
      const { sourcePort, targetPort } = selectPorts('card', 'card', 'BT');
      expect(sourcePort.side).toBe(Position.Top);
      expect(targetPort.side).toBe(Position.Bottom);
    });
  });

  describe('database', () => {
    it('LR: target input from Left (flow-in side)', () => {
      const { targetPort } = selectPorts('card', 'database', 'LR');
      expect(targetPort.side).toBe(Position.Left);
    });

    it('TB: target input from Top (cylinder cap)', () => {
      const { targetPort } = selectPorts('card', 'database', 'TB');
      expect(targetPort.side).toBe(Position.Top);
    });

    it('source output from flow-out side', () => {
      const { sourcePort } = selectPorts('database', 'card', 'LR');
      expect(sourcePort.side).toBe(Position.Right);
    });
  });

  describe('queue', () => {
    it('LR: target input from Left (flow-in), source output from Right (flow-out)', () => {
      const { sourcePort, targetPort } = selectPorts('queue', 'queue', 'LR');
      expect(sourcePort.side).toBe(Position.Right);
      expect(targetPort.side).toBe(Position.Left);
    });

    it('RL: reversed sides', () => {
      const { sourcePort, targetPort } = selectPorts('queue', 'queue', 'RL');
      expect(sourcePort.side).toBe(Position.Left);
      expect(targetPort.side).toBe(Position.Right);
    });
  });

  describe('person', () => {
    it('source always from Bottom', () => {
      const { sourcePort } = selectPorts('person', 'card', 'LR');
      expect(sourcePort.side).toBe(Position.Bottom);
    });

    it('target always from Bottom', () => {
      const { targetPort } = selectPorts('card', 'person', 'TB');
      expect(targetPort.side).toBe(Position.Bottom);
    });
  });

  describe('gateway', () => {
    it('LR: source output from Right, target input from Left', () => {
      const { sourcePort, targetPort } = selectPorts('gateway', 'gateway', 'LR');
      expect(sourcePort.side).toBe(Position.Right);
      expect(targetPort.side).toBe(Position.Left);
    });
  });
});

describe('portToAnchorPoint', () => {
  const bounds = { x: 100, y: 200, width: 220, height: 100 };

  it('Left side at center offset', () => {
    const point = portToAnchorPoint({ side: Position.Left, offset: 0.5 }, bounds);
    expect(point).toEqual({ x: 100, y: 250 });
  });

  it('Right side at center offset', () => {
    const point = portToAnchorPoint({ side: Position.Right, offset: 0.5 }, bounds);
    expect(point).toEqual({ x: 320, y: 250 });
  });

  it('Top side at center offset', () => {
    const point = portToAnchorPoint({ side: Position.Top, offset: 0.5 }, bounds);
    expect(point).toEqual({ x: 210, y: 200 });
  });

  it('Bottom side at center offset', () => {
    const point = portToAnchorPoint({ side: Position.Bottom, offset: 0.5 }, bounds);
    expect(point).toEqual({ x: 210, y: 300 });
  });
});
